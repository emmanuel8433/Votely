"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navigation/navbar";
import {
  ShieldCheck,
  Users,
  BarChart3,
  Vote,
  ClipboardList,
  Eye,
  ArrowRight,
  CheckCircle2,
  Lock,
} from "lucide-react";

const features = [
  {
    i: ClipboardList,
    t: "Build elections in minutes",
    d: "Configure multiple positions, candidate manifestos, and voting windows with automatic open and close.",
  },
  {
    i: Users,
    t: "Enforce voter eligibility",
    d: "Enroll voters individually or import rosters via CSV. Each verified email is guaranteed one ballot.",
  },
  {
    i: Eye,
    t: "Guaranteed ballot secrecy",
    d: "Participation and ballot choices live in disconnected database tables. Admins see turnout, never voter choices.",
  },
  {
    i: Vote,
    t: "Duplicate ballot rejection",
    d: "Database-level constraints instantly reject multiple submissions and votes outside the election window.",
  },
  {
    i: BarChart3,
    t: "Certified, instant results",
    d: "Real-time turnout tracking, vote distributions, winner determination, and tie handling ready to publish.",
  },
  {
    i: ShieldCheck,
    t: "Strict tenant isolation",
    d: "Row-level security ensures each organisation's voters, candidates, and ballots remain strictly confidential.",
  },
];

