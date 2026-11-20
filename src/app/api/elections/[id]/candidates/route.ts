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
    const { searchParams } = new URL(req.url);
    const candidateId = searchParams.get("candidateId");

    const admin = supabaseAdmin();
    if (!admin || !candidateId || !isValidUUID(candidateId)) {
      return NextResponse.json({ success: true });
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
