'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';
import { formatLapTime } from '@/lib/openf1';

interface StintConfig {
  compound: 'SOFT' | 'MEDIUM' | 'HARD';
  laps: number;
}

interface Strategy {
  id: string;
  name: string;
  stints: StintConfig[];
  color: string;
  totalTime: number;
  pitCount: number;
}

interface RealStint {
  stint_number: number;
  lap_start: number;
  lap_end: number;
  compound: string;
}

interface MeetingOption {
  meetingKey: number;
  label: string;
}

interface SessionOption {
  sessionKey: number;
  label: string;
}

interface DriverOption {
  driverNumber: number;
  acronym: string;
  fullName: string;
  team: string;
}

const TYRE_COLORS_MAP = {
  SOFT: '#FF1801',
  MEDIUM: '#FFF200',
  HARD: '#FFFFFF',
};

const STRATEGY_COLORS = ['#3671C6', '#FF8000', '#16a34a', '#e10600', '#c084fc', '#06b6d4'];

function calcLapTime(
  baseLap: number,
  lapInStint: number,
  compound: 'SOFT' | 'MEDIUM' | 'HARD',
  degradation: Record<string, number>
): number {
  const deg = degradation[compound] ?? 0.1;
  const compoundOffset = compound === 'SOFT' ? 0 : compound === 'MEDIUM' ? 0.5 : 1.2;
  return baseLap + compoundOffset + deg * lapInStint;
}

function simulateStrategy(
  stints: StintConfig[],
  baseLap: number,
  pitLoss: number,
  totalLaps: number,
  degradation: Record<string, number>
): number[] {
  const lapTimes: number[] = [];
  let cumulative = 0;
  let lapNum = 0;

  for (let stintIdx = 0; stintIdx < stints.length; stintIdx++) {
    const stint = stints[stintIdx];
    const isPit = stintIdx > 0;
    for (let l = 0; l < stint.laps && lapNum < totalLaps; l++, lapNum++) {
      const lapTime = calcLapTime(baseLap, l, stint.compound, degradation);
      cumulative += lapTime + (l === 0 && isPit ? pitLoss : 0);
      lapTimes.push(cumulative);
    }
  }

  return lapTimes;
}

const PRESET_STRATEGIES: Array<{ name: string; stints: StintConfig[] }> = [
  {
    name: '1-stop S→H',
    stints: [{ compound: 'SOFT', laps: 20 }, { compound: 'HARD', laps: 36 }],
  },
  {
    name: '1-stop M→H',
    stints: [{ compound: 'MEDIUM', laps: 25 }, { compound: 'HARD', laps: 31 }],
  },
  {
    name: '2-stop S→M→H',
    stints: [{ compound: 'SOFT', laps: 15 }, { compound: 'MEDIUM', laps: 20 }, { compound: 'HARD', laps: 21 }],
  },
  {
    name: '2-stop S→H→S',
    stints: [{ compound: 'SOFT', laps: 15 }, { compound: 'HARD', laps: 25 }, { compound: 'SOFT', laps: 16 }],
  },
  {
    name: '3-stop S→S→S→H',
    stints: [{ compound: 'SOFT', laps: 12 }, { compound: 'SOFT', laps: 14 }, { compound: 'SOFT', laps: 14 }, { compound: 'HARD', laps: 16 }],
  },
];

