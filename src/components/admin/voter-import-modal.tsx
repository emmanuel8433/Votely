"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/notification";
import { Upload, Download, FileSpreadsheet } from "lucide-react";

interface VoterImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (voters: { email: string; full_name?: string }[]) => Promise<{ added: number; skipped: number }>;
}

export function VoterImportModal({ isOpen, onClose, onImport }: VoterImportModalProps) {
  const [csvText, setCsvText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ added: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sampleCSV = `email,full_name\njordan.lee@apex.edu,Jordan Lee\nsarah.c@apex.edu,Sarah Connor\nmarcus.a@apex.edu,Marcus Aurelius`;

  const handleDownloadSample = () => {
    const blob = new Blob([sampleCSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "votely_voter_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCSV = (text: string) => {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length === 0) return [];

    const voters: { email: string; full_name?: string }[] = [];
    const startIndex = lines[0].toLowerCase().includes("email") ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const parts = line.split(",").map((p) => p.trim().replace(/^["']|["']$/g, ""));
      if (parts[0] && parts[0].includes("@")) {
        voters.push({
          email: parts[0],
          full_name: parts[1] || undefined,
        });
      }
    }
    return voters;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) setCsvText(content);
    };
    reader.readAsText(file);
  };

  const handleProcessImport = async () => {
    setError(null);
    setResult(null);

    const parsed = parseCSV(csvText);
    if (parsed.length === 0) {
      setError("No valid emails found. Please provide at least one valid email address.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await onImport(parsed);
      setResult(res);
      setCsvText("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to import voters");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setResult(null);
        setError(null);
        onClose();
      }}
      title="Import Eligible Voters"
      description="Add voters to the election roster in bulk via CSV or text paste."
      maxWidth="lg"
    >
      <div className="space-y-4">
        {result && (
          <Alert
            type="success"
            title="Import Completed"
            message={`Successfully added ${result.added} voter(s). ${
              result.skipped > 0 ? `${result.skipped} duplicate or invalid entries skipped.` : ""
            }`}
          />
        )}

        {error && <Alert type="error" message={error} />}

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-navy/10 bg-ice p-3 text-xs">
          <div className="flex items-center gap-2 text-ink">
            <FileSpreadsheet size={16} className="text-teal-600" />
            <span>Format: <code>email, full_name</code> (comma-separated)</span>
          </div>
          <button
            type="button"
            onClick={handleDownloadSample}
            className="flex items-center gap-1 font-semibold text-teal-600 hover:text-teal transition-colors"
          >
            <Download size={14} /> Download Sample CSV
          </button>
        </div>

        <div>
          <label className="block text-sm font-semibold text-navy mb-1.5">Upload CSV file</label>
          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            onChange={handleFileUpload}
            className="w-full text-xs text-ink file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-ice file:text-navy hover:file:bg-navy/10 cursor-pointer"
          />
        </div>

        <Textarea
          label="Or Paste CSV Data Directly"
          rows={6}
          placeholder="email,full_name&#10;amara@apex.edu,Amara Okafor&#10;tunde@apex.edu,Tunde Bello"
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          hint="One voter per line: email, followed by optional full name"
        />

        <div className="flex justify-end gap-3 pt-3 border-t border-navy/10">
          <Button variant="outline" type="button" onClick={onClose}>
            {result ? "Done" : "Cancel"}
          </Button>
          <Button
            type="button"
            isLoading={isLoading}
            disabled={!csvText.trim()}
            onClick={handleProcessImport}
          >
            <Upload size={16} /> Import Voters
          </Button>
        </div>
      </div>
    </Modal>
  );
}
