'use client';

import { useState, useMemo, useEffect } from 'react';
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
  const [sessionKey, setSessionKey] = useState(9159); // Default to a known session

  // Load real stint data
  useEffect(() => {
    // Australia 2025 Race session
    fetch('https://api.openf1.org/v1/stints?session_key=9159&driver_number=1')
      .then(r => r.json())
      .then((data: RealStint[]) => {
        if (data?.length) {
          setSelectedDriverStints(data);
        }
      })
      .catch(() => {});
  }, []);

  // Generate strategies
  useEffect(() => {
    const generated: Strategy[] = PRESET_STRATEGIES.map((preset, i) => {
      // Distribute laps proportionally
      const totalPropLaps = preset.stints.reduce((sum, s) => sum + s.laps, 0);
      const stints = preset.stints.map(s => ({
        ...s,
        laps: Math.round((s.laps / totalPropLaps) * totalLaps),
      }));
      // Adjust last stint to fill exactly
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
        <p className="text-gray-500 text-xs mb-6">Configure race parameters</p>

        <div className="space-y-5">
          <div>
            <label className="text-gray-400 text-xs uppercase tracking-wider block mb-2">Circuit Laps</label>
            <input
              type="number"
              value={totalLaps}
              onChange={e => setTotalLaps(Math.max(1, Number(e.target.value)))}
              className="w-full bg-[#1a1f2e] border border-[#2a3040] text-white rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-gray-400 text-xs uppercase tracking-wider block mb-2">
              Base Lap Time (s): {baseLapTime.toFixed(1)}s
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
              <span>70s</span><span>{formatLapTime(baseLapTime)}</span><span>150s</span>
            </div>
          </div>

          <div>
            <label className="text-gray-400 text-xs uppercase tracking-wider block mb-2">
              Pit Stop Loss: {pitLoss}s
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
              <span>15s</span><span>{pitLoss}s</span><span>35s</span>
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
          {selectedDriverStints.length > 0 && (
            <div>
              <label className="text-gray-400 text-xs uppercase tracking-wider block mb-2">
                Real Stints (VER · AUS 2025)
              </label>
              <div className="space-y-1">
                {selectedDriverStints.map(s => (
                  <div key={s.stint_number} className="flex items-center gap-2 text-xs bg-[#1a1f2e] rounded px-2 py-1.5">
                    <span className="w-2 h-2 rounded-full" style={{
                      backgroundColor: TYRE_COLORS_MAP[s.compound?.toUpperCase() as keyof typeof TYRE_COLORS_MAP] ?? '#888'
                    }} />
                    <span className="text-gray-300">{s.compound}</span>
                    <span className="text-gray-500 ml-auto">L{s.lap_start}→L{s.lap_end ?? '?'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="mb-6">
          <h1 className="text-white font-bold text-xl">Race Strategy Comparison</h1>
          <p className="text-gray-400 text-sm mt-1">
            {totalLaps} laps · Base {formatLapTime(baseLapTime)} · Pit loss {pitLoss}s
          </p>
        </div>

        {/* Winner banner */}
        {bestStrategy && (
          <div className="bg-[#1a1f2e] border border-yellow-500/30 rounded-xl p-4 mb-6 flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            <div>
              <p className="text-white font-bold">Optimal: {bestStrategy.name}</p>
              <p className="text-gray-400 text-sm">
                {formatRaceTime(bestStrategy.totalTime)} · {bestStrategy.pitCount} pit stop{bestStrategy.pitCount !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="ml-auto flex gap-2">
              {bestStrategy.stints.map((s, i) => (
                <div key={i} className="flex items-center gap-1 text-xs">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: TYRE_COLORS_MAP[s.compound] }} />
                  <span className="text-gray-300">{s.laps}L</span>
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
                tick={{ fill: '#6b7280', fontSize: 10 }}
                width={80}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value) => {
                  const strat = strategies.find(s => s.id === value);
                  return <span style={{ color: '#e5e7eb', fontSize: 12 }}>{strat?.name ?? value}</span>;
                }}
              />
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
                            <span className="text-gray-300">{s.laps}L</span>
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
