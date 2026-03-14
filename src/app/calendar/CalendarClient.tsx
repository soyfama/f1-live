'use client';

import { useState, useMemo } from 'react';
import { CALENDAR_2026, formatCountdown, toART, type Race2026 } from '@/lib/calendar-2026';

const SESSION_COLORS: Record<string, string> = {
  'Race': '#E10600',
  'Sprint': '#FF8000',
  'Qualifying': '#BF00FF',
  'Sprint Qualifying': '#c084fc',
  'Practice 1': '#3671C6',
  'Practice 2': '#3671C6',
  'Practice 3': '#3671C6',
};

const COUNTRY_FLAGS: Record<string, string> = {
  'AU': '🇦🇺', 'CN': '🇨🇳', 'JP': '🇯🇵', 'BH': '🇧🇭', 'SA': '🇸🇦', 'US': '🇺🇸',
  'CA': '🇨🇦', 'MC': '🇲🇨', 'ES': '🇪🇸', 'AT': '🇦🇹', 'GB': '🇬🇧', 'BE': '🇧🇪',
  'HU': '🇭🇺', 'NL': '🇳🇱', 'IT': '🇮🇹', 'AZ': '🇦🇿', 'SG': '🇸🇬', 'MX': '🇲🇽',
  'BR': '🇧🇷', 'QA': '🇶🇦', 'AE': '🇦🇪',
};

function getSessionColor(name: string): string {
  for (const [k, v] of Object.entries(SESSION_COLORS)) if (name?.includes(k)) return v;
  return '#555';
}

function CountryFlag({ code }: { code: string }) {
  return <span className="text-2xl">{COUNTRY_FLAGS[code] || '🏁'}</span>;
}

function RaceWeekBadge({ hasSprint }: { hasSprint: boolean }) {
  if (!hasSprint) return null;
  return <span className="text-[9px] bg-[#FF8000]/15 text-[#FF8000] border border-[#FF8000]/30 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Sprint</span>;
}

function NextBadge() {
  return <span className="text-[9px] bg-[#E10600]/20 text-[#E10600] border border-[#E10600]/40 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse-dot">PRÓXIMO</span>;
}

function LiveBadge() {
  return <span className="text-[9px] bg-[#00FF00]/10 text-[#00FF00] border border-[#00FF00]/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">● Live</span>;
}

