import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

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

    // Auto-update status based on duration window
    let currentStatus = election.status;
    const now = new Date();
    const start = election.starts_at ? new Date(election.starts_at) : null;
    const end = election.ends_at ? new Date(election.ends_at) : null;

    if (end && !isNaN(end.getTime())) {
      if ((currentStatus === "active" || currentStatus === "scheduled") && now >= end) {
        currentStatus = "completed";
        await admin.from("elections").update({ status: "completed" }).eq("id", electionId);
      } else if (currentStatus === "scheduled" && start && !isNaN(start.getTime()) && now >= start && now < end) {
        currentStatus = "active";
        await admin.from("elections").update({ status: "active" }).eq("id", electionId);
      }
    }

    // Get positions with candidates
    const { data: posData } = await admin
      .from("positions")
      .select("*")
      .eq("election_id", electionId);

    const positions = posData || [];
    if (positions.length > 0) {
      const posIds = positions.map((p) => p.id);
      const { data: cands } = await admin
        .from("candidates")
        .select("*")
        .in("position_id", posIds);

      positions.forEach((p) => {
        p.candidates = (cands || []).filter((c) => c.position_id === p.id);
      });
    }

    // Get voter count and ballot count
    const { count: vCount } = await admin
      .from("eligible_voters")
      .select("*", { count: "exact", head: true })
      .eq("election_id", electionId);

    const { count: bCount } = await admin
      .from("ballots")
      .select("*", { count: "exact", head: true })
      .eq("election_id", electionId);

    return NextResponse.json({
      success: true,
      election: {
        ...election,
        status: currentStatus,
        eligible_voters_count: vCount || 0,
        ballots_cast_count: bCount || 0,
        positions,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const electionId = params.id;
    const updates = await req.json();

    const admin = supabaseAdmin();
    if (!admin || !isValidUUID(electionId)) {
      return NextResponse.json({ error: "Invalid election id" }, { status: 400 });
    }

    // Filter allowed update fields
    const safeUpdates: Record<string, unknown> = {};
    if (updates.title !== undefined) safeUpdates.title = updates.title;
    if (updates.description !== undefined) safeUpdates.description = updates.description;
    if (updates.starts_at !== undefined) safeUpdates.starts_at = updates.starts_at;
    if (updates.ends_at !== undefined) safeUpdates.ends_at = updates.ends_at;
    if (updates.status !== undefined) safeUpdates.status = updates.status;
    if (updates.results_published !== undefined) safeUpdates.results_published = updates.results_published;

    const { data: updated, error: updateErr } = await admin
      .from("elections")
      .update(safeUpdates)
      .eq("id", electionId)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, election: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const electionId = params.id;
    const admin = supabaseAdmin();
    if (!admin || !isValidUUID(electionId)) {
      return NextResponse.json({ error: "Invalid election id" }, { status: 400 });
    }

    const { error: delErr } = await admin.from("elections").delete().eq("id", electionId);
    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
