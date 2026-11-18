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
  // Pure empty state: zero demo elections, positions, voters, or ballots
  private elections: Election[] = [];
  private positions: Record<string, Position[]> = {};
  private voters: Record<string, EligibleVoter[]> = {};
  private ballots: Record<string, BallotChoice[][]> = {};
  private organization: OrganizationInfo = DEFAULT_ORG;
  private currentUser: Profile = DEFAULT_USER;

  constructor() {
    if (typeof window !== "undefined") {
      this.loadFromStorage();
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
      // Automatically purge any previous demo fixtures ("el-1", "el-2", "el-3", "Apex")
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
    this.currentUser = {
      id: "",
      full_name: "",
      email: "",
      is_super_admin: false,
      role: undefined,
    };
    this.organization = { ...DEFAULT_ORG };
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

  async getElections(): Promise<Election[]> {
    if (isSupabaseConfigured()) {
      const client = supabaseClient();
      if (client) {
        try {
          const { data, error } = await client
            .from("elections")
            .select("*")
            .order("starts_at", { ascending: false });
          if (!error && data) return data as Election[];
        } catch {
          // fallback to storage
        }
      }
    }
    // In local mode: if logged in as an org_admin, only return elections created for this organization
    if (this.currentUser.role === "org_admin" && this.organization.id) {
      return this.elections.filter(
        (e) => !e.org_id || e.org_id === this.organization.id
      );
    }
    return [...this.elections];
  }

  /**
   * Returns only elections that the given voter email has been invited to
   * (i.e., appears in eligible_voters for that election).
   * Used by the voter dashboard to scope visibility.
   */
  async getElectionsForVoter(email: string): Promise<Election[]> {
    const normalised = email.toLowerCase().trim();

    if (isSupabaseConfigured()) {
      const client = supabaseClient();
      if (client) {
        try {
          // Fetch all eligible_voter rows for this email
          const { data: evRows, error: evError } = await client
            .from("eligible_voters")
            .select("election_id")
            .eq("email", normalised);
          if (!evError && evRows && evRows.length > 0) {
            const ids = evRows.map((r: { election_id: string }) => r.election_id);
            const { data: elections, error: elError } = await client
              .from("elections")
              .select("*")
              .in("id", ids)
              .order("starts_at", { ascending: false });
            if (!elError && elections) return elections as Election[];
          }
          return [];
        } catch {
          // fallback
        }
      }
    }

    // Local-storage fallback: iterate elections, check voter roster
    return this.elections.filter((el) => {
      const roster = this.voters[el.id] || [];
      return roster.some((v) => v.email.toLowerCase() === normalised);
    });
  }

  async getElectionById(id: string): Promise<Election | null> {
    if (isSupabaseConfigured() && isValidUUID(id)) {
      const client = supabaseClient();
      if (client) {
        try {
          const { data, error } = await client.from("elections").select("*").eq("id", id).single();
          if (!error && data) {
            const positions = await this.getPositions(id);
            return { ...data, positions } as Election;
          }
        } catch {
          // fallback
        }
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
    let createdFromDb: Election | null = null;

    if (isSupabaseConfigured()) {
      const client = supabaseClient();
      if (client) {
        try {
          const { data: { user } } = await client.auth.getUser();
          let orgId: string | null = null;
          if (user) {
            const { data: mem } = await client
              .from("memberships")
              .select("org_id")
              .eq("user_id", user.id)
              .limit(1)
              .single();
            if (mem?.org_id) orgId = mem.org_id;
          }

          if (!orgId) {
            const { data: orgs } = await client.from("organizations").select("id").limit(1);
            if (orgs && orgs.length > 0) orgId = orgs[0].id;
          }

          // If no organization row exists in Supabase yet, create one
          if (!orgId) {
            const { data: newOrg } = await client
              .from("organizations")
              .insert({
                name: this.organization.name || "Main Organisation",
                type: this.organization.type || "General",
              })
              .select()
              .single();
            if (newOrg) orgId = newOrg.id;
          }

          if (orgId && isValidUUID(orgId)) {
            const { data: dbData, error } = await client
              .from("elections")
              .insert({
                title: data.title,
                description: data.description,
                starts_at: data.starts_at,
                ends_at: data.ends_at,
                status: data.status,
                org_id: orgId,
              })
              .select()
              .single();
            if (!error && dbData) {
              createdFromDb = dbData as Election;
            }
          }
        } catch {
          // fallback
        }
      }
    }

    const newElection: Election = createdFromDb || {
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
    if (isSupabaseConfigured() && isValidUUID(id)) {
      const client = supabaseClient();
      if (client) {
        try {
          const { data, error } = await client
            .from("elections")
            .update(updates)
            .eq("id", id)
            .select()
            .single();
          if (!error && data) return data as Election;
        } catch {
          // fallback
        }
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
    if (isSupabaseConfigured() && isValidUUID(electionId)) {
      const client = supabaseClient();
      if (client) {
        try {
          const { data: posData } = await client
            .from("positions")
            .select("*")
            .eq("election_id", electionId);
          if (posData) {
            const { data: candData } = await client.from("candidates").select("*");
            return posData.map((p) => ({
              ...p,
              candidates: (candData || []).filter((c) => c.position_id === p.id),
            }));
          }
        } catch {
          // fallback
        }
      }
    }
    return this.positions[electionId] || [];
  }

  async addPosition(electionId: string, title: string): Promise<Position> {
    const newPos: Position = {
      id: `pos-${Date.now()}`,
      election_id: electionId,
      title,
      candidates: [],
    };

    if (isSupabaseConfigured() && isValidUUID(electionId)) {
      const client = supabaseClient();
      if (client) {
        try {
          const { data, error } = await client
            .from("positions")
            .insert({ election_id: electionId, title })
            .select()
            .single();
          if (!error && data) return { ...data, candidates: [] };
        } catch {
          // fallback
        }
      }
    }

    if (!this.positions[electionId]) this.positions[electionId] = [];
    this.positions[electionId].push(newPos);
    this.saveToStorage();
    return newPos;
  }

  async deletePosition(electionId: string, positionId: string): Promise<void> {
    if (isSupabaseConfigured() && isValidUUID(positionId)) {
      const client = supabaseClient();
      if (client) {
        try {
          await client.from("positions").delete().eq("id", positionId);
        } catch {
          // fallback
        }
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
    const newCand: Candidate = {
      id: `cand-${Date.now()}`,
      position_id: positionId,
      full_name: candidate.full_name,
      bio: candidate.bio,
      photo_path: candidate.photo_path,
    };

    if (isSupabaseConfigured() && isValidUUID(positionId)) {
      const client = supabaseClient();
      if (client) {
        try {
          const { data, error } = await client
            .from("candidates")
            .insert({
              position_id: positionId,
              full_name: candidate.full_name,
              bio: candidate.bio,
              photo_path: candidate.photo_path,
            })
            .select()
            .single();
          if (!error && data) return data as Candidate;
        } catch {
          // fallback
        }
      }
    }

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
    if (isSupabaseConfigured() && isValidUUID(candidateId)) {
      const client = supabaseClient();
      if (client) {
        try {
          await client.from("candidates").delete().eq("id", candidateId);
        } catch {
          // fallback
        }
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
    if (isSupabaseConfigured() && isValidUUID(electionId)) {
      const client = supabaseClient();
      if (client) {
        try {
          const { data: vList } = await client
            .from("eligible_voters")
            .select("*")
            .eq("election_id", electionId);
          const { data: pList } = await client
            .from("participation")
            .select("*")
            .eq("election_id", electionId);
          if (vList) {
            const participated = new Set((pList || []).map((p) => p.voter_id));
            return vList.map((v) => ({
              ...v,
              voted: participated.has(v.id),
            }));
          }
        } catch {
          // fallback
        }
      }
    }
    return this.voters[electionId] || [];
  }

  async addVoter(
    electionId: string,
    voter: { email: string; full_name?: string }
  ): Promise<EligibleVoter> {
    const newV: EligibleVoter = {
      id: `v-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      election_id: electionId,
      email: voter.email.toLowerCase().trim(),
      full_name: voter.full_name,
      voted: false,
    };

    if (isSupabaseConfigured() && isValidUUID(electionId)) {
      const client = supabaseClient();
      if (client) {
        try {
          const { data } = await client
            .from("eligible_voters")
            .insert({
              election_id: electionId,
              email: newV.email,
              full_name: newV.full_name,
            })
            .select()
            .single();
          if (data) return data;
        } catch {
          // fallback
        }
      }
    }

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

    if (isSupabaseConfigured() && isValidUUID(electionId)) {
      const client = supabaseClient();
      if (client) {
        try {
          const { error } = await client.rpc("cast_ballot", {
            p_election: electionId,
            p_choices: choices,
          });
          if (error) console.warn("Supabase cast_ballot note:", error.message);
        } catch {
          // fallback
        }
      }
    }

    // Record participation
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
