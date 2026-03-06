'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell,
} from 'recharts';
import { formatLapTime } from '@/lib/openf1';
import { getTeamColor } from '@/lib/f1-colors';

const TABS = [
  { id: 'drivers', label: 'Potential Drivers' },
  { id: 'teams', label: 'Potential Teams' },
  { id: 'stints', label: 'Long Stints' },
  { id: 'sectors', label: 'Best Sectors' },
  { id: 'speed', label: 'Speed Trap' },
];

interface SessionOption {
  value: string;
  label: string;
  sessionKey: number;
}

interface MeetingOption {
  value: string;
  label: string;
  meetingKey: number;
}

interface DriverRow {
  name: string;
  team: string;
  bestLap: number;
  bestLapStr: string;
  s1: number | null;
  s2: number | null;
  s3: number | null;
  laps: number;
  fill: string;
}

interface TeamRow {
  name: string;
  fullTeam: string;
  bestLap: number;
  bestLapStr: string;
  fill: string;
}

interface SectorRow {
  name: string;
  S1: number | null;
  S2: number | null;
  S3: number | null;
}

interface SpeedRow {
  name: string;
  team: string;
  speed: number;
  fill: string;
}

interface StintRow {
  driver: string;
  stint: number;
  laps: number;
  compound: string;
  from: number;
  to: number;
}