export default function CalendarClient() {
  const [expandedRound, setExpandedRound] = useState<number | null>(null);
  const now = useMemo(() => Date.now(), []);
  const nextRaceIndex = useMemo(() => CALENDAR_2026.findIndex(r => new Date(r.date).getTime() > now), [now]);

  const isLiveWeek = (race: Race2026): boolean => {
    const raceMs = new Date(race.date).getTime();
    return raceMs > now && raceMs - now < 7 * 86400000;
  };

  const isPast = (race: Race2026): boolean => new Date(race.date).getTime() < now;
  const isNext = (race: Race2026, idx: number): boolean => idx === nextRaceIndex;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white font-bold text-2xl">2026 Season</h1>
          <p className="text-gray-500 text-sm mt-0.5">{CALENDAR_2026.length} rounds • {CALENDAR_2026.filter(r => r.hasSprint).length} sprint weekends</p>
        </div>
        <div className="text-right text-[11px] text-gray-600">
          <p>Times in UTC</p>
          <p>ART = UTC−3</p>
        </div>
      </div>

      {nextRaceIndex >= 0 && (
        <div className="relative overflow-hidden rounded-2xl border border-[#E10600]/40 mb-6 p-6" style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, rgba(225,6,0,0.1) 100%)' }}>
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#E10600] to-transparent animate-pulse" />
          <div className="flex flex-wrap items-center gap-4">
            <CountryFlag code={CALENDAR_2026[nextRaceIndex].countryCode} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white font-bold text-xl">{CALENDAR_2026[nextRaceIndex].name}</span>
                <NextBadge />
                <RaceWeekBadge hasSprint={CALENDAR_2026[nextRaceIndex].hasSprint} />
              </div>
              <p className="text-gray-500 text-sm">{CALENDAR_2026[nextRaceIndex].circuit} • {CALENDAR_2026[nextRaceIndex].country}</p>
              <p className="text-gray-600 text-xs mt-1">{toART(CALENDAR_2026[nextRaceIndex].date)}</p>
            </div>
            <div className="text-right">
              <p className="text-4xl md:text-5xl font-black text-[#E10600] mono tracking-tight">
                {formatCountdown(CALENDAR_2026[nextRaceIndex].date)}
              </p>
              <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">Until Race</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {CALENDAR_2026.map((race, idx) => {
          const past = isPast(race);
          const live = isLiveWeek(race);
          const next = isNext(race, idx);
          const expanded = expandedRound === race.round;

          return (
            <div key={race.round} className={`rounded-xl overflow-hidden border transition-all ${live ? 'border-[#E10600]/40 bg-[#E10600]/5' : next ? 'border-[#E10600]/20 bg-[#E10600]/3' : past ? 'border-[#1a1a1a] bg-[#0a0a0a]/50 opacity-60' : 'border-[#1a1a1a] bg-[#111]'}`}>
              <button className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/[0.02] transition-colors" onClick={() => setExpandedRound(expanded ? null : race.round)}>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${live ? 'bg-[#E10600] text-white' : next ? 'bg-[#E10600]/80 text-white' : past ? 'bg-[#1a1a1a] text-gray-600' : 'bg-[#1a1a1a] text-gray-400 border border-[#2a2a2a]'}`}>
                  {race.round}
                </span>
                <CountryFlag code={race.countryCode} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-semibold text-sm ${past ? 'text-gray-600' : 'text-white'}`}>{race.name}</span>
                    {live && <LiveBadge />}
                    {next && !live && <NextBadge />}
                    <RaceWeekBadge hasSprint={race.hasSprint} />
                  </div>
                  <span className={`text-[11px] ${past ? 'text-gray-700' : 'text-gray-500'}`}>{race.circuit} • {race.country}</span>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-xs font-medium ${past ? 'text-gray-600' : 'text-gray-400'}`}>{new Date(race.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                  {!past && <p className={`text-[11px] mono font-bold ${live ? 'text-[#E10600]' : next ? 'text-[#E10600]' : 'text-gray-500'}`}>{formatCountdown(race.date)}</p>}
                  {past && <p className="text-[10px] text-gray-700">Completed</p>}
                </div>
                <span className={`text-gray-600 transition-transform shrink-0 text-xs ${expanded ? 'rotate-180' : ''}`}>▾</span>
              </button>

              {expanded && (
                <div className="border-t border-[#1a1a1a] px-4 pb-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-3">
                    {race.sessions.map((sess) => {
                      const sessMs = new Date(sess.date).getTime();
                      const sessPast = sessMs < now;
                      const sessLive = Math.abs(sessMs - now) < 2 * 3600000;
                      const countdown = !sessPast ? formatCountdown(sess.date) : null;
                      const color = getSessionColor(sess.name);

                      return (
                        <div key={sess.name} className={`rounded-lg p-3 flex items-center gap-2.5 ${sessLive ? 'bg-[#E10600]/10 border border-[#E10600]/20' : 'bg-[#0a0a0a] border border-[#1a1a1a]'} ${sessPast ? 'opacity-50' : ''}`}>
                          <div className="w-[3px] h-8 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`font-medium text-xs ${sessPast ? 'text-gray-600' : 'text-white'}`}>{sess.name}</span>
                              {sessLive && <span className="text-[9px] text-[#E10600] font-bold animate-pulse-dot">LIVE</span>}
                            </div>
                            <p className={`text-[10px] ${sessPast ? 'text-gray-700' : 'text-gray-500'}`}>
                              {new Date(sess.date).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: false })} UTC
                            </p>
                          </div>
                          {countdown && <span className="text-[10px] mono text-gray-500 shrink-0">{countdown}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-center text-[10px] text-gray-700 mt-8">2026 Season • 24 rounds • Dates approximate</p>
    </div>
  );
}
