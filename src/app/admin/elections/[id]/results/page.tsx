"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { store } from "@/lib/store";
import { ElectionResultsData, Election } from "@/lib/types";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/notification";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Trophy,
  ExternalLink,
  Printer,
  ShieldCheck,
  AlertCircle,
  Share2,
} from "lucide-react";

export default function AdminElectionResultsPage() {
  const params = useParams();
  const electionId = params.id as string;

  const [results, setResults] = useState<ElectionResultsData | null>(null);
  const [election, setElection] = useState<Election | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadResults = useCallback(async () => {
    try {
      const el = await store.getElectionById(electionId);
      if (!el) {
        setError("Election not found");
        return;
      }
      setElection(el);
      const res = await store.getElectionResults(electionId);
      setResults(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to compute results");
    } finally {
      setIsLoading(false);
    }
  }, [electionId]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  const handleTogglePublish = async () => {
    if (!election) return;
    try {
      const next = !election.results_published;
      await store.updateElection(electionId, { results_published: next });
      setElection({ ...election, results_published: next });
      setFeedback(next ? "Results published to voters and public link!" : "Results unpublished and kept private.");
      await loadResults();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to toggle results publication");
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-navy/10">
        <p className="text-sm font-semibold text-navy">Computing election tallies...</p>
      </div>
    );
  }

  if (!results || !election) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-navy/10">
        <AlertCircle size={32} className="mx-auto text-red-500 mb-3" />
        <h2 className="text-lg font-bold text-navy">Results unavailable</h2>
        <div className="mt-4">
          <Link href="/admin">
            <Button size="sm">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-ink/60">
          <Link href="/admin" className="hover:text-navy transition-colors">
            Elections
          </Link>
          <span>/</span>
          <Link href={`/admin/elections/${election.id}`} className="hover:text-navy transition-colors">
            {election.title}
          </Link>
          <span>/</span>
          <span className="text-navy">Results & Analytics</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={election.status} />
              {election.results_published ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-600">
                  <CheckCircle2 size={12} /> Published
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-ice px-2.5 py-0.5 text-xs font-semibold text-ink/60">
                  Private (Admin Only)
                </span>
              )}
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-navy">
              {results.election_title}
            </h1>
            <p className="text-xs text-ink/65 mt-0.5">
              Official ballot certification and vote counts
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={election.results_published ? "outline" : "primary"}
              onClick={handleTogglePublish}
            >
              {election.results_published ? "Unpublish Results" : "Publish to Voters"}
            </Button>

            {election.results_published && (
              <Link href={`/results/${election.id}`} target="_blank">
                <Button size="sm" variant="secondary">
                  <Share2 size={14} /> Public Link <ExternalLink size={12} />
                </Button>
              </Link>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => window.print()}
              className="hidden sm:inline-flex"
            >
              <Printer size={14} /> Print
            </Button>
          </div>
        </div>
      </div>

      {feedback && <Alert type="success" message={feedback} onDismiss={() => setFeedback(null)} />}
      {error && <Alert type="error" message={error} onDismiss={() => setError(null)} />}

      {/* Turnout Statistics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl p-6 border border-navy/10 shadow-2xs">
          <p className="text-xs font-bold text-ink/60 uppercase tracking-wider">Overall Turnout</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-4xl font-bold text-teal-600">
              {results.turnout_percentage}%
            </span>
            <span className="text-xs text-ink/60">participation</span>
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-ice overflow-hidden">
            <div
              className="h-full bg-teal rounded-full"
              style={{ width: `${Math.min(results.turnout_percentage, 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-navy/10 shadow-2xs">
          <p className="text-xs font-bold text-ink/60 uppercase tracking-wider">Ballots Cast</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-4xl font-bold text-navy">
              {results.total_ballots_cast}
            </span>
            <span className="text-xs text-ink/60">verified ballots</span>
          </div>
          <p className="mt-3 text-xs text-ink/50">Stored anonymously via cryptographic hash</p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-navy/10 shadow-2xs">
          <p className="text-xs font-bold text-ink/60 uppercase tracking-wider">Eligible Voters</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-4xl font-bold text-navy">
              {results.total_eligible_voters}
            </span>
            <span className="text-xs text-ink/60">enrolled on roster</span>
          </div>
          <p className="mt-3 text-xs text-ink/50">One ballot quota per verified voter</p>
        </div>
      </div>

      {/* Position Results Cards */}
      <div className="space-y-6">
        <h2 className="font-display text-xl font-bold text-navy">Certified Position Tallies</h2>

        {results.positions.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-navy/10">
            <p className="text-sm text-ink/60">No positions registered in this election.</p>
          </div>
        ) : (
          results.positions.map((pos) => (
            <div
              key={pos.position_id}
              className="bg-white rounded-3xl p-6 sm:p-8 border border-navy/10 shadow-2xs space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-navy/10">
                <div>
                  <h3 className="font-display text-xl font-bold text-navy">{pos.position_title}</h3>
                  <p className="text-xs text-ink/60">
                    {pos.total_votes} {pos.total_votes === 1 ? "vote" : "votes"} recorded
                  </p>
                </div>
              </div>

              <div className="space-y-4">
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
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-sm ${
                            cand.is_winner
                              ? "bg-teal text-white"
                              : "bg-white text-navy border border-navy/15"
                          }`}
                        >
                          {cand.full_name.charAt(0)}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-navy text-base">{cand.full_name}</h4>
                            {cand.is_winner && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-teal text-white px-2 py-0.5 text-[11px] font-bold">
                                <Trophy size={11} /> Winner
                              </span>
                            )}
                            {cand.is_tie && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber text-navy px-2 py-0.5 text-[11px] font-bold">
                                Tie
                              </span>
                            )}
                          </div>
                          {cand.bio && (
                            <p className="text-xs text-ink/70 mt-1 line-clamp-1">{cand.bio}</p>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-display text-xl font-bold text-navy">
                          {cand.percentage}%
                        </span>
                        <p className="text-xs text-ink/60 font-medium">
                          {cand.votes} {cand.votes === 1 ? "vote" : "votes"}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3 h-2.5 w-full rounded-full bg-white/80 overflow-hidden border border-navy/5">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          cand.is_winner ? "bg-teal" : cand.is_tie ? "bg-amber" : "bg-navy/40"
                        }`}
                        style={{ width: `${Math.min(cand.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Secret Ballot Assurance Confirmation */}
      <div className="rounded-2xl border border-navy/10 bg-ice p-5 flex items-start gap-3">
        <ShieldCheck size={20} className="text-teal-600 shrink-0 mt-0.5" />
        <div className="text-xs text-ink/75 leading-relaxed">
          <strong>Anonymity Audit Confirmed:</strong> Turnout metrics track who participated to prevent
          double voting, but individual ballot selections are isolated in a detached table without voter
          identifiers. Administrators cannot view which candidate any specific voter selected.
        </div>
      </div>
    </div>
  );
}
