"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/navigation/navbar";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ShieldCheck, PlusCircle, Users, ArrowRight } from "lucide-react";

function OnboardingContent() {
  const searchParams = useSearchParams();
  const orgName = searchParams.get("org") || "Your Organisation";

  const steps = [
    {
      title: "Organisation Workspace Created",
      desc: `${orgName} is registered and isolated with tenant row-level security.`,
      done: true,
      icon: CheckCircle2,
    },
    {
      title: "Define Your First Election",
      desc: "Specify election dates, add positions (e.g. President), and register candidate bios.",
      done: false,
      icon: PlusCircle,
    },
    {
      title: "Enroll Eligible Voters",
      desc: "Upload your voter roster manually or in bulk via CSV. Each voter gets one secret ballot.",
      done: false,
      icon: Users,
    },
  ];

  return (
    <div className="w-full max-w-2xl bg-white rounded-3xl p-7 sm:p-10 shadow-xl border border-navy/10">
      <div className="text-center mb-8">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-100 text-teal-600 mb-3">
          <ShieldCheck size={26} />
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-navy">
          Welcome to Votely
        </h1>
        <p className="mt-2 text-ink/75 max-w-md mx-auto">
          Your workspace for <strong>{orgName}</strong> is ready. Follow these steps to launch your first trusted election.
        </p>
      </div>

      <div className="space-y-4 mb-8">
        {steps.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div
              key={s.title}
              className={`flex items-start gap-4 p-4.5 rounded-2xl border transition-all ${
                s.done
                  ? "bg-teal-100/30 border-teal/30"
                  : "bg-ice border-navy/10 hover:border-navy/20"
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  s.done ? "bg-teal text-white" : "bg-white text-navy font-bold border border-navy/15"
                }`}
              >
                {s.done ? <CheckCircle2 size={18} /> : idx + 1}
              </span>
              <div className="flex-1">
                <h3 className="font-semibold text-navy text-base">{s.title}</h3>
                <p className="mt-1 text-sm text-ink/70 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-end">
        <Link href="/admin">
          <Button variant="outline" className="w-full sm:w-auto">
            View Dashboard
          </Button>
        </Link>
        <Link href="/admin/elections/new">
          <Button className="w-full sm:w-auto">
            Create First Election <ArrowRight size={16} />
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-ice flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <Suspense fallback={<div className="p-8 text-center text-navy">Loading workspace...</div>}>
          <OnboardingContent />
        </Suspense>
      </main>
    </div>
  );
}
