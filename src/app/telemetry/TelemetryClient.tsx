'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import { getTeamColor } from '@/lib/f1-colors';

interface Driver {
  driver_number: number;
  name_acronym: string;
  team_name: string;
  team_colour?: string;
}

interface CarPoint {
  date: string;
  speed: number;
  throttle: number;
  brake: number;
  n_gear: number;
  drs: number;
  rpm: number;
}

interface DriverData {
  driver: Driver;
  points: CarPoint[];
  color: string;
}

interface Meeting {
  meeting_key: number;
  meeting_name: string;
  country_name: string;
  date_start?: string;
}

interface Session {
  session_key: number;
  session_name: string;
  session_type: string;
}

const CHANNELS = [
  { id: 'speed', label: 'SPD', fullLabel: 'Speed', unit: 'km/h', domain: [0, 370] as [number, number], color: '#3B82F6' },
  { id: 'throttle', label: 'THR', fullLabel: 'Throttle', unit: '%', domain: [0, 100] as [number, number], color: '#22C55E' },
  { id: 'brake', label: 'BRK', fullLabel: 'Brake', unit: '%', domain: [0, 100] as [number, number], color: '#EF4444' },
  { id: 'n_gear', label: 'GEA', fullLabel: 'Gear', unit: '', domain: [0, 8] as [number, number], color: '#A855F7' },
  { id: 'rpm', label: 'RPM', fullLabel: 'RPM', unit: 'rpm', domain: [0, 14000] as [number, number], color: '#F59E0B' },
  { id: 'delta', label: 'Δ', fullLabel: 'Delta', unit: 's', domain: [-2, 2] as [number, number], color: '#FACC15' },
] as const;

type ChannelId = typeof CHANNELS[number]['id'];

