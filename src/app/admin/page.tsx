"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { store } from "@/lib/store";
import { Election, ElectionStatus } from "@/lib/types";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Vote,
  Users,
  Calendar,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Clock,
} from "lucide-react";

export default function AdminDashboardPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const data = await store.getElections();
      setElections(data);
      setIsLoading(false);
    }
    loadData();
  }, []);

  const filteredElections = elections.filter((e) => {
    if (filter === "all") return true;
    return e.status === filter;
  });

  const totalElections = elections.length;
  const activeCount = elections.filter((e) => e.status === "active").length;
  const totalBallots = elections.reduce((acc, e) => acc + (e.ballots_cast_count || 0), 0);
  const totalVoters = elections.reduce((acc, e) => acc + (e.eligible_voters_count || 0), 0);

  return (
    <div className="space-y-8">
      {/* Top Welcome & Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-navy">
            Elections Overview
          </h1>
          <p className="mt-1 text-sm text-ink/70">
            Create elections, schedule voting windows, manage voter rosters, and review results.
          </p>
        </div>

        <Link href="/admin/elections/new">
          <Button size="md" className="w-full sm:w-auto">
            <Plus size={16} /> Create Election
          </Button>
        </Link>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-navy/10 shadow-2xs">
          <p className="text-xs font-semibold text-ink/60 uppercase tracking-wider">Total Elections</p>
          <p className="mt-2 text-3xl font-bold text-navy">{totalElections}</p>
          <p className="mt-1 text-xs text-ink/50">{activeCount} currently active</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-navy/10 shadow-2xs">
          <p className="text-xs font-semibold text-ink/60 uppercase tracking-wider">Active Elections</p>
          <p className="mt-2 text-3xl font-bold text-teal-600">{activeCount}</p>
          <p className="mt-1 text-xs text-ink/50">Accepting verified ballots</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-navy/10 shadow-2xs">
          <p className="text-xs font-semibold text-ink/60 uppercase tracking-wider">Total Ballots Cast</p>
          <p className="mt-2 text-3xl font-bold text-navy">{totalBallots.toLocaleString()}</p>
          <p className="mt-1 text-xs text-ink/50">Across all completed & active</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-navy/10 shadow-2xs">
          <p className="text-xs font-semibold text-ink/60 uppercase tracking-wider">Enrolled Voters</p>
          <p className="mt-2 text-3xl font-bold text-navy">{totalVoters.toLocaleString()}</p>
          <p className="mt-1 text-xs text-ink/50">Verified on tenant rosters</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy/10 pb-4">
        <div className="flex rounded-xl bg-white p-1 border border-navy/10">
          {[
            { id: "all", label: "All" },
            { id: "active", label: "Active" },
            { id: "scheduled", label: "Scheduled" },
            { id: "completed", label: "Completed" },
            { id: "draft", label: "Drafts" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                filter === tab.id
                  ? "bg-navy text-white shadow-2xs"
                  : "text-ink/60 hover:text-navy hover:bg-ice"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span className="text-xs font-semibold text-ink/60">
          Showing {filteredElections.length} {filteredElections.length === 1 ? "election" : "elections"}
        </span>
      </div>

      {/* Elections List */}
      {isLoading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-navy/10">
          <p className="text-sm font-semibold text-navy">Loading elections...</p>
        </div>
      ) : filteredElections.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-navy/10">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-ice text-navy mb-3">
            <Vote size={24} />
          </div>
          <h3 className="font-display text-lg font-semibold text-navy">No elections found</h3>
          <p className="mt-1 text-sm text-ink/70 max-w-sm mx-auto">
            {filter === "all"
              ? "You haven't created any elections yet. Get started by creating your first election."
              : `No elections currently in "${filter}" status.`}
          </p>
          <div className="mt-5">
            <Link href="/admin/elections/new">
              <Button size="sm">
                <Plus size={15} /> Create Election
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredElections.map((election) => {
            const startDate = new Date(election.starts_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
            const endDate = new Date(election.ends_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            const eligibleCount = election.eligible_voters_count || 0;
            const ballotsCount = election.ballots_cast_count || 0;
            const turnoutPercent =
              eligibleCount > 0 ? Math.round((ballotsCount / eligibleCount) * 100) : 0;

            return (
              <div
                key={election.id}
                className="bg-white rounded-2xl p-6 border border-navy/10 shadow-2xs hover:border-navy/20 transition-all flex flex-col md:flex-row md:items-center md:justify-between gap-6"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <StatusBadge status={election.status} />
                    {election.results_published && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-600">
                        <CheckCircle2 size={12} /> Results Published
                      </span>
                    )}
                  </div>

                  <Link href={`/admin/elections/${election.id}`}>
                    <h2 className="font-display text-xl font-bold text-navy hover:text-teal transition-colors">
                      {election.title}
                    </h2>
                  </Link>

                  {election.description && (
                    <p className="text-sm text-ink/75 line-clamp-2 max-w-2xl">
                      {election.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs text-ink/65 pt-1">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} className="text-navy/60" />
                      <span>
                        {startDate} – {endDate}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Users size={14} className="text-navy/60" />
                      <span>{eligibleCount} eligible voters</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Vote size={14} className="text-navy/60" />
                      <span>{ballotsCount} ballots cast</span>
                    </div>
                  </div>
                </div>

                {/* Turnout Progress & Actions */}
                <div className="flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end justify-between gap-4 border-t md:border-t-0 pt-4 md:pt-0 border-navy/10">
                  <div className="w-full sm:w-44 text-left md:text-right">
                    <div className="flex items-center justify-between md:justify-end gap-2 text-xs font-semibold">
                      <span className="text-ink/60">Turnout</span>
                      <span className="text-navy">{turnoutPercent}%</span>
                    </div>
                    <div className="mt-1 h-2 w-full rounded-full bg-ice overflow-hidden">
                      <div
                        className="h-full bg-teal rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(turnoutPercent, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Link
                      href={`/admin/elections/${election.id}`}
                      className="flex-1 sm:flex-initial"
                    >
                      <Button variant="outline" size="sm" className="w-full">
                        Manage
                      </Button>
                    </Link>

                    <Link
                      href={`/admin/elections/${election.id}/results`}
                      className="flex-1 sm:flex-initial"
                    >
                      <Button variant="secondary" size="sm" className="w-full">
                        <BarChart3 size={14} /> Results
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