export default function AnalyticsClient() {
  const [activeTab, setActiveTab] = useState('drivers');
  const [year, setYear] = useState(2026);
  const [meetings, setMeetings] = useState<MeetingOption[]>([]);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<number | null>(null);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<{
    drivers: DriverRow[];
    teams: TeamRow[];
    stints: StintRow[];
    sectors: SectorRow[];
    speed: SpeedRow[];
  }>({ drivers: [], teams: [], stints: [], sectors: [], speed: [] });

  // Fetch meetings
  useEffect(() => {
    fetch(`https://api.openf1.org/v1/meetings?year=${year}`)
      .then(r => r.json())
      .then((data: Array<{ meeting_key: number; meeting_name: string; country_name: string; date_start?: string }>) => {
        const opts = data.map(m => ({
          value: String(m.meeting_key),
          label: `${m.country_name} — ${m.meeting_name}`,
          meetingKey: m.meeting_key,
          dateStart: m.date_start,
        }));
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
        const opts = data.map(s => ({
          value: String(s.session_key),
          label: s.session_name,
          sessionKey: s.session_key,
        }));
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

      // Best lap per driver
      const bestLapMap: Record<number, number> = {};
      const lapCountMap: Record<number, number> = {};
      for (const l of laps) {
        const dn = l.driver_number;
        const dur = l.lap_duration;
        lapCountMap[dn] = (lapCountMap[dn] ?? 0) + 1;
        if (dur && dur > 0 && (!bestLapMap[dn] || dur < bestLapMap[dn])) {
          bestLapMap[dn] = dur;
        }
      }

      // Best sector per driver
      const bestS1: Record<number, number> = {};
      const bestS2: Record<number, number> = {};
      const bestS3: Record<number, number> = {};
      for (const l of laps) {
        const dn = l.driver_number;
        if (l.duration_sector_1 && (!bestS1[dn] || l.duration_sector_1 < bestS1[dn])) bestS1[dn] = l.duration_sector_1;
        if (l.duration_sector_2 && (!bestS2[dn] || l.duration_sector_2 < bestS2[dn])) bestS2[dn] = l.duration_sector_2;
        if (l.duration_sector_3 && (!bestS3[dn] || l.duration_sector_3 < bestS3[dn])) bestS3[dn] = l.duration_sector_3;
      }

      // Max speed per driver
      const maxSpeed: Record<number, number> = {};
      for (const l of laps) {
        const dn = l.driver_number;
        const sp = l.st_speed ?? l.i2_speed ?? l.i1_speed;
        if (sp && (!maxSpeed[dn] || sp > maxSpeed[dn])) maxSpeed[dn] = sp;
      }

      // Best team lap
      const teamBestLap: Record<string, number> = {};
      for (const [dn, best] of Object.entries(bestLapMap)) {
        const team = driverMap[Number(dn)]?.team_name ?? 'Unknown';
        if (!teamBestLap[team] || best < teamBestLap[team]) teamBestLap[team] = best;
      }

      // Long stints (6+ laps) by driver
      const longStints: StintRow[] = [];
      for (const s of stints) {
        const lapCount = (s.lap_end ?? 0) - (s.lap_start ?? 0) + 1;
        if (lapCount >= 6) {
          const d = driverMap[s.driver_number];
          longStints.push({
            driver: d?.name_acronym ?? String(s.driver_number),
            stint: s.stint_number,
            laps: lapCount,
            compound: s.compound ?? '?',
            from: s.lap_start,
            to: s.lap_end,
          });
        }
      }

      // Build chart data — sorted best to worst
      const driverChartData: DriverRow[] = Object.entries(bestLapMap)
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
            fill: teamColor,
          };
        })
        .sort((a, b) => a.bestLap - b.bestLap);

      const teamChartData: TeamRow[] = Object.entries(teamBestLap)
        .map(([team, best]) => ({
          name: team.replace('Oracle Red Bull Racing', 'Red Bull').replace(' F1 Team', ''),
          fullTeam: team,
          bestLap: best,
          bestLapStr: formatLapTime(best),
          fill: getTeamColor(team),
        }))
        .sort((a, b) => a.bestLap - b.bestLap);

      const sectorData: SectorRow[] = Object.entries(bestS1)
        .filter(([dn]) => driverMap[Number(dn)])
        .map(([dn]) => {
          const d = driverMap[Number(dn)];
          return {
            name: d.name_acronym,
            S1: bestS1[Number(dn)] ?? null,
            S2: bestS2[Number(dn)] ?? null,
            S3: bestS3[Number(dn)] ?? null,
          };
        })
        .sort((a, b) => (a.S1 ?? 99) - (b.S1 ?? 99))
        .slice(0, 15);

      const speedData: SpeedRow[] = Object.entries(maxSpeed)
        .filter(([dn]) => driverMap[Number(dn)])
        .map(([dn, speed]) => {
          const d = driverMap[Number(dn)];
          return {
            name: d.name_acronym,
            team: d.team_name,
            speed,
            fill: d.team_colour ? `#${d.team_colour}` : getTeamColor(d.team_name),
          };
        })
        .sort((a, b) => b.speed - a.speed);

      setAnalyticsData({
        drivers: driverChartData,
        teams: teamChartData,
        stints: longStints,
        sectors: sectorData,
        speed: speedData,
      });
    } finally {
      setLoading(false);
    }
  }, [selectedSession]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name?: string }>; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-lg p-3 text-xs">
        <p className="text-white font-bold mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="text-gray-300 font-mono">
            {p.name ? `${p.name}: ` : ''}{p.value < 200 ? formatLapTime(p.value) : `${p.value} km/h`}
          </p>
        ))}
      </div>
    );
  };

  // Typed data from state (properly scoped)
  const driverChartData = analyticsData.drivers;
  const teamChartData = analyticsData.teams;

  // Compute domains for bar charts
  const driverVals = driverChartData.map(d => d.bestLap);
  const driverDomain: [(v: number) => number, (v: number) => number] = [
    (dataMin: number) => Math.floor(dataMin * 0.997),
    (dataMax: number) => Math.ceil(dataMax * 1.001),
  ];

  const teamVals = teamChartData.map(d => d.bestLap);
  const teamDomain: [(v: number) => number, (v: number) => number] = [
    (dataMin: number) => Math.floor(dataMin * 0.997),
    (dataMax: number) => Math.ceil(dataMax * 1.001),
  ];

  // suppress unused-var warnings in narrowing
  void driverVals;
  void teamVals;

  return (
    <div className="flex gap-0 min-h-[calc(100vh-3.5rem)]">
      {/* Sidebar */}
      <aside className="w-48 min-w-[150px] shrink-0 border-r border-[#2a3040] bg-[#0d1120] py-6 px-3">
        <h2 className="text-gray-500 text-xs uppercase tracking-wider px-2 mb-3">Analysis</h2>
        <nav className="space-y-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#1a1f2e] text-white font-medium border border-[#2a3040]'
                  : 'text-gray-400 hover:text-white hover:bg-[#1a1f2e]/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 p-6 overflow-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-white font-bold text-2xl mb-3">Session Analytics</h1>
          {/* Selectors */}
          <div className="flex flex-wrap gap-3 items-center">
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="bg-[#1a1f2e] border border-[#2a3040] text-white rounded-lg px-3 py-2 text-sm"
            >
              {[2026, 2025, 2024, 2023].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select
              value={selectedMeeting ?? ''}
              onChange={e => setSelectedMeeting(Number(e.target.value))}
              className="bg-[#1a1f2e] border border-[#2a3040] text-white rounded-lg px-3 py-2 text-sm min-w-[200px]"
            >
              {meetings.map(m => <option key={m.meetingKey} value={m.meetingKey}>{m.label}</option>)}
            </select>
            <select
              value={selectedSession ?? ''}
              onChange={e => setSelectedSession(Number(e.target.value))}
              className="bg-[#1a1f2e] border border-[#2a3040] text-white rounded-lg px-3 py-2 text-sm"
            >
              {sessions.map(s => <option key={s.sessionKey} value={s.sessionKey}>{s.label}</option>)}
            </select>
            <button
              onClick={loadData}
              disabled={loading}
              className="bg-[#e10600] hover:bg-[#c00500] disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {loading ? 'Loading...' : 'Load'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-8 h-8 border-2 border-[#e10600] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Drivers tab */}
            {activeTab === 'drivers' && (
              <div className="space-y-6">
                <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-6">
                  <h3 className="text-white font-semibold mb-4">Best Lap by Driver</h3>
                  {driverChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={Math.max(300, driverChartData.length * 28)}>
                      <BarChart
                        data={driverChartData}
                        layout="vertical"
                        margin={{ left: 10, right: 80 }}
                        barSize={14}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a3040" horizontal={false} />
                        <XAxis
                          type="number"
                          tickFormatter={(v) => formatLapTime(v)}
                          tick={{ fill: '#6b7280', fontSize: 11, fontFamily: 'monospace' }}
                          domain={driverDomain}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{ fill: '#e5e7eb', fontSize: 12, fontWeight: 'bold' }}
                          width={40}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="bestLap" radius={[0, 4, 4, 0]}>
                          {driverChartData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="text-gray-500 text-center py-12">No data available</p>}
                </div>

                {/* Driver table */}
                {driverChartData.length > 0 && (
                  <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[#2a3040] text-gray-500 text-xs uppercase tracking-wider">
                            <th className="py-2 px-3 text-left">Pos</th>
                            <th className="py-2 px-3 text-left">Driver</th>
                            <th className="py-2 px-3 text-left">Team</th>
                            <th className="py-2 px-3 text-right">Best Lap</th>
                            <th className="py-2 px-3 text-right">Gap</th>
                            <th className="py-2 px-3 text-right hidden md:table-cell">S1</th>
                            <th className="py-2 px-3 text-right hidden md:table-cell">S2</th>
                            <th className="py-2 px-3 text-right hidden md:table-cell">S3</th>
                            <th className="py-2 px-3 text-right">Laps</th>
                          </tr>
                        </thead>
                        <tbody>
                          {driverChartData.map((d, i) => {
                            const gap = i === 0 ? null : d.bestLap - driverChartData[0].bestLap;
                            return (
                              <tr key={d.name} className="border-b border-[#2a3040]/30 hover:bg-[#1f2535]">
                                <td className="py-2 px-3 text-gray-400 font-mono">{i + 1}</td>
                                <td className="py-2 px-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-[3px] h-4 rounded-full" style={{ backgroundColor: d.fill }} />
                                    <span className="font-bold text-white">{d.name}</span>
                                  </div>
                                </td>
                                <td className="py-2 px-3 text-gray-400 text-xs">{d.team?.replace(' F1 Team', '').replace('Oracle Red Bull Racing', 'Red Bull')}</td>
                                <td className="py-2 px-3 text-right font-mono text-white">{formatLapTime(d.bestLap)}</td>
                                <td className="py-2 px-3 text-right font-mono">
                                  {gap === null
                                    ? <span className="text-yellow-400">—</span>
                                    : <span className="text-red-400">+{formatLapTime(gap)}</span>
                                  }
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-gray-400 hidden md:table-cell text-xs">
                                  {d.s1 ? d.s1.toFixed(3) : '—'}
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-gray-400 hidden md:table-cell text-xs">
                                  {d.s2 ? d.s2.toFixed(3) : '—'}
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-gray-400 hidden md:table-cell text-xs">
                                  {d.s3 ? d.s3.toFixed(3) : '—'}
                                </td>
                                <td className="py-2 px-3 text-right text-gray-500 text-xs">{d.laps}</td>
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

            {/* Teams tab */}
            {activeTab === 'teams' && (
              <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-6">
                <h3 className="text-white font-semibold mb-4">Best Lap by Team</h3>
                {teamChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={Math.max(300, teamChartData.length * 36)}>
                    <BarChart
                      data={teamChartData}
                      layout="vertical"
                      margin={{ left: 10, right: 80 }}
                      barSize={16}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a3040" horizontal={false} />
                      <XAxis
                        type="number"
                        tickFormatter={(v) => formatLapTime(v)}
                        tick={{ fill: '#6b7280', fontSize: 11, fontFamily: 'monospace' }}
                        domain={teamDomain}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fill: '#e5e7eb', fontSize: 11 }}
                        width={100}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="bestLap" radius={[0, 4, 4, 0]}>
                        {teamChartData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-gray-500 text-center py-12">No data available</p>}
              </div>
            )}

            {/* Long Stints tab */}
            {activeTab === 'stints' && (
              <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-6">
                <h3 className="text-white font-semibold mb-4">Long Stints (6+ laps)</h3>
                {analyticsData.stints?.length ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {analyticsData.stints.map((s, i) => {
                      const tyreColors: Record<string, string> = { SOFT: '#FF1801', MEDIUM: '#FFF200', HARD: '#FFFFFF', INTERMEDIATE: '#39B54A', WET: '#0067FF' };
                      const color = tyreColors[s.compound?.toUpperCase()] ?? '#888';
                      return (
                        <div key={i} className="bg-[#0d1120] rounded-lg p-3 text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-white font-bold">{s.driver}</span>
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                          </div>
                          <p className="text-gray-400">{s.laps} laps · {s.compound}</p>
                          <p className="text-gray-500 font-mono">L{s.from} → L{s.to}</p>
                        </div>
                      );
                    })}
                  </div>
                ) : <p className="text-gray-500 text-center py-12">No long stints found</p>}
              </div>
            )}

            {/* Best Sectors tab */}
            {activeTab === 'sectors' && (
              <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-6 space-y-6">
                <h3 className="text-white font-semibold">Best Sector Times</h3>
                {analyticsData.sectors?.length ? (
                  ['S1', 'S2', 'S3'].map((sector, si) => {
                    const secDomain: [(v: number) => number, (v: number) => number] = [
                      (dataMin: number) => Math.floor(dataMin * 0.997),
                      (dataMax: number) => Math.ceil(dataMax * 1.001),
                    ];
                    return (
                      <div key={sector}>
                        <h4 className="text-gray-400 text-sm mb-2 font-medium">Sector {si + 1}</h4>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={analyticsData.sectors.slice(0, 15)} layout="vertical" margin={{ left: 10, right: 60 }} barSize={12}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2a3040" horizontal={false} />
                            <XAxis type="number" tickFormatter={(v) => v.toFixed(3)} tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'monospace' }} domain={secDomain} />
                            <YAxis type="category" dataKey="name" tick={{ fill: '#e5e7eb', fontSize: 11 }} width={35} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey={sector} fill={['#c084fc', '#4ade80', '#facc15'][si]} radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    );
                  })
                ) : <p className="text-gray-500 text-center py-12">No sector data</p>}
              </div>
            )}

            {/* Speed Trap tab */}
            {activeTab === 'speed' && (
              <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-6">
                <h3 className="text-white font-semibold mb-4">Speed Trap (km/h)</h3>
                {analyticsData.speed?.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#2a3040] text-gray-500 text-xs uppercase tracking-wider">
                          <th className="py-2 px-3 text-left">Pos</th>
                          <th className="py-2 px-3 text-left">Driver</th>
                          <th className="py-2 px-3 text-left">Team</th>
                          <th className="py-2 px-3 text-right">Max Speed</th>
                          <th className="py-2 px-3 text-left w-40">Bar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analyticsData.speed.map((d, i) => (
                          <tr key={i} className="border-b border-[#2a3040]/30 hover:bg-[#1f2535]">
                            <td className="py-2 px-3 text-gray-400 font-mono">{i + 1}</td>
                            <td className="py-2 px-3 font-bold text-white">{d.name}</td>
                            <td className="py-2 px-3 text-gray-400 text-xs">{d.team?.replace(' F1 Team', '')}</td>
                            <td className="py-2 px-3 text-right font-mono text-green-400">{d.speed}</td>
                            <td className="py-2 px-3">
                              <div className="bg-[#0d1120] rounded h-2">
                                <div
                                  className="h-2 rounded transition-all"
                                  style={{
                                    width: `${(d.speed / Math.max(...analyticsData.speed.map(x => x.speed))) * 100}%`,
                                    backgroundColor: d.fill,
                                  }}
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="text-gray-500 text-center py-12">No speed data</p>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
