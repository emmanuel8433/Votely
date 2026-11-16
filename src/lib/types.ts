export type ElectionStatus = "draft" | "scheduled" | "active" | "completed" | "cancelled";

export interface Organization {
  id: string;
  name: string;
  type?: string;
  status: "active" | "suspended" | "inactive";
  created_at?: string;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  is_super_admin: boolean;
  role?: "org_admin" | "voter";
}

export interface Candidate {
  id: string;
  position_id: string;
  full_name: string;
  bio?: string;
  photo_path?: string;
}

export interface Position {
  id: string;
  election_id: string;
  title: string;
  candidates: Candidate[];
}

export interface EligibleVoter {
  id: string;
  election_id: string;
  user_id?: string;
  email: string;
  full_name?: string;
  voted?: boolean;
  voted_at?: string;
}

export interface Election {
  id: string;
  org_id: string;
  title: string;
  description?: string;
  starts_at: string;
  ends_at: string;
  status: ElectionStatus;
  results_published: boolean;
  positions?: Position[];
  eligible_voters_count?: number;
  ballots_cast_count?: number;
}

export interface BallotChoice {
  position_id: string;
  candidate_id: string;
}

export interface CandidateResult {
  candidate_id: string;
  full_name: string;
  bio?: string;
  votes: number;
  percentage: number;
  is_winner: boolean;
  is_tie: boolean;
}

export interface PositionResult {
  position_id: string;
  position_title: string;
  total_votes: number;
  candidates: CandidateResult[];
}

export interface ElectionResultsData {
  election_id: string;
  election_title: string;
  starts_at: string;
  ends_at: string;
  status: ElectionStatus;
  results_published: boolean;
  total_eligible_voters: number;
  total_ballots_cast: number;
  turnout_percentage: number;
  positions: PositionResult[];
}
