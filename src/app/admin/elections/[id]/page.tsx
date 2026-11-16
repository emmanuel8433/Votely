"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { store } from "@/lib/store";
import { Election, Position, Candidate, EligibleVoter, ElectionStatus } from "@/lib/types";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/notification";
import { VoterImportModal } from "@/components/admin/voter-import-modal";
import { CandidateModal } from "@/components/admin/candidate-modal";
import { CandidateCard } from "@/components/voter/candidate-card";
import { SecretBallotBanner } from "@/components/voter/secret-ballot-banner";
import {
  ArrowLeft,
  Calendar,
  Users,
  Vote,
  Plus,
  Trash2,
  Upload,
  BarChart3,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Search,
  Eye,
  Settings,
  AlertCircle,
} from "lucide-react";

export default function ElectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const electionId = params.id as string;

  const [election, setElection] = useState<Election | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [voters, setVoters] = useState<EligibleVoter[]>([]);
  const [activeTab, setActiveTab] = useState<"positions" | "voters" | "preview" | "settings">("positions");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Modals state
  const [isNewPositionOpen, setIsNewPositionOpen] = useState(false);
  const [newPositionTitle, setNewPositionTitle] = useState("");
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);
  const [selectedPositionForCandidate, setSelectedPositionForCandidate] = useState<Position | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Single voter add form state
  const [voterEmail, setVoterEmail] = useState("");
  const [voterName, setVoterName] = useState("");
  const [voterSearch, setVoterSearch] = useState("");

  const refreshData = useCallback(async () => {
    try {
      const el = await store.getElectionById(electionId);
      if (!el) {
        setError("Election not found");
        return;
      }
      setElection(el);
      const pos = await store.getPositions(electionId);
      setPositions(pos);
      const vt = await store.getVoters(electionId);
      setVoters(vt);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load election data");
    } finally {
      setIsLoading(false);
    }
  }, [electionId]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Handle Add Position
  const handleAddPosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPositionTitle.trim()) return;
    try {
      await store.addPosition(electionId, newPositionTitle.trim());
      setNewPositionTitle("");
      setIsNewPositionOpen(false);
      setFeedback("Position created successfully");
      await refreshData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create position");
    }
  };

  // Handle Delete Position
  const handleDeletePosition = async (posId: string) => {
    if (!confirm("Are you sure you want to delete this position and its candidates?")) return;
    try {
      await store.deletePosition(electionId, posId);
      setFeedback("Position removed");
      await refreshData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete position");
    }
  };

  // Handle Add Candidate
  const handleSaveCandidate = async (candidate: { full_name: string; bio: string }) => {
    if (!selectedPositionForCandidate) return;
    await store.addCandidate(electionId, selectedPositionForCandidate.id, candidate);
    setFeedback(`Candidate ${candidate.full_name} added`);
    await refreshData();
  };

  // Handle Delete Candidate
  const handleDeleteCandidate = async (posId: string, candId: string) => {
    if (!confirm("Remove this candidate from the ballot?")) return;
    try {
      await store.deleteCandidate(electionId, posId, candId);
      setFeedback("Candidate removed");
      await refreshData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete candidate");
    }
  };

  // Handle Add Single Voter
  const handleAddSingleVoter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voterEmail.trim()) return;
    try {
      await store.addVoter(electionId, {
        email: voterEmail.trim(),
        full_name: voterName.trim() || undefined,
      });
      setVoterEmail("");
      setVoterName("");
      setFeedback("Voter added to roster");
      await refreshData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add voter");
    }
  };

  // Handle Status Update
  const handleUpdateStatus = async (newStatus: ElectionStatus) => {
    try {
      await store.updateElection(electionId, { status: newStatus });
      setFeedback(`Election status updated to "${newStatus}"`);
      await refreshData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update election status");
    }
  };

  // Handle Toggle Results Published
  const handleTogglePublishResults = async () => {
    if (!election) return;
    try {
      const next = !election.results_published;
      await store.updateElection(electionId, { results_published: next });
      setFeedback(next ? "Results published to public and voters" : "Results made private");
      await refreshData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to toggle result publication");
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-navy/10">
        <p className="text-sm font-semibold text-navy">Loading election workspace...</p>
      </div>
    );
  }

  if (!election) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-navy/10">
        <AlertCircle size={32} className="mx-auto text-red-500 mb-3" />
        <h2 className="text-lg font-bold text-navy">Election not found</h2>
        <div className="mt-4">
          <Link href="/admin">
            <Button size="sm">Back to Elections</Button>
          </Link>
        </div>
      </div>
    );
  }

  const startDate = new Date(election.starts_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const endDate = new Date(election.ends_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const ballotsCount = election.ballots_cast_count || voters.filter((v) => v.voted).length;
  const eligibleCount = voters.length || election.eligible_voters_count || 0;
  const turnoutPercent = eligibleCount > 0 ? Math.round((ballotsCount / eligibleCount) * 100) : 0;

  const filteredVoters = voters.filter(
    (v) =>
      v.email.toLowerCase().includes(voterSearch.toLowerCase()) ||
      (v.full_name && v.full_name.toLowerCase().includes(voterSearch.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-ink/60">
          <Link href="/admin" className="hover:text-navy transition-colors">
            Elections
          </Link>
          <span>/</span>
          <span className="text-navy">{election.title}</span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <StatusBadge status={election.status} />
              {election.results_published && (
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-600">
                  <CheckCircle2 size={12} /> Results Published
                </span>
              )}
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-navy">
              {election.title}
            </h1>
            <p className="text-xs text-ink/65 flex items-center gap-1.5">
              <Calendar size={13} className="text-navy/60" />
              <span>{startDate} – {endDate}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/admin/elections/${election.id}/results`}>
              <Button variant="secondary" size="sm">
                <BarChart3 size={15} /> Results & Turnout
              </Button>
            </Link>

            <Link href={`/vote/${election.id}`} target="_blank">
              <Button variant="outline" size="sm">
                <Eye size={15} /> Voter View <ExternalLink size={12} />
              </Button>
            </Link>

            {/* Quick Status Control Dropdown */}
            <select
              value={election.status}
              onChange={(e) => handleUpdateStatus(e.target.value as ElectionStatus)}
              className="rounded-xl border border-navy/20 bg-white px-3 py-2 text-xs font-semibold text-navy focus:outline-none focus:ring-2 focus:ring-teal"
            >
              <option value="draft">Status: Draft</option>
              <option value="scheduled">Status: Scheduled</option>
              <option value="active">Status: Active (Voting Open)</option>
              <option value="completed">Status: Completed</option>
              <option value="cancelled">Status: Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {feedback && (
        <Alert
          type="success"
          message={feedback}
          onDismiss={() => setFeedback(null)}
        />
      )}

      {error && (
        <Alert
          type="error"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Turnout & Key Statistics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-navy/10 shadow-2xs">
        <div>
          <span className="text-[11px] font-semibold text-ink/60 uppercase tracking-wider">Positions</span>
          <p className="text-2xl font-bold text-navy mt-0.5">{positions.length}</p>
        </div>
        <div>
          <span className="text-[11px] font-semibold text-ink/60 uppercase tracking-wider">Candidates</span>
          <p className="text-2xl font-bold text-navy mt-0.5">
            {positions.reduce((acc, p) => acc + p.candidates.length, 0)}
          </p>
        </div>
        <div>
          <span className="text-[11px] font-semibold text-ink/60 uppercase tracking-wider">Eligible Voters</span>
          <p className="text-2xl font-bold text-navy mt-0.5">{eligibleCount}</p>
        </div>
        <div>
          <span className="text-[11px] font-semibold text-ink/60 uppercase tracking-wider">Turnout</span>
          <p className="text-2xl font-bold text-teal-600 mt-0.5">
            {turnoutPercent}% <span className="text-xs font-normal text-ink/50">({ballotsCount})</span>
          </p>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-navy/10">
        {[
          { id: "positions", label: `Positions & Candidates (${positions.length})` },
          { id: "voters", label: `Eligible Voters (${eligibleCount})` },
          { id: "preview", label: "Ballot Preview" },
          { id: "settings", label: "Settings & Status" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-navy text-navy font-bold"
                : "border-transparent text-ink/60 hover:text-navy hover:border-navy/20"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: POSITIONS & CANDIDATES */}
      {activeTab === "positions" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-navy">Election Positions</h2>
              <p className="text-xs text-ink/70">
                Define the roles open for voting and add candidates with their manifestos.
              </p>
            </div>
            <Button size="sm" onClick={() => setIsNewPositionOpen(true)}>
              <Plus size={15} /> Add Position
            </Button>
          </div>

          {positions.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-navy/10">
              <Vote size={28} className="mx-auto text-teal-600 mb-2" />
              <h3 className="font-semibold text-navy">No positions created yet</h3>
              <p className="text-xs text-ink/70 mt-1 max-w-sm mx-auto">
                Add at least one position (e.g. &quot;President&quot;, &quot;Secretary&quot;) and assign candidates to it.
              </p>
              <Button size="sm" className="mt-4" onClick={() => setIsNewPositionOpen(true)}>
                <Plus size={14} /> Add First Position
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {positions.map((position) => (
                <div
                  key={position.id}
                  className="bg-white rounded-3xl p-6 border border-navy/10 shadow-2xs space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-navy/10">
                    <div>
                      <h3 className="font-display text-lg font-bold text-navy">
                        {position.title}
                      </h3>
                      <p className="text-xs text-ink/60">
                        {position.candidates.length} {position.candidates.length === 1 ? "candidate" : "candidates"} registered
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setSelectedPositionForCandidate(position);
                          setIsCandidateModalOpen(true);
                        }}
                      >
                        <Plus size={14} /> Add Candidate
                      </Button>
                      <button
                        onClick={() => handleDeletePosition(position.id)}
                        className="rounded-lg p-2 text-ink/40 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete position"
                        aria-label="Delete position"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {position.candidates.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-navy/20 p-6 text-center text-xs text-ink/60">
                      No candidates yet for {position.title}. Click &quot;Add Candidate&quot; to add nominees.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {position.candidates.map((candidate) => (
                        <div
                          key={candidate.id}
                          className="rounded-2xl border border-navy/10 bg-ice/50 p-4 relative group flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100 text-teal-600 font-bold text-sm">
                                  {candidate.full_name.charAt(0)}
                                </span>
                                <div>
                                  <h4 className="font-semibold text-navy text-sm">
                                    {candidate.full_name}
                                  </h4>
                                </div>
                              </div>
                              <button
                                onClick={() => handleDeleteCandidate(position.id, candidate.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-ink/40 hover:text-red-600 transition-opacity"
                                title="Remove candidate"
                                aria-label="Remove candidate"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>

                            {candidate.bio && (
                              <p className="mt-3 text-xs text-ink/75 leading-relaxed">
                                {candidate.bio}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ELIGIBLE VOTERS */}
      {activeTab === "voters" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-bold text-navy">Eligible Voter Roster</h2>
              <p className="text-xs text-ink/70">
                Only enrolled emails can authenticate and cast one secret ballot in this election.
              </p>
            </div>

            <Button size="sm" variant="secondary" onClick={() => setIsImportModalOpen(true)}>
              <Upload size={14} /> Import CSV
            </Button>
          </div>

          {/* Quick single voter add form */}
          <form
            onSubmit={handleAddSingleVoter}
            className="bg-white rounded-2xl p-4 border border-navy/10 flex flex-col sm:flex-row items-end gap-3"
          >
            <div className="flex-1 w-full sm:w-auto">
              <Input
                label="Add Individual Voter Email"
                type="email"
                placeholder="voter@organisation.org"
                value={voterEmail}
                onChange={(e) => setVoterEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex-1 w-full sm:w-auto">
              <Input
                label="Full Name (Optional)"
                placeholder="e.g. Jordan Lee"
                value={voterName}
                onChange={(e) => setVoterName(e.target.value)}
              />
            </div>
            <Button type="submit" size="md">
              <Plus size={15} /> Add to Roster
            </Button>
          </form>

          {/* Voter Search Bar */}
          <div className="flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 border border-navy/10 text-xs">
            <Search size={16} className="text-ink/40" />
            <input
              type="text"
              placeholder="Search voters by name or email..."
              value={voterSearch}
              onChange={(e) => setVoterSearch(e.target.value)}
              className="w-full bg-transparent text-ink placeholder:text-ink/40 focus:outline-none"
            />
            {voterSearch && (
              <button
                onClick={() => setVoterSearch("")}
                className="text-xs font-bold text-ink/40 hover:text-navy"
              >
                Clear
              </button>
            )}
          </div>

          {/* Voters Table */}
          <div className="bg-white rounded-3xl border border-navy/10 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-ink">
                <thead className="bg-ice border-b border-navy/10 text-navy uppercase text-[10px] tracking-wider font-bold">
                  <tr>
                    <th className="px-5 py-3.5">Voter Email</th>
                    <th className="px-5 py-3.5">Full Name</th>
                    <th className="px-5 py-3.5">Ballot Status</th>
                    <th className="px-5 py-3.5">Activity Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy/5">
                  {filteredVoters.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-ink/60">
                        {voters.length === 0
                          ? "No eligible voters enrolled yet. Add a voter or import via CSV."
                          : "No voters match your search query."}
                      </td>
                    </tr>
                  ) : (
                    filteredVoters.map((voter) => (
                      <tr key={voter.id} className="hover:bg-ice/40 transition-colors">
                        <td className="px-5 py-3.5 font-semibold text-navy">{voter.email}</td>
                        <td className="px-5 py-3.5 text-ink/75">{voter.full_name || "—"}</td>
                        <td className="px-5 py-3.5">
                          {voter.voted ? (
                            <span className="inline-flex items-center gap-1 text-teal-600 font-semibold bg-teal-100 px-2 py-0.5 rounded-full">
                              <CheckCircle2 size={12} /> Ballot Cast
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-ink/60 bg-ice px-2 py-0.5 rounded-full">
                              Eligible (Pending)
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-ink/50">
                          {voter.voted_at
                            ? new Date(voter.voted_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BALLOT PREVIEW */}
      {activeTab === "preview" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-navy">Voter Ballot Preview</h2>
              <p className="text-xs text-ink/70">
                This is the exact view authenticated voters will see when casting their vote.
              </p>
            </div>
            <Link href={`/vote/${election.id}`} target="_blank">
              <Button size="sm" variant="outline">
                Open in New Tab <ExternalLink size={13} />
              </Button>
            </Link>
          </div>

          <div className="max-w-3xl mx-auto space-y-6 bg-ice/40 p-6 rounded-3xl border border-navy/10">
            <SecretBallotBanner />

            {positions.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center text-xs text-ink/60">
                Add positions and candidates to view the ballot preview.
              </div>
            ) : (
              positions.map((pos) => (
                <div key={pos.id} className="bg-white rounded-2xl p-6 border border-navy/10 space-y-4">
                  <div>
                    <h3 className="font-display text-lg font-bold text-navy">{pos.title}</h3>
                    <p className="text-xs text-ink/60">Select one candidate</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {pos.candidates.map((c, i) => (
                      <CandidateCard
                        key={c.id}
                        candidate={c}
                        isSelected={i === 0}
                        onSelect={() => {}}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: SETTINGS & PUBLISHING */}
      {activeTab === "settings" && (
        <div className="max-w-2xl bg-white rounded-3xl p-6 sm:p-8 border border-navy/10 shadow-2xs space-y-6">
          <div>
            <h2 className="font-display text-lg font-bold text-navy">Election Lifecycle & Results</h2>
            <p className="text-xs text-ink/70">
              Manage election status and control public access to voting results.
            </p>
          </div>

          {/* Results Publishing Toggle */}
          <div className="flex items-center justify-between p-4 rounded-2xl border border-navy/10 bg-ice">
            <div>
              <p className="text-sm font-bold text-navy">Publish Results to Public & Voters</p>
              <p className="text-xs text-ink/70 mt-0.5">
                {election.results_published
                  ? "Results are currently live and visible at the public results link."
                  : "Results are currently restricted to organization administrators."}
              </p>
            </div>
            <Button
              size="sm"
              variant={election.results_published ? "outline" : "primary"}
              onClick={handleTogglePublishResults}
            >
              {election.results_published ? "Unpublish Results" : "Publish Results"}
            </Button>
          </div>

          {/* Status Controls */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-navy uppercase tracking-wider">
              Change Status
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(["draft", "scheduled", "active", "completed"] as ElectionStatus[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => handleUpdateStatus(st)}
                  className={`p-3 rounded-xl border text-xs font-bold capitalize transition-all ${
                    election.status === st
                      ? "bg-navy text-white border-navy"
                      : "bg-white text-navy border-navy/15 hover:bg-ice"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-navy/10 flex items-center justify-between text-xs text-ink/60">
            <span>Ballot Secrecy Protocol</span>
            <span className="font-semibold text-teal-600">Active</span>
          </div>
        </div>
      )}

      {/* MODAL: ADD POSITION */}
      <Modal
        isOpen={isNewPositionOpen}
        onClose={() => setIsNewPositionOpen(false)}
        title="Add Election Position"
        description="Specify the office or role to be elected (e.g. President, Treasurer)."
      >
        <form onSubmit={handleAddPosition} className="space-y-4">
          <Input
            label="Position Title"
            placeholder="e.g. President"
            value={newPositionTitle}
            onChange={(e) => setNewPositionTitle(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2 pt-3 border-t border-navy/10">
            <Button variant="outline" type="button" onClick={() => setIsNewPositionOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Position</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: ADD CANDIDATE */}
      {selectedPositionForCandidate && (
        <CandidateModal
          isOpen={isCandidateModalOpen}
          onClose={() => {
            setIsCandidateModalOpen(false);
            setSelectedPositionForCandidate(null);
          }}
          positionTitle={selectedPositionForCandidate.title}
          onSave={handleSaveCandidate}
        />
      )}

      {/* MODAL: IMPORT CSV VOTERS */}
      <VoterImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={async (list) => {
          const res = await store.importVoters(electionId, list);
          await refreshData();
          return res;
        }}
      />
    </div>
  );
}
