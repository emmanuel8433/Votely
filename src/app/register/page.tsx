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
import { VoterRegisterForm } from "@/components/voter/voter-register-form";
import { Building2, Vote, ArrowRight } from "lucide-react";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get("role") === "voter" ? "voter" : "org_admin";

  const [role, setRole] = useState<"org_admin" | "voter">(initialRole);

  // Admin registration form state
  const [orgName, setOrgName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgType, setOrgType] = useState("University / Student Union");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdminRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim() || !adminName.trim() || !email.trim()) {
      setError("Please fill out all required fields.");
      return;
    }
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (isSupabaseConfigured()) {
        const client = supabaseClient();
        if (client) {
          // 1. Create the auth user in Supabase
          const { data, error: signUpError } = await client.auth.signUp({
            email,
            password,
            options: { data: { full_name: adminName, role: "org_admin" } },
          });
          if (signUpError) throw new Error(signUpError.message);
          if (!data.user) throw new Error("Sign up failed — no user returned.");

          // 2. Create organization and membership via server route (uses service role)
          let orgId = "";
          try {
            const res = await fetch("/api/organizations", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orgName, orgType, userId: data.user.id }),
            });
            if (res.ok) {
              const body = await res.json();
              if (body?.org?.id) orgId = body.org.id;
            }
          } catch {
            // non-blocking
          }

          // 3. Update store
          store.setCurrentUser({ id: data.user.id, full_name: adminName, email, role: "org_admin" });
          store.setOrganization({ id: orgId, name: orgName, type: orgType, status: "active" });
          router.push("/onboarding?org=" + encodeURIComponent(orgName));
          return;
        }
      }

      // Local session if no Supabase configured
      store.setCurrentUser({ full_name: adminName, email, role: "org_admin" });
      store.setOrganization({ name: orgName, type: orgType, status: "active" });
      router.push("/onboarding?org=" + encodeURIComponent(orgName));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to register organisation");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-navy/10">
      <div className="mb-6">
        <span className="font-display text-2xl font-bold text-navy">
          Votely<span className="text-teal">.</span>
        </span>
        <h1 className="mt-2 text-2xl font-bold text-navy">
          {role === "org_admin" ? "Register your organisation" : "Register as an eligible voter"}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-ink/70">
          {role === "org_admin"
            ? "Set up your secure voting platform in less than two minutes."
            : "Create your voting credentials to participate in accredited elections."}
        </p>
      </div>

      {/* Role Selection Toggle */}
      <div className="flex rounded-xl bg-ice p-1 border border-navy/10 mb-6">
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
          <Building2 size={14} />
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
          <Vote size={14} />
          Eligible Voter
        </button>
      </div>

      {role === "voter" ? (
        <VoterRegisterForm />
      ) : (
        <>
          {error && <Alert type="error" message={error} className="mb-5" />}

          <form onSubmit={handleAdminRegister} className="space-y-4">
            <Input
              label="Organisation Name"
              placeholder="e.g. National Bar Association"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              required
            />

            <div>
              <label className="block text-sm font-semibold text-navy mb-1.5">
                Organisation Type
              </label>
              <select
                value={orgType}
                onChange={(e) => setOrgType(e.target.value)}
                className="w-full rounded-xl border border-navy/15 bg-white px-3.5 py-2.5 text-sm text-ink focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
              >
                <option>University / Student Union</option>
                <option>Professional Association</option>
                <option>Non-Profit / NGO</option>
                <option>Corporate Board / Shareholders</option>
                <option>Housing Co-op / HOA</option>
                <option>Other Community</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Admin Full Name"
                placeholder="e.g. Jane Doe"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                required
              />
              <Input
                label="Work Email"
                type="email"
                placeholder="admin@yourorg.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <Input
              label="Set Master Password"
              type="password"
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="pt-2">
              <Button type="submit" isLoading={isLoading} className="w-full">
                Create Organisation Account <ArrowRight size={16} />
              </Button>
            </div>
          </form>
        </>
      )}

      <div className="mt-6 pt-5 border-t border-navy/10 text-center text-xs text-ink/70">
        Already have an account?{" "}
        <Link
          href={role === "voter" ? "/login?role=voter" : "/login"}
          className="font-semibold text-teal-600 hover:text-teal"
        >
          {role === "voter" ? "Sign in to vote" : "Sign in here"}
        </Link>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-ice flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <Suspense fallback={<div className="text-center p-12 text-sm font-semibold text-navy">Loading...</div>}>
          <RegisterContent />
        </Suspense>
      </main>
    </div>
  );
}
