import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";

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

    // 1. Authenticate or verify the user creating the organization
    const { user } = await getAuthenticatedUser(req);
    let effectiveUserId = user?.id || userId;

    if (!effectiveUserId) {
      return NextResponse.json({ error: "Authentication required to create an organisation." }, { status: 401 });
    }

    // If session wasn't found in cookies (e.g. initial sign-up flow), verify user exists in auth
    if (!user) {
      const { data: authUser, error: authUserErr } = await admin.auth.admin.getUserById(effectiveUserId);
      if (authUserErr || !authUser?.user) {
        return NextResponse.json({ error: "Invalid user account." }, { status: 401 });
      }
    }

    // 2. Ensure user profile exists to satisfy foreign key in memberships
    await admin.from("profiles").upsert(
      {
        id: effectiveUserId,
        full_name: fullName || (userEmail ? userEmail.split("@")[0] : "Admin"),
        is_super_admin: false,
      },
      { onConflict: "id" }
    );

    // 3. Create organization
    const { data: org, error: orgError } = await admin
      .from("organizations")
      .insert({ name: orgName, type: orgType, status: "active" })
      .select()
      .single();

    if (orgError) {
      return NextResponse.json({ error: orgError.message }, { status: 500 });
    }

    // 4. Link membership strictly to verified user
    const { error: memError } = await admin.from("memberships").upsert(
      {
        org_id: org.id,
        user_id: effectiveUserId,
        role: "org_admin",
      },
      { onConflict: "org_id,user_id" }
    );
    if (memError) {
      console.warn("Membership insert note:", memError.message);
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
    const requestedUserId = searchParams.get("userId");

    const admin = supabaseAdmin();
    if (!admin) {
      return NextResponse.json({ success: true, org: null });
    }

    // Authenticate caller: strictly use authenticated user identity
    const { user } = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ success: true, org: null });
    }
    const effectiveUserId = user.id;

    // Query organization membership for verified user
    const { data: mem } = await admin
      .from("memberships")
      .select("org_id, role, organizations(*)")
      .eq("user_id", effectiveUserId)
      .eq("role", "org_admin")
      .limit(1)
      .maybeSingle();

    if (mem && mem.organizations) {
      const rawOrg: any = Array.isArray(mem.organizations) ? mem.organizations[0] : mem.organizations;
      return NextResponse.json({
        success: true,
        org: rawOrg,
        role: "org_admin",
      });
    }

    // If user is not an org_admin, return null (do NOT leak other organizations)
    return NextResponse.json({
      success: true,
      org: null,
      role: "voter",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
