const BASE_URL = 'https://api.openf1.org/v1';

export interface Driver {
  driver_number: number;
  broadcast_name: string;
  full_name: string;
  name_acronym: string;
  team_name: string;
  team_colour: string;
  first_name: string;
  last_name: string;
  headshot_url: string;
  country_code: string;
  session_key: number;
  meeting_key: number;
}

export interface Position {
  driver_number: number;
  date: string;
  position: number;
  session_key: number;
  meeting_key: number;
}

export interface Lap {
  driver_number: number;
  lap_number: number;
  lap_duration: number | null;
  duration_sector_1: number | null;
  duration_sector_2: number | null;
  duration_sector_3: number | null;
  i1_speed: number | null;
  i2_speed: number | null;
  st_speed: number | null;
  date_start: string;
  is_pit_out_lap: boolean;
  session_key: number;
  meeting_key: number;
}

export interface Stint {
  driver_number: number;
  stint_number: number;
  lap_start: number;
  lap_end: number;
  compound: string;
  tyre_age_at_start: number;
  session_key: number;
  meeting_key: number;
}

export interface Session {
  session_key: number;
  session_name: string;
  session_type: string;
  date_start: string;
  date_end: string;
  gmt_offset: string;
  session_status: string;
  meeting_key: number;
  country_name: string;
  circuit_short_name: string;
  year: number;
  location: string;
}

export interface Meeting {
  meeting_key: number;
  meeting_name: string;
  meeting_official_name: string;
  location: string;
  country_key: number;
  country_code: string;
  country_name: string;
  circuit_key: number;
  circuit_short_name: string;
  date_start: string;
  gmt_offset: string;
  year: number;
}

export interface CarData {
  driver_number: number;
  date: string;
  speed: number;
  throttle: number;
  brake: number;
  drs: number;
  n_gear: number;
  rpm: number;
  session_key: number;
  meeting_key: number;
}

export interface Interval {
  driver_number: number;
  date: string;
  gap_to_leader: number | null;
  interval: number | null;
  session_key: number;
  meeting_key: number;
}

async function fetchOpenF1<T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T[]> {
  const url = new URL(`${BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  
  try {
    const res = await fetch(url.toString(), { 
      next: { revalidate: 30 },
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function getLatestSession(): Promise<Session | null> {
  const sessions = await fetchOpenF1<Session>('/sessions', { session_key: 'latest' });
  return sessions[0] ?? null;
}

export async function getSessions(year: number, meetingKey?: number): Promise<Session[]> {
  const params: Record<string, string | number> = { year };
  if (meetingKey) params.meeting_key = meetingKey;
  return fetchOpenF1<Session>('/sessions', params);
}

export async function getMeetings(year: number): Promise<Meeting[]> {
  return fetchOpenF1<Meeting>('/meetings', { year });
}

export async function getDrivers(sessionKey: number): Promise<Driver[]> {
  return fetchOpenF1<Driver>('/drivers', { session_key: sessionKey });
}

export async function getPositions(sessionKey: number): Promise<Position[]> {
  return fetchOpenF1<Position>('/position', { session_key: sessionKey });
}

export async function getLaps(sessionKey: number, driverNumber?: number): Promise<Lap[]> {
  const params: Record<string, string | number> = { session_key: sessionKey };
  if (driverNumber) params.driver_number = driverNumber;
  return fetchOpenF1<Lap>('/laps', params);
}

export async function getStints(sessionKey: number): Promise<Stint[]> {
  return fetchOpenF1<Stint>('/stints', { session_key: sessionKey });
}

export async function getIntervals(sessionKey: number): Promise<Interval[]> {
  return fetchOpenF1<Interval>('/intervals', { session_key: sessionKey });
}

export async function getCarData(sessionKey: number, driverNumber: number, lapNumber?: number): Promise<CarData[]> {
  const params: Record<string, string | number> = { session_key: sessionKey, driver_number: driverNumber };
  if (lapNumber) params.lap_number = lapNumber;
  return fetchOpenF1<CarData>('/car_data', params);
}

export function formatLapTime(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '--:--.---';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const secStr = secs.toFixed(3).padStart(6, '0');
  return mins > 0 ? `${mins}:${secStr}` : `${secStr}`;
}

export function formatGap(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '--';
  if (seconds === 0) return 'Leader';
  const sign = seconds > 0 ? '+' : '';
  return `${sign}${seconds.toFixed(3)}`;
}
