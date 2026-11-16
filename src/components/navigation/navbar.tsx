"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { store } from "@/lib/store";
import { Vote, LayoutDashboard, LogIn, UserCircle2, ArrowRight } from "lucide-react";

export function Navbar() {
  const pathname = usePathname() || "";
  const [currentUser, setCurrentUser] = useState(store.getCurrentUser());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCurrentUser(store.getCurrentUser());
  }, [pathname]);

  const isAdmin = currentUser.role === "org_admin";

  const toggleRole = () => {
    const nextRole = isAdmin ? "voter" : "org_admin";
    const nextEmail = nextRole === "org_admin" ? "admin@apex.edu" : "voter@apex.edu";
    const nextName = nextRole === "org_admin" ? "Alex Vance (Admin)" : "Jordan Lee (Voter)";
    store.setCurrentUser({ role: nextRole, email: nextEmail, full_name: nextName });
    setCurrentUser(store.getCurrentUser());
  };

  const isAdminRoute = pathname.startsWith("/admin");
  const isVoteRoute = pathname.startsWith("/vote");

  return (
    <header className="sticky top-0 z-40 border-b border-navy/10 bg-white/95 backdrop-blur-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="flex items-center gap-1.5 font-display text-2xl font-semibold text-navy tracking-tight"
          >
            Votely<span className="text-teal">.</span>
          </Link>

          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-navy/80">
            <Link
              href="/admin"
              className={`transition-colors hover:text-navy ${
                isAdminRoute ? "text-navy font-bold" : ""
              }`}
            >
              Admin Portal
            </Link>
            <Link
              href="/vote"
              className={`transition-colors hover:text-navy ${
                isVoteRoute ? "text-navy font-bold" : ""
              }`}
            >
              Voter Portal
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick interactive role badge switcher for easy testing */}
          <button
            onClick={toggleRole}
            title="Click to toggle between Admin and Voter view mode"
            className="hidden sm:flex items-center gap-2 rounded-full border border-navy/15 bg-ice px-3 py-1.5 text-xs font-semibold text-navy hover:bg-navy/10 transition-colors"
          >
            <UserCircle2 size={15} className="text-teal-600" />
            <span>
              Role: <strong className="text-teal-600">{mounted && !isAdmin ? "Voter" : "Admin"}</strong>
            </span>
            <span className="text-[10px] uppercase tracking-wider text-ink/50 bg-white px-1.5 py-0.5 rounded-full border border-navy/10">switch</span>
          </button>

          {isAdminRoute ? (
            <Link
              href="/vote"
              className="flex items-center gap-1.5 rounded-full bg-teal-100 px-4 py-2 text-xs font-bold text-teal-600 hover:bg-teal-100/80 transition-colors"
            >
              <Vote size={15} />
              <span>Go to Voter Portal</span>
            </Link>
          ) : isVoteRoute ? (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 rounded-full bg-navy px-4 py-2 text-xs font-bold text-white hover:bg-navy-800 transition-colors"
            >
              <LayoutDashboard size={15} />
              <span>Go to Admin Portal</span>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="flex items-center gap-1.5 rounded-full border border-navy/20 px-4 py-2 text-xs font-semibold text-navy hover:bg-ice transition-colors"
              >
                <LogIn size={14} />
                <span>Sign in</span>
              </Link>
              <Link
                href="/register"
                className="flex items-center gap-1.5 rounded-full bg-navy px-4 py-2 text-xs font-semibold text-white hover:bg-navy-800 transition-colors"
              >
                <span>Get started</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
