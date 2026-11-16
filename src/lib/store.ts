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

const DEMO_ORG = {
  id: "org-101",
  name: "Apex University Student Union",
  type: "University",
  status: "active" as const,
};

const DEMO_ELECTIONS: Election[] = [
  {
    id: "el-1",
    org_id: "org-101",
    title: "Student Union General Election 2027",
    description:
      "Annual executive elections to select the executive leadership for the 2027/2028 academic session.",
    starts_at: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
    ends_at: new Date(Date.now() + 3600 * 1000 * 48).toISOString(),
    status: "active",
    results_published: false,
    eligible_voters_count: 850,
    ballots_cast_count: 512,
  },
  {
    id: "el-2",
    org_id: "org-101",
    title: "Faculty of Engineering Senate Representative",
    description:
      "Selection of undergraduate student delegate to the University Academic Senate.",
    starts_at: new Date(Date.now() + 3600 * 1000 * 72).toISOString(),
    ends_at: new Date(Date.now() + 3600 * 1000 * 144).toISOString(),
    status: "scheduled",
    results_published: false,
    eligible_voters_count: 320,
    ballots_cast_count: 0,
  },
  {
    id: "el-3",
    org_id: "org-101",
    title: "Postgraduate Association Constitutional Amendment",
    description:
      "Ratification ballot for the revised bylaws and welfare budget of 2026.",
    starts_at: new Date(Date.now() - 3600 * 1000 * 120).toISOString(),
    ends_at: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
    status: "completed",
    results_published: true,
    eligible_voters_count: 410,
    ballots_cast_count: 298,
  },
];

const DEMO_POSITIONS: Record<string, Position[]> = {
  "el-1": [
    {
      id: "pos-1",
      election_id: "el-1",
      title: "President",
      candidates: [
        {
          id: "cand-1",
          position_id: "pos-1",
          full_name: "Amara Okafor",
          bio: "Final year Computer Science student. Advocating for 24/7 campus library access, expanded mental health counseling, and transparent student union budgeting.",
        },
        {
          id: "cand-2",
          position_id: "pos-1",
          full_name: "Tunde Bello",
          bio: "Economics major and debate captain. Focused on subsidized inter-campus transit, green energy student initiatives, and career fair partnerships.",
        },
        {
          id: "cand-3",
          position_id: "pos-1",
          full_name: "Grace Eze",
          bio: "Biochemistry honours scholar. Dedicated to affordable campus dining options, women in STEM mentorship, and emergency student welfare grants.",
        },
      ],
    },
    {
      id: "pos-2",
      election_id: "el-1",
      title: "Vice President (Welfare & Inclusion)",
      candidates: [
        {
          id: "cand-4",
          position_id: "pos-2",
          full_name: "David Kim",
          bio: "International Student Representative. Championing accessible campus facilities, peer-to-peer tutoring networks, and multicultural festivals.",
        },
        {
          id: "cand-5",
          position_id: "pos-2",
          full_name: "Fatima Al-Hassan",
          bio: "Public Policy junior. Focused on quiet study pods in student hostels and student representation on faculty discipline committees.",
        },
      ],
    },
    {
      id: "pos-3",
      election_id: "el-1",
      title: "Director of Sports & Recreation",
      candidates: [
        {
          id: "cand-6",
          position_id: "pos-3",
          full_name: "Marcus Johnson",
          bio: "Varsity track captain. Plans to upgrade fitness center equipment, introduce free weekend sports leagues, and promote inter-hall tournaments.",
        },
        {
          id: "cand-7",
          position_id: "pos-3",
          full_name: "Chidinma Nwosu",
          bio: "Volleyball team lead. Pushing for revitalized intramural games, outdoor gym pods, and fitness workshops open to all skill levels.",
        },
      ],
    },
  ],
  "el-2": [
    {
      id: "pos-4",
      election_id: "el-2",
      title: "Engineering Senator",
      candidates: [
        {
          id: "cand-8",
          position_id: "pos-4",
          full_name: "Elena Rostova",
          bio: "Mechanical Engineering student. Advocating for modern lab equipment and flexible elective scheduling.",
        },
        {
          id: "cand-9",
          position_id: "pos-4",
          full_name: "Kwame Mensah",
          bio: "Electrical Engineering scholar. Pushing for industry co-op credits and faculty research grants.",
        },
      ],
    },
  ],
  "el-3": [
    {
      id: "pos-5",
      election_id: "el-3",
      title: "Amendment Ratification",
      candidates: [
        {
          id: "cand-10",
          position_id: "pos-5",
          full_name: "Yes - Adopt New Constitution",
          bio: "Approve the 2026 governance charter and revised executive term limits.",
        },
        {
          id: "cand-11",
          position_id: "pos-5",
          full_name: "No - Retain Existing Charter",
          bio: "Reject the revisions and mandate further committee consultation.",
        },
      ],
    },
  ],
};

