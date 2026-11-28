"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, supabaseClient } from "@/lib/supabase/client";
import { store } from "@/lib/store";

declare global {
  interface Window {
    google?: any;
  }
}

interface GoogleAuthButtonProps {
  text?: string;
  redirectTo?: string;
  onError?: (error: string) => void;
  className?: string;
  disabled?: boolean;
  role?: "voter" | "org_admin";
}

export function GoogleAuthButton({
  text = "Continue with Google",
  redirectTo,
  onError,
  className = "",
  disabled = false,
  role = "voter",
}: GoogleAuthButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isGisReady, setIsGisReady] = useState(false);
  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  // Helper to determine target redirect path
  const getTargetPath = useCallback((): string => {
    let target = redirectTo;
    if (!target && typeof window !== "undefined") {
      try {
        const pending = localStorage.getItem("votely_pending_election");
        if (pending) target = `/vote/${pending}`;
      } catch {
        // ignore
      }
    }
    return target || "/vote";
  }, [redirectTo]);

  // Handle credential response directly on votelysystem.vercel.app domain
  const handleCredentialResponse = useCallback(
    async (response: { credential?: string }) => {
      if (!response?.credential) return;
      setIsLoading(true);

      try {
        if (!isSupabaseConfigured()) {
          throw new Error("Supabase is not configured.");
        }

        const client = supabaseClient();
        if (!client) throw new Error("Supabase client is unavailable.");

        // Authenticate directly with Google ID token on our domain
        const { data, error } = await client.auth.signInWithIdToken({
          provider: "google",
          token: response.credential,
        });

        if (error) throw new Error(error.message);
        if (!data?.user) throw new Error("No user returned from Google authentication.");

        const user = data.user;
        const authName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          (user.email ? user.email.split("@")[0] : "Voter");
        const authEmail = user.email || "";

        // Authoritatively sync user into profiles and enforce voter role
        await fetch("/api/auth/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            email: authEmail,
            fullName: authName,
            role: "voter",
          }),
        });

        store.registerAccount({
          email: authEmail,
          role: "voter",
          full_name: authName,
        });

        store.setCurrentUser({
          id: user.id,
          email: authEmail,
          full_name: authName,
          role: "voter",
        });

        store.setOrganization({
          id: "",
          name: "Organisation Workspace",
          type: "General",
          status: "active",
        });

        const target = getTargetPath();

        // Redirect to login page with oauth_success so user sees confirmation,
        // which then smoothly moves them to their dashboard
        router.push(
          `/login?role=voter&auth=oauth_success&redirect=${encodeURIComponent(target)}`
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to sign in with Google.";
        if (onError) onError(msg);
        setIsLoading(false);
      }
    },
    [getTargetPath, onError, router]
  );

  // Initialize Google Identity Services (GIS) on votelysystem.vercel.app domain
  useEffect(() => {
    const rawClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientId = rawClientId?.trim();
    if (!clientId || typeof window === "undefined") return;

    let isMounted = true;

    const setupGIS = () => {
      if (!window.google?.accounts?.id || !isMounted) return;

      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        if (googleBtnContainerRef.current) {
          googleBtnContainerRef.current.innerHTML = "";

          const containerWidth = googleBtnContainerRef.current.offsetWidth || 340;
          const buttonWidth = Math.min(Math.max(containerWidth, 240), 400);

          window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
            type: "standard",
            theme: "outline",
            size: "large",
            text: text.toLowerCase().includes("sign up") ? "signup_with" : "continue_with",
            shape: "rectangular",
            logo_alignment: "left",
            width: buttonWidth,
          });

          setIsGisReady(true);
        }

        // Optional One Tap prompt for desktop users
        window.google.accounts.id.prompt();
      } catch (err) {
        console.warn("Google Identity Services initialization warning:", err);
      }
    };

    if (window.google?.accounts?.id) {
      setupGIS();
    } else {
      const scriptId = "google-gsi-client";
      let script = document.getElementById(scriptId) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", () => {
        if (isMounted) setupGIS();
      });
    }

    return () => {
      isMounted = false;
    };
  }, [handleCredentialResponse, text]);

  // Fallback OAuth click handler: initiates standard redirect if GIS is blocked
  const handleGoogleAuth = async () => {
    setIsLoading(true);

    try {
      const targetPath = getTargetPath();

      if (isSupabaseConfigured()) {
        const client = supabaseClient();
        if (client) {
          const rawOrigin =
            typeof window !== "undefined" && window.location.origin
              ? window.location.origin
              : process.env.NEXT_PUBLIC_APP_URL || "https://votelysystem.vercel.app";
          const origin = rawOrigin.replace(/\/+$/, "");

          const callbackUrl = `${origin}/auth/callback?role=voter&next=${encodeURIComponent(
            targetPath
          )}`;

          const { error } = await client.auth.signInWithOAuth({
            provider: "google",
            options: {
              redirectTo: callbackUrl,
              queryParams: {
                access_type: "offline",
                prompt: "consent",
              },
            },
          });

          if (error) throw new Error(error.message);
          return;
        }
      }

      // Demo offline fallback when Supabase credentials are not active locally
      const demoEmail = "voter.google@example.edu";
      const demoName = "Google Verified Voter";
      store.registerAccount({ email: demoEmail, role: "voter", full_name: demoName });
      store.setCurrentUser({
        id: `voter-google-${Date.now()}`,
        email: demoEmail,
        full_name: demoName,
        role: "voter",
      });
      router.push(
        `/login?role=voter&auth=oauth_success&redirect=${encodeURIComponent(targetPath)}`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to authenticate with Google.";
      if (onError) onError(msg);
      setIsLoading(false);
    }
  };

  return (
    <div className={`w-full flex flex-col items-center justify-center min-h-[44px] ${className}`}>
      {/* Native Google Identity Services Button: Prompts on votelysystem.vercel.app */}
      <div
        ref={googleBtnContainerRef}
        className={`w-full flex justify-center items-center [&_iframe]:!mx-auto ${isGisReady ? "block" : "hidden"
          }`}
      />

      {/* Styled Fallback / Loading Button when GIS is initializing or offline */}
      {!isGisReady && (
        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={disabled || isLoading}
          className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-navy/15 bg-white text-navy font-semibold text-sm hover:bg-slate-50 active:bg-slate-100 transition-all shadow-2xs hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="h-4 w-4 rounded-full border-2 border-teal border-t-transparent animate-spin shrink-0" />
          ) : (
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span>{isLoading ? "Connecting to Google..." : text}</span>
        </button>
      )}
    </div>
  );
}
