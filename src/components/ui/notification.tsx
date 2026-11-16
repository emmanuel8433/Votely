import React from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

interface AlertProps {
  type?: "success" | "error" | "info" | "warning";
  title?: string;
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export function Alert({
  type = "info",
  title,
  message,
  onDismiss,
  className = "",
}: AlertProps) {
  const configs = {
    success: {
      bg: "bg-teal-100/70 border-teal/30 text-teal-600",
      icon: CheckCircle2,
      text: "text-ink",
    },
    error: {
      bg: "bg-red-50 border-red-200 text-red-600",
      icon: AlertCircle,
      text: "text-red-950",
    },
    warning: {
      bg: "bg-amber/15 border-amber/30 text-amber-700",
      icon: AlertTriangle,
      text: "text-ink",
    },
    info: {
      bg: "bg-ice border-navy/15 text-navy",
      icon: Info,
      text: "text-ink",
    },
  };

  const config = configs[type];
  const Icon = config.icon;

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-xl border p-4 ${config.bg} ${className}`}
    >
      <Icon size={20} className="shrink-0 mt-0.5" />
      <div className="flex-1 text-sm">
        {title && <p className="font-semibold text-navy">{title}</p>}
        <p className={`${config.text} ${title ? "mt-0.5" : ""}`}>{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 rounded p-1 hover:bg-black/5"
          aria-label="Dismiss alert"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
