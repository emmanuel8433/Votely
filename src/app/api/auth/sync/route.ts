import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const { userId, email, fullName, role } = await req.json();

    const admin = supabaseAdmin();
    if (!admin) {
      return NextResponse.json({
        success: true,
        user: { id: userId, email, full_name: fullName, role },
        organization: null,
      });
    }

    let profile = null;
    let organization = null;
    let userRole = role;

    // 1. Ensure profile exists in profiles table
    if (userId) {
      const { data: prof, error: profErr } = await admin
        .from("profiles")
        .upsert(
          {
            id: userId,
            full_name: fullName || (email ? email.split("@")[0] : "User"),
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

    // 2. If user is an org_admin or unspecified role, check membership
    if (userId) {
      const { data: mem } = await admin
        .from("memberships")
        .select("org_id, role, organizations(*)")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();

      if (mem && mem.organizations) {
        organization = mem.organizations;
        if (mem.role) userRole = mem.role;
      } else if (role === "org_admin" || !role) {
        // Look for any organization this user might belong to, or link to latest active org
        const { data: orgs } = await admin
          .from("organizations")
          .select("*")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1);

        if (orgs && orgs.length > 0) {
          organization = orgs[0];
          // Auto-link membership so future queries are instant
          await admin.from("memberships").upsert(
            {
              org_id: organization.id,
              user_id: userId,
              role: "org_admin",
            },
            { onConflict: "org_id,user_id" }
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: userId,
        email,
        full_name: profile?.full_name || fullName || (email ? email.split("@")[0] : ""),
        role: userRole,
      },
      organization: organization
        ? {
            id: organization.id,
            name: organization.name,
            type: organization.type || "General",
            status: organization.status || "active",
          }
        : null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
