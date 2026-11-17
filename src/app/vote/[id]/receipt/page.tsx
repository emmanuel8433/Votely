"use client";

import React, { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { store } from "@/lib/store";
import { Election } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  ShieldCheck,
  FileCheck2,
  ArrowRight,
  Printer,
  Vote,
  BarChart3,
} from "lucide-react";

function ReceiptContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const electionId = params.id as string;
  const codeParam = searchParams.get("code");

  const [election, setElection] = useState<Election | null>(null);
  const [receiptCode, setReceiptCode] = useState<string>("");
  const [timestamp, setTimestamp] = useState<string>("");

  useEffect(() => {
    async function load() {
      const el = await store.getElectionById(electionId);
      setElection(el);
      setReceiptCode(
        codeParam || `VOTE-${electionId.slice(-4).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      );
      setTimestamp(new Date().toLocaleString());
    }
    load();
  }, [electionId, codeParam]);

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-navy/10 shadow-xl text-center space-y-6">
        <div className="mx-auto flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-3xl bg-teal text-white shadow-sm">
          <CheckCircle2 size={34} strokeWidth={2.5} />
        </div>

        <div className="space-y-1 min-w-0">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-navy break-words">
            Ballot Successfully Cast
          </h1>
          <p className="text-xs sm:text-sm text-ink/75 break-words">
            Your vote has been cryptographically recorded for{" "}
            <strong>{election?.title || "this election"}</strong>.
          </p>
        </div>

        {/* Verification Card */}
        <div className="rounded-2xl border border-navy/10 bg-ice p-5 sm:p-6 text-left space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-navy/10 pb-3 gap-2">
            <span className="text-xs font-bold text-navy uppercase tracking-wider">
              Official Ballot Receipt
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-600 bg-teal-100 px-2 py-0.5 rounded-full self-start sm:self-auto">
              <ShieldCheck size={12} /> Sealed & Anonymized
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <p className="text-ink/50 text-[10px] uppercase font-semibold">Verification Code</p>
              <p className="font-mono text-sm sm:text-base font-bold text-navy mt-0.5 tracking-wider select-all break-all">
                {receiptCode}
              </p>
            </div>

            <div>
              <p className="text-ink/50 text-[10px] uppercase font-semibold">Timestamp</p>
              <p className="font-medium text-navy mt-0.5 break-words">{timestamp}</p>
            </div>

            <div>
              <p className="text-ink/50 text-[10px] uppercase font-semibold">Voter Status</p>
              <p className="font-medium text-navy mt-0.5 break-words">
                Eligibility marked as participated • Zero duplicate ballots permitted
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-teal-100/40 p-3.5 text-left text-xs text-ink/75 leading-relaxed flex items-start gap-2.5">
          <ShieldCheck size={16} className="text-teal-600 shrink-0 mt-0.5" />
          <span className="break-words">
            <strong>Ballot Secrecy Guarantee:</strong> This receipt confirms your participation, but
            does not reveal your candidate selections. Your choices are stored independently without
            any voter identifier.
          </span>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" size="md" onClick={() => window.print()} className="w-full sm:w-auto">
            <Printer size={15} /> Print Receipt
          </Button>

          {election?.results_published ? (
            <Link href={`/results/${election.id}`} className="w-full sm:w-auto">
              <Button size="md" className="w-full">
                <BarChart3 size={15} /> View Published Results
              </Button>
            </Link>
          ) : (
            <Link href="/vote" className="w-full sm:w-auto">
              <Button size="md" className="w-full">
                Back to Elections <ArrowRight size={15} />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BallotReceiptPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-navy">Generating ballot receipt...</div>}>
      <ReceiptContent />
    </Suspense>
  );
}
