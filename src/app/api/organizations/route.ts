import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const { orgName, orgType, userId, userEmail, fullName } = await req.json();

    const admin = supabaseAdmin();
    if (!admin) {
      return NextResponse.json({
        success: true,
        org: { id: `org-${Date.now()}`, name: orgName, type: orgType, status: "active" },
      });
    }

    // 1. Ensure user profile exists to satisfy foreign key in memberships
    if (userId) {
      await admin.from("profiles").upsert(
        {
          id: userId,
          full_name: fullName || (userEmail ? userEmail.split("@")[0] : "Admin"),
          is_super_admin: false,
        },
        { onConflict: "id" }
      );
    }

    // 2. Create organization
    const { data: org, error: orgError } = await admin
      .from("organizations")
      .insert({ name: orgName, type: orgType, status: "active" })
      .select()
      .single();

    if (orgError) {
      return NextResponse.json({ error: orgError.message }, { status: 500 });
    }

    // 3. Link membership
    if (userId && org?.id) {
      const { error: memError } = await admin.from("memberships").upsert(
        {
          org_id: org.id,
          user_id: userId,
          role: "org_admin",
        },
        { onConflict: "org_id,user_id" }
      );
      if (memError) {
        console.warn("Membership insert note:", memError.message);
      }
    }

    return NextResponse.json({ success: true, org });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    const admin = supabaseAdmin();
    if (!admin) {
      return NextResponse.json({ success: true, org: null });
    }

    if (userId) {
      const { data: mem } = await admin
        .from("memberships")
        .select("org_id, role, organizations(*)")
        .eq("user_id", userId)
        .limit(1)
        .single();

      if (mem && mem.organizations) {
        return NextResponse.json({
          success: true,
          org: mem.organizations,
          role: mem.role,
        });
      }
    }

    // Fallback: return first active organization
    const { data: orgs } = await admin
      .from("organizations")
      .select("*")
      .eq("status", "active")
      .limit(1);

    return NextResponse.json({
      success: true,
      org: orgs && orgs.length > 0 ? orgs[0] : null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
