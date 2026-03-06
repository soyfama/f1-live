'use client';

import { useState, useMemo } from 'react';
import { CALENDAR_2026, formatCountdown, toART, type Race2026 } from '@/lib/calendar-2026';

const SESSION_COLORS: Record<string, string> = {
  'Race':                '#E10600',
  'Sprint':              '#FF8000',
  'Qualifying':          '#BF00FF',
  'Sprint Qualifying':   '#c084fc',
  'Practice 1':          '#3671C6',
  'Practice 2':          '#3671C6',
  'Practice 3':          '#3671C6',
};

function getSessionColor(name: string): string {
  for (const [k, v] of Object.entries(SESSION_COLORS)) {
    if (name?.includes(k)) return v;
  }
  return '#4b5563';
}

function CountryFlag({ code }: { code: string }) {
  // Use emoji flag from country code
  const emoji = code
    .toUpperCase()
    .split('')
    .map(c => String.fromCodePoint(c.charCodeAt(0) + 127397))
    .join('');
  return <span className="text-lg">{emoji}</span>;
}

function RaceWeekBadge({ hasSprint }: { hasSprint: boolean }) {
  if (!hasSprint) return null;
  return (
    <span className="text-[9px] bg-[#FF8000]/15 text-[#FF8000] border border-[#FF8000]/30 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
      Sprint
    </span>
  );
}

function NextBadge() {
  return (
    <span className="text-[9px] bg-[#E10600]/15 text-[#E10600] border border-[#E10600]/40 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse-dot">
      Next
    </span>
  );
}

function LiveBadge() {
  return (
    <span className="text-[9px] bg-[#00FF00]/10 text-[#00FF00] border border-[#00FF00]/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
      ● Live
    </span>
  );
}

