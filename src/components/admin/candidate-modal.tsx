"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/notification";
import { UserPlus } from "lucide-react";

interface CandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  positionTitle: string;
  onSave: (candidate: { full_name: string; bio: string }) => Promise<void>;
}

export function CandidateModal({
  isOpen,
  onClose,
  positionTitle,
  onSave,
}: CandidateModalProps) {
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError("Candidate full name is required");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await onSave({ full_name: fullName.trim(), bio: bio.trim() });
      setFullName("");
      setBio("");
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add candidate");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Add Candidate for ${positionTitle}`}
      description="Enter the candidate's public ballot details and manifesto summary."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" message={error} />}

        <Input
          label="Candidate Full Name"
          placeholder="e.g. Amara Okafor"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />

        <Textarea
          label="Manifesto / Bio Summary"
          rows={4}
          placeholder="Key priorities, relevant experience, or short manifesto statement displayed to voters on the ballot..."
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          hint="Brief summary shown on the ballot card"
        />

        <div className="flex justify-end gap-3 pt-3 border-t border-navy/10">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            <UserPlus size={16} /> Add Candidate
          </Button>
        </div>
      </form>
    </Modal>
  );
}
