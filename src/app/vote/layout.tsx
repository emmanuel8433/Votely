"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { store } from "@/lib/store";
import { ShieldCheck, Vote, LayoutDashboard } from "lucide-react";

export default function VoterLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState(store.getCurrentUser());

  useEffect(() => {
    setUser(store.getCurrentUser());
  }, []);

  const displayName = user.full_name || (user.email ? user.email.split("@")[0] : "Voter");
  const userInitial = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-ice flex flex-col text-ink">
      {/* Voter Portal Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-navy/10 bg-white shadow-2xs">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            href="/vote"
            className="flex items-center gap-1.5 font-display text-2xl font-bold text-navy tracking-tight shrink-0"
          >
            Votely<span className="text-teal">.</span>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <div className="flex items-center gap-2 text-xs">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-100 font-bold text-teal-600 shrink-0">
                {userInitial}
              </span>
              <div className="hidden sm:block text-left min-w-0">
                <p className="font-semibold text-navy leading-none truncate max-w-[140px]">
                  {displayName}
                </p>
                {user.email && (
                  <p className="text-[10px] text-ink/50 mt-0.5 truncate max-w-[140px]">{user.email}</p>
                )}
              </div>
            </div>

            <Link
              href="/admin"
              className="text-xs font-semibold text-navy hover:text-teal flex items-center gap-1 border border-navy/15 rounded-full px-3 py-1.5 bg-ice"
            >
              <LayoutDashboard size={13} className="shrink-0" />
              <span className="hidden sm:inline">Admin Portal</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Ballot Surface */}
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-6 sm:py-8 sm:px-6">
        {children}
      </main>

      <footer className="border-t border-navy/10 bg-white py-6 text-center text-xs text-ink/60">
        <div className="flex items-center justify-center gap-1.5 px-4">
          <ShieldCheck size={14} className="text-teal-600 shrink-0" />
          <span className="break-words">
            Votely Ballot Secrecy Architecture • Cryptographically Isolated Ballots
          </span>
        </div>
      </footer>
    </div>
  );
}
