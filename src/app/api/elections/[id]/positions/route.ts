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
      return NextResponse.json({ success: true, positions: [] });
    }

    const { data: posData, error } = await admin
      .from("positions")
      .select("*")
      .eq("election_id", electionId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

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

    return NextResponse.json({ success: true, positions });
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
    const electionId = params.id;
    const { title } = await req.json();

    const admin = supabaseAdmin();
    if (!admin || !isValidUUID(electionId)) {
      return NextResponse.json({
        success: true,
        position: { id: `pos-${Date.now()}`, election_id: electionId, title, candidates: [] },
      });
    }

    // 1. Fetch election org_id
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
        { error: adminErr || "Forbidden: Only organisation administrators can add positions." },
        { status: 403 }
      );
    }

    const { data: newPos, error } = await admin
      .from("positions")
      .insert({ election_id: electionId, title })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      position: { ...newPos, candidates: [] },
    });
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
    const { searchParams } = new URL(req.url);
    const posId = searchParams.get("posId");

    const admin = supabaseAdmin();
    if (!admin || !posId || !isValidUUID(posId)) {
      return NextResponse.json({ success: true });
    }

    // 1. Fetch election org_id
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
        { error: adminErr || "Forbidden: Only organisation administrators can delete positions." },
        { status: 403 }
      );
    }

    const { error } = await admin.from("positions").delete().eq("id", posId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
