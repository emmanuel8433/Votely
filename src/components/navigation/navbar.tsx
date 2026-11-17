"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { store } from "@/lib/store";
import {
  Vote,
  LayoutDashboard,
  LogIn,
  ArrowRight,
  Menu,
  X,
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname() || "";
  const [currentUser, setCurrentUser] = useState(store.getCurrentUser());
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCurrentUser(store.getCurrentUser());
    setMobileMenuOpen(false);
  }, [pathname]);

  const isAdminRoute = pathname.startsWith("/admin");
  const isVoteRoute = pathname.startsWith("/vote");

  return (
    <header className="sticky top-0 z-40 border-b border-navy/10 bg-white/95 backdrop-blur-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6 sm:gap-8">
          <Link
            href="/"
            className="flex items-center gap-1.5 font-display text-2xl font-bold text-navy tracking-tight shrink-0"
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

        {/* Desktop Controls */}
        <div className="hidden sm:flex items-center gap-3">
          {isAdminRoute ? (
            <Link
              href="/vote"
              className="flex items-center gap-1.5 rounded-full bg-teal-100 px-4 py-2 text-xs font-bold text-teal-600 hover:bg-teal-100/80 transition-colors"
            >
              <Vote size={15} />
              <span>Voter Portal</span>
            </Link>
          ) : isVoteRoute ? (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 rounded-full bg-navy px-4 py-2 text-xs font-bold text-white hover:bg-navy-800 transition-colors"
            >
              <LayoutDashboard size={15} />
              <span>Admin Portal</span>
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

        {/* Mobile Hamburger Toggle */}
        <div className="flex sm:hidden items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            type="button"
            aria-label="Toggle navigation menu"
            className="p-2 rounded-xl text-navy hover:bg-ice transition-colors border border-navy/10"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer Dropdown */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-navy/10 bg-white px-4 py-4 space-y-2.5 shadow-lg">
          <div className="flex flex-col space-y-1.5 pt-1">
            <Link
              href="/admin"
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                isAdminRoute ? "bg-navy text-white" : "text-navy hover:bg-ice"
              }`}
            >
              <LayoutDashboard size={16} />
              <span>Admin Portal</span>
            </Link>
            <Link
              href="/vote"
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                isVoteRoute ? "bg-teal-100 text-teal-600 font-bold" : "text-navy hover:bg-ice"
              }`}
            >
              <Vote size={16} />
              <span>Voter Portal</span>
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-navy hover:bg-ice"
            >
              <LogIn size={16} />
              <span>Sign In</span>
            </Link>
            <Link
              href="/register"
              className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-amber text-navy font-bold text-sm"
            >
              <span>Register Organisation</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