export default function TelemetryClient() {
  const [year, setYear] = useState(2026);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<number | null>(null);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDrivers, setSelectedDrivers] = useState<number[]>([]);
  const [lapNumber, setLapNumber] = useState(10);
  const [loading, setLoading] = useState(false);
  const [telemetryData, setTelemetryData] = useState<DriverData[]>([]);
  const [activeChannel, setActiveChannel] = useState<ChannelId>('speed');
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Load meetings on year change
  useEffect(() => {
    fetch(`https://api.openf1.org/v1/meetings?year=${year}`)
      .then(r => r.json())
      .then((data: Meeting[]) => {
        const sorted = [...data].sort((a, b) => b.meeting_key - a.meeting_key);
        setMeetings(sorted);
        const now = Date.now();
        const pastMeetings = sorted.filter(m => m.date_start && new Date(m.date_start).getTime() <= now);
        const defaultKey = pastMeetings.length > 0 ? pastMeetings[0].meeting_key : sorted[0]?.meeting_key ?? null;
        setSelectedMeeting(defaultKey);
      })
      .catch(() => {});
  }, [year]);

  // Load sessions when meeting changes
  useEffect(() => {
    if (!selectedMeeting) return;
    fetch(`https://api.openf1.org/v1/sessions?meeting_key=${selectedMeeting}`)
      .then(r => r.json())
      .then((data: Session[]) => {
        setSessions(data);
        const race = data.find(s => s.session_name.toLowerCase().includes('race'));
        setSelectedSession(race?.session_key ?? data[data.length - 1]?.session_key ?? null);
      })
      .catch(() => {});
  }, [selectedMeeting]);

  // Load drivers when session changes
  useEffect(() => {
    if (!selectedSession) return;
    fetch(`https://api.openf1.org/v1/drivers?session_key=${selectedSession}`)
      .then(r => r.json())
      .then((data: Driver[]) => {
        setDrivers(data);
        if (data.length >= 2) {
          setSelectedDrivers([data[0].driver_number, data[1].driver_number]);
        }
      })
      .catch(() => {});
  }, [selectedSession]);

  const loadTelemetry = useCallback(async () => {
    if (!selectedDrivers.length || !selectedSession) return;
    setLoading(true);
    try {
      const results: (DriverData | null)[] = await Promise.all(
        selectedDrivers.map(async (driverNum, i) => {
          const driver = drivers.find(d => d.driver_number === driverNum);
          if (!driver) return null;

          // Get lap data to find time window
          const lapsData = await fetch(
            `https://api.openf1.org/v1/laps?session_key=${selectedSession}&driver_number=${driverNum}&lap_number=${lapNumber}`
          ).then(r => r.json());

          let points: CarPoint[] = [];
          if (lapsData?.length) {
            const lap = lapsData[0];
            const dateStart = lap.date_start;
            const lapDur = lap.lap_duration ?? 120;
            
            if (dateStart) {
              const startTime = new Date(dateStart).toISOString();
              const endTime = new Date(new Date(dateStart).getTime() + (lapDur + 5) * 1000).toISOString();
              
              const carDataRaw = await fetch(
                `https://api.openf1.org/v1/car_data?session_key=${selectedSession}&driver_number=${driverNum}&date>=${startTime}&date<=${endTime}`
              ).then(r => r.json());

              points = carDataRaw.map((p: Record<string, unknown>) => ({
                date: p.date as string,
                speed: p.speed as number,
                throttle: p.throttle as number,
                brake: (p.brake as number) ? 100 : 0,
                n_gear: p.n_gear as number,
                drs: p.drs as number,
                rpm: p.rpm as number,
              }));
            }
          }

          const teamColor = driver.team_colour ? `#${driver.team_colour}` : getTeamColor(driver.team_name);
          return {
            driver,
            points,
            color: teamColor,
          };
        })
      );

      setTelemetryData(results.filter(Boolean) as DriverData[]);
    } finally {
      setLoading(false);
    }
  }, [selectedDrivers, selectedSession, lapNumber, drivers]);

  // Build combined chart data aligned by index
  const chartData = useMemo(() => {
    if (!telemetryData.length) return [];
    const maxLen = Math.max(...telemetryData.map(d => d.points.length));
    if (!maxLen) return [];

    return Array.from({ length: maxLen }, (_, i) => {
      const row: Record<string, number | null> = { index: i };
      for (const td of telemetryData) {
        const pt = td.points[i];
        const key = td.driver.name_acronym;
        row[`${key}_speed`] = pt?.speed ?? null;
        row[`${key}_throttle`] = pt?.throttle ?? null;
        row[`${key}_brake`] = pt?.brake ?? null;
        row[`${key}_n_gear`] = pt?.n_gear ?? null;
        row[`${key}_rpm`] = pt?.rpm ?? null;
      }
      // Simulated delta for now
      if (telemetryData.length >= 2) {
        row['delta'] = (i + 1) * 0.01 * (Math.sin(i * 0.1) * 0.3);
      }
      return row;
    });
  }, [telemetryData]);

  const activeChannelConfig = CHANNELS.find(c => c.id === activeChannel)!;

  // Calculate channel stats
  const channelStats = useMemo(() => {
    if (!telemetryData.length) return [];
    return telemetryData.map(td => {
      const values = td.points
        .map(p => activeChannel === 'brake' ? p.brake : p[activeChannel as keyof CarPoint] as number)
        .filter(v => v !== null && v !== undefined && !isNaN(v));
      return {
        acronym: td.driver.name_acronym,
        color: td.color,
        max: values.length ? Math.max(...values) : null,
        min: values.length ? Math.min(...values) : null,
        avg: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null,
      };
    });
  }, [telemetryData, activeChannel]);

  const toggleDriver = (dn: number) => {
    setSelectedDrivers(prev =>
      prev.includes(dn) ? prev.filter(d => d !== dn) : [...prev.slice(0, 3), dn]
    );
  };

  const getDriverColor = (driver: Driver): string => {
    return driver.team_colour ? `#${driver.team_colour}` : getTeamColor(driver.team_name);
  };

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string; dataKey?: string }> }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-[#13131F] border border-[rgba(255,255,255,0.07)] rounded-lg p-2 text-xs shadow-xl">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-[#7878A0]">
              {p.name?.replace(/_.+$/, '')}: 
              <span className="text-white ml-1">
                {typeof p.value === 'number' 
                  ? activeChannel === 'delta' 
                    ? `${p.value > 0 ? '+' : ''}${p.value.toFixed(3)}s`
                    : p.value.toFixed(activeChannel === 'n_gear' ? 0 : 1)
                  : p.value}
                {activeChannelConfig.unit && activeChannel !== 'delta' && (
                  <span className="text-[#7878A0] ml-0.5 text-[10px]">{activeChannelConfig.unit}</span>
                )}
              </span>
            </span>
          </div>
        ))}
      </div>
    );
  };

  const hasData = chartData.length > 0;

  return (
    <div className="max-w-screen-2xl mx-auto px-3 sm:px-4 lg:px-6 py-4">
      {/* Session Selector Row */}
      <div className="flex flex-wrap gap-2 items-center mb-4">
        <select 
          value={year} 
          onChange={e => setYear(Number(e.target.value))}
          className="bg-[#13131F] border border-[rgba(255,255,255,0.07)] text-[#EEEEF5] rounded-lg px-2 py-1.5 text-xs"
        >
          {[2026, 2025, 2024, 2023].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select 
          value={selectedMeeting ?? ''} 
          onChange={e => setSelectedMeeting(Number(e.target.value))}
          className="bg-[#13131F] border border-[rgba(255,255,255,0.07)] text-[#EEEEF5] rounded-lg px-2 py-1.5 text-xs min-w-[140px] max-w-[180px]"
        >
          {meetings.map(m => (
            <option key={m.meeting_key} value={m.meeting_key}>{m.country_name} — {m.meeting_name}</option>
          ))}
        </select>
        <select 
          value={selectedSession ?? ''} 
          onChange={e => setSelectedSession(Number(e.target.value))}
          className="bg-[#13131F] border border-[rgba(255,255,255,0.07)] text-[#EEEEF5] rounded-lg px-2 py-1.5 text-xs min-w-[100px]"
        >
          {sessions.map(s => <option key={s.session_key} value={s.session_key}>{s.session_name}</option>)}
        </select>
      </div>

      {/* Header - Driver Pills & Lap Selector */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
          {drivers.map(d => {
            const isSelected = selectedDrivers.includes(d.driver_number);
            const driverColor = getDriverColor(d);
            return (
              <button
                key={d.driver_number}
                onClick={() => toggleDriver(d.driver_number)}
                className={`px-2 py-1 rounded-full text-[11px] font-mono font-bold border transition-all shrink-0 ${
                  isSelected 
                    ? 'text-white' 
                    : 'border-[#2a3040] text-[#7878A0] hover:text-white'
                }`}
                style={isSelected ? { borderColor: driverColor, color: driverColor } : {}}
              >
                {d.name_acronym}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[#7878A0] text-[10px] uppercase">Lap</span>
          <button 
            onClick={() => setLapNumber(l => Math.max(1, l - 1))}
            className="w-6 h-6 rounded bg-[#1C1C2E] text-white text-xs flex items-center justify-center hover:bg-[#2a3040] transition-colors"
          >
            −
          </button>
          <span className="text-white font-mono text-xs w-5 text-center">{lapNumber}</span>
          <button 
            onClick={() => setLapNumber(l => l + 1)}
            className="w-6 h-6 rounded bg-[#1C1C2E] text-white text-xs flex items-center justify-center hover:bg-[#2a3040] transition-colors"
          >
            +
          </button>
          <button 
            onClick={loadTelemetry} 
            disabled={loading || !selectedDrivers.length}
            className="bg-[#E8002D] hover:bg-[#B80024] disabled:opacity-50 text-white px-3 py-1 rounded-lg text-xs font-bold ml-1 transition-colors"
          >
            {loading ? '...' : 'GO'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 border-2 border-[#E8002D] border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-[#7878A0] text-sm">Loading telemetry...</p>
        </div>
      ) : hasData ? (
        <div className="space-y-4">
          {/* Channel Tabs */}
          <div className="flex gap-0.5 overflow-x-auto [&::-webkit-scrollbar]:hidden border-b border-[rgba(255,255,255,0.07)]">
            {CHANNELS.map(ch => (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch.id)}
                className={`px-3 py-2 text-xs font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-all ${
                  activeChannel === ch.id
                    ? 'border-[#E8002D] text-white'
                    : 'border-transparent text-[#7878A0] hover:text-white'
                }`}
              >
                {ch.label}
                <span className="text-[10px] ml-1 opacity-60">{ch.unit}</span>
              </button>
            ))}
          </div>

          {/* Main Chart */}
          <div className="bg-[#13131F] rounded-xl border border-[rgba(255,255,255,0.07)] p-3 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-semibold text-sm">{activeChannelConfig.fullLabel}</h3>
              {telemetryData.length >= 2 && activeChannel === 'delta' && (
                <span className="text-[#7878A0] text-xs">
                  {telemetryData[0].driver.name_acronym} vs {telemetryData[1].driver.name_acronym}
                </span>
              )}
            </div>
            <ResponsiveContainer width="100%" height={isMobile ? 280 : 350}>
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: activeChannel === 'rpm' ? -10 : -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="index" hide />
                <YAxis 
                  tick={{ fill: '#7878A0', fontSize: 10 }} 
                  domain={activeChannelConfig.domain}
                  tickFormatter={activeChannel === 'delta' ? v => `${v > 0 ? '+' : ''}${v.toFixed(1)}s` : undefined}
                  width={activeChannel === 'rpm' ? 45 : activeChannel === 'delta' ? 40 : 30}
                />
                <Tooltip content={<CustomTooltip />} />
                {activeChannel === 'delta' && <ReferenceLine y={0} stroke="#4b5563" strokeDasharray="4 2" />}
                {activeChannel !== 'delta' 
                  ? telemetryData.map(td => (
                      <Line 
                        key={td.driver.name_acronym}
                        type="monotone" 
                        dataKey={`${td.driver.name_acronym}_${activeChannel}`}
                        stroke={td.color} 
                        dot={false} 
                        strokeWidth={2}
                        connectNulls
                      />
                    ))
                  : <Line type="monotone" dataKey="delta" stroke="#FACC15" dot={false} strokeWidth={2} />
                }
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-2">
            {['MAX', 'MIN', 'AVG'].map(stat => (
              <div key={stat} className="bg-[#0D0D14] rounded-lg p-2.5">
                <div className="text-[#7878A0] text-[10px] uppercase mb-1.5 font-bold">{stat}</div>
                <div className="space-y-1">
                  {channelStats.map(s => (
                    <div key={s.acronym} className="flex justify-between items-center">
                      <span className="text-[11px] font-mono font-bold" style={{ color: s.color }}>{s.acronym}</span>
                      <span className="text-[11px] font-mono text-white">
                        {stat === 'MAX' 
                          ? s.max?.toFixed(activeChannel === 'n_gear' ? 0 : 1)
                          : stat === 'MIN' 
                            ? s.min?.toFixed(activeChannel === 'n_gear' ? 0 : 1)
                            : s.avg?.toFixed(activeChannel === 'n_gear' ? 1 : 1)}
                        {activeChannelConfig.unit && (
                          <span className="text-[#7878A0] ml-0.5 text-[9px]">{activeChannelConfig.unit}</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Mini Charts - Desktop only */}
          <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
            {CHANNELS.filter(ch => ch.id !== activeChannel && ch.id !== 'delta').map(ch => (
              <div 
                key={ch.id}
                className="bg-[#13131F] rounded-lg border border-[rgba(255,255,255,0.07)] p-3 cursor-pointer hover:border-[rgba(255,255,255,0.15)] transition-colors"
                onClick={() => setActiveChannel(ch.id)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[#7878A0] text-[10px] uppercase font-bold">{ch.fullLabel}</span>
                  <span className="text-[9px] text-[#4A4A6A]">{ch.unit}</span>
                </div>
                <ResponsiveContainer width="100%" height={80}>
                  <LineChart data={chartData} margin={{ top: 2, right: 2, left: -30, bottom: 0 }}>
                    <YAxis domain={ch.domain} hide />
                    {telemetryData.map(td => (
                      <Line 
                        key={td.driver.name_acronym}
                        type="monotone" 
                        dataKey={`${td.driver.name_acronym}_${ch.id}`}
                        stroke={td.color} 
                        dot={false} 
                        strokeWidth={1.5} 
                        connectNulls 
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-[#13131F] rounded-xl border border-[rgba(255,255,255,0.07)] p-8 text-center mt-6">
          <div className="text-4xl mb-3">📡</div>
          <h3 className="text-white font-semibold mb-2">Telemetry Comparison</h3>
          <p className="text-[#7878A0] text-sm mb-4">Select two drivers and click GO to compare lap data</p>
          <div className="text-left max-w-xs mx-auto space-y-1.5 text-sm text-[#4A4A6A]">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-[#1C1C2E] flex items-center justify-center text-xs text-[#7878A0]">1</span>
              <span>Select session & lap number</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-[#1C1C2E] flex items-center justify-center text-xs text-[#7878A0]">2</span>
              <span>Pick 2–4 drivers to compare</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-[#1C1C2E] flex items-center justify-center text-xs text-[#7878A0]">3</span>
              <span>Switch channels with the tabs</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
