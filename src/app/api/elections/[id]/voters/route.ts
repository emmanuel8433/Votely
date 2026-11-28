import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedUser, verifyOrgAdmin } from "@/lib/auth/server-auth";
import { isValidEmail } from "@/lib/security/validation";
import { checkRateLimit, rateLimitExceededResponse } from "@/lib/security/rate-limit";

function isValidUUID(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const electionId = params.id;
    const admin = supabaseAdmin();
    if (!admin || !isValidUUID(electionId)) {
      return NextResponse.json({ success: true, voters: [] });
    }

    // 1. Authenticate caller
    const { user, error: authError } = await getAuthenticatedUser(req);
    if (!user || authError) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // 2. Fetch election to check org
    const { data: election, error: elErr } = await admin
      .from("elections")
      .select("org_id")
      .eq("id", electionId)
      .single();

    if (elErr || !election) {
      return NextResponse.json({ error: "Election not found" }, { status: 404 });
    }

    // 3. Determine if caller is an org admin for this election
    const { data: adminMem } = await admin
      .from("memberships")
      .select("role")
      .eq("user_id", user.id)
      .eq("org_id", election.org_id)
      .eq("role", "org_admin")
      .limit(1)
      .maybeSingle();

    const isOrgAdmin = Boolean(adminMem);

    // If org admin -> return full roster; if voter -> return ONLY their own record
    let query = admin.from("eligible_voters").select("*").eq("election_id", electionId);
    if (!isOrgAdmin) {
      const userEmail = (user.email || "").toLowerCase().trim();
      query = query.eq("email", userEmail);
    }

    const { data: vList, error: vErr } = await query;
    if (vErr) {
      return NextResponse.json({ error: vErr.message }, { status: 500 });
    }

    const { data: pList } = await admin
      .from("participation")
      .select("*")
      .eq("election_id", electionId);

    const participated = new Map<string, string>();
    (pList || []).forEach((p) => {
      participated.set(p.voter_id, p.voted_at);
    });

    const voters = (vList || []).map((v) => ({
      ...v,
      voted: participated.has(v.id),
      voted_at: participated.get(v.id) || undefined,
    }));

    return NextResponse.json({ success: true, voters });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Rate limiting for voter management
    const rateLimit = checkRateLimit(req, { limit: 30, windowMs: 60000, keyPrefix: "voters" });
    if (!rateLimit.success) {
      return rateLimitExceededResponse(rateLimit);
    }

    const electionId = params.id;
    const body = await req.json();

    const admin = supabaseAdmin();
    if (!admin || !isValidUUID(electionId)) {
      if (body.voters && Array.isArray(body.voters)) {
        return NextResponse.json({ success: true, added: body.voters.length, skipped: 0 });
      }
      return NextResponse.json({
        success: true,
        voter: {
          id: `v-${Date.now()}`,
          election_id: electionId,
          email: body.email,
          full_name: body.full_name,
          voted: false,
        },
      });
    }

    // 1. Fetch election
    const { data: election, error: elErr } = await admin
      .from("elections")
      .select("org_id")
      .eq("id", electionId)
      .single();

    if (elErr || !election) {
      return NextResponse.json({ error: "Election not found" }, { status: 404 });
    }

    // 2. Strict authorization: Caller must be org_admin of this election's organization
    const { user, error: adminErr } = await verifyOrgAdmin(req, election.org_id);
    if (!user || adminErr) {
      return NextResponse.json(
        { error: adminErr || "Forbidden: Only organisation administrators can add or import voters." },
        { status: 403 }
      );
    }

    // Bulk import
    if (body.voters && Array.isArray(body.voters)) {
      let added = 0;
      let skipped = 0;

      for (const item of body.voters) {
        if (!item.email || !isValidEmail(item.email)) {
          skipped++;
          continue;
        }
        const cleanEmail = item.email.toLowerCase().trim();
        const { error: insErr } = await admin.from("eligible_voters").insert({
          election_id: electionId,
          email: cleanEmail,
          full_name: item.full_name || null,
        });

        if (insErr) {
          skipped++;
        } else {
          added++;
        }
      }

      return NextResponse.json({ success: true, added, skipped }, { headers: rateLimit.headers });
    }

    // Single voter
    const cleanEmail = (body.email || "").toLowerCase().trim();
    if (!isValidEmail(cleanEmail)) {
      return NextResponse.json({ error: "A valid, well-formed email address is required (e.g. name@domain.com)." }, { status: 400 });
    }

    const { data: newVoter, error: insErr } = await admin
      .from("eligible_voters")
      .insert({
        election_id: electionId,
        email: cleanEmail,
        full_name: body.full_name || null,
      })
      .select()
      .single();

    if (insErr) {
      if (insErr.code === "23505") {
        return NextResponse.json(
          { error: "A voter with this email already exists in this election" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      voter: {
        ...newVoter,
        voted: false,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
