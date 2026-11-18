"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { store } from "@/lib/store";
import {
  Vote,
  LayoutDashboard,
  LogIn,
  ArrowRight,
  Menu,
  X,
  LogOut,
  User,
} from "lucide-react";

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname() || "";
  const [currentUser, setCurrentUser] = useState(store.getCurrentUser());
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCurrentUser(store.getCurrentUser());
    setMobileMenuOpen(false);
  }, [pathname]);

  const isAuthenticated = Boolean(currentUser && currentUser.email);
  const isAdmin = currentUser?.role === "org_admin";
  const isVoter = currentUser?.role === "voter";

  const isAdminRoute = pathname.startsWith("/admin");
  const isVoteRoute = pathname.startsWith("/vote");

  const handleSignOut = () => {
    store.signOut();
    setCurrentUser(store.getCurrentUser());
    setMobileMenuOpen(false);
    router.push("/");
  };

  const displayName = currentUser.full_name || (currentUser.email ? currentUser.email.split("@")[0] : "");
  const userInitial = displayName ? displayName.charAt(0).toUpperCase() : "U";

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

          {/* Contextual navigation links: only show portals when authenticated for them */}
          {isAuthenticated ? (
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-navy/80">
              {isAdmin && (
                <Link
                  href="/admin"
                  className={`transition-colors hover:text-navy ${
                    isAdminRoute ? "text-navy font-bold" : ""
                  }`}
                >
                  Admin Portal
                </Link>
              )}
              {isVoter && (
                <Link
                  href="/vote"
                  className={`transition-colors hover:text-navy ${
                    isVoteRoute ? "text-navy font-bold" : ""
                  }`}
                >
                  Voter Portal
                </Link>
              )}
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-navy/70">
              <Link href="/#features" className="transition-colors hover:text-navy">
                Features
              </Link>
              <Link href="/login?role=voter" className="transition-colors hover:text-teal font-medium">
                Voter Access
              </Link>
            </div>
          )}
        </div>

        {/* Desktop Controls */}
        <div className="hidden sm:flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-100 font-bold text-teal-600 shrink-0">
                  {userInitial}
                </span>
                <span className="font-semibold text-navy max-w-[120px] truncate">
                  {displayName}
                </span>
              </div>

              {isAdmin ? (
                <Link
                  href="/admin"
                  className="flex items-center gap-1.5 rounded-full bg-navy px-3.5 py-1.5 text-xs font-bold text-white hover:bg-navy-800 transition-colors"
                >
                  <LayoutDashboard size={14} />
                  <span>Admin</span>
                </Link>
              ) : (
                <Link
                  href="/vote"
                  className="flex items-center gap-1.5 rounded-full bg-teal-100 px-3.5 py-1.5 text-xs font-bold text-teal-600 hover:bg-teal-100/80 transition-colors"
                >
                  <Vote size={14} />
                  <span>Ballots</span>
                </Link>
              )}

              <button
                type="button"
                onClick={handleSignOut}
                title="Sign out"
                className="text-ink/60 hover:text-red-600 p-1.5 rounded-lg hover:bg-ice transition-colors flex items-center gap-1 text-xs"
              >
                <LogOut size={14} />
                <span className="hidden lg:inline">Sign out</span>
              </button>
            </div>
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
            {isAuthenticated ? (
              <>
                <div className="px-3 py-2 rounded-xl bg-ice text-xs text-navy flex items-center justify-between">
                  <span className="font-semibold truncate">{displayName}</span>
                  <span className="text-[10px] uppercase font-bold text-ink/50 bg-white px-2 py-0.5 rounded-md border border-navy/10">
                    {isAdmin ? "Admin" : "Voter"}
                  </span>
                </div>

                {isAdmin && (
                  <Link
                    href="/admin"
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      isAdminRoute ? "bg-navy text-white" : "text-navy hover:bg-ice"
                    }`}
                  >
                    <LayoutDashboard size={16} />
                    <span>Admin Portal</span>
                  </Link>
                )}

                {isVoter && (
                  <Link
                    href="/vote"
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      isVoteRoute ? "bg-teal-100 text-teal-600 font-bold" : "text-navy hover:bg-ice"
                    }`}
                  >
                    <Vote size={16} />
                    <span>Voter Portal</span>
                  </Link>
                )}

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors w-full text-left"
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-navy hover:bg-ice"
                >
                  <LogIn size={16} />
                  <span>Sign In</span>
                </Link>
                <Link
                  href="/register/voter"
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-teal-100 text-teal-800 font-bold text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Vote size={16} className="text-teal-600" />
                    <span>Register as Voter</span>
                  </div>
                  <ArrowRight size={16} />
                </Link>
                <Link
                  href="/register"
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-amber text-navy font-bold text-sm"
                >
                  <span>Register Organisation</span>
                  <ArrowRight size={16} />
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
