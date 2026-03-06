// ─── Official F1 Timing Colors ──────────────────────────────────────────────
export const F1_COLORS = {
  // Sector / lap time classification
  PURPLE: '#BF00FF',    // session best — fastest anyone has gone
  GREEN: '#00FF00',     // personal best — driver's fastest, not overall best
  YELLOW: '#FFFF00',    // no personal best — slower than their best
  WHITE: '#FFFFFF',     // current lap in progress
  RED_TIME: '#FF0000',  // DNF / out of race
  GREY: '#666666',      // no data / pit lap

  // Flag status
  FLAG_GREEN: '#00FF00',
  FLAG_YELLOW: '#FFFF00',
  FLAG_RED: '#FF0000',
  FLAG_SC: '#FF8C00',    // Safety Car
  FLAG_VSC: '#FFA500',   // Virtual Safety Car
  FLAG_CHECKERED: '#FFFFFF',

  // Brand
  F1_RED: '#E10600',
  F1_WHITE: '#FFFFFF',
} as const;

// ─── Pirelli Official Tyre Colors ───────────────────────────────────────────
export const TYRE_COLORS: Record<string, string> = {
  SOFT: '#FF3333',
  MEDIUM: '#FFFF00',
  HARD: '#FFFFFF',
  INTERMEDIATE: '#39B54A',
  WET: '#0067FF',
  // Deprecated / legacy
  SUPERSOFT: '#FF0000',
  ULTRASOFT: '#9B00E8',
  HYPERSOFT: '#FF6EBF',
};

export function getTyreColor(compound: string | null | undefined): string {
  if (!compound) return '#555';
  return TYRE_COLORS[compound.toUpperCase()] ?? '#888';
}

export function getTyreLetter(compound: string | null | undefined): string {
  if (!compound) return '?';
  const map: Record<string, string> = {
    SOFT: 'S', MEDIUM: 'M', HARD: 'H', INTERMEDIATE: 'I', WET: 'W',
    SUPERSOFT: 'SS', ULTRASOFT: 'US', HYPERSOFT: 'HS',
  };
  return map[compound.toUpperCase()] ?? compound[0]?.toUpperCase() ?? '?';
}

// ─── F1 Team Colors (official 2025/2026) ────────────────────────────────────
export const TEAM_COLORS: Record<string, string> = {
  'ferrari': '#E8002D',
  'scuderia ferrari': '#E8002D',
  'mclaren': '#FF8000',
  'mclaren racing': '#FF8000',
  'mercedes': '#00D2BE',
  'mercedes-amg': '#00D2BE',
  'red bull': '#3671C6',
  'oracle red bull racing': '#3671C6',
  'racing bulls': '#6692FF',
  'visa cashapp rb': '#6692FF',
  'rb f1 team': '#6692FF',
  'aston martin': '#358C75',
  'aston martin aramco': '#358C75',
  'alpine': '#FF87BC',
  'bwt alpine': '#FF87BC',
  'williams': '#64C4FF',
  'williams racing': '#64C4FF',
  'haas': '#B6BABD',
  'haas f1 team': '#B6BABD',
  'sauber': '#52E252',
  'kick sauber': '#52E252',
  'audi': '#C92D4B',
  'cadillac': '#FFFFFF',
};

export function getTeamColor(team: string | null | undefined, fallback = '#6B7280'): string {
  if (!team) return fallback;
  const key = team.toLowerCase();
  for (const [k, v] of Object.entries(TEAM_COLORS)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return fallback;
}

// ─── Sector Timing Classification ───────────────────────────────────────────
export type SectorClass = 'purple' | 'green' | 'yellow' | 'white' | 'grey';

export function classifySector(
  time: number | null,
  personalBest: number | null,
  sessionBest: number | null
): SectorClass {
  if (!time) return 'grey';
  if (sessionBest && time <= sessionBest) return 'purple';
  if (personalBest && time <= personalBest) return 'green';
  if (time) return 'yellow';
  return 'grey';
}

export const SECTOR_CLASS_STYLES: Record<SectorClass, { color: string; bg: string }> = {
  purple: { color: '#BF00FF', bg: 'rgba(191,0,255,0.15)' },
  green: { color: '#00FF00', bg: 'rgba(0,255,0,0.12)' },
  yellow: { color: '#FFFF00', bg: 'rgba(255,255,0,0.10)' },
  white: { color: '#FFFFFF', bg: 'rgba(255,255,255,0.08)' },
  grey: { color: '#555555', bg: 'transparent' },
};

// ─── Position Colors ─────────────────────────────────────────────────────────
export function getPosStyle(pos: number): string {
  if (pos === 1) return 'text-[#FFD700] font-black';  // gold
  if (pos === 2) return 'text-[#C0C0C0] font-black';  // silver
  if (pos === 3) return 'text-[#CD7F32] font-black';  // bronze
  return 'text-gray-300 font-bold';
}

// ─── Flag Banner Data ─────────────────────────────────────────────────────────
export interface FlagConfig { label: string; bg: string; color: string; }

export const FLAG_CONFIGS: Record<string, FlagConfig> = {
  started:    { label: 'GREEN FLAG',       bg: '#00FF00', color: '#000' },
  green:      { label: 'GREEN FLAG',       bg: '#00FF00', color: '#000' },
  yellow:     { label: 'YELLOW FLAG',      bg: '#FFFF00', color: '#000' },
  sc:         { label: '🚗 SAFETY CAR',    bg: '#FF8C00', color: '#fff' },
  safety_car: { label: '🚗 SAFETY CAR',    bg: '#FF8C00', color: '#fff' },
  vsc:        { label: 'VIRTUAL SC',       bg: '#FFA500', color: '#000' },
  red:        { label: 'RED FLAG',         bg: '#FF0000', color: '#fff' },
  chequered:  { label: '🏁 CHEQUERED',     bg: '#FFFFFF', color: '#000' },
  finished:   { label: '🏁 SESSION ENDED', bg: '#FFFFFF', color: '#000' },
  aborted:    { label: '🚫 ABORTED',       bg: '#7c3aed', color: '#fff' },
  inactive:   { label: 'INACTIVE',         bg: '#374151', color: '#9ca3af' },
};

export function getFlagConfig(status: string | null | undefined): FlagConfig {
  if (!status) return FLAG_CONFIGS.inactive;
  return FLAG_CONFIGS[status.toLowerCase()] ?? { label: (status || 'UNKNOWN').toUpperCase(), bg: '#374151', color: '#9ca3af' };
}
