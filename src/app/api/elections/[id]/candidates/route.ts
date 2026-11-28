import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyOrgAdmin } from "@/lib/auth/server-auth";

function isValidUUID(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const electionId = params.id;
    const { position_id, full_name, bio, photo_path } = await req.json();

    const admin = supabaseAdmin();
    if (!admin || !position_id || !isValidUUID(position_id)) {
      return NextResponse.json({
        success: true,
        candidate: {
          id: `cand-${Date.now()}`,
          position_id,
          full_name,
          bio: bio || "",
          photo_path,
        },
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
        { error: adminErr || "Forbidden: Only organisation administrators can add candidates." },
        { status: 403 }
      );
    }

    const { data: newCand, error } = await admin
      .from("candidates")
      .insert({
        position_id,
        full_name,
        bio: bio || "",
        photo_path: photo_path || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, candidate: newCand });
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
    const candidateId = searchParams.get("candidateId");

    const admin = supabaseAdmin();
    if (!admin || !candidateId || !isValidUUID(candidateId)) {
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
        { error: adminErr || "Forbidden: Only organisation administrators can delete candidates." },
        { status: 403 }
      );
    }

    const { error } = await admin.from("candidates").delete().eq("id", candidateId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
