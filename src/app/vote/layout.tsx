"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { store } from "@/lib/store";
import { ShieldCheck, Vote, LayoutDashboard, LogOut } from "lucide-react";

export default function VoterLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState(store.getCurrentUser());
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const currentUser = store.getCurrentUser();
    // Guard: Require authenticated voter
    if (!currentUser.email) {
      router.replace("/login?role=voter");
      return;
    }
    setUser(currentUser);
    setIsCheckingAuth(false);
  }, [router]);

  const handleSignOut = () => {
    store.signOut();
    setUser(store.getCurrentUser());
    router.replace("/login?role=voter");
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-ice flex flex-col items-center justify-center p-6 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-100 text-teal-600 mb-4 animate-pulse">
          <Vote size={26} />
        </div>
        <h2 className="text-lg font-bold text-navy">Verifying Voter Access...</h2>
        <p className="text-xs text-ink/60 mt-1">Authenticating voter credentials</p>
      </div>
    );
  }

  const displayName = user.full_name || (user.email ? user.email.split("@")[0] : "Voter");
  const userInitial = displayName ? displayName.charAt(0).toUpperCase() : "V";

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

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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

            <button
              type="button"
              onClick={handleSignOut}
              title="Sign out"
              className="text-ink/60 hover:text-red-600 p-1.5 rounded-lg hover:bg-ice transition-colors flex items-center gap-1 text-xs"
            >
              <LogOut size={14} />
              <span className="hidden md:inline">Sign out</span>
            </button>
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