const DEMO_VOTERS: Record<string, EligibleVoter[]> = {
  "el-1": [
    {
      id: "v-1",
      election_id: "el-1",
      email: "voter@apex.edu",
      full_name: "Jordan Lee",
      voted: false,
    },
    {
      id: "v-2",
      election_id: "el-1",
      email: "admin@apex.edu",
      full_name: "Admin User",
      voted: true,
      voted_at: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
    },
    {
      id: "v-3",
      election_id: "el-1",
      email: "sarah.connor@apex.edu",
      full_name: "Sarah Connor",
      voted: true,
      voted_at: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
    },
    {
      id: "v-4",
      election_id: "el-1",
      email: "michael.scott@apex.edu",
      full_name: "Michael Scott",
      voted: false,
    },
    {
      id: "v-5",
      election_id: "el-1",
      email: "priya.sharma@apex.edu",
      full_name: "Priya Sharma",
      voted: true,
      voted_at: new Date(Date.now() - 3600 * 1000 * 18).toISOString(),
    },
  ],
};

// Initial simulated votes for realistic results calculation
const DEMO_BALLOTS: Record<string, BallotChoice[][]> = {
  "el-1": [
    [{ position_id: "pos-1", candidate_id: "cand-1" }, { position_id: "pos-2", candidate_id: "cand-4" }, { position_id: "pos-3", candidate_id: "cand-6" }],
    [{ position_id: "pos-1", candidate_id: "cand-1" }, { position_id: "pos-2", candidate_id: "cand-5" }, { position_id: "pos-3", candidate_id: "cand-7" }],
    [{ position_id: "pos-1", candidate_id: "cand-2" }, { position_id: "pos-2", candidate_id: "cand-4" }, { position_id: "pos-3", candidate_id: "cand-6" }],
    [{ position_id: "pos-1", candidate_id: "cand-1" }, { position_id: "pos-2", candidate_id: "cand-4" }, { position_id: "pos-3", candidate_id: "cand-6" }],
    [{ position_id: "pos-1", candidate_id: "cand-3" }, { position_id: "pos-2", candidate_id: "cand-5" }, { position_id: "pos-3", candidate_id: "cand-7" }],
  ],
  "el-3": [
    [{ position_id: "pos-5", candidate_id: "cand-10" }],
    [{ position_id: "pos-5", candidate_id: "cand-10" }],
    [{ position_id: "pos-5", candidate_id: "cand-10" }],
    [{ position_id: "pos-5", candidate_id: "cand-11" }],
  ]
};

