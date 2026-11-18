"use client";

import React, { useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/navigation/navbar";
import { Button } from "@/components/ui/button";
import { store } from "@/lib/store";
import { Vote, LogIn, UserPlus, ShieldCheck } from "lucide-react";

/**
 * /vote/join?election=<electionId>
 *
 * Invitation landing page. The admin shares this URL with voters.
 * - Saves the election ID to localStorage so it survives login/signup.
 * - If the visitor is already authenticated as a voter, redirects immediately
 *   to that election's ballot page.
 * - Otherwise shows two clear CTAs: Sign in / Register.
 */
function JoinContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const electionId = searchParams.get("election") ?? "";

  useEffect(() => {
    if (!electionId) return;

    // Persist the pending election so post-auth redirects work
    try {
      localStorage.setItem("votely_pending_election", electionId);
    } catch {
      // storage unavailable
    }

    // If the visitor is already signed in as a voter, go straight to ballot
    const user = store.getCurrentUser();
    if (user?.email && user?.role === "voter") {
      router.replace(`/vote/${electionId}`);
    }
  }, [electionId, router]);

  if (!electionId) {
    return (
      <div className="w-full max-w-md bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-navy/10 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
          <Vote size={28} />
        </div>
        <h1 className="font-display text-xl font-bold text-navy">Invalid Invitation Link</h1>
        <p className="text-sm text-ink/70 leading-relaxed">
          This invitation link is missing the election identifier. Please contact the election
          administrator for a valid link.
        </p>
        <Link href="/">
          <Button variant="outline" size="sm" className="mt-2">
            Go to Homepage
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-navy/10 text-center space-y-6">
      {/* Icon + Branding */}
      <div className="space-y-3">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-100 text-teal-600">
          <Vote size={32} />
        </div>
        <div>
          <span className="font-display text-2xl font-bold text-navy">
            Votely<span className="text-teal">.</span>
          </span>
          <h1 className="mt-2 text-xl font-bold text-navy">You&apos;ve Been Invited to Vote</h1>
          <p className="mt-2 text-sm text-ink/70 leading-relaxed">
            You have been granted access to participate in a secure election. Sign in with your
            voter account or register if this is your first time.
          </p>
        </div>
      </div>

      {/* Security note */}
      <div className="rounded-2xl bg-teal-100/40 border border-teal/20 p-3.5 flex items-start gap-2.5 text-xs text-navy text-left">
        <ShieldCheck size={18} className="text-teal-600 shrink-0 mt-0.5" />
        <span className="leading-relaxed">
          <span className="font-bold">Ballot Secrecy Guaranteed.</span> Your vote is cryptographically
          decoupled from your identity — no one can link your ballot to your name.
        </span>
      </div>

      {/* CTAs */}
      <div className="space-y-3">
        <Link
          href={`/login?role=voter&redirect=/vote/${electionId}`}
          className="block"
        >
          <Button size="lg" className="w-full">
            <LogIn size={18} />
            Sign In to Vote
          </Button>
        </Link>

        <Link
          href={`/register/voter?redirect=/vote/${electionId}`}
          className="block"
        >
          <Button size="lg" variant="secondary" className="w-full">
            <UserPlus size={18} />
            Create Voter Account
          </Button>
        </Link>
      </div>

      <p className="text-xs text-ink/50">
        Already have an account? Use &ldquo;Sign In to Vote&rdquo; above.
      </p>
    </div>
  );
}

export default function JoinPage() {
  return (
    <div className="min-h-screen bg-ice flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <Suspense
          fallback={
            <div className="text-center p-12 text-sm font-semibold text-navy">
              Loading invitation...
            </div>
          }
        >
          <JoinContent />
        </Suspense>
      </main>
    </div>
  );
}
