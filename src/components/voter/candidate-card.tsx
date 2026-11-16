import React from "react";
import { Check } from "lucide-react";
import { Candidate } from "@/lib/types";

interface CandidateCardProps {
  candidate: Candidate;
  isSelected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

export function CandidateCard({
  candidate,
  isSelected,
  onSelect,
  disabled = false,
}: CandidateCardProps) {
  const initial = candidate.full_name ? candidate.full_name.charAt(0).toUpperCase() : "?";

  return (
    <div
      role="radio"
      aria-checked={isSelected}
      tabIndex={disabled ? -1 : 0}
      onClick={() => !disabled && onSelect()}
      onKeyDown={(e) => {
        if (!disabled && (e.key === " " || e.key === "Enter")) {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`group relative flex cursor-pointer flex-col justify-between rounded-2xl border-2 p-5 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal ${
        isSelected
          ? "border-teal bg-teal-100/30 shadow-sm"
          : "border-navy/10 bg-white hover:border-navy/25 hover:bg-ice/40"
      } ${disabled ? "pointer-events-none opacity-50" : ""}`}
    >
      <div className="flex items-start gap-3.5">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base font-bold transition-colors ${
            isSelected ? "bg-teal text-white" : "bg-ice text-navy group-hover:bg-teal-100 group-hover:text-teal-600"
          }`}
        >
          {initial}
        </span>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-semibold text-navy text-base">{candidate.full_name}</h4>
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all ${
                isSelected
                  ? "border-teal bg-teal text-white"
                  : "border-navy/20 bg-white group-hover:border-navy/40"
              }`}
            >
              {isSelected && <Check size={14} strokeWidth={3} />}
            </div>
          </div>
          {candidate.bio && (
            <p className="mt-2 text-sm leading-relaxed text-ink/75 line-clamp-3">
              {candidate.bio}
            </p>
          )}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-navy/5 pt-3 text-xs">
        <span className={`font-semibold ${isSelected ? "text-teal-600" : "text-ink/50"}`}>
          {isSelected ? "Selected Choice" : "Click to select"}
        </span>
      </div>
    </div>
  );
}
