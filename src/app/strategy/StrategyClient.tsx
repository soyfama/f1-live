'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatLapTime } from '@/lib/openf1';

interface StintConfig { compound: 'SOFT' | 'MEDIUM' | 'HARD'; laps: number; }
interface Strategy { 
  id: string; 
  name: string; 
  stints: StintConfig[]; 
  color: string; 
  totalTime: number; 
  pitCount: number;
}
interface RealStint { stint_number: number; lap_start: number; lap_end: number; compound: string; }

// Modelo de degradación realista (valores Ferrari 2024/2025)
const REAL_DEGRADATION = {
  SOFT: { baseDeg: 0.18, cliff: 25, cliffMultiplier: 2.5 },
  MEDIUM: { baseDeg: 0.09, cliff: 38, cliffMultiplier: 2.0 },
  HARD: { baseDeg: 0.05, cliff: 52, cliffMultiplier: 1.8 }
} as const;

const TYRE_COLORS_MAP = { SOFT: '#FF3333', MEDIUM: '#FFF200', HARD: '#FFFFFF' };
const STRATEGY_COLORS = ['#3671C6', '#FF8000', '#16a34a', '#E8002D', '#BF00FF', '#06b6d4'];

function calcLapTime(baseLap: number, lapInStint: number, compound: 'SOFT' | 'MEDIUM' | 'HARD'): number {
  const deg = REAL_DEGRADATION[compound];
  const compoundOffset = compound === 'SOFT' ? 0 : compound === 'MEDIUM' ? 0.5 : 1.2;
  
  // Aplicar degradación con cliff
  let degradation = deg.baseDeg * lapInStint;
  if (lapInStint > deg.cliff) {
    const postCliffLaps = lapInStint - deg.cliff;
    degradation += deg.baseDeg * (deg.cliffMultiplier - 1) * postCliffLaps;
  }
  
  return baseLap + compoundOffset + degradation;
}

function simulateStrategy(stints: StintConfig[], baseLap: number, pitLoss: number, totalLaps: number): number[] {
  const lapTimes: number[] = [];
  let cumulative = 0;
  let lapNum = 0;
  for (let stintIdx = 0; stintIdx < stints.length; stintIdx++) {
    const stint = stints[stintIdx];
    const isPit = stintIdx > 0;
    for (let l = 0; l < stint.laps && lapNum < totalLaps; l++, lapNum++) {
      const lapTime = calcLapTime(baseLap, l, stint.compound);
      cumulative += lapTime + (l === 0 && isPit ? pitLoss : 0);
      lapTimes.push(cumulative);
    }
  }
  return lapTimes;
}

// Calcular undercut window
function calcUndercutWindow(
  gapBehind: number,
  pitStopLoss: number,
  tyreDeltaPerLap: number,
  lapsRemaining: number
): { works: boolean; margin: number } {
  const gain = tyreDeltaPerLap * lapsRemaining;
  const netLoss = pitStopLoss - gain;
  const margin = gapBehind - netLoss;
  return { works: margin > 0, margin };
}

const PRESET_STRATEGIES: Array<{ name: string; stints: StintConfig[] }> = [
  { name: '1-stop S→H', stints: [{ compound: 'SOFT', laps: 20 }, { compound: 'HARD', laps: 36 }] },
  { name: '1-stop M→H', stints: [{ compound: 'MEDIUM', laps: 25 }, { compound: 'HARD', laps: 31 }] },
  { name: '2-stop S→M→H', stints: [{ compound: 'SOFT', laps: 15 }, { compound: 'MEDIUM', laps: 20 }, { compound: 'HARD', laps: 21 }] },
  { name: '2-stop S→H→S', stints: [{ compound: 'SOFT', laps: 15 }, { compound: 'HARD', laps: 25 }, { compound: 'SOFT', laps: 16 }] },
  { name: '3-stop S→S→S→H', stints: [{ compound: 'SOFT', laps: 12 }, { compound: 'SOFT', laps: 14 }, { compound: 'SOFT', laps: 14 }, { compound: 'HARD', laps: 16 }] },
];