export default function Home() {
  const [selectedCandidate, setSelectedCandidate] = useState<string>("Amara Okafor");

  const previewCandidates = [
    {
      name: "Amara Okafor",
      initial: "A",
      manifesto: "24/7 campus library access & student emergency welfare fund",
    },
    {
      name: "Tunde Bello",
      initial: "T",
      manifesto: "Subsidized transit passes & student sustainability grants",
    },
    {
      name: "Grace Eze",
      initial: "G",
      manifesto: "Affordable dining plans & STEM mentorship network",
    },
  ];

  return (
    <div className="min-h-screen bg-white text-ink flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-navy text-white overflow-hidden w-full">
          <div className="mx-auto grid max-w-7xl items-center gap-8 sm:gap-10 lg:gap-12 px-4 py-10 sm:px-6 sm:py-16 md:grid-cols-2 md:py-24">
            <div className="space-y-4 sm:space-y-6 w-full min-w-0">
              <span className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-navy-700 px-3 py-1 sm:px-3.5 text-xs font-semibold text-teal-100 border border-teal/20 max-w-full">
                <ShieldCheck size={14} className="text-teal shrink-0" />
                <span className="truncate">Next-Generation Voting Platform</span>
              </span>

              <h1 className="font-display text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.15] tracking-tight break-words">
                Modern elections. Trusted results.
              </h1>

              <p className="max-w-lg text-xs sm:text-base md:text-lg text-white/80 leading-relaxed break-words">
                Votely gives universities, associations, and organisations a secure, transparent, and
                verifiable way to run online elections and publish certified outcomes.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-2 w-full">
                <Link
                  href="/register"
                  className="rounded-xl bg-amber px-5 sm:px-6 py-3.5 font-bold text-navy hover:brightness-95 transition-all shadow-sm flex items-center justify-center gap-2 w-full sm:w-auto text-sm sm:text-base text-center"
                >
                  <span>Register organisation</span>
                  <ArrowRight size={16} className="shrink-0" />
                </Link>
                <Link
                  href="/vote"
                  className="rounded-xl border border-white/20 px-5 sm:px-6 py-3.5 font-semibold text-white hover:bg-white/10 transition-colors text-center w-full sm:w-auto text-sm sm:text-base"
                >
                  Explore Voter Experience
                </Link>
              </div>
            </div>

            {/* Interactive Ballot Card Preview */}
            <div className="rounded-3xl bg-white p-4 sm:p-7 text-ink shadow-xl sm:shadow-2xl border border-white/10 w-full min-w-0 max-w-full" aria-label="Sample ballot">
              <div className="flex items-center justify-between pb-3 border-b border-navy/10 gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base sm:text-xl font-bold text-navy truncate">
                    Student Union Election 2027
                  </p>
                  <p className="text-[11px] sm:text-xs text-ink/60 truncate">Position: President • Click to select</p>
                </div>
                <span className="shrink-0 rounded-full bg-teal-100 text-teal-600 px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-xs font-bold">
                  Active Demo
                </span>
              </div>

              <div className="mt-3.5 sm:mt-4 space-y-2.5">
                {previewCandidates.map((cand) => {
                  const isSelected = selectedCandidate === cand.name;
                  return (
                    <div
                      key={cand.name}
                      onClick={() => setSelectedCandidate(cand.name)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedCandidate(cand.name);
                        }
                      }}
                      className={`flex items-start gap-2.5 sm:gap-3 rounded-2xl border-2 p-2.5 sm:p-3.5 transition-all cursor-pointer ${
                        isSelected
                          ? "border-teal bg-teal-100/30 shadow-xs"
                          : "border-ice bg-white hover:bg-ice/50 hover:border-navy/15"
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl text-xs sm:text-sm font-bold transition-colors ${
                          isSelected ? "bg-teal text-white" : "bg-ice text-navy"
                        }`}
                      >
                        {cand.initial}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-navy text-xs sm:text-sm truncate">{cand.name}</span>
                          {isSelected && (
                            <span className="text-[10px] sm:text-[11px] font-bold text-teal-600 shrink-0">Selected</span>
                          )}
                        </div>
                        <p className="text-[11px] sm:text-xs text-ink/70 mt-0.5 leading-snug break-words">
                          {cand.manifesto}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3.5 sm:mt-4 pt-3.5 border-t border-navy/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
                <span className="text-[11px] sm:text-xs text-ink/60 flex items-center gap-1.5 justify-center sm:justify-start">
                  <Lock size={13} className="text-teal-600 shrink-0" />
                  <span>Choices are 100% private & sealed</span>
                </span>
                <Link
                  href="/vote"
                  className="rounded-xl bg-navy px-4 py-2 text-xs font-bold text-white hover:bg-navy-800 transition-colors w-full sm:w-auto text-center"
                >
                  Cast Real Ballot <ArrowRight size={13} className="inline ml-1" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="bg-ice py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-navy">
                Designed for ballot integrity
              </h2>
              <p className="mt-2 text-ink/70 text-sm sm:text-base">
                Everything required to run trustworthy elections without operational complexity.
              </p>
            </div>

            <div className="mt-10 sm:mt-12 grid gap-5 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ i: Icon, t, d }) => (
                <div
                  key={t}
                  className="rounded-3xl bg-white p-6 sm:p-7 shadow-2xs border border-navy/10 hover:border-navy/20 transition-all space-y-3"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-100 text-teal-600">
                    <Icon size={22} />
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-navy">{t}</h3>
                  <p className="text-xs sm:text-sm leading-relaxed text-ink/75">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how" className="py-16 sm:py-20 bg-white">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-navy text-center">
              How Votely works
            </h2>
            <p className="mt-2 text-ink/70 text-center text-xs sm:text-sm max-w-lg mx-auto">
              Four deliberate steps from registration to certified outcome.
            </p>

            <div className="mt-10 sm:mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {[
                {
                  step: "01",
                  title: "Register and set up your organisation",
                  desc: "Create an isolated tenant workspace. Configure administrators and governance defaults.",
                },
                {
                  step: "02",
                  title: "Build the election and add candidates",
                  desc: "Specify offices, register candidates with photos and manifestos, and define voting dates.",
                },
                {
                  step: "03",
                  title: "Enroll voters and open the ballot",
                  desc: "Import your eligible voter roster via CSV. Voters authenticate and cast confidential votes.",
                },
                {
                  step: "04",
                  title: "Audit turnout and publish results",
                  desc: "Review participation metrics, verify zero duplicate ballots, and publish certified tallies.",
                },
              ].map((s) => (
                <div
                  key={s.step}
                  className="flex gap-4 p-5 sm:p-6 rounded-3xl border border-navy/10 bg-ice/40"
                >
                  <span className="font-display text-2xl font-bold text-teal-600 shrink-0">
                    {s.step}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-bold text-navy text-sm sm:text-base">{s.title}</h3>
                    <p className="mt-1.5 text-xs text-ink/70 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Ready to start CTA */}
        <section className="bg-navy py-12 sm:py-20 text-white overflow-hidden w-full">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center space-y-5 sm:space-y-6">
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold break-words">
              Ready to modernize your elections?
            </h2>
            <p className="max-w-xl mx-auto text-xs sm:text-base text-white/80 leading-relaxed break-words">
              Start building your first election now. Free setup, no credit card required.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2 w-full">
              <Link
                href="/register"
                className="rounded-xl bg-amber px-6 py-3.5 font-bold text-navy hover:brightness-95 transition-all shadow-sm text-center w-full sm:w-auto text-sm sm:text-base"
              >
                Get Started with Votely
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-white/20 px-6 py-3.5 font-semibold text-white hover:bg-white/10 transition-colors text-center w-full sm:w-auto text-sm sm:text-base"
              >
                Sign In
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-navy/10 bg-white py-8 text-center text-xs text-ink/60">
        Votely Secure Voting System • Built with Next.js, Tailwind & Supabase
      </footer>
    </div>
  );
}
