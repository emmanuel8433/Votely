"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/navigation/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/notification";
import { store } from "@/lib/store";
import { isSupabaseConfigured, supabaseClient } from "@/lib/supabase/client";
import { GoogleAuthButton } from "@/components/ui/google-auth-button";
import { ShieldCheck, ArrowRight, Vote, Building2 } from "lucide-react";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get("role") === "voter" ? "voter" : "org_admin";
  // Explicit redirect param takes priority; fallback: check pending election in localStorage
  const explicitRedirect = searchParams.get("redirect");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"org_admin" | "voter">(initialRole);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Determine where to send the user after a successful voter login */
  const resolveVoterRedirect = (): string => {
    if (explicitRedirect) return explicitRedirect;
    try {
      const pending = localStorage.getItem("votely_pending_election");
      if (pending) {
        localStorage.removeItem("votely_pending_election");
        return `/vote/${pending}`;
      }
    } catch {
      // storage unavailable
    }
    return "/vote";
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setError("Please provide a valid email address.");
      return;
    }
    if (!password || password.length < 6) {
      setError("Please enter your password (minimum 6 characters).");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (isSupabaseConfigured()) {
        const client = supabaseClient();
        if (client) {
          const { data, error: authError } = await client.auth.signInWithPassword({
            email,
            password,
          });
          if (authError) throw new Error(authError.message);

          if (!data.user) {
            throw new Error("Authentication failed: No user returned.");
          }

          const registeredRole = data.user.user_metadata?.role as "org_admin" | "voter" | undefined;
          const resolvedName = data.user.user_metadata?.full_name ?? email.split("@")[0];

          // Determine authoritative role and organization from backend
          const syncRes = await fetch("/api/auth/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: data.user.id,
              email: data.user.email ?? email,
              fullName: resolvedName,
              role: registeredRole,
            }),
          });

          let syncedRole: "org_admin" | "voter" = registeredRole === "org_admin" ? "org_admin" : "voter";
          let syncedOrg = null;

          if (syncRes.ok) {
            const syncData = await syncRes.json();
            if (syncData.profile?.role) {
              syncedRole = syncData.profile.role;
            }
            if (syncData.organization) {
              syncedOrg = syncData.organization;
            }
          }

          // SECURITY CHECK: If attempting to sign in as Organisation Admin
          if (role === "org_admin") {
            if (registeredRole === "voter" || syncedRole !== "org_admin" || !syncedOrg) {
              // Deny admin access: immediately terminate Supabase session and clean store
              await client.auth.signOut().catch(() => {});
              store.signOut();
              setError("Access denied: This account is registered as an eligible voter and does not have administrator privileges. Please switch to the Eligible Voter tab to log in.");
              setIsLoading(false);
              return;
            }

            store.setCurrentUser({
              id: data.user.id,
              email: data.user.email ?? email,
              full_name: resolvedName,
              role: "org_admin",
            });
            store.setOrganization(syncedOrg);
            router.push("/admin");
            return;
          }

          // If signing in as Eligible Voter
          store.setCurrentUser({
            id: data.user.id,
            email: data.user.email ?? email,
            full_name: resolvedName,
            role: "voter",
          });
          store.setOrganization({ id: "", name: "Organisation Workspace", type: "General", status: "active" });

          router.push(resolveVoterRedirect());
          return;
        }
      }

      // Local session if operating without live Supabase
      const isVoter = store.isVoterEmail(email);
      const isRegisteredAdmin = store.isAdminEmail(email);

      if (role === "org_admin" && isVoter && !isRegisteredAdmin) {
        setError("Access denied: This account is registered as an eligible voter and does not have administrator privileges. Please switch to the Eligible Voter tab to log in.");
        setIsLoading(false);
        return;
      }

      store.setCurrentUser({
        email,
        full_name: email.split("@")[0].replace(".", " "),
        role,
      });
      router.push(role === "org_admin" ? "/admin" : resolveVoterRedirect());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-9 shadow-xl border border-navy/10">
      <div className="text-center mb-6">
        <span className="font-display text-3xl font-bold text-navy">
          Votely<span className="text-teal">.</span>
        </span>
        <h1 className="mt-3 text-xl font-bold text-navy">
          {role === "org_admin" ? "Sign in to your organisation" : "Sign in to cast your ballot"}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-ink/70">
          {role === "org_admin"
            ? "Access your elections dashboard and oversee results"
            : "Authenticate your voter credentials to access your ballots"}
        </p>
      </div>

      {error && <Alert type="error" message={error} className="mb-5" />}

      {/* Role Selection Tabs */}
      <div className="flex rounded-xl bg-ice p-1 border border-navy/10 mb-5">
        <button
          type="button"
          onClick={() => {
            setRole("org_admin");
            setError(null);
          }}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            role === "org_admin" ? "bg-white text-navy shadow-xs" : "text-ink/60 hover:text-navy"
          }`}
        >
          <Building2 size={13} />
          Organisation Admin
        </button>
        <button
          type="button"
          onClick={() => {
            setRole("voter");
            setError(null);
          }}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            role === "voter" ? "bg-white text-navy shadow-xs" : "text-ink/60 hover:text-navy"
          }`}
        >
          <Vote size={13} />
          Eligible Voter
        </button>
      </div>

      {/* Google Authentication: ONLY for voters */}
      {role === "voter" && (
        <div className="mb-4">
          <GoogleAuthButton
            text="Sign in with Google"
            redirectTo={resolveVoterRedirect()}
            onError={(msg) => setError(msg)}
          />

          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-navy/10 w-full" />
            <span className="bg-white px-3 text-[11px] font-semibold uppercase tracking-wider text-ink/45 shrink-0">
              or continue with email
            </span>
            <div className="border-t border-navy/10 w-full" />
          </div>
        </div>
      )}

      {/* Manual Email Login Form (Available for both voters and admins) */}
      <form onSubmit={handleLogin} className="space-y-4">
        <Input
          label="Email address"
          type="email"
          placeholder={role === "org_admin" ? "admin@yourorg.com" : "voter@yourorg.com"}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          label="Password"
          type="password"
          placeholder="••••••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <Button type="submit" isLoading={isLoading} className="w-full mt-2">
          Sign In <ArrowRight size={16} />
        </Button>
      </form>

      <div className="mt-6 pt-5 border-t border-navy/10 text-center text-xs text-ink/70">
        {role === "voter" ? (
          <>
            Don&apos;t have a voter account yet?{" "}
            <Link href="/register/voter" className="font-semibold text-teal-600 hover:text-teal">
              Sign up as a voter
            </Link>
          </>
        ) : (
          <>
            Don&apos;t have an organisation registered yet?{" "}
            <Link href="/register" className="font-semibold text-teal-600 hover:text-teal">
              Register now
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-ice flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <Suspense fallback={<div className="text-center p-12 text-sm font-semibold text-navy">Loading...</div>}>
          <LoginContent />
        </Suspense>
      </main>
    </div>
  );
}
