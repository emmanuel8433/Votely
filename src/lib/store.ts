"use client";

import {
  Election,
  Position,
  Candidate,
  EligibleVoter,
  BallotChoice,
  ElectionResultsData,
  ElectionStatus,
  Profile,
} from "./types";
import { isSupabaseConfigured, supabaseClient } from "./supabase/client";

function isValidUUID(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
}

export interface OrganizationInfo {
  id: string;
  name: string;
  type: string;
  status: "active" | "suspended" | "inactive";
}

const DEFAULT_ORG: OrganizationInfo = {
  id: "",
  name: "Organisation Workspace",
  type: "General",
  status: "active",
};

const DEFAULT_USER: Profile = {
  id: "",
  full_name: "",
  email: "",
  is_super_admin: false,
  role: undefined,
};

class DataStore {
  private elections: Election[] = [];
  private positions: Record<string, Position[]> = {};
  private voters: Record<string, EligibleVoter[]> = {};
  private ballots: Record<string, BallotChoice[][]> = {};
  private organization: OrganizationInfo = { ...DEFAULT_ORG };
  private currentUser: Profile = { ...DEFAULT_USER };
  private isMigrating = false;

  constructor() {
    if (typeof window !== "undefined") {
      this.loadFromStorage();
      // Asynchronously sync session with cloud if user was logged in
      if (this.currentUser.email) {
        this.syncUserSession();
      }
    }
  }

