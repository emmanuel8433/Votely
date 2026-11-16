"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navigation/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/notification";
import { store } from "@/lib/store";
import { Building2, ArrowRight, CheckCircle2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [orgName, setOrgName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgType, setOrgType] = useState("University / Student Union");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim() || !adminName.trim() || !email.trim()) {
      setError("Please fill out all required fields.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // In a live Supabase environment, create auth user and organization membership
      store.setCurrentUser({
        full_name: adminName,
        email,
        role: "org_admin",
      });

      router.push("/onboarding?org=" + encodeURIComponent(orgName));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to register organization");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ice flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-lg bg-white rounded-3xl p-7 sm:p-10 shadow-xl border border-navy/10">
          <div className="mb-6">
            <span className="font-display text-2xl font-semibold text-navy">
              Votely<span className="text-teal">.</span>
            </span>
            <h1 className="mt-2 text-2xl font-bold text-navy">Register your organisation</h1>
            <p className="mt-1 text-sm text-ink/70">
              Set up your secure voting platform in less than two minutes.
            </p>
          </div>

          {error && <Alert type="error" message={error} className="mb-5" />}

          <form onSubmit={handleRegister} className="space-y-4">
            <Input
              label="Organisation Name"
              placeholder="e.g. Apex University Student Union"
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
                placeholder="e.g. Alex Vance"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                required
              />
              <Input
                label="Work Email"
                type="email"
                placeholder="admin@organisation.org"
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

          <div className="mt-6 pt-5 border-t border-navy/10 text-center text-xs text-ink/70">
            Already registered?{" "}
            <Link href="/login" className="font-semibold text-teal-600 hover:text-teal">
              Sign in here
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