class DataStore {
  private elections: Election[] = DEMO_ELECTIONS;
  private positions: Record<string, Position[]> = DEMO_POSITIONS;
  private voters: Record<string, EligibleVoter[]> = DEMO_VOTERS;
  private ballots: Record<string, BallotChoice[][]> = DEMO_BALLOTS;
  private currentUser: Profile = {
    id: "usr-admin-1",
    full_name: "Alex Vance",
    email: "admin@apex.edu",
    is_super_admin: false,
    role: "org_admin",
  };

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
    } catch {
      // storage unavailable or full
    }
  }

  private loadFromStorage() {
    try {
      const el = localStorage.getItem("votely_elections");
      if (el) this.elections = JSON.parse(el);

      const pos = localStorage.getItem("votely_positions");
      if (pos) this.positions = JSON.parse(pos);

      const vt = localStorage.getItem("votely_voters");
      if (vt) this.voters = JSON.parse(vt);

      const bl = localStorage.getItem("votely_ballots");
      if (bl) this.ballots = JSON.parse(bl);

      const usr = localStorage.getItem("votely_user");
      if (usr) this.currentUser = JSON.parse(usr);
    } catch {
      // fallback to initial in-memory
    }
  }

  getCurrentUser(): Profile {
    return this.currentUser;
  }

  setCurrentUser(user: Partial<Profile>) {
    this.currentUser = { ...this.currentUser, ...user };
    this.saveToStorage();
  }

  getOrganization() {
    return DEMO_ORG;
  }

  async getElections(): Promise<Election[]> {
    if (isSupabaseConfigured()) {
      const client = supabaseClient();
      if (client) {
        const { data, error } = await client.from("elections").select("*").order("starts_at", { ascending: false });
        if (!error && data && data.length > 0) return data as Election[];
      }
    }
    return [...this.elections];
  }

  async getElectionById(id: string): Promise<Election | null> {
    if (isSupabaseConfigured()) {
      const client = supabaseClient();
      if (client) {
        const { data, error } = await client.from("elections").select("*").eq("id", id).single();
        if (!error && data) {
          const positions = await this.getPositions(id);
          return { ...data, positions } as Election;
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
    const newElection: Election = {
      id: `el-${Date.now()}`,
      org_id: DEMO_ORG.id,
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

    if (isSupabaseConfigured()) {
      const client = supabaseClient();
      if (client) {
        const { data: dbData, error } = await client
          .from("elections")
          .insert({
            title: data.title,
            description: data.description,
            starts_at: data.starts_at,
            ends_at: data.ends_at,
            status: data.status,
            org_id: DEMO_ORG.id,
          })
          .select()
          .single();
        if (!error && dbData) return dbData as Election;
      }
    }

    this.elections.unshift(newElection);
    this.positions[newElection.id] = [];
    this.voters[newElection.id] = [];
    this.ballots[newElection.id] = [];
    this.saveToStorage();
    return newElection;
  }

  async updateElection(id: string, updates: Partial<Election>): Promise<Election> {
    if (isSupabaseConfigured()) {
      const client = supabaseClient();
      if (client) {
        const { data, error } = await client.from("elections").update(updates).eq("id", id).select().single();
        if (!error && data) return data as Election;
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
    if (isSupabaseConfigured()) {
      const client = supabaseClient();
      if (client) {
        const { data: posData } = await client.from("positions").select("*").eq("election_id", electionId);
        if (posData) {
          const { data: candData } = await client.from("candidates").select("*");
          return posData.map((p) => ({
            ...p,
            candidates: (candData || []).filter((c) => c.position_id === p.id),
          }));
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

    if (isSupabaseConfigured()) {
      const client = supabaseClient();
      if (client) {
        const { data, error } = await client
          .from("positions")
          .insert({ election_id: electionId, title })
          .select()
          .single();
        if (!error && data) return { ...data, candidates: [] };
      }
    }

    if (!this.positions[electionId]) this.positions[electionId] = [];
    this.positions[electionId].push(newPos);
    this.saveToStorage();
    return newPos;
  }

  async deletePosition(electionId: string, positionId: string): Promise<void> {
    if (isSupabaseConfigured()) {
      const client = supabaseClient();
      if (client) {
        await client.from("positions").delete().eq("id", positionId);
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

    if (isSupabaseConfigured()) {
      const client = supabaseClient();
      if (client) {
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

  async deleteCandidate(electionId: string, positionId: string, candidateId: string): Promise<void> {
    if (isSupabaseConfigured()) {
      const client = supabaseClient();
      if (client) {
        await client.from("candidates").delete().eq("id", candidateId);
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
    if (isSupabaseConfigured()) {
      const client = supabaseClient();
      if (client) {
        const { data: vList } = await client.from("eligible_voters").select("*").eq("election_id", electionId);
        const { data: pList } = await client.from("participation").select("*").eq("election_id", electionId);
        if (vList) {
          const participated = new Set((pList || []).map((p) => p.voter_id));
          return vList.map((v) => ({
            ...v,
            voted: participated.has(v.id),
          }));
        }
      }
    }
    return this.voters[electionId] || [];
  }

  async addVoter(electionId: string, voter: { email: string; full_name?: string }): Promise<EligibleVoter> {
    const newV: EligibleVoter = {
      id: `v-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      election_id: electionId,
      email: voter.email.toLowerCase().trim(),
      full_name: voter.full_name,
      voted: false,
    };

    if (isSupabaseConfigured()) {
      const client = supabaseClient();
      if (client) {
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

  async importVoters(electionId: string, list: { email: string; full_name?: string }[]): Promise<{ added: number; skipped: number }> {
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

  async castBallot(electionId: string, voterEmail: string, choices: BallotChoice[]): Promise<{ success: boolean; receipt_code: string }> {
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

    if (isSupabaseConfigured()) {
      const client = supabaseClient();
      if (client) {
        const { error } = await client.rpc("cast_ballot", {
          p_election: electionId,
          p_choices: choices,
        });
        if (error) throw new Error(error.message);
      }
    }

    // In-memory demo record
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

    const total_eligible_voters = voters.length || election.eligible_voters_count || 1;
    const total_ballots_cast = ballots.length || election.ballots_cast_count || 0;
    const turnout_percentage = total_eligible_voters > 0
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

      // If simulated ballots count is 0 but election has a cast count, give realistic demo numbers
      if (ballots.length === 0 && total_ballots_cast > 0) {
        const cands = pos.candidates;
        if (cands.length > 0) {
          votesPerCand[cands[0].id] = Math.floor(total_ballots_cast * 0.55);
          if (cands[1]) votesPerCand[cands[1].id] = Math.floor(total_ballots_cast * 0.35);
          if (cands[2]) votesPerCand[cands[2].id] = total_ballots_cast - (votesPerCand[cands[0].id] + votesPerCand[cands[1].id]);
        }
      }

      const posTotalVotes = Object.values(votesPerCand).reduce((a, b) => a + b, 0);

      // Determine max votes
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
