"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { store } from "@/lib/store";
import { ElectionStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/notification";
import { ArrowLeft, Calendar, Plus, CheckCircle2 } from "lucide-react";

export default function NewElectionPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ElectionStatus>("draft");

  // Defaults: starts today, ends in 7 days
  const now = new Date();
  const nextWeek = new Date(Date.now() + 7 * 24 * 3600 * 1000);

  const formatDateForInput = (d: Date) => {
    return d.toISOString().slice(0, 16);
  };

  const [startsAt, setStartsAt] = useState(formatDateForInput(now));
  const [endsAt, setEndsAt] = useState(formatDateForInput(nextWeek));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Election title is required.");
      return;
    }

    const startDate = new Date(startsAt);
    const endDate = new Date(endsAt);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      setError("Please specify valid start and end dates.");
      return;
    }

    if (endDate <= startDate) {
      setError("Voting end time must be later than the start time.");
      return;
    }

    try {
      setIsLoading(true);
      const newElection = await store.createElection({
        title: title.trim(),
        description: description.trim(),
        starts_at: startDate.toISOString(),
        ends_at: endDate.toISOString(),
        status,
      });

      router.push(`/admin/elections/${newElection.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create election.");
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-navy/15 text-navy hover:bg-ice transition-colors"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Create New Election</h1>
          <p className="text-xs text-ink/70">
            Configure the election details, timeline, and voting parameters.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-9 border border-navy/10 shadow-xl">
        {error && <Alert type="error" message={error} className="mb-6" />}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Election Title"
            placeholder="e.g. Student Union Executive Election 2027"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            hint="Displayed prominently to voters on their ballots"
            required
          />

          <Textarea
            label="Description / Purpose"
            rows={4}
            placeholder="Explain the background, eligibility requirements, or election guidelines..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            hint="Optional contextual description displayed on the voter portal"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Voting Starts At"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
            />

            <Input
              label="Voting Ends At"
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-navy mb-1.5">
              Initial Election Status
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: "draft" as ElectionStatus,
                  label: "Draft",
                  desc: "Keep private while setting up positions and voters",
                },
                {
                  id: "scheduled" as ElectionStatus,
                  label: "Scheduled",
                  desc: "Visible to voters; voting opens automatically at start time",
                },
                {
                  id: "active" as ElectionStatus,
                  label: "Active Immediately",
                  desc: "Open for voting right now",
                },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setStatus(opt.id)}
                  className={`text-left p-3.5 rounded-2xl border-2 transition-all ${
                    status === opt.id
                      ? "border-teal bg-teal-100/30 text-navy"
                      : "border-navy/10 bg-white hover:border-navy/20"
                  }`}
                >
                  <p className="font-bold text-xs">{opt.label}</p>
                  <p className="text-[11px] text-ink/70 mt-1 leading-normal">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-navy/10">
            <Link href="/admin">
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </Link>
            <Button type="submit" isLoading={isLoading}>
              Save & Configure Positions <Plus size={16} />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
