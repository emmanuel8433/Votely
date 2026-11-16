import React from "react";
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
  return (
    <div className="min-h-screen bg-white text-ink flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-navy text-white">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 md:grid-cols-2 md:py-28">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-navy-700 px-3.5 py-1 text-xs font-semibold text-teal-100 border border-teal/20">
                <ShieldCheck size={14} className="text-teal" />
                Next-Generation Voting Platform
              </span>

              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold leading-tight">
                Modern elections. Trusted results.
              </h1>

              <p className="max-w-lg text-base sm:text-lg text-white/80 leading-relaxed">
                Votely gives universities, associations, and organisations a secure, transparent, and
                verifiable way to run online elections and publish certified outcomes.
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href="/register"
                  className="rounded-xl bg-amber px-6 py-3.5 font-bold text-navy hover:brightness-95 transition-all shadow-sm flex items-center gap-2"
                >
                  <span>Register organisation</span>
                  <ArrowRight size={16} />
                </Link>
                <Link
                  href="/vote"
                  className="rounded-xl border border-white/20 px-6 py-3.5 font-semibold text-white hover:bg-white/10 transition-colors"
                >
                  Explore Voter Experience
                </Link>
              </div>
            </div>

            {/* Interactive Ballot Card Preview */}
            <div className="rounded-3xl bg-white p-6 sm:p-8 text-ink shadow-2xl border border-white/10" aria-label="Sample ballot">
              <div className="flex items-center justify-between pb-3 border-b border-navy/10">
                <div>
                  <p className="font-display text-xl font-bold text-navy">
                    Student Union Election 2027
                  </p>
                  <p className="text-xs text-ink/60">Position: President • Select one candidate</p>
                </div>
                <span className="rounded-full bg-teal-100 text-teal-600 px-2.5 py-0.5 text-xs font-bold">
                  Active
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {[
                  { name: "Amara Okafor", initial: "A", selected: true, manifesto: "24/7 campus library access & student emergency fund" },
                  { name: "Tunde Bello", initial: "T", selected: false, manifesto: "Subsidized transit passes & student sustainability grants" },
                  { name: "Grace Eze", initial: "G", selected: false, manifesto: "Affordable dining plans & STEM mentorship program" },
                ].map((cand) => (
                  <div
                    key={cand.name}
                    className={`flex items-start gap-3 rounded-2xl border-2 p-3.5 transition-all ${
                      cand.selected ? "border-teal bg-teal-100/30" : "border-ice bg-white hover:bg-ice/50"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                        cand.selected ? "bg-teal text-white" : "bg-ice text-navy"
                      }`}
                    >
                      {cand.initial}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-navy text-sm">{cand.name}</span>
                        {cand.selected && (
                          <span className="text-xs font-bold text-teal-600">Selected Choice</span>
                        )}
                      </div>
                      <p className="text-xs text-ink/70 mt-0.5">{cand.manifesto}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 pt-4 border-t border-navy/10 flex items-center justify-between">
                <span className="text-xs text-ink/60 flex items-center gap-1.5">
                  <Lock size={13} className="text-teal-600" />
                  <span>Choices are 100% private</span>
                </span>
                <Link
                  href="/vote"
                  className="rounded-xl bg-navy px-4 py-2.5 text-xs font-bold text-white hover:bg-navy-800 transition-colors"
                >
                  Try Live Ballot
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="bg-ice py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-navy">
                Designed for ballot integrity
              </h2>
              <p className="mt-2 text-ink/70 text-base">
                Everything required to run trustworthy elections without operational complexity.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ i: Icon, t, d }) => (
                <div
                  key={t}
                  className="rounded-3xl bg-white p-7 shadow-2xs border border-navy/10 hover:border-navy/20 transition-all space-y-3"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-100 text-teal-600">
                    <Icon size={22} />
                  </span>
                  <h3 className="text-lg font-bold text-navy">{t}</h3>
                  <p className="text-sm leading-relaxed text-ink/75">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how" className="py-20 bg-white">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-navy text-center">
              How Votely works
            </h2>
            <p className="mt-2 text-ink/70 text-center text-sm max-w-lg mx-auto">
              Four deliberate steps from registration to certified outcome.
            </p>

            <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                  className="flex gap-4 p-6 rounded-3xl border border-navy/10 bg-ice/40"
                >
                  <span className="font-display text-2xl font-bold text-teal-600 shrink-0">
                    {s.step}
                  </span>
                  <div>
                    <h3 className="font-bold text-navy text-base">{s.title}</h3>
                    <p className="mt-1.5 text-xs text-ink/70 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Ready to start CTA */}
        <section className="bg-navy py-20 text-white">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center space-y-6">
            <h2 className="font-display text-3xl sm:text-4xl font-bold">
              Ready to modernize your elections?
            </h2>
            <p className="max-w-xl mx-auto text-base text-white/80">
              Start building your first election now. Free setup, no credit card required.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Link
                href="/register"
                className="rounded-xl bg-amber px-7 py-3.5 font-bold text-navy hover:brightness-95 transition-all shadow-sm"
              >
                Get Started with Votely
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-white/20 px-7 py-3.5 font-semibold text-white hover:bg-white/10 transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-navy/10 bg-white py-8 text-center text-xs text-ink/60">
        Votely Voting System • Built with Next.js, Tailwind & Supabase
      </footer>
    </div>
  );
}
