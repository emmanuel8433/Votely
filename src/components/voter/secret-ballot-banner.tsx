import React from "react";
import { ShieldCheck } from "lucide-react";

export function SecretBallotBanner() {
  return (
    <div className="flex items-start gap-3.5 rounded-2xl border border-navy/10 bg-ice p-4.5 sm:p-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-600">
        <ShieldCheck size={22} />
      </div>
      <div>
        <p className="font-semibold text-navy">Secret Ballot Protection Enabled</p>
        <p className="mt-1 text-sm leading-relaxed text-ink/75">
          Your voter eligibility validates your right to cast a single ballot. Once submitted, your
          ballot selections are stored independently without voter identifiers, ensuring your choices
          remain completely anonymous from administrators and peers.
        </p>
      </div>
    </div>
  );
}
