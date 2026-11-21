import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const { userId, email, fullName, role } = await req.json();

    const admin = supabaseAdmin();
    if (!admin) {
      return NextResponse.json({
        success: true,
        profile: { id: userId, email, full_name: fullName, role: role || "voter" },
        organization: null,
      });
    }

    let profile = null;
    let organization = null;
    let userRole: "org_admin" | "voter" = "voter";

    // 1. Fetch user metadata from Supabase Auth to determine the authoritative registered role
    let authMetaRole: string | undefined = undefined;
    let authEmail = email;
    let authName = fullName;

    if (userId) {
      const { data: authUserData } = await admin.auth.admin.getUserById(userId);
      if (authUserData?.user) {
        authMetaRole = authUserData.user.user_metadata?.role;
        authEmail = authUserData.user.email || email;
        authName =
          authUserData.user.user_metadata?.full_name ||
          fullName ||
          (authEmail ? authEmail.split("@")[0] : "User");
      }
    }

    // 2. Ensure profile exists in profiles table
    if (userId) {
      const { data: prof, error: profErr } = await admin
        .from("profiles")
        .upsert(
          {
            id: userId,
            full_name: authName || (authEmail ? authEmail.split("@")[0] : "User"),
            is_super_admin: false,
          },
          { onConflict: "id" }
        )
        .select()
        .single();

      if (!profErr && prof) {
        profile = prof;
      }
    }

    // 3. Strictly verify membership in organizations
    // If user registered as a voter, they CANNOT be an admin and have no org admin rights
    if (authMetaRole === "voter") {
      userRole = "voter";
      organization = null;
    } else if (userId) {
      const { data: mem } = await admin
        .from("memberships")
        .select("org_id, role, organizations(*)")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();

      if (mem && mem.organizations && mem.role === "org_admin") {
        const rawOrg: any = Array.isArray(mem.organizations) ? mem.organizations[0] : mem.organizations;
        if (rawOrg) {
          organization = {
            id: rawOrg.id,
            name: rawOrg.name,
            type: rawOrg.type || "General",
            status: rawOrg.status || "active",
          };
          userRole = "org_admin";
        }
      } else {
        userRole = "voter";
        organization = null;
      }
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: userId,
        email: authEmail,
        full_name: profile?.full_name || authName || (authEmail ? authEmail.split("@")[0] : ""),
        role: userRole,
      },
      organization,
      isAdmin: userRole === "org_admin",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
