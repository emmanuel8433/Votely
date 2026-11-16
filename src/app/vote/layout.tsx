"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { store } from "@/lib/store";
import { ShieldCheck, Vote, LogOut, LayoutDashboard } from "lucide-react";

export default function VoterLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState(store.getCurrentUser());

  useEffect(() => {
    setUser(store.getCurrentUser());
  }, []);

  return (
    <div className="min-h-screen bg-ice flex flex-col text-ink">
      {/* Voter Portal Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-navy/10 bg-white shadow-2xs">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            href="/vote"
            className="flex items-center gap-1.5 font-display text-2xl font-semibold text-navy tracking-tight"
          >
            Votely<span className="text-teal">.</span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-100 font-bold text-teal-600">
                {user.full_name ? user.full_name.charAt(0) : "V"}
              </span>
              <div className="hidden sm:block text-left">
                <p className="font-semibold text-navy leading-none">{user.full_name}</p>
                <p className="text-[10px] text-ink/50 mt-0.5">{user.email}</p>
              </div>
            </div>

            <Link
              href="/admin"
              className="text-xs font-semibold text-navy hover:text-teal flex items-center gap-1 border border-navy/15 rounded-full px-3 py-1.5 bg-ice"
            >
              <LayoutDashboard size={13} />
              <span className="hidden md:inline">Admin Portal</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Ballot Surface */}
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        {children}
      </main>

      <footer className="border-t border-navy/10 bg-white py-6 text-center text-xs text-ink/60">
        <div className="flex items-center justify-center gap-1.5">
          <ShieldCheck size={14} className="text-teal-600" />
          <span>Votely Ballot Secrecy Architecture • Cryptographically Isolated Ballots</span>
        </div>
      </footer>
    </div>
  );
}
