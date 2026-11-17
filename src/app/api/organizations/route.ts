import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { orgName, orgType, userId } = await req.json();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({
        success: true,
        org: { id: "org-101", name: orgName, type: orgType },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: org, error: orgError } = await admin
      .from("organizations")
      .insert({ name: orgName, type: orgType })
      .select()
      .single();

    if (orgError) {
      return NextResponse.json({ error: orgError.message }, { status: 500 });
    }

    if (userId) {
      const { error: memError } = await admin.from("memberships").insert({
        org_id: org.id,
        user_id: userId,
        role: "org_admin",
      });
      if (memError) {
        console.warn("Membership insert error:", memError.message);
      }
    }

    return NextResponse.json({ success: true, org });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
