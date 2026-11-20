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
      return NextResponse.json({ success: true, voters: [] });
    }

    const { data: vList, error: vErr } = await admin
      .from("eligible_voters")
      .select("*")
      .eq("election_id", electionId);

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

    // Bulk import
    if (body.voters && Array.isArray(body.voters)) {
      let added = 0;
      let skipped = 0;

      for (const item of body.voters) {
        if (!item.email || !item.email.includes("@")) {
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

      return NextResponse.json({ success: true, added, skipped });
    }

    // Single voter
    const cleanEmail = (body.email || "").toLowerCase().trim();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
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
