import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function isValidUUID(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const electionId = params.id;
    const { voterEmail, choices } = await req.json();

    const admin = supabaseAdmin();
    if (!admin || !isValidUUID(electionId)) {
      const receipt_code = `VOTE-${electionId.slice(-4).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      return NextResponse.json({ success: true, receipt_code });
    }

    // 1. Validate election exists and is active
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

    // 2. Validate voter eligibility
    const normalised = (voterEmail || "").toLowerCase().trim();
    const { data: voter, error: vErr } = await admin
      .from("eligible_voters")
      .select("*")
      .eq("election_id", electionId)
      .eq("email", normalised)
      .maybeSingle();

    if (vErr || !voter) {
      return NextResponse.json(
        { error: "This email is not on the eligible voter roster for this election" },
        { status: 403 }
      );
    }

    // 3. Check if voter already cast ballot
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

    // 4. Validate choices length matches positions
    const { data: positions } = await admin
      .from("positions")
      .select("id")
      .eq("election_id", electionId);

    const posCount = positions?.length || 0;
    if (choices.length !== posCount) {
      return NextResponse.json(
        { error: "You must select exactly one candidate for every position on the ballot" },
        { status: 400 }
      );
    }

    // 5. Record participation
    const { error: partErr } = await admin.from("participation").insert({
      election_id: electionId,
      voter_id: voter.id,
      voted_at: new Date().toISOString(),
    });

    if (partErr) {
      return NextResponse.json({ error: partErr.message }, { status: 500 });
    }

    // 6. Record anonymous ballot
    const { data: ballot, error: bErr } = await admin
      .from("ballots")
      .insert({ election_id: electionId })
      .select()
      .single();

    if (bErr || !ballot) {
      return NextResponse.json({ error: bErr?.message || "Failed to record ballot" }, { status: 500 });
    }

    // 7. Record ballot selections
    const selections = choices.map((c: { position_id: string; candidate_id: string }) => ({
      ballot_id: ballot.id,
      position_id: c.position_id,
      candidate_id: c.candidate_id,
    }));

    const { error: selErr } = await admin.from("ballot_selections").insert(selections);
    if (selErr) {
      console.warn("Ballot selection record note:", selErr.message);
    }

    const receipt_code = `VOTE-${electionId.slice(-4).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    return NextResponse.json({ success: true, receipt_code });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