  private saveToStorage() {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("votely_elections", JSON.stringify(this.elections));
      localStorage.setItem("votely_positions", JSON.stringify(this.positions));
      localStorage.setItem("votely_voters", JSON.stringify(this.voters));
      localStorage.setItem("votely_ballots", JSON.stringify(this.ballots));
      localStorage.setItem("votely_user", JSON.stringify(this.currentUser));
      localStorage.setItem("votely_org", JSON.stringify(this.organization));
    } catch {
      // storage unavailable or full
    }
  }

  private loadFromStorage() {
    try {
      const el = localStorage.getItem("votely_elections");
      if (el) {
        const parsed = JSON.parse(el);
        this.elections = Array.isArray(parsed)
          ? parsed.filter(
              (e: Election) => e.id !== "el-1" && e.id !== "el-2" && e.id !== "el-3"
            )
          : [];
      }

      const pos = localStorage.getItem("votely_positions");
      if (pos) {
        const parsed = JSON.parse(pos);
        delete parsed["el-1"];
        delete parsed["el-2"];
        delete parsed["el-3"];
        this.positions = parsed;
      }

      const vt = localStorage.getItem("votely_voters");
      if (vt) {
        const parsed = JSON.parse(vt);
        delete parsed["el-1"];
        delete parsed["el-2"];
        delete parsed["el-3"];
        this.voters = parsed;
      }

      const bl = localStorage.getItem("votely_ballots");
      if (bl) {
        const parsed = JSON.parse(bl);
        delete parsed["el-1"];
        delete parsed["el-2"];
        delete parsed["el-3"];
        this.ballots = parsed;
      }

      const usr = localStorage.getItem("votely_user");
      if (usr) {
        const parsed = JSON.parse(usr);
        if (
          parsed &&
          parsed.email &&
          parsed.email !== "admin@apex.edu" &&
          parsed.email !== "voter@apex.edu" &&
          parsed.email !== "admin@organisation.org"
        ) {
          this.currentUser = parsed;
        } else {
          this.currentUser = { ...DEFAULT_USER };
        }
      }

      const org = localStorage.getItem("votely_org");
      if (org) {
        const parsed = JSON.parse(org);
        if (parsed && !parsed.name?.includes("Apex University")) {
          this.organization = parsed;
        }
      }
    } catch {
      // fallback
    }
  }

  isAuthenticated(): boolean {
    return Boolean(this.currentUser && this.currentUser.email);
  }

  getCurrentUser(): Profile {
    return this.currentUser;
  }

  setCurrentUser(user: Partial<Profile>) {
    this.currentUser = { ...this.currentUser, ...user };
    this.saveToStorage();
  }

  signOut() {
    this.currentUser = { ...DEFAULT_USER };
    this.organization = { ...DEFAULT_ORG };
    this.elections = [];
    this.positions = {};
    this.voters = {};
    this.ballots = {};
    this.saveToStorage();
    if (isSupabaseConfigured()) {
      const client = supabaseClient();
      if (client) {
        client.auth.signOut().catch(() => {});
      }
    }
  }

  getOrganization(): OrganizationInfo {
    return this.organization;
  }

  setOrganization(org: Partial<OrganizationInfo>) {
    this.organization = {
      ...this.organization,
      ...org,
      id: org.id || this.organization.id || `org-${Date.now()}`,
    };
    this.saveToStorage();
  }

  /**
   * Synchronizes user profile, organization, and local data with the cloud database.
   * Ensures that logging in on any device pulls down the user's correct organization
   * and shared elections.
   */
  async syncUserSession(data?: {
    userId?: string;
    email?: string;
    fullName?: string;
    role?: "org_admin" | "voter";
  }): Promise<void> {
    const userId = data?.userId || this.currentUser.id;
    const email = data?.email || this.currentUser.email;
    const fullName = data?.fullName || this.currentUser.full_name;
    const role = data?.role || this.currentUser.role;

    if (!email && !userId) return;

    try {
      const res = await fetch("/api/auth/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, email, fullName, role }),
      });

      if (res.ok) {
        const body = await res.json();
        if (body.profile) {
          this.currentUser = {
            ...this.currentUser,
            id: body.profile.id || this.currentUser.id,
            email: body.profile.email || this.currentUser.email,
            full_name: body.profile.full_name || this.currentUser.full_name,
            role: body.profile.role || this.currentUser.role,
          };
        }
        if (body.organization) {
          this.organization = {
            id: body.organization.id,
            name: body.organization.name,
            type: body.organization.type || "General",
            status: body.organization.status || "active",
          };
        }
        this.saveToStorage();

        // Migrate any previous local-only elections created on this device to the database
        await this.migrateLocalDataToDb();
      }
    } catch {
      // Non-blocking: continue with stored credentials if offline
    }
  }

  /**
   * Uploads any legacy local elections created on this machine that were never saved to Supabase
   */
  async migrateLocalDataToDb(): Promise<void> {
    if (this.isMigrating || !this.organization.id || !isValidUUID(this.organization.id)) return;
    this.isMigrating = true;

    try {
      const localOnlyElections = this.elections.filter(
        (e) => !isValidUUID(e.id) && e.id.startsWith("el-")
      );

      for (const localEl of localOnlyElections) {
        const res = await fetch("/api/elections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: localEl.title,
            description: localEl.description,
            starts_at: localEl.starts_at,
            ends_at: localEl.ends_at,
            status: localEl.status,
            org_id: this.organization.id,
            userId: this.currentUser.id,
          }),
        });

        if (res.ok) {
          const body = await res.json();
          const cloudEl: Election = body.election;
          if (cloudEl && cloudEl.id) {
            // Migrate positions
            const localPositions = this.positions[localEl.id] || [];
            for (const p of localPositions) {
              const posRes = await fetch(`/api/elections/${cloudEl.id}/positions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: p.title }),
              });
              if (posRes.ok) {
                const posBody = await posRes.json();
                const cloudPos: Position = posBody.position;
                for (const c of p.candidates || []) {
                  await fetch(`/api/elections/${cloudEl.id}/candidates`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      position_id: cloudPos.id,
                      full_name: c.full_name,
                      bio: c.bio,
                      photo_path: c.photo_path,
                    }),
                  });
                }
              }
            }

            // Migrate voters
            const localVoters = this.voters[localEl.id] || [];
            if (localVoters.length > 0) {
              await fetch(`/api/elections/${cloudEl.id}/voters`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  voters: localVoters.map((v) => ({
                    email: v.email,
                    full_name: v.full_name,
                  })),
                }),
              });
            }

            // Replace local election with cloud election
            this.elections = this.elections.filter((e) => e.id !== localEl.id);
            this.elections.unshift(cloudEl);
            delete this.positions[localEl.id];
            delete this.voters[localEl.id];
            delete this.ballots[localEl.id];
            this.saveToStorage();
          }
        }
      }
    } catch (e) {
      console.warn("Migration note:", e);
    } finally {
      this.isMigrating = false;
    }
  }

  async getElections(): Promise<Election[]> {
    try {
      const params = new URLSearchParams();
      if (this.organization.id && isValidUUID(this.organization.id)) {
        params.append("orgId", this.organization.id);
      }
      if (this.currentUser.id && isValidUUID(this.currentUser.id)) {
        params.append("userId", this.currentUser.id);
      }

      const url = `/api/elections${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url);
      if (res.ok) {
        const body = await res.json();
        if (body.elections && Array.isArray(body.elections)) {
          this.elections = body.elections;
          this.saveToStorage();
          return body.elections;
        }
      }
    } catch {
      // fallback
    }

    // Local fallback
    if (this.currentUser.role === "org_admin" && this.organization.id) {
      return this.elections.filter(
        (e) => !e.org_id || e.org_id === this.organization.id
      );
    }
    return [...this.elections];
  }

  /**
   * Returns only elections that the given voter email has been invited to.
   */
  async getElectionsForVoter(email: string): Promise<Election[]> {
    const normalised = email.toLowerCase().trim();

    try {
      const res = await fetch(`/api/elections?voterEmail=${encodeURIComponent(normalised)}`);
      if (res.ok) {
        const body = await res.json();
        if (body.elections && Array.isArray(body.elections)) {
          return body.elections;
        }
      }
    } catch {
      // fallback
    }

    return this.elections.filter((el) => {
      const roster = this.voters[el.id] || [];
      return roster.some((v) => v.email.toLowerCase() === normalised);
    });
  }

  async getElectionById(id: string): Promise<Election | null> {
    if (isValidUUID(id)) {
      try {
        const res = await fetch(`/api/elections/${id}`);
        if (res.ok) {
          const body = await res.json();
          if (body.election) {
            return body.election;
          }
        }
      } catch {
        // fallback
      }
    }

    const found = this.elections.find((e) => e.id === id);
    if (!found) return null;
    const positions = await this.getPositions(id);
    return { ...found, positions };
  }

  async createElection(data: {
    title: string;
    description: string;
    starts_at: string;
    ends_at: string;
    status: ElectionStatus;
  }): Promise<Election> {
    try {
      const res = await fetch("/api/elections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          starts_at: data.starts_at,
          ends_at: data.ends_at,
          status: data.status,
          org_id: this.organization.id,
          userId: this.currentUser.id,
        }),
      });

      if (res.ok) {
        const body = await res.json();
        if (body.election) {
          const newEl: Election = body.election;
          this.elections.unshift(newEl);
          this.positions[newEl.id] = [];
          this.voters[newEl.id] = [];
          this.ballots[newEl.id] = [];
          this.saveToStorage();
          return newEl;
        }
      }
    } catch {
      // fallback
    }

    const newElection: Election = {
      id: `el-${Date.now()}`,
      org_id: this.organization.id || `org-${Date.now()}`,
      title: data.title,
      description: data.description,
      starts_at: data.starts_at,
      ends_at: data.ends_at,
      status: data.status,
      results_published: false,
      eligible_voters_count: 0,
      ballots_cast_count: 0,
      positions: [],
    };

    this.elections.unshift(newElection);
    this.positions[newElection.id] = [];
    this.voters[newElection.id] = [];
    this.ballots[newElection.id] = [];
    this.saveToStorage();
    return newElection;
  }

  async updateElection(id: string, updates: Partial<Election>): Promise<Election> {
    if (isValidUUID(id)) {
      try {
        const res = await fetch(`/api/elections/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        if (res.ok) {
          const body = await res.json();
          if (body.election) {
            const index = this.elections.findIndex((e) => e.id === id);
            if (index !== -1) {
              this.elections[index] = { ...this.elections[index], ...body.election };
            }
            this.saveToStorage();
            return body.election;
          }
        }
      } catch {
        // fallback
      }
    }

    const index = this.elections.findIndex((e) => e.id === id);
    if (index !== -1) {
      this.elections[index] = { ...this.elections[index], ...updates };
      this.saveToStorage();
      return this.elections[index];
    }
    throw new Error("Election not found");
  }

  async getPositions(electionId: string): Promise<Position[]> {
    if (isValidUUID(electionId)) {
      try {
        const res = await fetch(`/api/elections/${electionId}/positions`);
        if (res.ok) {
          const body = await res.json();
          if (body.positions) {
            this.positions[electionId] = body.positions;
            this.saveToStorage();
            return body.positions;
          }
        }
      } catch {
        // fallback
      }
    }
    return this.positions[electionId] || [];
  }

  async addPosition(electionId: string, title: string): Promise<Position> {
    if (isValidUUID(electionId)) {
      try {
        const res = await fetch(`/api/elections/${electionId}/positions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        });
        if (res.ok) {
          const body = await res.json();
          if (body.position) {
            if (!this.positions[electionId]) this.positions[electionId] = [];
            this.positions[electionId].push(body.position);
            this.saveToStorage();
            return body.position;
          }
        }
      } catch {
        // fallback
      }
    }

    const newPos: Position = {
      id: `pos-${Date.now()}`,
      election_id: electionId,
      title,
      candidates: [],
    };
    if (!this.positions[electionId]) this.positions[electionId] = [];
    this.positions[electionId].push(newPos);
    this.saveToStorage();
    return newPos;
  }

  async deletePosition(electionId: string, positionId: string): Promise<void> {
    if (isValidUUID(positionId)) {
      try {
        await fetch(`/api/elections/${electionId}/positions?posId=${positionId}`, {
          method: "DELETE",
        });
      } catch {
        // fallback
      }
    }
    if (this.positions[electionId]) {
      this.positions[electionId] = this.positions[electionId].filter((p) => p.id !== positionId);
      this.saveToStorage();
    }
  }

  async addCandidate(
    electionId: string,
    positionId: string,
    candidate: { full_name: string; bio: string; photo_path?: string }
  ): Promise<Candidate> {
    if (isValidUUID(positionId)) {
      try {
        const res = await fetch(`/api/elections/${electionId}/candidates`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            position_id: positionId,
            full_name: candidate.full_name,
            bio: candidate.bio,
            photo_path: candidate.photo_path,
          }),
        });
        if (res.ok) {
          const body = await res.json();
          if (body.candidate) {
            const list = this.positions[electionId] || [];
            const pos = list.find((p) => p.id === positionId);
            if (pos) {
              pos.candidates.push(body.candidate);
              this.saveToStorage();
            }
            return body.candidate;
          }
        }
      } catch {
        // fallback
      }
    }

    const newCand: Candidate = {
      id: `cand-${Date.now()}`,
      position_id: positionId,
      full_name: candidate.full_name,
      bio: candidate.bio,
      photo_path: candidate.photo_path,
    };
    const list = this.positions[electionId] || [];
    const pos = list.find((p) => p.id === positionId);
    if (pos) {
      pos.candidates.push(newCand);
      this.saveToStorage();
    }
    return newCand;
  }

  async deleteCandidate(
    electionId: string,
    positionId: string,
    candidateId: string
  ): Promise<void> {
    if (isValidUUID(candidateId)) {
      try {
        await fetch(`/api/elections/${electionId}/candidates?candidateId=${candidateId}`, {
          method: "DELETE",
        });
      } catch {
        // fallback
      }
    }
    const list = this.positions[electionId] || [];
    const pos = list.find((p) => p.id === positionId);
    if (pos) {
      pos.candidates = pos.candidates.filter((c) => c.id !== candidateId);
      this.saveToStorage();
    }
  }

  async getVoters(electionId: string): Promise<EligibleVoter[]> {
    if (isValidUUID(electionId)) {
      try {
        const res = await fetch(`/api/elections/${electionId}/voters`);
        if (res.ok) {
          const body = await res.json();
          if (body.voters) {
            this.voters[electionId] = body.voters;
            this.saveToStorage();
            return body.voters;
          }
        }
      } catch {
        // fallback
      }
    }
    return this.voters[electionId] || [];
  }

  async addVoter(
    electionId: string,
    voter: { email: string; full_name?: string }
  ): Promise<EligibleVoter> {
    const cleanEmail = voter.email.toLowerCase().trim();

    if (isValidUUID(electionId)) {
      const res = await fetch(`/api/elections/${electionId}/voters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, full_name: voter.full_name }),
      });
      if (res.ok) {
        const body = await res.json();
        if (body.voter) {
          if (!this.voters[electionId]) this.voters[electionId] = [];
          this.voters[electionId].push(body.voter);
          this.saveToStorage();
          return body.voter;
        }
      } else {
        const errBody = await res.json();
        throw new Error(errBody.error || "Failed to add voter");
      }
    }

    const newV: EligibleVoter = {
      id: `v-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      election_id: electionId,
      email: cleanEmail,
      full_name: voter.full_name,
      voted: false,
    };

    if (!this.voters[electionId]) this.voters[electionId] = [];
    const existing = this.voters[electionId].find((v) => v.email === newV.email);
    if (existing) throw new Error("A voter with this email already exists in this election");
    this.voters[electionId].push(newV);

    const el = this.elections.find((e) => e.id === electionId);
    if (el) el.eligible_voters_count = (el.eligible_voters_count || 0) + 1;

    this.saveToStorage();
    return newV;
  }

  async importVoters(
    electionId: string,
    list: { email: string; full_name?: string }[]
  ): Promise<{ added: number; skipped: number }> {
    if (isValidUUID(electionId)) {
      try {
        const res = await fetch(`/api/elections/${electionId}/voters`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ voters: list }),
        });
        if (res.ok) {
          const body = await res.json();
          await this.getVoters(electionId);
          return { added: body.added || 0, skipped: body.skipped || 0 };
        }
      } catch {
        // fallback
      }
    }

    let added = 0;
    let skipped = 0;
    for (const item of list) {
      try {
        await this.addVoter(electionId, item);
        added++;
      } catch {
        skipped++;
      }
    }
    return { added, skipped };
  }

  async castBallot(
    electionId: string,
    voterEmail: string,
    choices: BallotChoice[]
  ): Promise<{ success: boolean; receipt_code: string }> {
    if (isValidUUID(electionId)) {
      const res = await fetch(`/api/elections/${electionId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voterEmail, choices }),
      });
      if (res.ok) {
        const body = await res.json();
        return { success: true, receipt_code: body.receipt_code };
      } else {
        const errBody = await res.json();
        throw new Error(errBody.error || "Failed to cast ballot");
      }
    }

    const election = await this.getElectionById(electionId);
    if (!election) throw new Error("Election not found");
    if (election.status !== "active") throw new Error("Voting is not open for this election");

    const now = new Date();
    if (now < new Date(election.starts_at) || now > new Date(election.ends_at)) {
      throw new Error("Ballot rejected: outside active voting window");
    }

    const voters = await this.getVoters(electionId);
    const voter = voters.find((v) => v.email.toLowerCase() === voterEmail.toLowerCase());
    if (!voter) throw new Error("This email is not on the eligible voter roster for this election");
    if (voter.voted) throw new Error("Ballot rejected: You have already cast a ballot in this election");

    const positions = await this.getPositions(electionId);
    if (choices.length !== positions.length) {
      throw new Error("You must select exactly one candidate for every position on the ballot");
    }

    voter.voted = true;
    voter.voted_at = new Date().toISOString();

    if (!this.ballots[electionId]) this.ballots[electionId] = [];
    this.ballots[electionId].push(choices);

    const el = this.elections.find((e) => e.id === electionId);
    if (el) {
      el.ballots_cast_count = (el.ballots_cast_count || 0) + 1;
    }

    this.saveToStorage();

    const receipt_code = `VOTE-${electionId.slice(-4).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    return { success: true, receipt_code };
  }

  async getElectionResults(electionId: string): Promise<ElectionResultsData> {
    if (isValidUUID(electionId)) {
      try {
        const res = await fetch(`/api/elections/${electionId}/results`);
        if (res.ok) {
          const body = await res.json();
          if (body.results) {
            return body.results;
          }
        }
      } catch {
        // fallback
      }
    }

    const election = await this.getElectionById(electionId);
    if (!election) throw new Error("Election not found");

    const positions = await this.getPositions(electionId);
    const voters = await this.getVoters(electionId);
    const ballots = this.ballots[electionId] || [];

    const total_eligible_voters = voters.length || election.eligible_voters_count || 0;
    const total_ballots_cast = ballots.length || election.ballots_cast_count || 0;
    const turnout_percentage =
      total_eligible_voters > 0
        ? Math.round((total_ballots_cast / total_eligible_voters) * 100)
        : 0;

    const positionResults = positions.map((pos) => {
      const votesPerCand: Record<string, number> = {};
      pos.candidates.forEach((c) => {
        votesPerCand[c.id] = 0;
      });

      ballots.forEach((ballot) => {
        const sel = ballot.find((b) => b.position_id === pos.id);
        if (sel && votesPerCand[sel.candidate_id] !== undefined) {
          votesPerCand[sel.candidate_id]++;
        }
      });

      const posTotalVotes = Object.values(votesPerCand).reduce((a, b) => a + b, 0);

      let maxVotes = -1;
      Object.values(votesPerCand).forEach((v) => {
        if (v > maxVotes) maxVotes = v;
      });

      const winnersCount = Object.values(votesPerCand).filter((v) => v === maxVotes && v > 0).length;
      const isTie = winnersCount > 1;

      const candidatesResult = pos.candidates.map((c) => {
        const votes = votesPerCand[c.id] || 0;
        const percentage = posTotalVotes > 0 ? Math.round((votes / posTotalVotes) * 100) : 0;
        return {
          candidate_id: c.id,
          full_name: c.full_name,
          bio: c.bio,
          votes,
          percentage,
          is_winner: votes === maxVotes && maxVotes > 0 && !isTie,
          is_tie: votes === maxVotes && maxVotes > 0 && isTie,
        };
      });

      return {
        position_id: pos.id,
        position_title: pos.title,
        total_votes: posTotalVotes,
        candidates: candidatesResult.sort((a, b) => b.votes - a.votes),
      };
    });

    return {
      election_id: election.id,
      election_title: election.title,
      starts_at: election.starts_at,
      ends_at: election.ends_at,
      status: election.status,
      results_published: election.results_published,
      total_eligible_voters,
      total_ballots_cast,
      turnout_percentage,
      positions: positionResults,
    };
  }
}

export const store = new DataStore();