export default function StrategyClient() {
  const [totalLaps, setTotalLaps] = useState(58);
  const [baseLapTime, setBaseLapTime] = useState(95.0);
  const [pitLoss, setPitLoss] = useState(22);
  const [degradation, setDegradation] = useState({ SOFT: 0.15, MEDIUM: 0.08, HARD: 0.04 });
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [selectedDriverStints, setSelectedDriverStints] = useState<RealStint[]>([]);

  // Session selector state
  const [year, setYear] = useState(2026);
  const [meetings, setMeetings] = useState<MeetingOption[]>([]);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<number | null>(null);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);
  const [driverLabel, setDriverLabel] = useState('');
  const [sessionLabel, setSessionLabel] = useState('');
  const [loadingStints, setLoadingStints] = useState(false);

  // Fetch meetings
  useEffect(() => {
    fetch(`https://api.openf1.org/v1/meetings?year=${year}`)
      .then(r => r.json())
      .then((data: Array<{ meeting_key: number; meeting_name: string; country_name: string; date_start?: string }>) => {
        const opts = data.map(m => ({ meetingKey: m.meeting_key, label: `${m.country_name} — ${m.meeting_name}`, dateStart: m.date_start }));
        const now = Date.now();
        const sortedOpts = [...opts].sort((a, b) => b.meetingKey - a.meetingKey);
        setMeetings(sortedOpts);
        const pastMeetings = sortedOpts.filter(m => m.dateStart && new Date(m.dateStart).getTime() <= now);
        const defaultKey = pastMeetings.length > 0 ? pastMeetings[0].meetingKey : 1279;
        setSelectedMeeting(defaultKey);
      })
      .catch(() => {});
  }, [year]);

  // Fetch sessions when meeting changes
  useEffect(() => {
    if (!selectedMeeting) return;
    fetch(`https://api.openf1.org/v1/sessions?meeting_key=${selectedMeeting}`)
      .then(r => r.json())
      .then((data: Array<{ session_key: number; session_name: string; session_type: string }>) => {
        const opts = data.map(s => ({ sessionKey: s.session_key, label: s.session_name }));
        setSessions(opts);
        // Prefer Race session
        const race = opts.find(s => s.label.toLowerCase().includes('race'));
        const chosen = race ?? opts[opts.length - 1];
        if (chosen) {
          setSelectedSession(chosen.sessionKey);
          setSessionLabel(chosen.label);
        }
      })
      .catch(() => {});
  }, [selectedMeeting]);

  // Fetch drivers when session changes
  useEffect(() => {
    if (!selectedSession) return;
    fetch(`https://api.openf1.org/v1/drivers?session_key=${selectedSession}`)
      .then(r => r.json())
      .then((data: Array<{ driver_number: number; name_acronym: string; full_name: string; team_name: string }>) => {
        const opts: DriverOption[] = data
          .filter(d => d.name_acronym)
          .map(d => ({ driverNumber: d.driver_number, acronym: d.name_acronym, fullName: d.full_name ?? d.name_acronym, team: d.team_name ?? '' }))
          .sort((a, b) => a.acronym.localeCompare(b.acronym));
        setDrivers(opts);
        if (opts.length > 0) {
          setSelectedDriver(opts[0].driverNumber);
          setDriverLabel(`${opts[0].acronym}`);
        }
      })
      .catch(() => {});
  }, [selectedSession]);

  // Load real stints for selected driver/session
  const loadStints = useCallback(async () => {
    if (!selectedSession || !selectedDriver) return;
    setLoadingStints(true);
    try {
      const data: RealStint[] = await fetch(
        `https://api.openf1.org/v1/stints?session_key=${selectedSession}&driver_number=${selectedDriver}`
      ).then(r => r.json());
      if (data?.length) {
        setSelectedDriverStints(data);
        // Auto-set total laps from last stint end
        const lastStint = data[data.length - 1];
        if (lastStint?.lap_end) setTotalLaps(lastStint.lap_end);
      } else {
        setSelectedDriverStints([]);
      }
    } catch {
      setSelectedDriverStints([]);
    } finally {
      setLoadingStints(false);
    }
  }, [selectedSession, selectedDriver]);

  useEffect(() => {
    loadStints();
  }, [loadStints]);

  // Generate strategies
  useEffect(() => {
    const generated: Strategy[] = PRESET_STRATEGIES.map((preset, i) => {
      const totalPropLaps = preset.stints.reduce((sum, s) => sum + s.laps, 0);
      const stints = preset.stints.map(s => ({
        ...s,
        laps: Math.round((s.laps / totalPropLaps) * totalLaps),
      }));
      const usedLaps = stints.slice(0, -1).reduce((sum, s) => sum + s.laps, 0);
      stints[stints.length - 1].laps = totalLaps - usedLaps;

      const lapTimes = simulateStrategy(stints, baseLapTime, pitLoss, totalLaps, degradation);
      return {
        id: `strat-${i}`,
        name: preset.name,
        stints,
        color: STRATEGY_COLORS[i % STRATEGY_COLORS.length],
        totalTime: lapTimes[lapTimes.length - 1] ?? 0,
        pitCount: stints.length - 1,
      };
    });
    setStrategies(generated);
  }, [totalLaps, baseLapTime, pitLoss, degradation]);

  // Build chart data
  const chartData = useMemo(() => {
    if (!strategies.length) return [];
    const data: Array<Record<string, number>> = [];
    for (let lap = 1; lap <= totalLaps; lap++) {
      const row: Record<string, number> = { lap };
      for (const strat of strategies) {
        const lapTimes = simulateStrategy(strat.stints, baseLapTime, pitLoss, totalLaps, degradation);
        row[strat.id] = lapTimes[lap - 1] ?? 0;
      }
      data.push(row);
    }
    return data;
  }, [strategies, totalLaps, baseLapTime, pitLoss, degradation]);

  const bestStrategy = useMemo(
    () => strategies.reduce((best, s) => (!best || s.totalTime < best.totalTime) ? s : best, strategies[0]),
    [strategies]
  );

  function formatRaceTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${s.toFixed(3).padStart(6, '0')}`;
    return `${m}:${s.toFixed(3).padStart(6, '0')}`;
  }

  const CustomTooltip = ({ active, payload, label }: {active?: boolean; payload?: Array<{dataKey: string; value: number; color: string}>; label?: number}) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-lg p-3 text-xs shadow-xl">
        <p className="text-white font-bold mb-2">Lap {label}</p>
        {payload.map((p) => {
          const strat = strategies.find(s => s.id === p.dataKey);
          return (
            <div key={p.dataKey} className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="text-gray-300">{strat?.name}:</span>
              <span className="text-white font-mono">{formatRaceTime(p.value)}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      {/* Input Panel */}
      <aside className="w-72 shrink-0 border-r border-[#2a3040] bg-[#0d1120] p-6 overflow-y-auto">
        <h2 className="text-white font-bold text-lg mb-1">Strategy Simulator</h2>
        <p className="text-gray-500 text-xs mb-5">Configure race parameters</p>

        {/* Session selector */}
        <div className="space-y-3 mb-5 pb-5 border-b border-[#2a3040]">
          <label className="text-gray-400 text-xs uppercase tracking-wider block">Reference Session</label>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="w-full bg-[#1a1f2e] border border-[#2a3040] text-white rounded-lg px-3 py-2 text-sm"
          >
            {[2026, 2025, 2024, 2023].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select
            value={selectedMeeting ?? ''}
            onChange={e => setSelectedMeeting(Number(e.target.value))}
            className="w-full bg-[#1a1f2e] border border-[#2a3040] text-white rounded-lg px-3 py-2 text-sm"
          >
            {meetings.map(m => <option key={m.meetingKey} value={m.meetingKey}>{m.label}</option>)}
          </select>
          <select
            value={selectedSession ?? ''}
            onChange={e => {
              const v = Number(e.target.value);
              setSelectedSession(v);
              const s = sessions.find(s => s.sessionKey === v);
              if (s) setSessionLabel(s.label);
            }}
            className="w-full bg-[#1a1f2e] border border-[#2a3040] text-white rounded-lg px-3 py-2 text-sm"
          >
            {sessions.map(s => <option key={s.sessionKey} value={s.sessionKey}>{s.label}</option>)}
          </select>
          <select
            value={selectedDriver ?? ''}
            onChange={e => {
              const v = Number(e.target.value);
              setSelectedDriver(v);
              const d = drivers.find(d => d.driverNumber === v);
              if (d) setDriverLabel(d.acronym);
            }}
            className="w-full bg-[#1a1f2e] border border-[#2a3040] text-white rounded-lg px-3 py-2 text-sm"
          >
            {drivers.map(d => <option key={d.driverNumber} value={d.driverNumber}>{d.acronym} — {d.team?.replace(' F1 Team', '')}</option>)}
          </select>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-gray-400 text-xs uppercase tracking-wider block mb-2">Circuit Laps</label>
            <input
              type="number"
              value={totalLaps}
              onChange={e => setTotalLaps(Math.max(1, Number(e.target.value)))}
              className="w-full bg-[#1a1f2e] border border-[#2a3040] text-white rounded-lg px-3 py-2 text-sm font-mono"
            />
          </div>

          <div>
            <label className="text-gray-400 text-xs uppercase tracking-wider block mb-2">
              Base Lap Time (s): <span className="font-mono">{baseLapTime.toFixed(1)}s</span>
            </label>
            <input
              type="range"
              min="70"
              max="150"
              step="0.1"
              value={baseLapTime}
              onChange={e => setBaseLapTime(Number(e.target.value))}
              className="w-full accent-[#e10600]"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span className="font-mono">70s</span><span className="font-mono">{formatLapTime(baseLapTime)}</span><span className="font-mono">150s</span>
            </div>
          </div>

          <div>
            <label className="text-gray-400 text-xs uppercase tracking-wider block mb-2">
              Pit Stop Loss: <span className="font-mono">{pitLoss}s</span>
            </label>
            <input
              type="range"
              min="15"
              max="35"
              step="0.5"
              value={pitLoss}
              onChange={e => setPitLoss(Number(e.target.value))}
              className="w-full accent-[#e10600]"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span className="font-mono">15s</span><span className="font-mono">{pitLoss}s</span><span className="font-mono">35s</span>
            </div>
          </div>

          <div>
            <label className="text-gray-400 text-xs uppercase tracking-wider block mb-2">Tyre Degradation (s/lap)</label>
            <div className="space-y-3">
              {(['SOFT', 'MEDIUM', 'HARD'] as const).map(compound => (
                <div key={compound}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: TYRE_COLORS_MAP[compound] }} />
                      <span className="text-gray-300 text-xs">{compound}</span>
                    </div>
                    <span className="text-gray-400 text-xs font-mono">{degradation[compound].toFixed(2)}s/lap</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.5"
                    step="0.01"
                    value={degradation[compound]}
                    onChange={e => setDegradation(prev => ({ ...prev, [compound]: Number(e.target.value) }))}
                    className="w-full accent-[#e10600]"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Real stints */}
          <div>
            <label className="text-gray-400 text-xs uppercase tracking-wider block mb-2">
              {loadingStints ? 'Loading stints…' : selectedDriverStints.length > 0
                ? `Real Stints — ${driverLabel} · ${sessionLabel}`
                : 'Real Stints (select session + driver)'}
            </label>
            {loadingStints ? (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="w-3 h-3 border border-[#e10600] border-t-transparent rounded-full animate-spin" />
                Fetching…
              </div>
            ) : selectedDriverStints.length > 0 ? (
              <div className="space-y-1">
                {selectedDriverStints.map(s => (
                  <div key={s.stint_number} className="flex items-center gap-2 text-xs bg-[#1a1f2e] rounded px-2 py-1.5">
                    <span className="w-2 h-2 rounded-full" style={{
                      backgroundColor: TYRE_COLORS_MAP[s.compound?.toUpperCase() as keyof typeof TYRE_COLORS_MAP] ?? '#888'
                    }} />
                    <span className="text-gray-300">{s.compound}</span>
                    <span className="text-gray-500 ml-auto font-mono">L{s.lap_start}→L{s.lap_end ?? '?'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-xs italic">No stints found for this driver/session.</p>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="mb-6">
          <h1 className="text-white font-bold text-2xl">Race Strategy Comparison</h1>
          <p className="text-gray-400 text-sm mt-1">
            <span className="font-mono">{totalLaps}</span> laps · Base <span className="font-mono">{formatLapTime(baseLapTime)}</span> · Pit loss <span className="font-mono">{pitLoss}s</span>
          </p>
        </div>

        {/* Winner banner */}
        {bestStrategy && (
          <div className="bg-[#1a1f2e] border border-yellow-500/30 rounded-xl p-4 mb-6 flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            <div>
              <p className="text-white font-bold">Optimal: {bestStrategy.name}</p>
              <p className="text-gray-400 text-sm font-mono">
                {formatRaceTime(bestStrategy.totalTime)} · {bestStrategy.pitCount} pit stop{bestStrategy.pitCount !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="ml-auto flex gap-2">
              {bestStrategy.stints.map((s, i) => (
                <div key={i} className="flex items-center gap-1 text-xs">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: TYRE_COLORS_MAP[s.compound] }} />
                  <span className="text-gray-300 font-mono">{s.laps}L</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-6 mb-6">
          <h3 className="text-white font-semibold mb-4">Cumulative Race Time by Strategy</h3>
          <ResponsiveContainer width="100%" height={380}>
            <LineChart data={chartData} margin={{ left: 20, right: 20, top: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a3040" />
              <XAxis
                dataKey="lap"
                tick={{ fill: '#6b7280', fontSize: 11 }}
                label={{ value: 'Lap', position: 'insideBottom', offset: -2, fill: '#6b7280', fontSize: 11 }}
              />
              <YAxis
                tickFormatter={(v) => formatRaceTime(v)}
                tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'monospace' }}
                width={80}
                domain={['auto', 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value) => {
                  const strat = strategies.find(s => s.id === value);
                  return <span style={{ color: '#e5e7eb', fontSize: 12 }}>{strat?.name ?? value}</span>;
                }}
              />
              {/* Pit stop reference lines from real data */}
              {selectedDriverStints.length > 1 && selectedDriverStints.slice(1).map((s, i) => (
                <ReferenceLine
                  key={i}
                  x={s.lap_start}
                  stroke="#FFD700"
                  strokeDasharray="4 3"
                  label={{ value: `PIT`, position: 'top', fill: '#FFD700', fontSize: 9 }}
                />
              ))}
              {strategies.map(strat => (
                <Line
                  key={strat.id}
                  type="monotone"
                  dataKey={strat.id}
                  stroke={strat.color}
                  strokeWidth={strat.id === bestStrategy?.id ? 3 : 1.5}
                  dot={false}
                  strokeDasharray={strat.id === bestStrategy?.id ? undefined : '4 2'}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Comparison table */}
        <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a3040] text-gray-500 text-xs uppercase tracking-wider">
                <th className="py-3 px-4 text-left">Strategy</th>
                <th className="py-3 px-4 text-center">Stops</th>
                <th className="py-3 px-4 text-left">Stints</th>
                <th className="py-3 px-4 text-right">Total Time</th>
                <th className="py-3 px-4 text-right">Delta to Best</th>
              </tr>
            </thead>
            <tbody>
              {[...strategies].sort((a, b) => a.totalTime - b.totalTime).map((strat, i) => {
                const delta = strat.totalTime - (bestStrategy?.totalTime ?? 0);
                return (
                  <tr
                    key={strat.id}
                    className={`border-b border-[#2a3040]/30 hover:bg-[#1f2535] ${i === 0 ? 'bg-yellow-500/5' : ''}`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: strat.color }} />
                        <span className={`font-medium ${i === 0 ? 'text-yellow-400' : 'text-white'}`}>
                          {i === 0 && '🏆 '}{strat.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center text-gray-300">{strat.pitCount}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        {strat.stints.map((s, j) => (
                          <span key={j} className="flex items-center gap-1 text-xs">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TYRE_COLORS_MAP[s.compound] }} />
                            <span className="text-gray-300 font-mono">{s.laps}L</span>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-white">{formatRaceTime(strat.totalTime)}</td>
                    <td className="py-3 px-4 text-right font-mono">
                      {delta === 0 ? (
                        <span className="text-yellow-400">—</span>
                      ) : (
                        <span className="text-red-400">+{formatRaceTime(delta)}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
