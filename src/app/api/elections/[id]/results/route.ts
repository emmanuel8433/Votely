import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyOrgAdmin } from "@/lib/auth/server-auth";

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
      return NextResponse.json({ error: "Invalid election id" }, { status: 400 });
    }

    const { data: election, error: elErr } = await admin
      .from("elections")
      .select("*")
      .eq("id", electionId)
      .single();

    if (elErr || !election) {
      return NextResponse.json({ error: "Election not found" }, { status: 404 });
    }

    // Auto-update status if duration has elapsed
    let currentStatus = election.status;
    const now = new Date();
    const end = election.ends_at ? new Date(election.ends_at) : null;
    if (end && !isNaN(end.getTime()) && (currentStatus === "active" || currentStatus === "scheduled") && now >= end) {
      currentStatus = "completed";
      await admin.from("elections").update({ status: "completed" }).eq("id", electionId);
    }

    // Results Visibility Gate:
    // If results are not yet published, only an authenticated org_admin of this election may view tallies
    const isPubliclyPublished = Boolean(election.results_published);
    if (!isPubliclyPublished) {
      const { user, error: adminAuthErr } = await verifyOrgAdmin(req, election.org_id);
      if (!user || adminAuthErr) {
        return NextResponse.json(
          {
            error: "Election results are confidential and have not been published by the administrator yet.",
            results_published: false,
            status: currentStatus,
          },
          { status: 403 }
        );
      }
    }

    // Get positions & candidates
    const { data: posData } = await admin
      .from("positions")
      .select("*")
      .eq("election_id", electionId);

    const positions = posData || [];
    let candidates: { id: string; position_id: string; full_name: string; bio: string }[] = [];
    if (positions.length > 0) {
      const posIds = positions.map((p) => p.id);
      const { data: candData } = await admin
        .from("candidates")
        .select("*")
        .in("position_id", posIds);
      candidates = candData || [];
    }

    // Counts
    const { count: vCount } = await admin
      .from("eligible_voters")
      .select("*", { count: "exact", head: true })
      .eq("election_id", electionId);

    const { count: bCount } = await admin
      .from("ballots")
      .select("*", { count: "exact", head: true })
      .eq("election_id", electionId);

    const total_eligible_voters = vCount || 0;
    const total_ballots_cast = bCount || 0;
    const turnout_percentage =
      total_eligible_voters > 0
        ? Math.round((total_ballots_cast / total_eligible_voters) * 100)
        : 0;

    // Fetch all ballots for this election
    const { data: ballotRows } = await admin
      .from("ballots")
      .select("id")
      .eq("election_id", electionId);

    const ballotIds = (ballotRows || []).map((b) => b.id);
    let selections: { ballot_id: string; position_id: string; candidate_id: string }[] = [];
    if (ballotIds.length > 0) {
      const { data: selData } = await admin
        .from("ballot_selections")
        .select("*")
        .in("ballot_id", ballotIds);
      selections = selData || [];
    }

    // Calculate position tallies
    const positionResults = positions.map((pos) => {
      const posCandidates = candidates.filter((c) => c.position_id === pos.id);
      const votesPerCand: Record<string, number> = {};
      posCandidates.forEach((c) => {
        votesPerCand[c.id] = 0;
      });

      selections
        .filter((s) => s.position_id === pos.id)
        .forEach((s) => {
          if (votesPerCand[s.candidate_id] !== undefined) {
            votesPerCand[s.candidate_id]++;
          }
        });

      const posTotalVotes = Object.values(votesPerCand).reduce((a, b) => a + b, 0);

      let maxVotes = -1;
      Object.values(votesPerCand).forEach((v) => {
        if (v > maxVotes) maxVotes = v;
      });

      const winnersCount = Object.values(votesPerCand).filter(
        (v) => v === maxVotes && v > 0
      ).length;
      const isTie = winnersCount > 1;

      const candidatesResult = posCandidates.map((c) => {
        const votes = votesPerCand[c.id] || 0;
        const percentage = posTotalVotes > 0 ? Math.round((votes / posTotalVotes) * 100) : 0;
        return {
          candidate_id: c.id,
          full_name: c.full_name,
          bio: c.bio || "",
          votes,
          percentage,
          is_winner: votes === maxVotes && maxVotes > 0 && !isTie,
          is_tie: votes === maxVotes && maxVotes > 0 && isTie,
        };
      });

      return {
        position_id: pos.id,
        position_title: pos.title,
        total_votes: posTotalVotes,
        candidates: candidatesResult.sort((a, b) => b.votes - a.votes),
      };
    });

    return NextResponse.json({
      success: true,
      results: {
        election_id: election.id,
        election_title: election.title,
        starts_at: election.starts_at,
        ends_at: election.ends_at,
        status: currentStatus,
        results_published: election.results_published,
        total_eligible_voters,
        total_ballots_cast,
        turnout_percentage,
        positions: positionResults,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
