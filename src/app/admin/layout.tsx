"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { store } from "@/lib/store";
import {
  Vote,
  LayoutDashboard,
  Users,
  Plus,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || "";
  const [org, setOrg] = useState(store.getOrganization());
  const [user, setUser] = useState(store.getCurrentUser());
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    async function initAdmin() {
      const currentUser = store.getCurrentUser();
      // Guard: Require authenticated user
      if (!currentUser.email) {
        router.replace("/login?role=org_admin");
        return;
      }
      // Guard: If authenticated user is registered as a voter, redirect to voter portal
      if (currentUser.role === "voter") {
        router.replace("/vote");
        return;
      }
      if (currentUser.role !== "org_admin") {
        router.replace("/login?role=org_admin");
        return;
      }

      await store.syncUserSession();
      const verifiedUser = store.getCurrentUser();
      const verifiedOrg = store.getOrganization();

      // Guard: Strictly verify org_admin role and confirmed organization membership
      if (!verifiedUser.email || verifiedUser.role !== "org_admin" || !verifiedOrg?.id) {
        router.replace(verifiedUser.role === "voter" ? "/vote" : "/login?role=org_admin");
        return;
      }

      setOrg(verifiedOrg);
      setUser(verifiedUser);
      setIsCheckingAuth(false);
    }
    initAdmin();
  }, [router, pathname]);

  const handleSignOut = () => {
    store.signOut();
    router.replace("/login?role=org_admin");
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-ice flex flex-col items-center justify-center p-6 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-navy text-white mb-4 animate-pulse">
          <ShieldCheck size={26} />
        </div>
        <h2 className="text-lg font-bold text-navy">Verifying Admin Access...</h2>
        <p className="text-xs text-ink/60 mt-1">Checking administrator credentials</p>
      </div>
    );
  }

  const displayName = org?.name || "Organisation Workspace";
  const orgInitial = displayName.charAt(0).toUpperCase();
  const userInitial = user.full_name ? user.full_name.charAt(0).toUpperCase() : "A";

  return (
    <div className="min-h-screen bg-ice flex flex-col text-ink">
      {/* Top Administration Bar */}
      <header className="sticky top-0 z-40 border-b border-navy/10 bg-white shadow-2xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3 sm:gap-6 min-w-0">
            <Link
              href="/"
              className="font-display text-2xl font-bold text-navy tracking-tight shrink-0"
            >
              Votely<span className="text-teal">.</span>
            </Link>

            <div className="h-5 w-px bg-navy/15 hidden sm:block shrink-0" />

            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-navy text-white text-xs font-bold">
                {orgInitial}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-navy leading-none truncate max-w-[140px] sm:max-w-[220px]">
                  {displayName}
                </p>
                <p className="text-[10px] text-ink/50 mt-0.5 hidden xs:block truncate">Admin Workspace</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link href="/admin/elections/new">
              <Button size="sm" className="hidden sm:inline-flex">
                <Plus size={15} /> New Election
              </Button>
              <button
                type="button"
                className="sm:hidden p-2 rounded-xl bg-navy text-white hover:bg-navy-800"
                aria-label="Create new election"
              >
                <Plus size={16} />
              </button>
            </Link>

            <Link
              href="/vote"
              className="text-xs font-semibold text-teal-600 hover:text-teal hidden md:flex items-center gap-1 bg-teal-100/60 px-3 py-1.5 rounded-full"
            >
              <span>Voter View</span>
              <ExternalLink size={12} />
            </Link>

            <div className="flex items-center gap-2 pl-2 border-l border-navy/10">
              <span className="h-8 w-8 rounded-full bg-ice border border-navy/15 flex items-center justify-center text-xs font-bold text-navy shrink-0">
                {userInitial}
              </span>
              <div className="hidden lg:block text-left text-xs min-w-0">
                <p className="font-semibold text-navy truncate max-w-[120px]">
                  {user.full_name || "Administrator"}
                </p>
                <p className="text-ink/50 text-[10px]">Administrator</p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                title="Sign out of admin workspace"
                className="text-ink/50 hover:text-red-600 p-1.5 rounded-lg hover:bg-ice transition-colors ml-1"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Sub-navigation Bar */}
        <div className="border-t border-navy/5 bg-white px-4 sm:px-6">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <nav className="flex space-x-6 text-xs font-semibold overflow-x-auto whitespace-nowrap py-0.5">
              <Link
                href="/admin"
                className={`py-2.5 border-b-2 transition-colors ${
                  pathname === "/admin" || (pathname.startsWith("/admin/elections") && !pathname.endsWith("/results"))
                    ? "border-navy text-navy font-bold"
                    : "border-transparent text-ink/60 hover:text-navy"
                }`}
              >
                All Elections
              </Link>
              <Link
                href="/admin/elections/new"
                className={`py-2.5 border-b-2 transition-colors ${
                  pathname === "/admin/elections/new"
                    ? "border-navy text-navy font-bold"
                    : "border-transparent text-ink/60 hover:text-navy"
                }`}
              >
                New Election
              </Link>
              <Link
                href="/vote"
                className="py-2.5 border-b-2 border-transparent text-ink/60 hover:text-navy flex items-center gap-1"
              >
                <span>Voter Portal</span>
                <ExternalLink size={11} className="text-teal-600" />
              </Link>
            </nav>

            <div className="hidden sm:flex items-center gap-1.5 text-xs text-ink/60 shrink-0">
              <ShieldCheck size={14} className="text-teal-600" />
              <span>Tenant RLS Enforced</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:py-8 sm:px-6">
        {children}
      </main>

      <footer className="border-t border-navy/10 bg-white py-6 text-center text-xs text-ink/60">
        Votely Secure Voting System • Organisation: {displayName}
      </footer>
    </div>
  );
}