export default function StrategyClient() {
  const [totalLaps, setTotalLaps] = useState(58);
  const [baseLapTime, setBaseLapTime] = useState(95.0);
  const [pitLoss, setPitLoss] = useState(22);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [selectedDriverStints, setSelectedDriverStints] = useState<RealStint[]>([]);
  
  // Pit Window Calculator state
  const [gapBehind, setGapBehind] = useState(2.0);
  const [tyreDelta, setTyreDelta] = useState(0.5);
  const [lapsRemaining, setLapsRemaining] = useState(10);

  const [year, setYear] = useState(2026);
  const [meetings, setMeetings] = useState<{ meetingKey: number; label: string; dateStart?: string }[]>([]);
  const [sessions, setSessions] = useState<{ sessionKey: number; label: string }[]>([]);
  const [drivers, setDrivers] = useState<{ driverNumber: number; acronym: string; fullName: string; team: string }[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<number | null>(null);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);

  useEffect(() => {
    fetch(`https://api.openf1.org/v1/meetings?year=${year}`)
      .then(r => r.json())
      .then((data: Array<{ meeting_key: number; meeting_name: string; country_name: string; date_start?: string }>) => {
        const opts = data.map(m => ({ meetingKey: m.meeting_key, label: `${m.country_name} — ${m.meeting_name}`, dateStart: m.date_start }));
        const sortedOpts = [...opts].sort((a, b) => b.meetingKey - a.meetingKey);
        setMeetings(sortedOpts);
        const pastMeetings = sortedOpts.filter((m: any) => m.dateStart && new Date(m.dateStart).getTime() <= Date.now());
        const defaultKey = pastMeetings.length > 0 ? pastMeetings[0].meetingKey : 1279;
        setSelectedMeeting(defaultKey);
      })
      .catch(() => {});
  }, [year]);

  useEffect(() => {
    if (!selectedMeeting) return;
    fetch(`https://api.openf1.org/v1/sessions?meeting_key=${selectedMeeting}`)
      .then(r => r.json())
      .then((data: Array<{ session_key: number; session_name: string; session_type: string }>) => {
        const opts = data.map(s => ({ sessionKey: s.session_key, label: s.session_name }));
        setSessions(opts);
        const race = opts.find(s => s.label.toLowerCase().includes('race'));
        const chosen = race ?? opts[opts.length - 1];
        if (chosen) setSelectedSession(chosen.sessionKey);
      })
      .catch(() => {});
  }, [selectedMeeting]);

  useEffect(() => {
    if (!selectedSession) return;
    fetch(`https://api.openf1.org/v1/drivers?session_key=${selectedSession}`)
      .then(r => r.json())
      .then((data: Array<{ driver_number: number; name_acronym: string; full_name: string; team_name: string }>) => {
        const opts = data.filter(d => d.name_acronym).map(d => ({ 
          driverNumber: d.driver_number, 
          acronym: d.name_acronym, 
          fullName: d.full_name ?? d.name_acronym, 
          team: d.team_name ?? '' 
        })).sort((a, b) => a.acronym.localeCompare(b.acronym));
        setDrivers(opts);
        if (opts.length > 0) setSelectedDriver(opts[0].driverNumber);
      })
      .catch(() => {});
  }, [selectedSession]);

  const loadStints = useCallback(async () => {
    if (!selectedSession || !selectedDriver) return;
    try {
      const data: RealStint[] = await fetch(`https://api.openf1.org/v1/stints?session_key=${selectedSession}&driver_number=${selectedDriver}`).then(r => r.json());
      if (data?.length) {
        setSelectedDriverStints(data);
        const lastStint = data[data.length - 1];
        if (lastStint?.lap_end) setTotalLaps(lastStint.lap_end);
      } else { setSelectedDriverStints([]); }
    } catch { setSelectedDriverStints([]); }
  }, [selectedSession, selectedDriver]);

  useEffect(() => { loadStints(); }, [loadStints]);

  useEffect(() => {
    const generated: Strategy[] = PRESET_STRATEGIES.map((preset, i) => {
      const totalPropLaps = preset.stints.reduce((sum, s) => sum + s.laps, 0);
      const stints = preset.stints.map(s => ({ ...s, laps: Math.round((s.laps / totalPropLaps) * totalLaps) }));
      const usedLaps = stints.slice(0, -1).reduce((sum, s) => sum + s.laps, 0);
      stints[stints.length - 1].laps = totalLaps - usedLaps;
      const lapTimes = simulateStrategy(stints, baseLapTime, pitLoss, totalLaps);
      return { 
        id: `strat-${i}`, 
        name: preset.name, 
        stints, 
        color: STRATEGY_COLORS[i % STRATEGY_COLORS.length], 
        totalTime: lapTimes[lapTimes.length - 1] ?? 0, 
        pitCount: stints.length - 1 
      };
    });
    setStrategies(generated);
  }, [totalLaps, baseLapTime, pitLoss]);

  const { chartData, deltaData } = useMemo(() => {
    if (!strategies.length) return { chartData: [], deltaData: [] };
    const allLapTimes: Record<string, number[]> = {};
    for (const strat of strategies) allLapTimes[strat.id] = simulateStrategy(strat.stints, baseLapTime, pitLoss, totalLaps);
    const chartData: Array<Record<string, number>> = [];
    const deltaData: Array<Record<string, number>> = [];
    for (let lap = 1; lap <= totalLaps; lap++) {
      const row: Record<string, number> = { lap };
      const deltaRow: Record<string, number> = { lap };
      let minTime = Infinity;
      for (const strat of strategies) { 
        const t = allLapTimes[strat.id][lap - 1] ?? 0; 
        if (t > 0 && t < minTime) minTime = t; 
      }
      for (const strat of strategies) { 
        const t = allLapTimes[strat.id][lap - 1] ?? 0; 
        row[strat.id] = t; 
        deltaRow[strat.id] = t > 0 ? parseFloat((t - minTime).toFixed(3)) : 0; 
      }
      chartData.push(row);
      deltaData.push(deltaRow);
    }
    return { chartData, deltaData };
  }, [strategies, totalLaps, baseLapTime, pitLoss]);

  const bestStrategy = useMemo(() => 
    strategies.reduce((best, s) => (!best || s.totalTime < best.totalTime) ? s : best, strategies[0]), 
  [strategies]);

  // Undercut calculation
  const undercutCalc = calcUndercutWindow(gapBehind, pitLoss, tyreDelta, lapsRemaining);

  function formatRaceTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${s.toFixed(3).padStart(6, '0')}`;
    return `${m}:${s.toFixed(3).padStart(6, '0')}`;
  }

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; value: number; color: string }>; label?: number }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-[#13131F] border border-[rgba(255,255,255,0.07)] rounded-lg p-3 text-xs shadow-xl">
        <p className="text-[#EEEEF5] font-bold mb-2">Lap {label}</p>
        {payload.map((p) => { 
          const strat = strategies.find((s: Strategy) => s.id === p.dataKey); 
          return (
            <div key={p.dataKey} className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="text-[#7878A0]">{strat?.name}:</span>
              <span className="text-[#EEEEF5] font-mono">{formatRaceTime(p.value)}</span>
            </div>
          ); 
        })}
      </div>
    );
  };

  // Stint Timeline Component
  function StintTimeline({ strategy }: { strategy: Strategy }) {
    return (
      <div className="flex items-center gap-1 w-full">
        {strategy.stints.map((stint, i) => (
          <div key={i} className="flex items-center">
            <div 
              className="h-6 rounded-sm flex items-center justify-center text-[10px] font-bold text-black relative group cursor-help"
              style={{ 
                backgroundColor: TYRE_COLORS_MAP[stint.compound],
                width: `${(stint.laps / totalLaps) * 200}px`,
                minWidth: '20px'
              }}
            >
              {stint.laps > 3 && stint.compound[0]}
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-2 py-1 bg-[#1a1a2e] border border-[#333] rounded text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {stint.compound}: {stint.laps} laps
              </div>
            </div>
            {i < strategy.stints.length - 1 && (
              <div className="w-3 h-4 bg-gray-600 flex items-center justify-center text-[8px] text-white font-bold">
                P
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row w-full min-h-[calc(100vh-3.5rem)]">
      <aside className="w-full lg:w-[260px] shrink-0 border-b lg:border-b-0 lg:border-r border-[rgba(255,255,255,0.07)] bg-[#13131F] py-4 px-3 overflow-y-auto">
        <h2 className="text-[#EEEEF5] font-bold text-base mb-0.5 px-3">Strategy Simulator</h2>
        <p className="text-[#7878A0] text-xs mb-5 px-3 font-mono">Configure parameters</p>
        
        <div className="space-y-3 mb-5 pb-5 border-b border-[rgba(255,255,255,0.07)] px-3">
          <label className="text-[#4A4A6A] text-[10px] uppercase tracking-widest font-bold block">Reference Session</label>
          <select value={year} onChange={e => setYear(Number(e.target.value))} 
            className="w-full bg-[#0D0D14] border border-[rgba(255,255,255,0.07)] text-[#EEEEF5] rounded-lg px-3 py-2 text-sm">
            {[2026, 2025, 2024, 2023].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={selectedMeeting ?? ''} onChange={e => setSelectedMeeting(Number(e.target.value))} 
            className="w-full bg-[#0D0D14] border border-[rgba(255,255,255,0.07)] text-[#EEEEF5] rounded-lg px-3 py-2 text-sm">
            {meetings.map(m => <option key={m.meetingKey} value={m.meetingKey}>{m.label}</option>)}
          </select>
          <select value={selectedSession ?? ''} onChange={e => setSelectedSession(Number(e.target.value))} 
            className="w-full bg-[#0D0D14] border border-[rgba(255,255,255,0.07)] text-[#EEEEF5] rounded-lg px-3 py-2 text-sm">
            {sessions.map(s => <option key={s.sessionKey} value={s.sessionKey}>{s.label}</option>)}
          </select>
          <select value={selectedDriver ?? ''} onChange={e => setSelectedDriver(Number(e.target.value))} 
            className="w-full bg-[#0D0D14] border border-[rgba(255,255,255,0.07)] text-[#EEEEF5] rounded-lg px-3 py-2 text-sm">
            {drivers.map(d => <option key={d.driverNumber} value={d.driverNumber}>{d.acronym} — {d.team?.replace(' F1 Team', '')}</option>)}
          </select>
        </div>

        <div className="space-y-5 px-3">
          <div>
            <label className="text-[#4A4A6A] text-[10px] uppercase tracking-widest font-bold block mb-2">Circuit Laps</label>
            <input type="number" value={totalLaps} onChange={e => setTotalLaps(Math.max(1, Number(e.target.value)))} 
              className="w-full bg-[#0D0D14] border border-[rgba(255,255,255,0.07)] text-[#EEEEF5] rounded-lg px-3 py-2 text-sm font-mono" />
          </div>
          
          <div>
            <label className="text-[#4A4A6A] text-[10px] uppercase tracking-widest font-bold block mb-2">Base Lap: <span className="font-mono text-[#EEEEF5]">{baseLapTime.toFixed(1)}s</span></label>
            <input type="range" min="70" max="150" step="0.1" value={baseLapTime} 
              onChange={e => setBaseLapTime(Number(e.target.value))} className="w-full accent-[#E8002D]" />
          </div>
          
          <div>
            <label className="text-[#4A4A6A] text-[10px] uppercase tracking-widest font-bold block mb-2">Pit Loss: <span className="font-mono text-[#EEEEF5]">{pitLoss}s</span></label>
            <input type="range" min="15" max="35" step="0.5" value={pitLoss} 
              onChange={e => setPitLoss(Number(e.target.value))} className="w-full accent-[#E8002D]" />
          </div>

          {/* Pit Window Calculator */}
          <div className="pt-4 border-t border-[rgba(255,255,255,0.07)]">
            <label className="text-[#E8002D] text-[10px] uppercase tracking-widest font-bold block mb-3">Pit Window Calculator</label>
            
            <div className="space-y-3">
              <div>
                <label className="text-[#7878A0] text-[10px] block mb-1">Gap Behind: <span className="text-white font-mono">+{gapBehind.toFixed(1)}s</span></label>
                <input type="range" min="0" max="10" step="0.1" value={gapBehind} 
                  onChange={e => setGapBehind(Number(e.target.value))} className="w-full accent-[#E8002D]" />
              </div>
              
              <div>
                <label className="text-[#7878A0] text-[10px] block mb-1">Tyre Delta: <span className="text-white font-mono">{tyreDelta.toFixed(2)}s/lap</span></label>
                <input type="range" min="0.1" max="2" step="0.05" value={tyreDelta} 
                  onChange={e => setTyreDelta(Number(e.target.value))} className="w-full accent-[#E8002D]" />
              </div>
              
              <div>
                <label className="text-[#7878A0] text-[10px] block mb-1">Laps Remaining: <span className="text-white font-mono">{lapsRemaining}</span></label>
                <input type="range" min="1" max="30" step="1" value={lapsRemaining} 
                  onChange={e => setLapsRemaining(Number(e.target.value))} className="w-full accent-[#E8002D]" />
              </div>
            </div>
            
            <div className={`mt-3 p-2 rounded-lg text-xs font-bold ${undercutCalc.works ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              <div className="flex items-center justify-between">
                <span>{undercutCalc.works ? '✅ UNDERCUT WORKS' : '❌ UNDERCUT FAILS'}</span>
                <span className="font-mono">{undercutCalc.margin > 0 ? '+' : ''}{undercutCalc.margin.toFixed(1)}s</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 px-4 sm:px-6 lg:px-8 py-5 overflow-auto">
        <div className="mb-6 border-b border-[rgba(255,255,255,0.07)] pb-4">
          <h1 className="text-[#EEEEF5] font-bold text-xl">Race Strategy Comparison</h1>
          <p className="text-[#7878A0] text-sm mt-1 font-mono">{totalLaps} laps • Base {formatLapTime(baseLapTime)}</p>
        </div>

        {bestStrategy && (
          <div className="f1-card border-[rgba(232,0,45,0.3)] bg-gradient-to-r from-[rgba(232,0,45,0.08)] to-transparent mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#E8002D] flex items-center justify-center shrink-0"><span className="text-white text-lg">🏆</span></div>
            <div className="flex-1">
              <p className="text-[#EEEEF5] font-bold text-lg">Optimal: {bestStrategy.name}</p>
              <p className="text-[#7878A0] text-sm font-mono">{formatRaceTime(bestStrategy.totalTime)} • {bestStrategy.pitCount} stop{bestStrategy.pitCount !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {bestStrategy.stints.map((s, i) => (
                <div key={i} className="flex flex-col items-center gap-1 bg-[#0D0D14] rounded-lg px-3 py-2 border border-[rgba(255,255,255,0.07)]">
                  <span className="w-4 h-4 rounded-full" style={{ backgroundColor: TYRE_COLORS_MAP[s.compound] }} />
                  <span className="text-[#7878A0] text-xs font-mono">{s.laps}L</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="chart-container mb-5">
          <h3 className="text-[#EEEEF5] font-semibold mb-4">Gap to Best Strategy</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={deltaData} margin={{ top: 10, right: 30, left: 10, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
              <XAxis dataKey="lap" tick={{ fill: '#4A4A6A', fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `+${v.toFixed(1)}s`} tick={{ fill: '#4A4A6A', fontSize: 10, fontFamily: 'monospace' }} width={55} domain={[0, 'auto']} />
              <Tooltip contentStyle={{ background: '#13131F', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ paddingTop: 16 }} formatter={(value) => { const strat = strategies.find(s => s.id === value); return <span style={{ color: '#7878A0', fontSize: 11 }}>{strat?.name ?? value}</span>; }} />
              {strategies.map(strat => <Line key={strat.id} type="monotone" dataKey={strat.id} stroke={strat.color} 
                strokeWidth={strat.id === bestStrategy?.id ? 3 : 1.5} dot={false} 
                strokeDasharray={strat.id === bestStrategy?.id ? undefined : '4 2'} />)}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="f1-card overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Strategy</th>
                  <th className="text-center">Stops</th>
                  <th>Stint Timeline</th>
                  <th className="text-right">Total Time</th>
                  <th className="text-right">Delta</th>
                </tr>
              </thead>
              <tbody>
                {[...strategies].sort((a, b) => a.totalTime - b.totalTime).map((strat, i) => {
                  const delta = strat.totalTime - (bestStrategy?.totalTime ?? 0);
                  return (
                    <tr key={strat.id} className={i === 0 ? 'bg-[rgba(232,0,45,0.05)]' : ''}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: strat.color }} />
                          <span className={`font-medium ${i === 0 ? 'text-[#E8002D]' : 'text-[#EEEEF5]'}`}>{strat.name}</span>
                        </div>
                      </td>
                      <td className="text-center text-[#7878A0]">{strat.pitCount}</td>
                      <td className="min-w-[250px]">
                        <StintTimeline strategy={strat} />
                      </td>
                      <td className="text-right font-mono text-[#EEEEF5]">{formatRaceTime(strat.totalTime)}</td>
                      <td className="text-right font-mono">
                        {delta === 0 ? <span className="text-[#E8002D]">—</span> : 
                          <span className="text-[#FF3333]">+{formatRaceTime(delta)}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Degradation Model Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['SOFT', 'MEDIUM', 'HARD'] as const).map(compound => {
            const deg = REAL_DEGRADATION[compound];
            return (
              <div key={compound} className="f1-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-4 h-4 rounded-full" style={{ backgroundColor: TYRE_COLORS_MAP[compound] }} />
                  <span className="text-[#EEEEF5] font-bold">{compound}</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#7878A0]">Base Deg</span>
                    <span className="text-white font-mono">+{deg.baseDeg}s/lap</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7878A0]">Cliff</span>
                    <span className="text-white font-mono">Lap {deg.cliff}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7878A0]">Post-cliff</span>
                    <span className="text-white font-mono">x{deg.cliffMultiplier}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
