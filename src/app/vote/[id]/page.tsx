"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { store } from "@/lib/store";
import { Election, Position, BallotChoice } from "@/lib/types";
import { CandidateCard } from "@/components/voter/candidate-card";
import { SecretBallotBanner } from "@/components/voter/secret-ballot-banner";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/notification";
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Vote,
  Send,
} from "lucide-react";

export default function BallotCastingPage() {
  const params = useParams();
  const router = useRouter();
  const electionId = params.id as string;

  const [election, setElection] = useState<Election | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasVoted, setHasVoted] = useState(false);
  const [isEligible, setIsEligible] = useState<boolean | null>(null); // null = not yet checked
  const [error, setError] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const currentUser = store.getCurrentUser();

  useEffect(() => {
    async function loadBallot() {
      try {
        const el = await store.getElectionById(electionId);
        if (!el) {
          setError("Election not found");
          setIsLoading(false);
          return;
        }
        setElection(el);

        const pos = await store.getPositions(electionId);
        setPositions(pos);

        // Check eligibility AND voted status
        const voters = await store.getVoters(electionId);
        const currentVoter = voters.find(
          (v) => v.email.toLowerCase() === currentUser.email.toLowerCase()
        );

        if (!currentVoter) {
          setIsEligible(false);
        } else {
          setIsEligible(true);
          if (currentVoter.voted) {
            setHasVoted(true);
          }
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load ballot");
      } finally {
        setIsLoading(false);
      }
    }
    loadBallot();
  }, [electionId, currentUser.email]);

  // Real-time duration monitor: closes ballot casting as soon as election duration expires
  useEffect(() => {
    if (!election) return;

    const checkDuration = () => {
      const now = new Date();
      const end = election.ends_at ? new Date(election.ends_at) : null;
      if (end && !isNaN(end.getTime()) && now >= end && election.status !== "completed") {
        setElection((prev) => (prev ? { ...prev, status: "completed" } : null));
        store.updateElection(election.id, { status: "completed" });
      }
    };

    checkDuration();
    const timer = setInterval(checkDuration, 3000);
    return () => clearInterval(timer);
  }, [election]);

  const handleSelectCandidate = (positionId: string, candidateId: string) => {
    setChoices((prev) => ({
      ...prev,
      [positionId]: candidateId,
    }));
    setError(null);
  };

  const selectedCount = Object.keys(choices).length;
  const isComplete = positions.length > 0 && selectedCount === positions.length;

  const handleOpenConfirm = () => {
    if (!isComplete) {
      setError(`Please make a selection for every position (${selectedCount} of ${positions.length} selected).`);
      return;
    }
    setError(null);
    setIsConfirmModalOpen(true);
  };

  const handleFinalSubmit = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      const ballotPayload: BallotChoice[] = Object.entries(choices).map(
        ([position_id, candidate_id]) => ({
          position_id,
          candidate_id,
        })
      );

      const res = await store.castBallot(electionId, currentUser.email, ballotPayload);
      setIsConfirmModalOpen(false);
      router.push(`/vote/${electionId}/receipt?code=${encodeURIComponent(res.receipt_code)}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ballot submission failed");
      setIsSubmitting(false);
      setIsConfirmModalOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-navy/10">
        <p className="text-sm font-semibold text-navy">Preparing your ballot...</p>
      </div>
    );
  }

  if (error && !election) {
    return (
      <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-navy/10">
        <AlertCircle size={32} className="mx-auto text-red-500 mb-3" />
        <h2 className="text-lg font-bold text-navy">{error}</h2>
        <div className="mt-4">
          <Link href="/vote">
            <Button size="sm">Return to Elections</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (hasVoted) {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-3xl p-6 sm:p-10 border border-navy/10 shadow-xl text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-100 text-teal-600">
          <CheckCircle2 size={32} />
        </div>
        <h2 className="font-display text-2xl font-bold text-navy">Ballot Already Cast</h2>
        <p className="text-sm text-ink/75 leading-relaxed break-words">
          Our records confirm that you have already cast your confidential ballot for{" "}
          <strong>{election?.title}</strong>. Under the one-person-one-vote protocol, additional
          submissions are not permitted.
        </p>
        <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href={`/vote/${electionId}/receipt`}>
            <Button variant="secondary" size="md" className="w-full sm:w-auto">
              View Your Ballot Receipt
            </Button>
          </Link>
          <Link href="/vote">
            <Button variant="outline" size="md" className="w-full sm:w-auto">
              Back to Elections
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Not on this election's eligible voter roster
  if (isEligible === false) {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-3xl p-6 sm:p-10 border border-navy/10 shadow-xl text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
          <AlertCircle size={32} />
        </div>
        <h2 className="font-display text-2xl font-bold text-navy">Not Eligible for This Election</h2>
        <p className="text-sm text-ink/70 leading-relaxed">
          Your email address (<strong>{currentUser.email}</strong>) is not on the eligible voter
          roster for this election. If you believe this is an error, please contact the election
          administrator.
        </p>
        <div className="pt-4">
          <Link href="/vote">
            <Button variant="outline" size="md">
              Back to My Elections
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Check if voting has ended or duration elapsed
  const isElectionEnded =
    election?.status === "completed" ||
    Boolean(election?.ends_at && new Date() >= new Date(election.ends_at));

  if (isElectionEnded) {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-3xl p-6 sm:p-10 border border-navy/10 shadow-xl text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <Clock size={32} />
        </div>
        <h2 className="font-display text-2xl font-bold text-navy">Voting Has Ended</h2>
        <p className="text-sm text-ink/75 leading-relaxed break-words">
          The scheduled voting duration for <strong>{election?.title}</strong> has elapsed. Voting is now officially closed and additional ballots cannot be accepted.
        </p>
        <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href={`/results/${electionId}`}>
            <Button variant="secondary" size="md" className="w-full sm:w-auto">
              View Certified Results
            </Button>
          </Link>
          <Link href="/vote">
            <Button variant="outline" size="md" className="w-full sm:w-auto">
              Back to My Elections
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Check if election is scheduled but voting window hasn't opened yet
  const isNotStarted =
    election?.status === "scheduled" &&
    Boolean(election?.starts_at && new Date() < new Date(election.starts_at));

  if (isNotStarted) {
    const formattedStartDate = election?.starts_at
      ? new Date(election.starts_at).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

    return (
      <div className="max-w-xl mx-auto bg-white rounded-3xl p-6 sm:p-10 border border-navy/10 shadow-xl text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
          <Clock size={32} />
        </div>
        <h2 className="font-display text-2xl font-bold text-navy">Voting Has Not Started Yet</h2>
        <p className="text-sm text-ink/70 leading-relaxed">
          Voting for <strong>{election?.title}</strong> will officially open on{" "}
          <strong>{formattedStartDate}</strong>. Please return once the election window begins.
        </p>
        <div className="pt-4">
          <Link href="/vote">
            <Button variant="outline" size="md">
              Back to My Elections
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const endDate = election
    ? new Date(election.ends_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8">
      {/* Back button & Title */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-ink/60">
          <Link href="/vote" className="hover:text-navy transition-colors flex items-center gap-1">
            <ArrowLeft size={13} />
            Back to Elections
          </Link>
        </div>

        <div className="min-w-0">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-navy break-words">
            {election?.title}
          </h1>
          <p className="text-xs text-ink/65 mt-1 flex items-center gap-1.5 flex-wrap">
            <Clock size={13} className="text-navy/60 shrink-0" />
            <span>Voting closes <strong>{endDate}</strong></span>
          </p>
        </div>
      </div>

      {error && <Alert type="error" message={error} onDismiss={() => setError(null)} />}

      {/* Secret Ballot Assurance */}
      <SecretBallotBanner />

      {/* Ballot Positions */}
      <div className="space-y-6 sm:space-y-8">
        {positions.map((position, index) => {
          const selectedCandidateId = choices[position.id];
          return (
            <div
              key={position.id}
              className="bg-white rounded-3xl p-5 sm:p-8 border border-navy/10 shadow-2xs space-y-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-navy/10">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy text-white text-xs font-bold">
                      {index + 1}
                    </span>
                    <h2 className="font-display text-lg sm:text-xl font-bold text-navy break-words">
                      {position.title}
                    </h2>
                  </div>
                  <p className="text-xs text-ink/60 mt-1 pl-8">
                    Select exactly one candidate for this office.
                  </p>
                </div>

                {selectedCandidateId && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-600 self-start sm:self-auto shrink-0">
                    <CheckCircle2 size={13} /> Choice Selected
                  </span>
                )}
              </div>

              {position.candidates.length === 0 ? (
                <p className="text-xs text-ink/50 py-4 text-center">
                  No candidates listed for this position.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {position.candidates.map((cand) => (
                    <CandidateCard
                      key={cand.id}
                      candidate={cand}
                      isSelected={selectedCandidateId === cand.id}
                      onSelect={() => handleSelectCandidate(position.id, cand.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sticky Bottom Submission Bar */}
      <div className="sticky bottom-4 z-20 rounded-2xl bg-white p-4 sm:p-5 border border-navy/15 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:w-auto">
          <p className="text-xs font-bold text-navy">
            Ballot Completion: {selectedCount} of {positions.length} positions selected
          </p>
          <div className="mt-1 h-1.5 w-full sm:w-44 rounded-full bg-ice overflow-hidden">
            <div
              className="h-full bg-teal rounded-full transition-all duration-300"
              style={{
                width: `${positions.length > 0 ? (selectedCount / positions.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        <Button
          size="lg"
          onClick={handleOpenConfirm}
          disabled={!isComplete}
          className="w-full sm:w-auto"
        >
          Review & Cast Ballot <Send size={16} />
        </Button>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="Confirm Your Secret Ballot"
        description="Please review your selections before final submission. Once cast, your ballot is sealed and cannot be changed."
      >
        <div className="space-y-4">
          <div className="divide-y divide-navy/10 rounded-2xl border border-navy/10 bg-ice/50 p-4">
            {positions.map((pos) => {
              const cand = pos.candidates.find((c) => c.id === choices[pos.id]);
              return (
                <div key={pos.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs gap-3">
                  <span className="font-semibold text-navy break-words">{pos.title}:</span>
                  <span className="font-bold text-teal-600 break-words text-right">{cand?.full_name || "None"}</span>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl bg-teal-100/50 p-3 text-xs text-ink/75 leading-relaxed flex items-start gap-2">
            <ShieldCheck size={16} className="text-teal-600 shrink-0 mt-0.5" />
            <span>
              Your selections will be detached from your identity in the database.
            </span>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-3 border-t border-navy/10">
            <Button
              variant="outline"
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsConfirmModalOpen(false)}
              className="w-full sm:w-auto"
            >
              Make Changes
            </Button>
            <Button
              type="button"
              isLoading={isSubmitting}
              onClick={handleFinalSubmit}
              className="w-full sm:w-auto"
            >
              Confirm and Submit Ballot
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
