import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { checkRateLimit, rateLimitExceededResponse } from "@/lib/security/rate-limit";

function isValidUUID(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 0. Rate limiting protection against automated vote-stuffing
    const rateLimit = checkRateLimit(req, { limit: 10, windowMs: 60000, keyPrefix: "vote" });
    if (!rateLimit.success) {
      return rateLimitExceededResponse(rateLimit);
    }

    const electionId = params.id;
    const body = await req.json();
    const { voterEmail, choices } = body;

    const admin = supabaseAdmin();
    // Fallback for local mock demo elections
    if (!admin || !isValidUUID(electionId)) {
      const randomCode = crypto.randomBytes(8).toString("hex").toUpperCase();
      const receipt_code = `VOTE-${electionId.slice(-4).toUpperCase()}-${randomCode}`;
      return NextResponse.json({ success: true, receipt_code });
    }

    // 1. Strict Server-Side Authentication & Identity Binding
    const { user, error: authError } = await getAuthenticatedUser(req);
    if (!user || !user.email) {
      return NextResponse.json(
        { error: "Authentication required: Please sign in to cast your ballot." },
        { status: 401 }
      );
    }

    const authenticatedEmail = user.email.toLowerCase().trim();

    // Prevent identity spoofing: Caller cannot submit under a different email than their authenticated identity
    if (voterEmail && voterEmail.toLowerCase().trim() !== authenticatedEmail) {
      return NextResponse.json(
        { error: "Forbidden: You cannot cast a ballot on behalf of another user." },
        { status: 403 }
      );
    }

    // 2. Validate election exists and is active
    const { data: election, error: elErr } = await admin
      .from("elections")
      .select("*")
      .eq("id", electionId)
      .single();

    if (elErr || !election) {
      return NextResponse.json({ error: "Election not found" }, { status: 404 });
    }

    const now = new Date();
    const end = election.ends_at ? new Date(election.ends_at) : null;

    // Auto-complete status if duration has elapsed
    if (end && !isNaN(end.getTime()) && now >= end) {
      await admin.from("elections").update({ status: "completed" }).eq("id", electionId);
      return NextResponse.json(
        { error: "Voting is closed: The election duration has elapsed and this election is now completed" },
        { status: 400 }
      );
    }

    if (election.status !== "active") {
      return NextResponse.json({ error: "Voting is not open for this election" }, { status: 400 });
    }

    if (now < new Date(election.starts_at) || (end && now > end)) {
      return NextResponse.json(
        { error: "Ballot rejected: outside active voting window" },
        { status: 400 }
      );
    }

    // 3. Validate voter eligibility using verified identity
    const { data: voter, error: vErr } = await admin
      .from("eligible_voters")
      .select("*")
      .eq("election_id", electionId)
      .eq("email", authenticatedEmail)
      .maybeSingle();

    if (vErr || !voter) {
      return NextResponse.json(
        { error: "This email is not on the eligible voter roster for this election" },
        { status: 403 }
      );
    }

    // Link voter account if not already linked
    if (!voter.user_id && user.id) {
      await admin.from("eligible_voters").update({ user_id: user.id }).eq("id", voter.id);
    }

    // 4. Pre-check if voter already cast ballot (fast path)
    const { data: part } = await admin
      .from("participation")
      .select("voter_id")
      .eq("election_id", electionId)
      .eq("voter_id", voter.id)
      .maybeSingle();

    if (part) {
      return NextResponse.json(
        { error: "Ballot rejected: You have already cast a ballot in this election" },
        { status: 409 }
      );
    }

    // 5. Validate choices length matches positions
    const { data: positions } = await admin
      .from("positions")
      .select("id")
      .eq("election_id", electionId);

    const posCount = positions?.length || 0;
    if (!Array.isArray(choices) || choices.length !== posCount) {
      return NextResponse.json(
        { error: "You must select exactly one candidate for every position on the ballot" },
        { status: 400 }
      );
    }

    // 6. Record participation atomically (Race-Condition Protected by primary key constraint)
    const { error: partErr } = await admin.from("participation").insert({
      election_id: electionId,
      voter_id: voter.id,
      voted_at: new Date().toISOString(),
    });

    if (partErr) {
      // Catch unique violation (PostgreSQL code 23505) or duplicate primary key
      if (
        partErr.code === "23505" ||
        partErr.message?.toLowerCase().includes("duplicate") ||
        partErr.message?.toLowerCase().includes("unique") ||
        partErr.message?.toLowerCase().includes("pkey")
      ) {
        return NextResponse.json(
          { error: "Ballot rejected: You have already cast a ballot in this election" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: partErr.message }, { status: 500 });
    }

    // 7. Record anonymous ballot
    const { data: ballot, error: bErr } = await admin
      .from("ballots")
      .insert({ election_id: electionId })
      .select()
      .single();

    if (bErr || !ballot) {
      // Rollback participation if ballot creation fails so the voter isn't locked out without a counted vote
      await admin.from("participation").delete().eq("election_id", electionId).eq("voter_id", voter.id);
      return NextResponse.json({ error: bErr?.message || "Failed to record ballot" }, { status: 500 });
    }

    // 8. Record ballot selections
    const selections = choices.map((c: { position_id: string; candidate_id: string }) => ({
      ballot_id: ballot.id,
      position_id: c.position_id,
      candidate_id: c.candidate_id,
    }));

    const { error: selErr } = await admin.from("ballot_selections").insert(selections);
    if (selErr) {
      console.error("Ballot selection record error:", selErr.message);
      // Rollback ballot and participation
      await admin.from("ballots").delete().eq("id", ballot.id);
      await admin.from("participation").delete().eq("election_id", electionId).eq("voter_id", voter.id);
      return NextResponse.json({ error: "Failed to record ballot selections. Please try again." }, { status: 500 });
    }

    // 9. Cryptographically secure 16-hex receipt code (64-bit entropy)
    const randomHex = crypto.randomBytes(8).toString("hex").toUpperCase();
    const receipt_code = `VOTE-${electionId.slice(-4).toUpperCase()}-${randomHex}`;
    return NextResponse.json({ success: true, receipt_code }, { headers: rateLimit.headers });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
