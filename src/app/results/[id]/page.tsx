"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/navigation/navbar";
import { store } from "@/lib/store";
import { ElectionResultsData, Election } from "@/lib/types";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  CheckCircle2,
  Trophy,
  BarChart3,
  Calendar,
  Lock,
  ArrowLeft,
  Users,
  Vote,
} from "lucide-react";

export default function PublicElectionResultsPage() {
  const params = useParams();
  const electionId = params.id as string;

  const [results, setResults] = useState<ElectionResultsData | null>(null);
  const [election, setElection] = useState<Election | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const el = await store.getElectionById(electionId);
        setElection(el);
        if (el) {
          const res = await store.getElectionResults(electionId);
          setResults(res);
        }
      } catch {
        // Not found or error
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [electionId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-ice flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-sm font-semibold text-navy">Loading certified election results...</p>
        </div>
      </div>
    );
  }

  if (!election || !results) {
    return (
      <div className="min-h-screen bg-ice flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md bg-white rounded-3xl p-8 text-center border border-navy/10 shadow-lg space-y-4">
            <h2 className="text-xl font-bold text-navy">Election Not Found</h2>
            <p className="text-sm text-ink/70">
              The requested election results could not be located.
            </p>
            <Link href="/">
              <Button size="sm">Go to Homepage</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!election.results_published) {
    return (
      <div className="min-h-screen bg-ice flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md bg-white rounded-3xl p-6 sm:p-8 text-center border border-navy/10 shadow-lg space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-ice text-navy">
              <Lock size={28} />
            </div>
            <h2 className="font-display text-2xl font-bold text-navy">Results Not Yet Published</h2>
            <p className="text-sm text-ink/70 leading-relaxed break-words">
              Official results for <strong>{election.title}</strong> have not yet been released by the
              election administrators. Please check back after voting certification.
            </p>
            <div className="pt-2">
              <Link href="/vote">
                <Button size="sm">Return to Voter Portal</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ice flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 sm:py-8 sm:px-6 space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="space-y-3 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-3 py-1 text-xs font-bold text-teal-600">
              <CheckCircle2 size={13} /> Official Certified Results
            </span>
            <StatusBadge status={election.status} />
          </div>

          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-navy break-words">
            {election.title}
          </h1>

          {election.description && (
            <p className="text-xs sm:text-sm text-ink/75 max-w-2xl break-words">{election.description}</p>
          )}
        </div>

        {/* Turnout Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white rounded-2xl p-5 border border-navy/10 shadow-2xs">
            <p className="text-xs font-bold text-ink/60 uppercase tracking-wider">Voter Turnout</p>
            <p className="mt-1 font-display text-2xl sm:text-3xl font-bold text-teal-600">
              {results.turnout_percentage}%
            </p>
            <div className="mt-3 h-2 w-full rounded-full bg-ice overflow-hidden">
              <div
                className="h-full bg-teal rounded-full"
                style={{ width: `${Math.min(results.turnout_percentage, 100)}%` }}
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-navy/10 shadow-2xs">
            <p className="text-xs font-bold text-ink/60 uppercase tracking-wider">Ballots Cast</p>
            <p className="mt-1 font-display text-2xl sm:text-3xl font-bold text-navy">
              {results.total_ballots_cast}
            </p>
            <p className="mt-2 text-xs text-ink/50">Verified secret ballots</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-navy/10 shadow-2xs">
            <p className="text-xs font-bold text-ink/60 uppercase tracking-wider">Eligible Voters</p>
            <p className="mt-1 font-display text-2xl sm:text-3xl font-bold text-navy">
              {results.total_eligible_voters}
            </p>
            <p className="mt-2 text-xs text-ink/50">Registered on official roster</p>
          </div>
        </div>

        {/* Position Tallies */}
        <div className="space-y-6">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-navy">Certified Results by Office</h2>

          {results.positions.map((pos) => (
            <div
              key={pos.position_id}
              className="bg-white rounded-3xl p-5 sm:p-8 border border-navy/10 shadow-2xs space-y-5"
            >
              <div className="flex items-center justify-between border-b border-navy/10 pb-4">
                <div className="min-w-0">
                  <h3 className="font-display text-lg sm:text-xl font-bold text-navy break-words">{pos.position_title}</h3>
                  <p className="text-xs text-ink/60">
                    {pos.total_votes} total votes cast for this position
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {pos.candidates.map((cand) => (
                  <div
                    key={cand.candidate_id}
                    className={`rounded-2xl p-4 sm:p-5 border transition-all ${
                      cand.is_winner
                        ? "border-teal bg-teal-100/30"
                        : cand.is_tie
                        ? "border-amber bg-amber/10"
                        : "border-navy/10 bg-ice/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 sm:gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-sm ${
                            cand.is_winner ? "bg-teal text-white" : "bg-white text-navy border border-navy/15"
                          }`}
                        >
                          {cand.full_name.charAt(0)}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-navy text-sm sm:text-base break-words">{cand.full_name}</span>
                            {cand.is_winner && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-teal text-white px-2 py-0.5 text-[10px] sm:text-[11px] font-bold shrink-0">
                                <Trophy size={11} /> Winner
                              </span>
                            )}
                            {cand.is_tie && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber text-navy px-2 py-0.5 text-[10px] sm:text-[11px] font-bold shrink-0">
                                Tie
                              </span>
                            )}
                          </div>
                          {cand.bio && (
                            <p className="text-xs text-ink/70 mt-1 line-clamp-1 break-words">{cand.bio}</p>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-display text-lg sm:text-xl font-bold text-navy">
                          {cand.percentage}%
                        </span>
                        <p className="text-[11px] sm:text-xs text-ink/60">
                          {cand.votes} {cand.votes === 1 ? "vote" : "votes"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 h-2 w-full rounded-full bg-white overflow-hidden border border-navy/5">
                      <div
                        className={`h-full rounded-full ${
                          cand.is_winner ? "bg-teal" : cand.is_tie ? "bg-amber" : "bg-navy/40"
                        }`}
                        style={{ width: `${Math.min(cand.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Audit footer */}
        <div className="rounded-2xl border border-navy/10 bg-white p-4 sm:p-5 flex items-start gap-3">
          <ShieldCheck size={20} className="text-teal-600 shrink-0 mt-0.5" />
          <div className="text-xs text-ink/75 leading-relaxed break-words">
            <strong>Certified Secret Ballot Record:</strong> All votes displayed represent finalized
            ballots cast inside the official voting window. Ballot choices remain untraceable to individual
            voters.
          </div>
        </div>
      </main>

      <footer className="border-t border-navy/10 bg-white py-6 text-center text-xs text-ink/60">
        Votely Certified Election Results
      </footer>
    </div>
  );
}