export default function CalendarClient() {
  const [expandedRound, setExpandedRound] = useState<number | null>(null);
  const now = useMemo(() => Date.now(), []);

  // Find current/next race
  const nextRaceIndex = useMemo(() => {
    return CALENDAR_2026.findIndex(r => new Date(r.date).getTime() > now);
  }, [now]);

  // Auto-expand next race
  useState(() => {
    if (nextRaceIndex >= 0) setExpandedRound(CALENDAR_2026[nextRaceIndex].round);
  });

  const isLiveWeek = (race: Race2026): boolean => {
    const raceMs = new Date(race.date).getTime();
    return raceMs > now && raceMs - now < 7 * 86400000;
  };

  const isPast = (race: Race2026): boolean => {
    return new Date(race.date).getTime() < now;
  };

  const isNext = (race: Race2026, idx: number): boolean => idx === nextRaceIndex;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white font-bold text-2xl">2026 Season</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">
            {CALENDAR_2026.length} rounds · {CALENDAR_2026.filter(r => r.hasSprint).length} sprint weekends
          </p>
        </div>
        <div className="text-right text-[11px] text-[#4b5563]">
          <p>Times in UTC</p>
          <p>ART = UTC−3</p>
        </div>
      </div>

      {/* Upcoming highlight */}
      {nextRaceIndex >= 0 && (
        <div className="f1-card p-4 mb-5 border-[#E10600]/20">
          <div className="flex items-center gap-3">
            <CountryFlag code={CALENDAR_2026[nextRaceIndex].countryCode} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-white font-bold">{CALENDAR_2026[nextRaceIndex].name}</span>
                <NextBadge />
                <RaceWeekBadge hasSprint={CALENDAR_2026[nextRaceIndex].hasSprint} />
              </div>
              <p className="text-[#6b7280] text-xs">{CALENDAR_2026[nextRaceIndex].circuit}</p>
              <p className="text-[#4b5563] text-xs">{toART(CALENDAR_2026[nextRaceIndex].date)}</p>
            </div>
            <div className="text-right">
              <p className="text-[#E10600] font-bold text-lg mono tabular-nums">
                {formatCountdown(CALENDAR_2026[nextRaceIndex].date)}
              </p>
              <p className="text-[#4b5563] text-[10px]">to Race</p>
            </div>
          </div>
        </div>
      )}

      {/* Race list */}
      <div className="space-y-1.5">
        {CALENDAR_2026.map((race, idx) => {
          const past = isPast(race);
          const live = isLiveWeek(race);
          const next = isNext(race, idx);
          const expanded = expandedRound === race.round;

          return (
            <div
              key={race.round}
              className={`rounded-xl overflow-hidden border transition-all ${
                live ? 'border-[#00FF00]/30 bg-[#00FF00]/3' :
                next ? 'border-[#E10600]/30 bg-[#E10600]/3' :
                past ? 'border-[#1e2538] bg-[#12172a]/50' :
                'border-[#1e2538] bg-[#12172a]'
              } ${past ? 'opacity-55' : ''}`}
            >
              {/* Race row */}
              <button
                className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/3 transition-colors"
                onClick={() => setExpandedRound(expanded ? null : race.round)}
              >
                {/* Round badge */}
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  live ? 'bg-[#00FF00] text-black' :
                  next ? 'bg-[#E10600] text-white' :
                  past ? 'bg-[#1e2538] text-[#4b5563]' :
                  'bg-[#1a1f2e] text-[#6b7280] border border-[#2a3040]'
                }`}>
                  {race.round}
                </span>

                {/* Flag */}
                <CountryFlag code={race.countryCode} />

                {/* Name + badges */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-semibold text-sm ${past ? 'text-[#4b5563]' : 'text-white'}`}>
                      {race.name}
                    </span>
                    {live && <LiveBadge />}
                    {next && !live && <NextBadge />}
                    <RaceWeekBadge hasSprint={race.hasSprint} />
                  </div>
                  <span className={`text-[11px] ${past ? 'text-[#374151]' : 'text-[#4b5563]'}`}>
                    {race.circuit} · {race.country}
                  </span>
                </div>

                {/* Date + countdown */}
                <div className="text-right shrink-0">
                  <p className={`text-xs font-medium ${past ? 'text-[#4b5563]' : 'text-[#9ca3af]'}`}>
                    {new Date(race.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                  {!past && (
                    <p className={`text-[11px] mono font-bold ${live ? 'text-[#00FF00]' : next ? 'text-[#E10600]' : 'text-[#6b7280]'}`}>
                      {formatCountdown(race.date)}
                    </p>
                  )}
                  {past && <p className="text-[10px] text-[#374151]">Completed</p>}
                </div>

                <span className={`text-[#4b5563] transition-transform shrink-0 text-xs ${expanded ? 'rotate-180' : ''}`}>▾</span>
              </button>

              {/* Session breakdown */}
              {expanded && (
                <div className="border-t border-[#1e2538] px-4 pb-3 animate-slide-down">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 mt-3">
                    {race.sessions.map((sess) => {
                      const sessMs = new Date(sess.date).getTime();
                      const sessPast = sessMs < now;
                      const sessLive = Math.abs(sessMs - now) < 2 * 3600000;
                      const countdown = !sessPast ? formatCountdown(sess.date) : null;
                      const color = getSessionColor(sess.name);

                      return (
                        <div
                          key={sess.name}
                          className={`rounded-lg p-2.5 flex items-center gap-2.5 ${
                            sessLive ? 'bg-[#00FF00]/8 border border-[#00FF00]/20' : 'bg-[#0a0e1a] border border-[#1e2538]'
                          } ${sessPast ? 'opacity-50' : ''}`}
                        >
                          <div className="w-[3px] h-8 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`font-medium text-xs ${sessPast ? 'text-[#4b5563]' : 'text-white'}`}>
                                {sess.name}
                              </span>
                              {sessLive && (
                                <span className="text-[9px] text-[#00FF00] font-bold animate-pulse-dot">LIVE</span>
                              )}
                            </div>
                            <p className={`text-[10px] ${sessPast ? 'text-[#374151]' : 'text-[#4b5563]'}`}>
                              {new Date(sess.date).toLocaleString('en-US', {
                                weekday: 'short', month: 'short', day: 'numeric',
                                hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: false,
                              })} UTC
                            </p>
                            <p className="text-[10px] text-[#374151]">
                              {toART(sess.date)}
                            </p>
                          </div>
                          {countdown && (
                            <span className="text-[10px] mono text-[#6b7280] shrink-0">{countdown}</span>
                          )}
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

      <p className="text-center text-[10px] text-[#374151] mt-8">
        2026 Season · 24 rounds · Dates approximate — verify with official F1 calendar
      </p>
    </div>
  );
}
