import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { User } from "@supabase/supabase-js";

export interface AuthUserResult {
  user: User | null;
  error: string | null;
}

/**
 * Validates the caller's identity via either:
 * 1. Bearer token in the Authorization header (JWT)
 * 2. Supabase SSR session cookie via @supabase/ssr
 */
export async function getAuthenticatedUser(req?: NextRequest): Promise<AuthUserResult> {
  try {
    const admin = supabaseAdmin();

    // 1. Check Bearer token in Authorization header
    const authHeader = req?.headers.get("authorization");
    if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
      const token = authHeader.substring(7).trim();
      if (token) {
        if (admin) {
          const { data, error } = await admin.auth.getUser(token);
          if (data?.user && !error) {
            return { user: data.user, error: null };
          }
        }
        try {
          const serverClient = supabaseServer();
          const { data, error } = await serverClient.auth.getUser(token);
          if (data?.user && !error) {
            return { user: data.user, error: null };
          }
        } catch {
          // Continue to cookie check if header validation fails
        }
      }
    }

    // 2. Check cookies via supabaseServer()
    try {
      const serverClient = supabaseServer();
      const { data, error } = await serverClient.auth.getUser();
      if (data?.user && !error) {
        return { user: data.user, error: null };
      }
    } catch {
      // Cookies not present or misconfigured
    }

    return { user: null, error: "Unauthorized: Valid session or token required" };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Authentication failed";
    return { user: null, error: message };
  }
}

export interface AdminVerificationResult {
  user: User | null;
  orgId: string | null;
  error: string | null;
}

/**
 * Confirms that the caller is an authenticated user with verified 'org_admin' role
 * in the memberships table, optionally scoped to a specific organization.
 */
export async function verifyOrgAdmin(
  req: NextRequest,
  expectedOrgId?: string
): Promise<AdminVerificationResult> {
  const { user, error: authError } = await getAuthenticatedUser(req);
  if (!user || authError) {
    return { user: null, orgId: null, error: "Unauthorized: Sign-in required." };
  }

  const admin = supabaseAdmin();
  if (!admin) {
    // If running in local mock mode without Supabase connection
    return { user, orgId: expectedOrgId || null, error: null };
  }

  let query = admin
    .from("memberships")
    .select("org_id, role")
    .eq("user_id", user.id)
    .eq("role", "org_admin");

  if (expectedOrgId) {
    query = query.eq("org_id", expectedOrgId);
  }

  const { data: mem, error: memErr } = await query.limit(1).maybeSingle();

  if (memErr || !mem) {
    return {
      user,
      orgId: null,
      error: "Forbidden: Verified organisation administrator access required.",
    };
  }

  return { user, orgId: mem.org_id, error: null };
}
