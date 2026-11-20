import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function isValidUUID(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
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

      // Augment counts
      const electionsWithCounts = await Promise.all(
        (elections || []).map(async (el) => {
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
            eligible_voters_count: vCount || 0,
            ballots_cast_count: bCount || 0,
          };
        })
      );

      return NextResponse.json({ success: true, elections: electionsWithCounts });
    }

    // Admin / General query
    let query = admin.from("elections").select("*").order("starts_at", { ascending: false });

    if (orgId && isValidUUID(orgId)) {
      query = query.eq("org_id", orgId);
    } else if (userId && isValidUUID(userId)) {
      const { data: mem } = await admin
        .from("memberships")
        .select("org_id")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();

      if (mem?.org_id) {
        query = query.eq("org_id", mem.org_id);
      }
    }

    const { data: elections, error: elError } = await query;
    if (elError) {
      return NextResponse.json({ error: elError.message }, { status: 500 });
    }

    // Augment counts
    const electionsWithCounts = await Promise.all(
      (elections || []).map(async (el) => {
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

    // If org_id is not valid UUID, look up user's org or create/find default
    if (!targetOrgId || !isValidUUID(targetOrgId)) {
      if (userId && isValidUUID(userId)) {
        const { data: mem } = await admin
          .from("memberships")
          .select("org_id")
          .eq("user_id", userId)
          .limit(1)
          .maybeSingle();
        if (mem?.org_id) targetOrgId = mem.org_id;
      }
    }

    if (!targetOrgId || !isValidUUID(targetOrgId)) {
      const { data: orgs } = await admin.from("organizations").select("id").limit(1);
      if (orgs && orgs.length > 0) {
        targetOrgId = orgs[0].id;
      } else {
        const { data: newOrg } = await admin
          .from("organizations")
          .insert({ name: "Organisation Workspace", type: "General", status: "active" })
          .select()
          .single();
        if (newOrg) targetOrgId = newOrg.id;
      }
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
