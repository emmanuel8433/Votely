import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const authError = searchParams.get("error_description") || searchParams.get("error");
  let next = searchParams.get("next") || "/vote";

  // Security enforcement: Google OAuth is strictly for voters!
  // Never allow an OAuth callback to redirect to administrator surfaces.
  if (next.startsWith("/admin") || next === "/admin") {
    next = "/vote";
  }

  if (authError) {
    return NextResponse.redirect(
      `${origin}/login?role=voter&error=${encodeURIComponent(authError)}`
    );
  }

  if (code) {
    const cookieStore = cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Read-only in some execution contexts
            }
          },
        },
      });

      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        return NextResponse.redirect(
          `${origin}/login?role=voter&error=${encodeURIComponent(error.message)}`
        );
      }

      if (data?.user) {
        // Enforce voter role for all Google/OAuth authenticated accounts
        const admin = supabaseAdmin();
        if (admin) {
          const authName =
            data.user.user_metadata?.full_name ||
            data.user.user_metadata?.name ||
            (data.user.email ? data.user.email.split("@")[0] : "Voter");

          // 1. Authoritatively set role in auth user metadata
          await admin.auth.admin.updateUserById(data.user.id, {
            user_metadata: {
              ...data.user.user_metadata,
              role: "voter",
            },
          });

          // 2. Ensure profile exists in profiles table with voter status
          await admin.from("profiles").upsert(
            {
              id: data.user.id,
              full_name: authName,
              is_super_admin: false,
            },
            { onConflict: "id" }
          );
        }
      }
    }
  }

  // Redirect to the login page first with oauth_success flag so the user
  // returns to the login page, which then smoothly moves them to their dashboard
  return NextResponse.redirect(
    `${origin}/login?role=voter&auth=oauth_success&redirect=${encodeURIComponent(next)}`
  );
}
