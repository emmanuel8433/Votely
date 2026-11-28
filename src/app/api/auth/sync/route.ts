import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { checkRateLimit, rateLimitExceededResponse } from "@/lib/security/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const rateLimit = checkRateLimit(req, { limit: 40, windowMs: 60000, keyPrefix: "auth-sync" });
    if (!rateLimit.success) {
      return rateLimitExceededResponse(rateLimit);
    }

    const { userId, email, fullName } = await req.json();

    const admin = supabaseAdmin();
    if (!admin) {
      return NextResponse.json({
        success: true,
        profile: { id: userId, email, full_name: fullName, role: "voter" },
        organization: null,
      });
    }

    // 1. Authenticate caller to prevent session impersonation
    const { user: sessionUser } = await getAuthenticatedUser(req);
    const effectiveUserId = sessionUser?.id || userId;
    const effectiveEmail = sessionUser?.email || email;

    if (!effectiveUserId) {
      return NextResponse.json({ error: "No user specified" }, { status: 400 });
    }

    let profile = null;
    let organization = null;
    let userRole: "org_admin" | "voter" = "voter";

    // 2. Fetch user metadata authoritatively from Supabase Auth (ignore any caller-supplied role)
    let authMetaRole: string | undefined = undefined;
    let authEmail = effectiveEmail;
    let authName = fullName;
    let isGoogleAuth = false;

    const { data: authUserData } = await admin.auth.admin.getUserById(effectiveUserId);
    if (authUserData?.user) {
      authMetaRole = authUserData.user.user_metadata?.role;
      authEmail = authUserData.user.email || effectiveEmail;
      authName =
        authUserData.user.user_metadata?.full_name ||
        authUserData.user.user_metadata?.name ||
        fullName ||
        (authEmail ? authEmail.split("@")[0] : "User");

      const provider = authUserData.user.app_metadata?.provider;
      const identities = authUserData.user.identities || [];
      isGoogleAuth =
        provider === "google" ||
        identities.some((id: { provider?: string }) => id.provider === "google");
    }

    // 3. Ensure profile exists in profiles table
    const { data: prof, error: profErr } = await admin
      .from("profiles")
      .upsert(
        {
          id: effectiveUserId,
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

    // 4. Authoritatively verify membership in organizations
    // If user registered as a voter or authenticated with Google, they cannot be an admin
    if (authMetaRole === "voter" || isGoogleAuth) {
      userRole = "voter";
      organization = null;
    } else {
      const { data: mem } = await admin
        .from("memberships")
        .select("org_id, role, organizations(*)")
        .eq("user_id", effectiveUserId)
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
        id: effectiveUserId,
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
