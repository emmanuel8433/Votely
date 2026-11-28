import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && key) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Edge Route Protection: Protect all /admin routes and /onboarding
    if (request.nextUrl.pathname.startsWith("/admin") || request.nextUrl.pathname.startsWith("/onboarding")) {
      // 1. Require authenticated session
      if (!user) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("role", "org_admin");
        loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
        return NextResponse.redirect(loginUrl);
      }

      // 2. Strictly require org_admin role at Edge
      if (user.user_metadata?.role !== "org_admin") {
        if (user.user_metadata?.role === "voter") {
          const voterUrl = new URL("/vote", request.url);
          return NextResponse.redirect(voterUrl);
        }
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("role", "org_admin");
        loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/onboarding"],
};
