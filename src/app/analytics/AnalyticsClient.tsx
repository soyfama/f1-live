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

const TYRE_COLORS: Record<string, string> = { 
  SOFT: '#FF3333', 
  MEDIUM: '#FFF200', 
  HARD: '#FFFFFF', 
  INTERMEDIATE: '#39B54A', 
  WET: '#0067FF' 
};

export default function AnalyticsClient() {
  const [activeTab, setActiveTab] = useState('drivers');
  const [year, setYear] = useState(2026);
  const [meetings, setMeetings] = useState<{ value: string; label: string; meetingKey: number }[]>([]);
  const [sessions, setSessions] = useState<{ value: string; label: string; sessionKey: number }[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<number | null>(null);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<{
    drivers: { name: string; team: string; bestLap: number; bestLapStr: string; s1: number | null; s2: number | null; s3: number | null; laps: number; fill: string }[];
    teams: { name: string; fullTeam: string; bestLap: number; bestLapStr: string; fill: string }[];
    stints: { driver: string; stint: number; laps: number; compound: string; from: number; to: number; teamColor: string }[];
    sectors: { name: string; S1: number | null; S2: number | null; S3: number | null; teamColor: string }[];
    speed: { name: string; team: string; speed: number; fill: string }[];
  }>({ drivers: [], teams: [], stints: [], sectors: [], speed: [] });

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

      const stintData: { driver: string; stint: number; laps: number; compound: string; from: number; to: number; teamColor: string }[] = [];
      for (const s of stints) {
        const lapCount = (s.lap_end ?? 0) - (s.lap_start ?? 0) + 1;
        const d = driverMap[s.driver_number];
        if (d) {
          stintData.push({ 
            driver: d.name_acronym, 
            stint: s.stint_number, 
            laps: lapCount, 
            compound: s.compound ?? '?', 
            from: s.lap_start, 
            to: s.lap_end,
            teamColor: d.team_colour ? `#${d.team_colour}` : getTeamColor(d.team_name)
          });
        }
      }

      const driverChartData = Object.entries(bestLapMap)
        .map(([dn, best]) => {
          const d = driverMap[Number(dn)];
          const teamColor = d?.team_colour ? `#${d.team_colour}` : getTeamColor(d?.team_name ?? '');
          return { 
            name: d?.name_acronym ?? dn, 
            team: d?.team_name ?? 'Unknown', 
            bestLap: best, 
            bestLapStr: formatLapTime(best), 
            s1: bestS1[Number(dn)] ?? null, 
            s2: bestS2[Number(dn)] ?? null, 
            s3: bestS3[Number(dn)] ?? null, 
            laps: lapCountMap[Number(dn)] ?? 0, 
            fill: teamColor 
          };
        })
        .sort((a, b) => a.bestLap - b.bestLap);

      const teamChartData = Object.entries(teamBestLap)
        .map(([team, best]) => ({ 
          name: team.replace('Oracle Red Bull Racing', 'Red Bull').replace(' F1 Team', ''), 
          fullTeam: team, 
          bestLap: best, 
          bestLapStr: formatLapTime(best), 
          fill: getTeamColor(team) 
        }))
        .sort((a, b) => a.bestLap - b.bestLap);

      const sectorData = Object.entries(bestS1)
        .filter(([dn]) => driverMap[Number(dn)])
        .map(([dn]) => {
          const d = driverMap[Number(dn)];
          return { 
            name: d.name_acronym, 
            S1: bestS1[Number(dn)] ?? null, 
            S2: bestS2[Number(dn)] ?? null, 
            S3: bestS3[Number(dn)] ?? null,
            teamColor: d.team_colour ? `#${d.team_colour}` : getTeamColor(d.team_name)
          };
        })
        .sort((a, b) => (a.S1 ?? 99) - (b.S1 ?? 99))
        .slice(0, 15);

      const speedData = Object.entries(maxSpeed)
        .filter(([dn]) => driverMap[Number(dn)])
        .map(([dn, speed]) => {
          const d = driverMap[Number(dn)];
          return { 
            name: d.name_acronym, 
            team: d.team_name, 
            speed, 
            fill: d.team_colour ? `#${d.team_colour}` : getTeamColor(d.team_name) 
          };
        })
        .sort((a, b) => b.speed - a.speed);

      setAnalyticsData({ 
        drivers: driverChartData, 
        teams: teamChartData, 
        stints: stintData, 
        sectors: sectorData, 
        speed: speedData 
      });
    } finally { setLoading(false); }
  }, [selectedSession]);

  useEffect(() => { loadData(); }, [loadData]);

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name?: string }>; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-[#13131F] border border-[rgba(255,255,255,0.07)] rounded-lg p-3 text-xs shadow-xl">
        <p className="text-[#EEEEF5] font-bold mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="text-[#7878A0] font-mono">{p.name ? `${p.name}: ` : ''}{p.value && p.value < 200 ? formatLapTime(p.value) : `${p.value} km/h`}</p>
        ))}
      </div>
    );
  };

  // Gantt Chart Component for Stints
  function StintGanttChart() {
    const drivers = [...new Set(analyticsData.stints.map(s => s.driver))];
    const maxLap = Math.max(...analyticsData.stints.map(s => s.to), 50);
    
    return (
      <div className="space-y-2">
        {drivers.slice(0, 20).map(driver => {
          const driverStints = analyticsData.stints.filter(s => s.driver === driver);
          const teamColor = driverStints[0]?.teamColor ?? '#666';
          return (
            <div key={driver} className="flex items-center gap-2">
              <div className="w-12 text-[11px] font-bold text-[#EEEEF5] truncate">{driver}</div>
              <div className="flex-1 h-8 bg-[#0D0D14] rounded relative" style={{ minWidth: '300px' }}>
                {driverStints.map((stint, i) => {
                  const left = (stint.from / maxLap) * 100;
                  const width = ((stint.to - stint.from + 1) / maxLap) * 100;
                  const color = TYRE_COLORS[stint.compound?.toUpperCase()] ?? '#888';
                  return (
                    <div
                      key={i}
                      className="absolute top-1 bottom-1 rounded flex items-center justify-center text-[9px] font-bold text-black cursor-help group"
                      style={{ 
                        left: `${left}%`, 
                        width: `${width}%`, 
                        backgroundColor: color,
                        minWidth: '20px'
                      }}
                    >
                      {width > 8 && stint.laps}
                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-2 py-1 bg-[#1a1a2e] border border-[#333] rounded text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        {stint.compound}: L{stint.from}-{stint.to} ({stint.laps} laps)
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        <div className="flex items-center gap-2 mt-4 pt-2 border-t border-[rgba(255,255,255,0.07)]">
          <div className="w-12"></div>
          <div className="flex-1 flex justify-between text-[10px] text-[#7878A0]">
            <span>L1</span>
            <span>L{Math.round(maxLap / 4)}</span>
            <span>L{Math.round(maxLap / 2)}</span>
            <span>L{Math.round(maxLap * 0.75)}</span>
            <span>L{maxLap}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row w-full min-h-[calc(100vh-3.5rem)]">
      <aside className="w-[220px] shrink-0 border-r border-[rgba(255,255,255,0.07)] bg-[#13131F] py-4 px-3 hidden lg:block">
        <p className="text-[#4A4A6A] text-[10px] uppercase tracking-widest px-3 mb-3 font-bold">Analysis</p>
        <nav className="flex flex-col gap-1">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`sidebar-item ${activeTab === tab.id ? 'active' : ''}`}>
              {activeTab === tab.id && <span className="w-1.5 h-1.5 rounded-full bg-[#E8002D]" />}
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="lg:hidden w-full border-b border-[rgba(255,255,255,0.07)] bg-[#13131F] py-3 px-4">
        <div className="flex gap-1 overflow-x-auto pb-2">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-all ${
                activeTab === tab.id ? 'bg-[rgba(232,0,45,0.12)] text-[#EEEEF5] font-medium' : 'text-[#7878A0] hover:text-[#EEEEF5] hover:bg-[#1C1C2E]'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 sm:px-6 lg:px-8 py-5 overflow-auto">
        <div className="mb-6 border-b border-[rgba(255,255,255,0.07)] pb-4">
          <h1 className="text-[#EEEEF5] font-bold text-xl mb-4">Session Analytics</h1>
          <div className="flex flex-wrap gap-3 items-center">
            <select value={year} onChange={e => setYear(Number(e.target.value))} 
              className="bg-[#13131F] border border-[rgba(255,255,255,0.07)] text-[#EEEEF5] rounded-lg px-3 py-2 text-sm">
              {[2026, 2025, 2024, 2023].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={selectedMeeting ?? ''} onChange={e => setSelectedMeeting(Number(e.target.value))} 
              className="bg-[#13131F] border border-[rgba(255,255,255,0.07)] text-[#EEEEF5] rounded-lg px-3 py-2 text-sm min-w-[200px]">
              {meetings.map(m => <option key={m.meetingKey} value={m.meetingKey}>{m.label}</option>)}
            </select>
            <select value={selectedSession ?? ''} onChange={e => setSelectedSession(Number(e.target.value))} 
              className="bg-[#13131F] border border-[rgba(255,255,255,0.07)] text-[#EEEEF5] rounded-lg px-3 py-2 text-sm">
              {sessions.map(s => <option key={s.sessionKey} value={s.sessionKey}>{s.label}</option>)}
            </select>
            <button onClick={loadData} disabled={loading} 
              className="bg-[#E8002D] hover:bg-[#B80024] disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
              {loading ? 'Loading...' : 'Load'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-8 h-8 border-2 border-[#E8002D] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-[#7878A0] text-sm">Loading session data...</p>
          </div>
        ) : (
          <>
            {activeTab === 'drivers' && (
              <div className="space-y-6">
                <div className="chart-container">
                  <h3 className="text-[#EEEEF5] font-semibold mb-4">Best Lap by Driver</h3>
                  {analyticsData.drivers.length > 0 ? (
                    <ResponsiveContainer width="100%" height={Math.max(400, analyticsData.drivers.length * 32)}>
                      <BarChart data={analyticsData.drivers} layout="vertical" margin={{ left: 10, right: 80 }} barSize={18}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" horizontal={false} />
                        <XAxis type="number" tickFormatter={(v) => formatLapTime(v)} tick={{ fill: '#4A4A6A', fontSize: 11, fontFamily: 'monospace' }} 
                          domain={[(dataMin: number) => Math.floor(dataMin * 0.997), (dataMax: number) => Math.ceil(dataMax * 1.001)]} />
                        <YAxis type="category" dataKey="name" tick={{ fill: '#EEEEF5', fontSize: 12, fontWeight: 'bold' }} width={45} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="bestLap" radius={[0, 4, 4, 0]}>
                          {analyticsData.drivers.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                          <LabelList dataKey="bestLap" position="right" formatter={(v) => formatLapTime(Number(v))} style={{ fill: '#7878A0', fontSize: 10, fontFamily: 'monospace' }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="empty-state">
                      <svg className="w-12 h-12 text-[#4A4A6A] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <p className="text-[#7878A0] font-medium">No lap data available</p>
                      <p className="text-xs text-[#4A4A6A] mt-1">Select a session and click Load to see driver analytics</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'teams' && (
              <div className="chart-container">
                <h3 className="text-[#EEEEF5] font-semibold mb-4">Best Lap by Team</h3>
                {analyticsData.teams.length > 0 ? (
                  <ResponsiveContainer width="100%" height={Math.max(300, analyticsData.teams.length * 45)}>
                    <BarChart data={analyticsData.teams} layout="vertical" margin={{ left: 10, right: 90 }} barSize={22}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" horizontal={false} />
                      <XAxis type="number" tickFormatter={(v) => formatLapTime(v)} tick={{ fill: '#4A4A6A', fontSize: 11, fontFamily: 'monospace' }} 
                        domain={[(dataMin: number) => Math.floor(dataMin * 0.997), (dataMax: number) => Math.ceil(dataMax * 1.001)]} />
                      <YAxis type="category" dataKey="name" tick={{ fill: '#EEEEF5', fontSize: 11 }} width={110} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="bestLap" radius={[0, 4, 4, 0]}>
                        {analyticsData.teams.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                        <LabelList dataKey="bestLap" position="right" formatter={(v) => formatLapTime(Number(v))} style={{ fill: '#7878A0', fontSize: 10, fontFamily: 'monospace' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-state">
                    <p className="text-[#7878A0] font-medium">No team data available</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'stints' && (
              <div className="chart-container">
                <h3 className="text-[#EEEEF5] font-semibold mb-4">Stint Timeline (Gantt)</h3>
                {analyticsData.stints?.length ? (
                  <StintGanttChart />
                ) : (
                  <div className="empty-state">
                    <p className="text-[#7878A0] font-medium">No stint data available</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'sectors' && (
              <div className="chart-container space-y-6">
                <h3 className="text-[#EEEEF5] font-semibold">Best Sector Times</h3>
                {analyticsData.sectors?.length ? (
                  ['S1', 'S2', 'S3'].map((sector, si) => (
                    <div key={sector}>
                      <h4 className="text-[#7878A0] text-sm mb-3 font-medium">Sector {si + 1}</h4>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={analyticsData.sectors.slice(0, 15)} layout="vertical" margin={{ left: 10, right: 60 }} barSize={14}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" horizontal={false} />
                          <XAxis type="number" tickFormatter={(v) => v.toFixed(3)} tick={{ fill: '#4A4A6A', fontSize: 10, fontFamily: 'monospace' }} 
                            domain={[(dataMin: number) => Math.floor(dataMin * 0.997), (dataMax: number) => Math.ceil(dataMax * 1.001)]} />
                          <YAxis type="category" dataKey="name" tick={{ fill: '#EEEEF5', fontSize: 11 }} width={35} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey={sector} fill={['#BF00FF', '#00FF44', '#FFE600'][si]} radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <p className="text-[#7878A0] font-medium">No sector data available</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'speed' && (
              <div className="chart-container">
                <h3 className="text-[#EEEEF5] font-semibold mb-4">Speed Trap (km/h)</h3>
                {analyticsData.speed?.length ? (
                  <div className="overflow-x-auto">
                    <table className="premium-table">
                      <thead>
                        <tr>
                          <th>Pos</th>
                          <th>Driver</th>
                          <th>Team</th>
                          <th className="text-right">Max Speed</th>
                          <th className="text-left w-40">Bar
</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analyticsData.speed.map((d, i) => (
                          <tr key={i}>
                            <td className="text-[#7878A0] font-mono">{i + 1}</td>
                            <td className="font-bold text-[#EEEEF5]">{d.name}</td>
                            <td className="text-[#7878A0] text-xs">{d.team?.replace(' F1 Team', '')}</td>
                            <td className="text-right font-mono text-[#00FF44]">{d.speed}</td>
                            <td>
                              <div className="bg-[#0D0D14] rounded h-2">
                                <div className="h-2 rounded transition-all" 
                                  style={{ width: `${(d.speed / Math.max(...analyticsData.speed.map(x => x.speed))) * 100}%`, backgroundColor: d.fill }} />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">
                    <p className="text-[#7878A0] font-medium">No speed data available</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
