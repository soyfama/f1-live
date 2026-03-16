// F1 Fantasy Types - Interfaces and type definitions

export interface DriverPrice {
  number: number;
  acronym: string;
  name: string;
  team: string;
  price: number;
  history: number[]; // Last 5 weeks
}

export interface DriverFantasyPoints {
  driverNumber: number;
  acronym: string;
  fullName: string;
  team: string;
  teamColor: string;
  price: number;

  // Points breakdown
  qualifyingPoints: number;
  racePoints: number;
  positionBonus: number;
  fastestLapBonus: number;
  pitPenalty: number;
  teammateBeatBonus: number;
  dotdBonus: number;
  total: number;

  // Metadata
  racePosition: number | null;
  gridPosition: number | null;
  positionsDelta: number | null;
  fastestLap: boolean;
  pitStops: number;
  isDNF: boolean;
  dnfType: 'driver' | 'car' | null;
}

export interface OpenF1Driver {
  meeting_key: number;
  session_key: number;
  driver_number: number;
  broadcast_name: string;
  full_name: string;
  name_acronym: string;
  team_name: string;
  team_colour: string;
  first_name: string;
  last_name: string;
  headshot_url: string | null;
  country_code: string | null;
}

export interface OpenF1Position {
  meeting_key: number;
  session_key: number;
  driver_number: number;
  date: string;
  position: number;
}

export interface OpenF1Lap {
  meeting_key: number;
  session_key: number;
  driver_number: number;
  i1_speed?: number;
  i2_speed?: number;
  st_speed?: number;
  date_start: string;
  duration_sector_1?: number;
  duration_sector_2?: number;
  duration_sector_3?: number;
  is_pit_out_lap: boolean;
  lap_duration?: number;
  lap_number: number;
  segments_sector_1: number[];
  segments_sector_2: number[];
  segments_sector_3: number[];
}

export interface OpenF1Stint {
  meeting_key: number;
  session_key: number;
  driver_number: number;
  compound: string;
  lap_start: number;
  lap_end: number | null;
  tyre_age_at_start: number;
}

export interface OpenF1Session {
  session_key: number;
  session_name: string;
  session_type: string;
  meeting_key: number;
  circuit_key: number;
  circuit_short_name: string;
  date_start: string;
  date_end: string;
  gmt_offset: string;
  location: string;
  country_code: string;
  country_name: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export type TrendType = 'rising' | 'stable' | 'falling' | 'hotpick';

export interface PriceStats {
  averagePrice: number;
  highestRiser: { driver: string; change: number } | null;
  biggestFaller: { driver: string; change: number } | null;
}
