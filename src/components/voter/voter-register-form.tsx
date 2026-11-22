"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/notification";
import { store } from "@/lib/store";
import { isSupabaseConfigured, supabaseClient } from "@/lib/supabase/client";
import { GoogleAuthButton } from "@/components/ui/google-auth-button";
import { ShieldCheck, ArrowRight, CheckCircle2 } from "lucide-react";

interface VoterRegisterFormProps {
  onSuccess?: () => void;
  redirectTo?: string;
}

export function VoterRegisterForm({ onSuccess, redirectTo }: VoterRegisterFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [voterId, setVoterId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** After registration, go to the invited election or fallback to dashboard */
  const resolveRedirect = (): string => {
    if (redirectTo) return redirectTo;
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      setError("Please enter your full name.");
      return;
    }

    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError("Please provide a valid email address.");
      return;
    }

    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify.");
      return;
    }

    setIsLoading(true);

    try {
      if (isSupabaseConfigured()) {
        const client = supabaseClient();
        if (client) {
          // 1. Create auth user in Supabase
          const { data, error: signUpError } = await client.auth.signUp({
            email: trimmedEmail,
            password,
            options: {
              data: {
                full_name: trimmedName,
                role: "voter",
                voter_id: voterId.trim() || undefined,
              },
            },
          });

          if (signUpError) {
            throw new Error(signUpError.message);
          }

          if (!data.user) {
            throw new Error("Sign up failed — no user returned.");
          }

          // 2. Sync profile into store
          store.registerAccount({ email: trimmedEmail, role: "voter", full_name: trimmedName });
          store.setCurrentUser({
            id: data.user.id,
            email: data.user.email ?? trimmedEmail,
            full_name: trimmedName,
            role: "voter",
          });
          await store.syncUserSession({
            userId: data.user.id,
            email: data.user.email ?? trimmedEmail,
            fullName: trimmedName,
            role: "voter",
          });

          if (onSuccess) {
            onSuccess();
          } else {
            router.push(resolveRedirect());
          }
          return;
        }
      }

      // Local state fallback when running without live Supabase
      store.registerAccount({ email: trimmedEmail, role: "voter", full_name: trimmedName });
      store.setCurrentUser({
        id: `voter-${Date.now()}`,
        email: trimmedEmail,
        full_name: trimmedName,
        role: "voter",
      });

      if (onSuccess) {
        onSuccess();
      } else {
        router.push(resolveRedirect());
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to register voter account.");
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && <Alert type="error" message={error} className="mb-2" />}

      {/* Google Sign-up: available ONLY for voters */}
      <GoogleAuthButton
        text="Sign up with Google"
        redirectTo={resolveRedirect()}
        onError={(msg) => setError(msg)}
      />

      <div className="relative flex items-center justify-center my-2">
        <div className="border-t border-navy/10 w-full" />
        <span className="bg-white px-3 text-[11px] font-semibold uppercase tracking-wider text-ink/45 shrink-0">
          or register with email
        </span>
        <div className="border-t border-navy/10 w-full" />
      </div>

      <form onSubmit={handleRegister} className="space-y-4">
        <Input
          label="Full Name"
          placeholder="e.g. Maya Lin"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />

        <Input
          label="Institutional or Voter Email"
          type="email"
          placeholder="voter@university.edu"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          hint="Use the email address registered on your organisation's voter eligibility roster."
          required
        />

        <Input
          label="Student or Member ID (Optional)"
          placeholder="e.g. STU-84920"
          value={voterId}
          onChange={(e) => setVoterId(e.target.value)}
          hint="Used by election officials to verify roster eligibility."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Password"
            type="password"
            placeholder="Min 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Input
            label="Confirm Password"
            type="password"
            placeholder="Re-enter password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        {/* Ballot Secrecy Assurance */}
        <div className="rounded-2xl bg-teal-100/40 border border-teal/20 p-3 sm:p-3.5 flex items-start gap-2.5 text-xs text-navy">
          <ShieldCheck size={18} className="text-teal-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold">Ballot Secrecy Protocol:</span> Your voter profile is used exclusively to authenticate eligibility. When voting, your ballot choices are cryptographically decoupled from your personal identity.
          </div>
        </div>

        <div className="pt-2">
          <Button type="submit" isLoading={isLoading} className="w-full">
            Create Voter Account <ArrowRight size={16} />
          </Button>
        </div>
      </form>
    </div>
  );
}
