import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Player {
  id: string;
  first_name: string;
  last_name: string;
  photo_url?: string;
  units: number;
  has_license: boolean;
  email?: string;
  manual_payment: number;
  paid_amount: number;
  participates_in_fund: boolean;
  is_coach: boolean;
  created_at: string;
  carpooling: boolean;
  scoreboard: boolean;
  thursday_aperitif: boolean;
}

export interface AperoSchedule {
  id: string;
  person1_id?: string;
  person2_id?: string;
  date: string;
  created_at: string;
  person1?: Player;
  person2?: Player;
}

export interface MatchSchedule {
  id: string;
  match_date: string;
  location: string;
  opponent?: string;
  scorer1_id?: string;
  scorer2_id?: string;
  saturday_person1_id?: string;
  saturday_person2_id?: string;
  saturday_person3_id?: string;
  saturday_person4_id?: string;
  sunday_person1_id?: string;
  sunday_person2_id?: string;
  sunday_person3_id?: string;
  sunday_person4_id?: string;
  created_at: string;
}

export interface Carpool {
  id: string;
  match_id?: string;
  weekend_date?: string;
  team1_player1_id?: string;
  team1_player2_id?: string;
  team1_player3_id?: string;
  team1_player4_id?: string;
  team1_player5_id?: string;
  team2_player1_id?: string;
  team2_player2_id?: string;
  team2_player3_id?: string;
  team2_player4_id?: string;
  team2_player5_id?: string;
  created_at: string;
  match_schedule?: MatchSchedule;
}

export interface FineType {
  id: string;
  name: string;
  amount: number;
  custom_label?: string;
  paye_ton_pack: boolean;
  created_at: string;
}

export interface Fine {
  id: string;
  player_id: string;
  fine_type_id: string;
  date: string;
  notes?: string;
  created_at: string;
  players?: Player;
  fine_types?: FineType;
}

export interface ActivityLog {
  id: string;
  action: string;
  description: string;
  user_id?: string;
  created_at: string;
}

export interface CarpoolProposal {
  id: string;
  weekend_date: string;
  player_id: string;
  is_validated: boolean;
  created_at: string;
  players?: Player;
}

export interface ExpenseParticipant {
  id: string;
  expense_id: string;
  player_id: string;
  created_at: string;
  players?: Player;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  created_at: string;
  expense_participants?: ExpenseParticipant[];
}
