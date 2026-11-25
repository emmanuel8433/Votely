import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function isValidUUID(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
}

/**
 * Automatically transitions election status based on duration window:
 * - If ends_at has passed and election is active or scheduled -> switches to "completed"
 * - If starts_at has arrived and election is scheduled -> switches to "active"
 */
async function syncElectionDurationStatus(admin: any, el: any): Promise<string> {
  const now = new Date();
  let currentStatus = el.status;
  const start = el.starts_at ? new Date(el.starts_at) : null;
  const end = el.ends_at ? new Date(el.ends_at) : null;

  if (end && !isNaN(end.getTime())) {
    if ((currentStatus === "active" || currentStatus === "scheduled") && now >= end) {
      currentStatus = "completed";
      await admin.from("elections").update({ status: "completed" }).eq("id", el.id);
    } else if (currentStatus === "scheduled" && start && !isNaN(start.getTime()) && now >= start && now < end) {
      currentStatus = "active";
      await admin.from("elections").update({ status: "active" }).eq("id", el.id);
    }
  }

  return currentStatus;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId");
    const voterEmail = searchParams.get("voterEmail");
    const userId = searchParams.get("userId");

    const admin = supabaseAdmin();
    if (!admin) {
      return NextResponse.json({ success: true, elections: [] });
    }

    // Voter query: Find elections this voter was enrolled in
    if (voterEmail) {
      const normalised = voterEmail.toLowerCase().trim();
      const { data: evRows } = await admin
        .from("eligible_voters")
        .select("election_id")
        .eq("email", normalised);

      if (!evRows || evRows.length === 0) {
        return NextResponse.json({ success: true, elections: [] });
      }

      const electionIds = Array.from(new Set(evRows.map((r) => r.election_id)));
      const { data: elections, error: elError } = await admin
        .from("elections")
        .select("*")
        .in("id", electionIds)
        .order("starts_at", { ascending: false });

      if (elError) {
        return NextResponse.json({ error: elError.message }, { status: 500 });
      }

      // Augment counts & auto-sync duration status
      const electionsWithCounts = await Promise.all(
        (elections || []).map(async (el) => {
          const resolvedStatus = await syncElectionDurationStatus(admin, el);
          const { count: vCount } = await admin
            .from("eligible_voters")
            .select("*", { count: "exact", head: true })
            .eq("election_id", el.id);
          const { count: bCount } = await admin
            .from("ballots")
            .select("*", { count: "exact", head: true })
            .eq("election_id", el.id);
          return {
            ...el,
            status: resolvedStatus,
            eligible_voters_count: vCount || 0,
            ballots_cast_count: bCount || 0,
          };
        })
      );

      return NextResponse.json({ success: true, elections: electionsWithCounts });
    }

    // Admin query: Strictly require valid orgId or userId with org_admin membership
    let query = admin.from("elections").select("*").order("starts_at", { ascending: false });

    if (orgId && isValidUUID(orgId)) {
      query = query.eq("org_id", orgId);
    } else if (userId && isValidUUID(userId)) {
      const { data: mem } = await admin
        .from("memberships")
        .select("org_id, role")
        .eq("user_id", userId)
        .eq("role", "org_admin")
        .limit(1)
        .maybeSingle();

      if (mem?.org_id) {
        query = query.eq("org_id", mem.org_id);
      } else {
        // User is not an admin: return empty list
        return NextResponse.json({ success: true, elections: [] });
      }
    } else {
      // Neither orgId nor authenticated admin userId provided
      return NextResponse.json({ success: true, elections: [] });
    }

    const { data: elections, error: elError } = await query;
    if (elError) {
      return NextResponse.json({ error: elError.message }, { status: 500 });
    }

    // Augment counts & auto-sync duration status
    const electionsWithCounts = await Promise.all(
      (elections || []).map(async (el) => {
        const resolvedStatus = await syncElectionDurationStatus(admin, el);
        const { count: vCount } = await admin
          .from("eligible_voters")
          .select("*", { count: "exact", head: true })
          .eq("election_id", el.id);
        const { count: bCount } = await admin
          .from("ballots")
          .select("*", { count: "exact", head: true })
          .eq("election_id", el.id);
        return {
          ...el,
          status: resolvedStatus,
          eligible_voters_count: vCount || 0,
          ballots_cast_count: bCount || 0,
        };
      })
    );

    return NextResponse.json({ success: true, elections: electionsWithCounts });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, starts_at, ends_at, status, org_id, userId } = body;

    const admin = supabaseAdmin();
    if (!admin) {
      return NextResponse.json({
        success: true,
        election: {
          id: `el-${Date.now()}`,
          org_id: org_id || `org-${Date.now()}`,
          title,
          description: description || "",
          starts_at,
          ends_at,
          status: status || "draft",
          results_published: false,
          eligible_voters_count: 0,
          ballots_cast_count: 0,
        },
      });
    }

    let targetOrgId = org_id;

    if (userId && isValidUUID(userId)) {
      const { data: mem } = await admin
        .from("memberships")
        .select("org_id, role")
        .eq("user_id", userId)
        .eq("role", "org_admin")
        .limit(1)
        .maybeSingle();

      if (!mem) {
        return NextResponse.json(
          { error: "Unauthorized: only verified organisation administrators can create elections." },
          { status: 403 }
        );
      }
      targetOrgId = mem.org_id;
    } else if (!targetOrgId || !isValidUUID(targetOrgId)) {
      return NextResponse.json(
        { error: "Unauthorized: valid organisation required." },
        { status: 403 }
      );
    }

    const { data: newElection, error: insertError } = await admin
      .from("elections")
      .insert({
        title,
        description: description || "",
        starts_at,
        ends_at,
        status: status || "draft",
        results_published: false,
        org_id: targetOrgId,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      election: {
        ...newElection,
        eligible_voters_count: 0,
        ballots_cast_count: 0,
        positions: [],
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
