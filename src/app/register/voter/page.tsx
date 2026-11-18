"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/navigation/navbar";
import { VoterRegisterForm } from "@/components/voter/voter-register-form";
import { Vote } from "lucide-react";

function VoterRegisterContent() {
  const searchParams = useSearchParams();
  // Preserve any ?redirect= param so the form redirects to the correct election
  const redirect = searchParams.get("redirect") ?? undefined;

  return (
    <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-navy/10">
      <div className="mb-6">
        <span className="font-display text-2xl font-bold text-navy">
          Votely<span className="text-teal">.</span>
        </span>
        <div className="flex items-center gap-2 mt-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-teal-100 text-teal-600">
            <Vote size={18} />
          </span>
          <h1 className="text-2xl font-bold text-navy">Voter Registration</h1>
        </div>
        <p className="mt-1 text-xs sm:text-sm text-ink/70">
          Create your secure voter credential to access ballots and cast your confidential vote.
        </p>
      </div>

      {/* Role Navigation Toggle */}
      <div className="flex rounded-xl bg-ice p-1 border border-navy/10 mb-6">
        <Link
          href="/register"
          className="flex-1 py-1.5 text-xs font-bold rounded-lg text-center transition-all text-ink/60 hover:text-navy"
        >
          Organisation Admin
        </Link>
        <div className="flex-1 py-1.5 text-xs font-bold rounded-lg text-center bg-white text-navy shadow-xs">
          Eligible Voter
        </div>
      </div>

      <VoterRegisterForm redirectTo={redirect} />

      <div className="mt-6 pt-5 border-t border-navy/10 text-center text-xs text-ink/70 space-y-1.5">
        <div>
          Already have a voter account?{" "}
          <Link
            href={redirect ? `/login?role=voter&redirect=${encodeURIComponent(redirect)}` : "/login?role=voter"}
            className="font-semibold text-teal-600 hover:text-teal"
          >
            Sign in to vote
          </Link>
        </div>
        <div>
          Looking to administer an election?{" "}
          <Link href="/register" className="font-semibold text-navy hover:text-teal">
            Register your organisation
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VoterRegisterPage() {
  return (
    <div className="min-h-screen bg-ice flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <Suspense
          fallback={
            <div className="text-center p-12 text-sm font-semibold text-navy">Loading...</div>
          }
        >
          <VoterRegisterContent />
        </Suspense>
      </main>
    </div>
  );
}
