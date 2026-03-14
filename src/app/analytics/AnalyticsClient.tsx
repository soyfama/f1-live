'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList
} from 'recharts';
import { formatLapTime } from '@/lib/openf1';
import { getTeamColor } from '@/lib/f1-colors';

const TABS = [
  { id: 'drivers', label: 'Drivers' },
  { id: 'teams', label: 'Teams' },
  { id: 'stints', label: 'Stints' },
  { id: 'sectors', label: 'Sectors' },
  { id: 'speed', label: 'Speed' },
];

interface SessionOption { value: string; label: string; sessionKey: number; }
interface MeetingOption { value: string; label: string; meetingKey: number; }
interface DriverRow { name: string; team: string; bestLap: number; bestLapStr: string; s1: number | null; s2: number | null; s3: number | null; laps: number; fill: string; }
interface TeamRow { name: string; fullTeam: string; bestLap: number; bestLapStr: string; fill: string; }
interface SectorRow { name: string; S1: number | null; S2: number | null; S3: number | null; }
interface SpeedRow { name: string; team: string; speed: number; fill: string; }
interface StintRow { driver: string; stint: number; laps: number; compound: string; from: number; to: number; }

export default function AnalyticsClient() {
  const [activeTab, setActiveTab] = useState('drivers');
  const [year, setYear] = useState(2026);
  const [meetings, setMeetings] = useState<MeetingOption[]>([]);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<number | null>(null);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<{ drivers: DriverRow[]; teams: TeamRow[]; stints: StintRow[]; sectors: SectorRow[]; speed: SpeedRow[]; }>({ drivers: [], teams: [], stints: [], sectors: [], speed: [] });

  useEffect(() => {
    fetch(`https://api.openf1.org/v1/meetings?year=${year}`)
      .then(r => r.json())
      .then((data: Array<{ meeting_key: number; meeting_name: string; country_name: string; date_start?: string }>) => {
        const opts = data.map(m => ({ value: String(m.meeting_key), label: `${m.country_name} — ${m.meeting_name}`, meetingKey: m.meeting_key, dateStart: m.date_start }));
        const sortedOpts = [...opts].sort((a, b) => b.meetingKey - a.meetingKey);
        setMeetings(sortedOpts);
        const now = Date.now();
        const pastMeetings = sortedOpts.filter((m: any) => m.dateStart && new Date(m.dateStart).getTime() <= now);
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
        const opts = data.map(s => ({ value: String(s.session_key), label: s.session_name, sessionKey: s.session_key }));
        setSessions(opts);
        const race = opts.find(s => s.label.toLowerCase().includes('race'));
        setSelectedSession(race?.sessionKey ?? opts[opts.length - 1]?.sessionKey ?? null);
      })
      .catch(() => {});
  }, [selectedMeeting]);

  const loadData = useCallback(async () => {
    if (!selectedSession) return;
    setLoading(true);
    try {
      const [drivers, laps, stints] = await Promise.all([
        fetch(`https://api.openf1.org/v1/drivers?session_key=${selectedSession}`).then(r => r.json()),
        fetch(`https://api.openf1.org/v1/laps?session_key=${selectedSession}`).then(r => r.json()),
        fetch(`https://api.openf1.org/v1/stints?session_key=${selectedSession}`).then(r => r.json()),
      ]);

      const driverMap: Record<number, { name_acronym: string; team_name: string; driver_number: number; team_colour?: string }> = {};
      for (const d of drivers) driverMap[d.driver_number] = d;

      const bestLapMap: Record<number, number> = {};
      const lapCountMap: Record<number, number> = {};
      for (const l of laps) {
        const dn = l.driver_number;
        const dur = l.lap_duration;
        lapCountMap[dn] = (lapCountMap[dn] ?? 0) + 1;
        if (dur && dur > 0 && (!bestLapMap[dn] || dur < bestLapMap[dn])) bestLapMap[dn] = dur;
      }

      const bestS1: Record<number, number> = {};
      const bestS2: Record<number, number> = {};
      const bestS3: Record<number, number> = {};
      for (const l of laps) {
        const dn = l.driver_number;
        if (l.duration_sector_1 && (!bestS1[dn] || l.duration_sector_1 < bestS1[dn])) bestS1[dn] = l.duration_sector_1;
        if (l.duration_sector_2 && (!bestS2[dn] || l.duration_sector_2 < bestS2[dn])) bestS2[dn] = l.duration_sector_2;
        if (l.duration_sector_3 && (!bestS3[dn] || l.duration_sector_3 < bestS3[dn])) bestS3[dn] = l.duration_sector_3;
      }

      const maxSpeed: Record<number, number> = {};
      for (const l of laps) {
        const dn = l.driver_number;
        const sp = l.st_speed ?? l.i2_speed ?? l.i1_speed;
        if (sp && (!maxSpeed[dn] || sp > maxSpeed[dn])) maxSpeed[dn] = sp;
      }

      const teamBestLap: Record<string, number> = {};
      for (const [dn, best] of Object.entries(bestLapMap)) {
        const team = driverMap[Number(dn)]?.team_name ?? 'Unknown';
        if (!teamBestLap[team] || best < teamBestLap[team]) teamBestLap[team] = best;
      }

      const longStints: StintRow[] = [];
      for (const s of stints) {
        const lapCount = (s.lap_end ?? 0) - (s.lap_start ?? 0) + 1;
        if (lapCount >= 6) {
          const d = driverMap[s.driver_number];
          longStints.push({ driver: d?.name_acronym ?? String(s.driver_number), stint: s.stint_number, laps: lapCount, compound: s.compound ?? '?', from: s.lap_start, to: s.lap_end });
        }
      }

      const driverChartData: DriverRow[] = Object.entries(bestLapMap)
        .map(([dn, best]) => {
          const d = driverMap[Number(dn)];
          const teamColor = d?.team_colour ? `#${d.team_colour}` : getTeamColor(d?.team_name ?? '');
          return { name: d?.name_acronym ?? dn, team: d?.team_name ?? 'Unknown', bestLap: best, bestLapStr: formatLapTime(best), s1: bestS1[Number(dn)] ?? null, s2: bestS2[Number(dn)] ?? null, s3: bestS3[Number(dn)] ?? null, laps: lapCountMap[Number(dn)] ?? 0, fill: teamColor };
        })
        .sort((a, b) => a.bestLap - b.bestLap);

      const teamChartData: TeamRow[] = Object.entries(teamBestLap)
        .map(([team, best]) => ({ name: team.replace('Oracle Red Bull Racing', 'Red Bull').replace(' F1 Team', ''), fullTeam: team, bestLap: best, bestLapStr: formatLapTime(best), fill: getTeamColor(team) }))
        .sort((a, b) => a.bestLap - b.bestLap);

      const sectorData: SectorRow[] = Object.entries(bestS1)
        .filter(([dn]) => driverMap[Number(dn)])
        .map(([dn]) => {
          const d = driverMap[Number(dn)];
          return { name: d.name_acronym, S1: bestS1[Number(dn)] ?? null, S2: bestS2[Number(dn)] ?? null, S3: bestS3[Number(dn)] ?? null };
        })
        .sort((a, b) => (a.S1 ?? 99) - (b.S1 ?? 99))
        .slice(0, 15);

      const speedData: SpeedRow[] = Object.entries(maxSpeed)
        .filter(([dn]) => driverMap[Number(dn)])
        .map(([dn, speed]) => {
          const d = driverMap[Number(dn)];
          return { name: d.name_acronym, team: d.team_name, speed, fill: d.team_colour ? `#${d.team_colour}` : getTeamColor(d.team_name) };
        })
        .sort((a, b) => b.speed - a.speed);

      setAnalyticsData({ drivers: driverChartData, teams: teamChartData, stints: longStints, sectors: sectorData, speed: speedData });
    } finally { setLoading(false); }
  }, [selectedSession]);

  useEffect(() => { loadData(); }, [loadData]);

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name?: string }>; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-[#111] border border-[#333] rounded-lg p-3 text-xs shadow-xl">
        <p className="text-white font-bold mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="text-gray-300 font-mono">{p.name ? `${p.name}: ` : ''}{p.value && p.value < 200 ? formatLapTime(p.value) : `${p.value} km/h`}</p>
        ))}
      </div>
    );
  };

  const driverChartData = analyticsData.drivers;
  const teamChartData = analyticsData.teams;

  return (
    <div className="flex flex-col lg:flex-row gap-0 min-h-[calc(100vh-3.5rem)]">
      {/* Sidebar - Responsive */}
      <aside className="w-full lg:w-48 shrink-0 border-b lg:border-b-0 lg:border-r border-[#1a1a1a] bg-[#0a0a0a] py-4 lg:py-5 px-4 lg:px-3">
        <p className="text-gray-400 text-[10px] uppercase tracking-widest px-2 mb-3 font-bold">Analysis</p>
        <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`w-auto lg:w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-[#E10600]/15 text-white font-semibold border border-[#E10600]/30' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
              {activeTab === tab.id && <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#E10600] mr-2" />}
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex-1 px-4 sm:px-6 lg:px-8 py-5 overflow-auto">
        <div className="mb-5 border-b border-[#1a1a1a] pb-4">
          <h1 className="text-white font-bold text-xl mb-3">Session Analytics</h1>
          <div className="flex flex-wrap gap-3 items-center">
            <select value={year} onChange={e => setYear(Number(e.target.value))} className="bg-[#111] border border-[#222] text-white rounded-lg px-3 py-2 text-sm w-full sm:w-auto">
              {[2026, 2025, 2024, 2023].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={selectedMeeting ?? ''} onChange={e => setSelectedMeeting(Number(e.target.value))} className="bg-[#111] border border-[#222] text-white rounded-lg px-3 py-2 text-sm min-w-[200px] w-full sm:w-auto">
              {meetings.map(m => <option key={m.meetingKey} value={m.meetingKey}>{m.label}</option>)}
            </select>
            <select value={selectedSession ?? ''} onChange={e => setSelectedSession(Number(e.target.value))} className="bg-[#111] border border-[#222] text-white rounded-lg px-3 py-2 text-sm w-full sm:w-auto">
              {sessions.map(s => <option key={s.sessionKey} value={s.sessionKey}>{s.label}</option>)}
            </select>
            <button onClick={loadData} disabled={loading} className="bg-[#E10600] hover:bg-[#c00500] disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors w-full sm:w-auto">{loading ? 'Loading...' : 'Load'}</button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-8 h-8 border-2 border-[#E10600] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-400 text-sm">Loading session data...</p>
          </div>
        ) : (
          <>
            {activeTab === 'drivers' && (
              <div className="space-y-6">
                <div className="chart-container">
                  <h3 className="text-white font-semibold mb-4">Best Lap by Driver</h3>
                  {driverChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={Math.max(400, driverChartData.length * 32)}>
                      <BarChart data={driverChartData} layout="vertical" margin={{ left: 10, right: 80 }} barSize={18}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" horizontal={false} />
                        <XAxis type="number" tickFormatter={(v) => formatLapTime(v)} tick={{ fill: '#666', fontSize: 11, fontFamily: 'monospace' }} domain={[(dataMin: number) => Math.floor(dataMin * 0.997), (dataMax: number) => Math.ceil(dataMax * 1.001)]} />
                        <YAxis type="category" dataKey="name" tick={{ fill: '#fff', fontSize: 12, fontWeight: 'bold' }} width={45} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="bestLap" radius={[0, 4, 4, 0]}>
                          {driverChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                          <LabelList dataKey="bestLap" position="right" formatter={(v: any) => formatLapTime(Number(v))} style={{ fill: '#888', fontSize: 10, fontFamily: 'monospace' }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                      <p className="text-3xl mb-2">📊</p>
                      <p className="text-sm font-medium text-gray-400">No lap data available</p>
                      <p className="text-xs mt-1 text-gray-500">Select a session and click Load</p>
                    </div>
                  )}
                </div>

                {driverChartData.length > 0 && (
                  <div className="f1-card overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[#1a1a1a] text-gray-400 text-xs uppercase tracking-wider">
                            <th className="py-3 px-3 text-left">Pos</th>
                            <th className="py-3 px-3 text-left">Driver</th>
                            <th className="py-3 px-3 text-left">Team</th>
                            <th className="py-3 px-3 text-right">Best Lap</th>
                            <th className="py-3 px-3 text-right">Gap</th>
                            <th className="py-3 px-3 text-right hidden md:table-cell">S1</th>
                            <th className="py-3 px-3 text-right hidden md:table-cell">S2</th>
                            <th className="py-3 px-3 text-right hidden md:table-cell">S3</th>
                            <th className="py-3 px-3 text-right">Laps</th>
                          </tr>
                        </thead>
                        <tbody>
                          {driverChartData.map((d, i) => {
                            const gap = i === 0 ? null : d.bestLap - driverChartData[0].bestLap;
                            return (
                              <tr key={d.name} className="border-b border-[#1a1a1a]/50 hover:bg-white/[0.02]">
                                <td className="py-3 px-3 text-gray-400 font-mono">{i + 1}</td>
                                <td className="py-3 px-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-[3px] h-4 rounded-full" style={{ backgroundColor: d.fill }} />
                                    <span className="font-bold text-white">{d.name}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-gray-400 text-xs">{d.team?.replace(' F1 Team', '').replace('Oracle Red Bull Racing', 'Red Bull')}</td>
                                <td className="py-3 px-3 text-right font-mono text-white">{formatLapTime(d.bestLap)}</td>
                                <td className="py-3 px-3 text-right font-mono">{gap === null ? <span className="text-[#FFD700]">—</span> : <span className="text-red-400">+{formatLapTime(gap)}</span>}</td>
                                <td className="py-3 px-3 text-right font-mono text-gray-400 hidden md:table-cell text-xs">{d.s1 ? d.s1.toFixed(3) : '—'}</td>
                                <td className="py-3 px-3 text-right font-mono text-gray-400 hidden md:table-cell text-xs">{d.s2 ? d.s2.toFixed(3) : '—'}</td>
                                <td className="py-3 px-3 text-right font-mono text-gray-400 hidden md:table-cell text-xs">{d.s3 ? d.s3.toFixed(3) : '—'}</td>
                                <td className="py-3 px-3 text-right text-gray-400 text-xs">{d.laps}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'teams' && (
              <div className="chart-container">
                <h3 className="text-white font-semibold mb-4">Best Lap by Team</h3>
                {teamChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={Math.max(300, teamChartData.length * 45)}>
                    <BarChart data={teamChartData} layout="vertical" margin={{ left: 10, right: 90 }} barSize={22}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" horizontal={false} />
                      <XAxis type="number" tickFormatter={(v) => formatLapTime(v)} tick={{ fill: '#666', fontSize: 11, fontFamily: 'monospace' }} domain={[(dataMin: number) => Math.floor(dataMin * 0.997), (dataMax: number) => Math.ceil(dataMax * 1.001)]} />
                      <YAxis type="category" dataKey="name" tick={{ fill: '#fff', fontSize: 11 }} width={110} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="bestLap" radius={[0, 4, 4, 0]}>
                        {teamChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                        <LabelList dataKey="bestLap" position="right" formatter={(v: any) => formatLapTime(Number(v))} style={{ fill: '#888', fontSize: 10, fontFamily: 'monospace' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <p className="text-3xl mb-2">🏎️</p>
                    <p className="text-sm font-medium text-gray-400">No team data available</p>
                    <p className="text-xs mt-1 text-gray-500">Select a session and click Load</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'stints' && (
              <div className="chart-container">
                <h3 className="text-white font-semibold mb-4">Long Stints (6+ laps)</h3>
                {analyticsData.stints?.length ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {analyticsData.stints.map((s, i) => {
                      const tyreColors: Record<string, string> = { SOFT: '#FF3333', MEDIUM: '#FFF200', HARD: '#FFFFFF', INTERMEDIATE: '#39B54A', WET: '#0067FF' };
                      const color = tyreColors[s.compound?.toUpperCase()] ?? '#888';
                      return (
                        <div key={i} className="bg-[#0a0a0a] rounded-lg p-3 text-xs border border-[#1a1a1a]">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-white font-bold">{s.driver}</span>
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                          </div>
                          <p className="text-gray-400">{s.laps} laps • {s.compound}</p>
                          <p className="text-gray-500 font-mono">L{s.from} → L{s.to}</p>
                        </div>
                      );
                    })}
                  </div>
                ) : <p className="text-gray-400 text-center py-12">No long stints found</p>}
              </div>
            )}

            {activeTab === 'sectors' && (
              <div className="chart-container space-y-6">
                <h3 className="text-white font-semibold">Best Sector Times</h3>
                {analyticsData.sectors?.length ? (
                  ['S1', 'S2', 'S3'].map((sector, si) => (
                    <div key={sector}>
                      <h4 className="text-gray-400 text-sm mb-2 font-medium">Sector {si + 1}</h4>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={analyticsData.sectors.slice(0, 15)} layout="vertical" margin={{ left: 10, right: 60 }} barSize={14}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" horizontal={false} />
                          <XAxis type="number" tickFormatter={(v) => v.toFixed(3)} tick={{ fill: '#666', fontSize: 10, fontFamily: 'monospace' }} domain={[(dataMin: number) => Math.floor(dataMin * 0.997), (dataMax: number) => Math.ceil(dataMax * 1.001)]} />
                          <YAxis type="category" dataKey="name" tick={{ fill: '#fff', fontSize: 11 }} width={35} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey={sector} fill={['#BF00FF', '#00FF00', '#FFFF00'][si]} radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ))
                ) : <p className="text-gray-400 text-center py-12">No sector data</p>}
              </div>
            )}

            {activeTab === 'speed' && (
              <div className="chart-container">
                <h3 className="text-white font-semibold mb-4">Speed Trap (km/h)</h3>
                {analyticsData.speed?.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#1a1a1a] text-gray-400 text-xs uppercase tracking-wider">
                          <th className="py-3 px-3 text-left">Pos</th>
                          <th className="py-3 px-3 text-left">Driver</th>
                          <th className="py-3 px-3 text-left">Team</th>
                          <th className="py-3 px-3 text-right">Max Speed</th>
                          <th className="py-3 px-3 text-left w-40">Bar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analyticsData.speed.map((d, i) => (
                          <tr key={i} className="border-b border-[#1a1a1a]/50 hover:bg-white/[0.02]">
                            <td className="py-3 px-3 text-gray-400 font-mono">{i + 1}</td>
                            <td className="py-3 px-3 font-bold text-white">{d.name}</td>
                            <td className="py-3 px-3 text-gray-400 text-xs">{d.team?.replace(' F1 Team', '')}</td>
                            <td className="py-3 px-3 text-right font-mono text-green-400">{d.speed}</td>
                            <td className="py-3 px-3">
                              <div className="bg-[#0a0a0a] rounded h-2">
                                <div className="h-2 rounded transition-all" style={{ width: `${(d.speed / Math.max(...analyticsData.speed.map(x => x.speed))) * 100}%`, backgroundColor: d.fill }} />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="text-gray-400 text-center py-12">No speed data</p>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
