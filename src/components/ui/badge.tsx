import React from "react";
import { ElectionStatus } from "@/lib/types";

interface BadgeProps {
  status?: ElectionStatus | "invited" | "voted" | "winner" | "tie";
  children?: React.ReactNode;
  className?: string;
}

export function StatusBadge({ status, children, className = "" }: BadgeProps) {
  let style = "bg-ice text-ink border-ice";
  let label = children;

  switch (status) {
    case "active":
      style = "bg-teal-100 text-teal-600 font-semibold border-teal/20";
      label = label || "Active Voting";
      break;
    case "scheduled":
      style = "bg-amber/15 text-navy font-semibold border-amber/30";
      label = label || "Scheduled";
      break;
    case "completed":
      style = "bg-navy/10 text-navy font-semibold border-navy/20";
      label = label || "Completed";
      break;
    case "draft":
      style = "bg-gray-100 text-gray-700 font-medium border-gray-200";
      label = label || "Draft";
      break;
    case "cancelled":
      style = "bg-red-50 text-red-700 font-medium border-red-200";
      label = label || "Cancelled";
      break;
    case "voted":
      style = "bg-teal-100 text-teal-600 font-semibold border-teal/20";
      label = label || "Ballot Cast";
      break;
    case "invited":
      style = "bg-ice text-navy/70 font-medium border-navy/10";
      label = label || "Invited";
      break;
    case "winner":
      style = "bg-teal text-white font-semibold border-teal";
      label = label || "Winner";
      break;
    case "tie":
      style = "bg-amber text-navy font-semibold border-amber";
      label = label || "Tie";
      break;
    default:
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs border ${style} ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {label}
    </span>
  );
}
