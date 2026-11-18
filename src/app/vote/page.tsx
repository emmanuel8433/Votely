"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { store } from "@/lib/store";
import { Election } from "@/lib/types";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Vote,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  BarChart3,
  FileCheck2,
  Link2,
} from "lucide-react";

export default function VoterDashboardPage() {
  const [currentUser, setCurrentUser] = useState(store.getCurrentUser());
  const [elections, setElections] = useState<Election[]>([]);
  const [voterStatusMap, setVoterStatusMap] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const activeUser = store.getCurrentUser();
      setCurrentUser(activeUser);

      if (!activeUser?.email) {
        setIsLoading(false);
        return;
      }

      // Only load elections this voter is enrolled in
      const invited = await store.getElectionsForVoter(activeUser.email);
      setElections(invited);

      // Build voted-status map
      const statusMap: Record<string, boolean> = {};
      for (const el of invited) {
        const voters = await store.getVoters(el.id);
        const match = voters.find(
          (v) => v.email.toLowerCase() === activeUser.email.toLowerCase()
        );
        statusMap[el.id] = Boolean(match && match.voted);
      }
      setVoterStatusMap(statusMap);
      setIsLoading(false);
    }
    loadData();
  }, []);

  const activeElections = elections.filter((e) => e.status === "active");
  const pastElections = elections.filter((e) => e.status === "completed");
  const scheduledElections = elections.filter((e) => e.status === "scheduled");

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Voter Welcome Banner */}
      <div className="bg-white rounded-3xl p-5 sm:p-8 border border-navy/10 shadow-2xs">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-navy break-words">
          Your Voting Portal
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-ink/75 max-w-xl leading-relaxed break-words">
          {currentUser.full_name ? (
            <>Welcome, <strong>{currentUser.full_name}</strong>. </>
          ) : null}
          Below are the elections you have been invited to participate in.
        </p>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-navy/10">
          <p className="text-sm font-semibold text-navy">Loading your elections...</p>
        </div>
      ) : elections.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 sm:p-12 text-center border border-navy/10 shadow-2xs space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-ice text-navy">
            <Link2 size={28} />
          </div>
          <h2 className="font-display text-xl font-bold text-navy">No Elections Yet</h2>
          <p className="text-xs sm:text-sm text-ink/70 max-w-md mx-auto leading-relaxed">
            You haven&apos;t been invited to any elections yet. When an administrator shares an
            invitation link with you, it will appear here after you sign in.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Elections */}
          <div>
            <h2 className="font-display text-lg font-bold text-navy mb-4 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-teal animate-pulse" />
              Active Elections (Open Now)
            </h2>

            {activeElections.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-navy/10 text-xs text-ink/60">
                No active elections open for voting at this moment.
              </div>
            ) : (
              <div className="space-y-4">
                {activeElections.map((election) => {
                  const hasVoted = voterStatusMap[election.id];
                  const endDate = new Date(election.ends_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <div
                      key={election.id}
                      className="bg-white rounded-3xl p-5 sm:p-7 border border-navy/10 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6"
                    >
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge status="active" />
                          {hasVoted ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-600">
                              <CheckCircle2 size={12} /> Ballot Submitted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber/20 px-2.5 py-0.5 text-xs font-semibold text-navy">
                              Ready to Vote
                            </span>
                          )}
                        </div>

                        <h3 className="font-display text-lg sm:text-xl font-bold text-navy break-words">
                          {election.title}
                        </h3>
                        {election.description && (
                          <p className="text-xs text-ink/70 max-w-xl break-words">{election.description}</p>
                        )}

                        <p className="text-xs text-ink/60 flex items-center gap-1 pt-1 flex-wrap">
                          <Clock size={13} className="text-navy/50 shrink-0" />
                          <span>Voting window closes on <strong>{endDate}</strong></span>
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {hasVoted ? (
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Link href={`/vote/${election.id}/receipt`} className="w-full sm:w-auto">
                              <Button variant="outline" size="sm" className="w-full">
                                <FileCheck2 size={15} /> View Ballot Receipt
                              </Button>
                            </Link>
                          </div>
                        ) : (
                          <Link href={`/vote/${election.id}`} className="w-full sm:w-auto">
                            <Button size="md" className="w-full">
                              Cast Your Ballot <ArrowRight size={16} />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Scheduled & Past Elections */}
          {(scheduledElections.length > 0 || pastElections.length > 0) && (
            <div className="pt-6 border-t border-navy/10 space-y-4">
              <h2 className="font-display text-lg font-bold text-navy">Other Elections</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {scheduledElections.map((el) => (
                  <div
                    key={el.id}
                    className="bg-white rounded-2xl p-5 border border-navy/10 flex flex-col justify-between space-y-3"
                  >
                    <div className="min-w-0">
                      <StatusBadge status="scheduled" />
                      <h4 className="font-bold text-navy text-base mt-2 break-words">{el.title}</h4>
                      <p className="text-xs text-ink/65 mt-1 flex items-center gap-1">
                        <Calendar size={12} />
                        Opens on {new Date(el.starts_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-ink/40">Voting opens soon</span>
                  </div>
                ))}

                {pastElections.map((el) => (
                  <div
                    key={el.id}
                    className="bg-white rounded-2xl p-5 border border-navy/10 flex flex-col justify-between space-y-3"
                  >
                    <div className="min-w-0">
                      <StatusBadge status="completed" />
                      <h4 className="font-bold text-navy text-base mt-2 break-words">{el.title}</h4>
                      <p className="text-xs text-ink/65 mt-1">
                        Closed on {new Date(el.ends_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-navy/5 flex items-center justify-between gap-2">
                      <span className="text-xs text-ink/50 truncate">
                        {voterStatusMap[el.id] ? "You participated" : "Voting ended"}
                      </span>
                      {el.results_published ? (
                        <Link href={`/results/${el.id}`} className="shrink-0">
                          <Button size="sm" variant="secondary">
                            <BarChart3 size={13} /> View Results
                          </Button>
                        </Link>
                      ) : (
                        <span className="text-xs text-ink/40 shrink-0">Results pending admin</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
