'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { formatLapTime } from '@/lib/openf1';
import {
  getTyreColor, getTyreLetter,
  classifySector, SECTOR_CLASS_STYLES,
  getFlagConfig, getTeamColor
} from '@/lib/f1-colors';

interface DriverTiming {
  driverNumber: number;
  position: number;
  acronym: string;
  fullName: string;
  team: string;
  teamColor: string;
  lastLap: number | null;
  bestLap: number | null;
  sector1: number | null;
  sector2: number | null;
  sector3: number | null;
  lapNumber: number | null;
  tyre: string | null;
  tyreAge: number | null;
  gapToLeader: number | null;
  interval: number | null;
  isPitOut: boolean;
  drs: number | null;
  pits: number;
  isInPit: boolean;
}

interface SessionInfo {
  key: number;
  name: string;
  type: string;
  status: string;
  circuit: string;
  country: string;
  year: number;
}

interface WeatherData {
  track_temperature: number;
  air_temperature: number;
  humidity: number;
  rainfall: number;
  wind_speed: number;
  wind_direction: number;
}

interface LiveData {
  type: string;
  session?: SessionInfo;
  timing?: DriverTiming[];
  timestamp?: number;
  message?: string;
}

const REAL_DEGRADATION = {
  SOFT: { baseDeg: 0.18, cliff: 25, cliffMultiplier: 2.5 },
  MEDIUM: { baseDeg: 0.09, cliff: 38, cliffMultiplier: 2.0 },
  HARD: { baseDeg: 0.05, cliff: 52, cliffMultiplier: 1.8 }
} as const;

function getLapsToCliff(compound: string | null, age: number | null): number | null {
  if (!compound || age === null) return null;
  const upperCompound = compound.toUpperCase();
  const deg = REAL_DEGRADATION[upperCompound as keyof typeof REAL_DEGRADATION];
  if (!deg) return null;
  return Math.max(0, deg.cliff - age);
}

function TyreBadgeWithTooltip({ compound, age }: { compound: string | null; age: number | null }) {
  if (!compound) return <span className="text-gray-500 text-xs">—</span>;
  const bg = getTyreColor(compound);
  const letter = getTyreLetter(compound);
  const lapsToCliff = getLapsToCliff(compound, age);
  
  return (
    <div className="group relative inline-flex items-center gap-1.5">
      <span className="tyre-badge" style={{ backgroundColor: bg, color: '#000' }} title={compound}>
        {letter}
      </span>
      {age !== null && (
        <span className="text-gray-400 text-[10px] mono tabular-nums">{age}</span>
      )}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[#1a1a2e] border border-[#333] rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
        <div className="font-semibold text-white">{compound} {age !== null ? `(${age} laps)` : ''}</div>
        {lapsToCliff !== null && (
          <div className={`mt-1 ${lapsToCliff < 5 ? 'text-red-400' : lapsToCliff < 10 ? 'text-yellow-400' : 'text-green-400'}`}>
            ~{lapsToCliff} laps to cliff
          </div>
        )}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-[#1a1a2e] border-r border-b border-[#333] rotate-45"></div>
      </div>
    </div>
  );
}

function DrsCell({ drs }: { drs: number | null }) {
  if (drs === null || drs === undefined) return <span className="text-gray-600 text-[10px]">—</span>;
  const isActive = drs >= 8;
  const isAvailable = drs >= 1;
  if (isActive) return <span className="drs-active">DRS</span>;
  if (isAvailable) return <span className="text-[#FFD700] text-[10px] font-bold">DRS</span>;
  return <span className="text-gray-600 text-[10px]">DRS</span>;
}

function SectorCell({ time, personalBest, sessionBest }: { time: number | null; personalBest: number | null; sessionBest: number | null }) {
  if (!time) return <span className="text-gray-600 mono text-[11px]">—</span>;
  const cls = classifySector(time, personalBest, sessionBest);
  const style = SECTOR_CLASS_STYLES[cls];
  return (
    <span className="mono text-[11px] tabular-nums px-1.5 py-0.5 rounded" style={{ color: style.color, background: style.bg }}>
      {time.toFixed(3)}
    </span>
  );
}

function MiniSectors({ s1, s2, s3, bestS1, bestS2, bestS3, sessionBestS1, sessionBestS2, sessionBestS3 }: {
  s1: number | null; s2: number | null; s3: number | null;
  bestS1: number | null; bestS2: number | null; bestS3: number | null;
  sessionBestS1: number | null; sessionBestS2: number | null; sessionBestS3: number | null;
}) {
  const sectors = [
    { t: s1, pb: bestS1, sb: sessionBestS1 },
    { t: s2, pb: bestS2, sb: sessionBestS2 },
    { t: s3, pb: bestS3, sb: sessionBestS3 },
  ];
  return (
    <span className="inline-flex items-center gap-[3px]">
      {sectors.map((s, i) => {
        const color = !s.t ? '#333' : SECTOR_CLASS_STYLES[classifySector(s.t, s.pb, s.sb)].color;
        return <span key={i} className="mini-sector" style={{ backgroundColor: color }} />;
      })}
    </span>
  );
}

function GapCell({ gap, pos }: { gap: number | null; pos: number }) {
  if (pos === 1) return <span className="text-[10px] bg-[#E10600] text-white px-2 py-0.5 rounded font-bold tracking-wider">LEADER</span>;
  if (gap === null) return <span className="text-gray-600 mono text-[11px]">—</span>;
  let colorClass = 'text-gray-300';
  if (gap < 1.0) colorClass = 'text-[#00FF44] font-bold';
  else if (gap < 3.0) colorClass = 'text-[#FFE600]';
  else if (gap > 30) colorClass = 'text-gray-600';
  return (
    <div className="flex items-center gap-2">
      <span className={`mono text-[11px] tabular-nums ${colorClass}`}>+{gap.toFixed(3)}</span>
      <div className="w-12 h-1 bg-[#333] rounded-full overflow-hidden hidden sm:block">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min((gap / 60) * 100, 100)}%`, backgroundColor: gap < 1.0 ? '#00FF44' : gap < 3.0 ? '#FFE600' : '#666' }} />
      </div>
    </div>
  );
}

function IntervalCell({ interval }: { interval: number | null }) {
  if (interval === null) return <span className="text-gray-600 mono text-[11px]">—</span>;
  let colorClass = 'text-gray-300';
  if (interval < 1.0) colorClass = 'text-[#00FF44] font-bold';
  else if (interval < 3.0) colorClass = 'text-[#FFE600]';
  else if (interval > 10) colorClass = 'text-gray-500';
  return <span className={`mono text-[11px] tabular-nums ${colorClass}`}>+{interval.toFixed(3)}</span>;
}

function LapCell({ time, best, sessionBest }: { time: number | null; best: number | null; sessionBest: number | null }) {
  if (!time) return <span className="text-gray-600 mono text-[11px]">—</span>;
  let colorClass = 'text-gray-300';
  if (sessionBest && Math.abs(time - sessionBest) < 0.001) colorClass = 'text-[#BF00FF] font-bold';
  else if (best && Math.abs(time - best) < 0.001) colorClass = 'text-[#00FF44] font-bold';
  else if (best && time > best) colorClass = 'text-[#FFE600]';
  return <span className={`mono text-[11px] tabular-nums ${colorClass}`}>{formatLapTime(time)}</span>;
}

function BestLapCell({ time, isSessionBest }: { time: number | null; isSessionBest: boolean }) {
  if (!time) return <span className="text-gray-600 mono text-[11px]">—</span>;
  return <span className={`mono text-[11px] tabular-nums ${isSessionBest ? 'text-[#BF00FF] font-bold' : 'text-gray-300'}`}>{formatLapTime(time)}</span>;
}

function TimeAgo({ date }: { date: Date }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const update = () => setSeconds(Math.floor((Date.now() - date.getTime()) / 1000));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [date]);
  if (seconds < 5) return <span className="text-green-400">Just now</span>;
  if (seconds < 60) return <span className="text-gray-400">{seconds}s ago</span>;
  return <span className="text-gray-500">{Math.floor(seconds / 60)}m ago</span>;
}

function WeatherStrip({ sessionKey }: { sessionKey: number | null }) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  useEffect(() => {
    if (!sessionKey) return;
    const fetchWeather = async () => {
      try {
        const res = await fetch(`https://api.openf1.org/v1/weather?session_key=${sessionKey}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.length > 0) setWeather(data[data.length - 1]);
      } catch {}
    };
    fetchWeather();
    const interval = setInterval(fetchWeather, 30000);
    return () => clearInterval(interval);
  }, [sessionKey]);

  if (!weather) return null;
  const hasRain = weather.rainfall > 0;
  return (
    <div className="flex flex-wrap items-center gap-4 px-4 py-2 bg-[#13131F] border border-[rgba(255,255,255,0.07)] rounded-lg">
      <div className="flex items-center gap-1.5 text-xs">
        <span className="text-gray-400">🌡️</span>
        <span className="text-gray-500">Track</span>
        <span className="text-white font-mono">{weather.track_temperature?.toFixed(1)}°C</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs">
        <span className="text-gray-400">🌬️</span>
        <span className="text-gray-500">Air</span>
        <span className="text-white font-mono">{weather.air_temperature?.toFixed(1)}°C</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs">
        <span className="text-gray-400">💧</span>
        <span className="text-gray-500">Hum</span>
        <span className="text-white font-mono">{weather.humidity?.toFixed(0)}%</span>
      </div>
      {hasRain && (
        <div className="flex items-center gap-1.5 text-xs bg-blue-500/20 px-2 py-0.5 rounded animate-pulse-fast">
          <span>☔</span>
          <span className="text-blue-400 font-bold">Rain {weather.rainfall.toFixed(1)}mm</span>
        </div>
      )}
    </div>
  );
}

function ProminentFlagBanner({ status }: { status: string }) {
  const cfg = getFlagConfig(status);
  return (
    <div className="px-4 py-2 rounded-lg font-bold text-sm tracking-wider animate-pulse-fast"
      style={{ backgroundColor: cfg.bg, color: cfg.color, boxShadow: `0 0 20px ${cfg.bg}40` }}>
      {cfg.label}
    </div>
  );
}

function TimingTableSkeleton() {
  return (
    <div className="f1-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="timing-table w-full">
          <thead>
            <tr>
              <th className="text-left w-10">POS</th>
              <th className="text-left w-8">DRS</th>
              <th className="text-left">DRIVER</th>
              <th className="text-left hidden md:table-cell">TEAM</th>
              <th className="text-right">GAP</th>
              <th className="text-right hidden sm:table-cell">INT</th>
              <th className="text-right">BEST</th>
              <th className="text-right">LAST</th>
              <th className="text-right hidden lg:table-cell">S1</th>
              <th className="text-right hidden lg:table-cell">S2</th>
              <th className="text-right hidden lg:table-cell">S3</th>
              <th className="text-center hidden xl:table-cell">SEC</th>
              <th className="text-center">TYRE</th>
              <th className="text-right hidden sm:table-cell">LAP</th>
              <th className="text-right hidden md:table-cell">PITS</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 20 }).map((_, i) => (
              <tr key={i}>
                <td><div className="h-4 bg-white/5 rounded animate-pulse w-6" /></td>
                <td><div className="h-4 bg-white/5 rounded animate-pulse w-8" /></td>
                <td><div className="h-4 bg-white/5 rounded animate-pulse w-20" /></td>
                <td className="hidden md:table-cell"><div className="h-4 bg-white/5 rounded animate-pulse w-24" /></td>
                <td><div className="h-4 bg-white/5 rounded animate-pulse w-16 ml-auto" /></td>
                <td className="hidden sm:table-cell"><div className="h-4 bg-white/5 rounded animate-pulse w-16 ml-auto" /></td>
                <td><div className="h-4 bg-white/5 rounded animate-pulse w-16 ml-auto" /></td>
                <td><div className="h-4 bg-white/5 rounded animate-pulse w-16 ml-auto" /></td>
                <td className="hidden lg:table-cell"><div className="h-4 bg-white/5 rounded animate-pulse w-14 ml-auto" /></td>
                <td className="hidden lg:table-cell"><div className="h-4 bg-white/5 rounded animate-pulse w-14 ml-auto" /></td>
                <td className="hidden lg:table-cell"><div className="h-4 bg-white/5 rounded animate-pulse w-14 ml-auto" /></td>
                <td className="hidden xl:table-cell"><div className="h-4 bg-white/5 rounded animate-pulse w-12 mx-auto" /></td>
                <td><div className="h-4 bg-white/5 rounded animate-pulse w-10 mx-auto" /></td>
                <td className="hidden sm:table-cell"><div className="h-4 bg-white/5 rounded animate-pulse w-8 ml-auto" /></td>
                <td className="hidden md:table-cell"><div className="h-4 bg-white/5 rounded animate-pulse w-6 ml-auto" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SessionSelector({ onSessionChange, currentSessionKey }: { onSessionChange: (key: number | null) => void; currentSessionKey: number | null }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [meetings, setMeetings] = useState<{ meetingKey: number; label: string }[]>([]);
  const [sessions, setSessions] = useState<{ sessionKey: number; label: string }[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<number | null>(null);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);

  useEffect(() => {
    fetch(`https://api.openf1.org/v1/meetings?year=${year}`)
      .then(r => r.json())
      .then((data: Array<{ meeting_key: number; meeting_name: string; country_name: string }>) => {
        const opts = data.map(m => ({ meetingKey: m.meeting_key, label: `${m.country_name} — ${m.meeting_name}` }));
        setMeetings(opts.reverse());
        if (opts.length > 0) setSelectedMeeting(opts[0].meetingKey);
      })
      .catch(() => {});
  }, [year]);

  useEffect(() => {
    if (!selectedMeeting) return;
    fetch(`https://api.openf1.org/v1/sessions?meeting_key=${selectedMeeting}`)
      .then(r => r.json())
      .then((data: Array<{ session_key: number; session_name: string }>) => {
        const opts = data.map(s => ({ sessionKey: s.session_key, label: s.session_name }));
        setSessions(opts);
        const last = opts[opts.length - 1];
        if (last) setSelectedSession(last.sessionKey);
      })
      .catch(() => {});
  }, [selectedMeeting]);

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <select value={year} onChange={e => setYear(Number(e.target.value))}
        className="bg-[#111] border border-[#222] hover:border-[#333] text-white rounded-lg px-3 py-1.5 text-sm">
        {[2026, 2025, 2024, 2023].map(y => <option key={y} value={y}>{y}</option>)}
      </select>
      <select value={selectedMeeting ?? ''} onChange={e => setSelectedMeeting(Number(e.target.value))}
        className="bg-[#111] border border-[#222] hover:border-[#333] text-white rounded-lg px-3 py-1.5 text-sm min-w-[180px]">
        {meetings.map(m => <option key={m.meetingKey} value={m.meetingKey}>{m.label}</option>)}
      </select>
      <select value={selectedSession ?? ''} onChange={e => setSelectedSession(Number(e.target.value))}
        className="bg-[#111] border border-[#222] hover:border-[#333] text-white rounded-lg px-3 py-1.5 text-sm">
        {sessions.map(s => <option key={s.sessionKey} value={s.sessionKey}>{s.label}</option>)}
      </select>
      <button onClick={() => onSessionChange(selectedSession)} disabled={!selectedSession}
        className="bg-[#E10600] hover:bg-[#c00500] disabled:opacity-40 text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors">Load</button>
      <button onClick={() => onSessionChange(null)}
        className="bg-[#111] hover:bg-[#1a1a1a] border border-[#222] hover:border-[#E10600]/50 text-gray-300 px-3 py-1.5 rounded-lg text-sm transition-colors">Live</button>
    </div>
  );
}

export default function LiveTimingClient() {
  const [data, setData] = useState<LiveData | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [flashMap, setFlashMap] = useState<Map<number, 'green' | 'purple'>>(new Map());
  const [noLiveSession, setNoLiveSession] = useState(false);
  const [manualSessionKey, setManualSessionKey] = useState<number | null>(null);
  const [positionChanges, setPositionChanges] = useState<Map<number, 'up' | 'down' | 'same'>>(new Map());
  const prevRef = useRef<Map<number, DriverTiming>>(new Map());
  const esRef = useRef<EventSource | null>(null);
  const [connectionTimeout, setConnectionTimeout] = useState(false);
  const [sessionBests, setSessionBests] = useState<{ s1: number | null; s2: number | null; s3: number | null; lap: number | null }>({ s1: null, s2: null, s3: null, lap: null });
  const [driverBests, setDriverBests] = useState<Map<number, { s1: number | null; s2: number | null; s3: number | null }>>(new Map());

  useEffect(() => {
    if (data?.session || !connected) { setConnectionTimeout(false); return; }
    const t = setTimeout(() => setConnectionTimeout(true), 10000);
    return () => clearTimeout(t);
  }, [data?.session, connected]);

  useEffect(() => {
    if (!noLiveSession || manualSessionKey !== null) return;
    fetch('https://api.openf1.org/v1/sessions?session_key=latest')
      .then(r => r.json())
      .then((data: Array<{ session_key: number }>) => { if (data?.length > 0) setManualSessionKey(data[0].session_key); })
      .catch(() => {});
  }, [noLiveSession, manualSessionKey]);

  const connect = useCallback((sessionKey?: number | null) => {
    if (esRef.current) esRef.current.close();
    const url = sessionKey ? `/api/live?session_key=${sessionKey}` : '/api/live';
    const es = new EventSource(url);
    esRef.current = es;
    es.onopen = () => setConnected(true);
    es.onerror = () => { setConnected(false); es.close(); setTimeout(() => connect(sessionKey), 5000); };
    es.onmessage = (e) => {
      try {
        const parsed: LiveData = JSON.parse(e.data);
        if (parsed.type === 'error') { setNoLiveSession(true); return; }
        setNoLiveSession(false);
        if (parsed.type === 'timing' && parsed.timing) {
          const newFlash = new Map<number, 'green' | 'purple'>();
          const newBests = new Map(driverBests);
          const newPosChanges = new Map<number, 'up' | 'down' | 'same'>();
          let sbChanged = false;
          let newSB = { ...sessionBests };
          for (const d of parsed.timing) {
            const prev = prevRef.current.get(d.driverNumber);
            const prevBests = driverBests.get(d.driverNumber) ?? { s1: null, s2: null, s3: null };
            if (prev) {
              if (d.position < prev.position) newPosChanges.set(d.driverNumber, 'up');
              else if (d.position > prev.position) newPosChanges.set(d.driverNumber, 'down');
              else newPosChanges.set(d.driverNumber, 'same');
            }
            if (d.bestLap && (!newSB.lap || d.bestLap < newSB.lap)) { newSB.lap = d.bestLap; sbChanged = true; newFlash.set(d.driverNumber, 'purple'); }
            else if (prev && d.bestLap && d.bestLap !== prev.bestLap) { newFlash.set(d.driverNumber, 'green'); }
            if (d.sector1 && (!newSB.s1 || d.sector1 < newSB.s1)) { newSB.s1 = d.sector1; sbChanged = true; }
            if (d.sector2 && (!newSB.s2 || d.sector2 < newSB.s2)) { newSB.s2 = d.sector2; sbChanged = true; }
            if (d.sector3 && (!newSB.s3 || d.sector3 < newSB.s3)) { newSB.s3 = d.sector3; sbChanged = true; }
            newBests.set(d.driverNumber, {
              s1: prevBests.s1 === null ? d.sector1 : d.sector1 ? Math.min(prevBests.s1, d.sector1) : prevBests.s1,
              s2: prevBests.s2 === null ? d.sector2 : d.sector2 ? Math.min(prevBests.s2, d.sector2) : prevBests.s2,
              s3: prevBests.s3 === null ? d.sector3 : d.sector3 ? Math.min(prevBests.s3, d.sector3) : prevBests.s3,
            });
          }
          if (sbChanged) setSessionBests(newSB);
          setDriverBests(newBests);
          setPositionChanges(newPosChanges);
          if (newFlash.size) { setFlashMap(newFlash); setTimeout(() => setFlashMap(new Map()), 1500); }
          const map = new Map<number, DriverTiming>();
          for (const d of parsed.timing) map.set(d.driverNumber, d);
          prevRef.current = map;
        }
        setData(parsed);
        setLastUpdate(new Date());
      } catch { }
    };
  }, []);

  useEffect(() => { connect(manualSessionKey); return () => esRef.current?.close(); }, [connect, manualSessionKey]);

  const handleSessionChange = (key: number | null) => {
    setManualSessionKey(key); setData(null); setNoLiveSession(false);
    setSessionBests({ s1: null, s2: null, s3: null, lap: null });
    setDriverBests(new Map()); prevRef.current = new Map();
  };

  const isManual = manualSessionKey !== null;

  if (!data || !data.session) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex flex-col">
        <div className="p-4">
          <div className="f1-card p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div>
                <h1 className="text-white font-bold text-lg">Live Timing</h1>
                <p className="text-gray-400 text-xs">OpenF1 • Real-time telemetry</p>
              </div>
              <div className="sm:ml-auto">
                <SessionSelector onSessionChange={handleSessionChange} currentSessionKey={manualSessionKey} />
              </div>
            </div>
          </div>
          {connectionTimeout && (
            <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-yellow-400 text-sm">
              <div className="flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <p className="font-semibold mb-1">No live session active</p>
                  <p className="text-yellow-400/80 text-xs">No live F1 session found. Showing last available data or select a session above.</p>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => { setConnectionTimeout(false); connect(manualSessionKey); }} 
                      className="bg-[#E10600] hover:bg-[#c00500] text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors">Retry connection</button>
                    <Link href="/calendar"
                      className="bg-[#111] hover:bg-[#1a1a1a] border border-[#222] text-gray-300 px-4 py-2 rounded-lg text-xs font-semibold transition-colors">View Calendar</Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="flex flex-col items-center justify-center text-center w-full max-w-4xl px-4">
            <div className="w-10 h-10 border-2 border-[#E10600] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm text-gray-300">{connectionTimeout ? 'Loading last session data...' : 'Connecting to live timing...'}</p>
            <p className="text-xs mt-1 text-gray-500">{connectionTimeout ? 'Historical' : 'Live'} session</p>
            <div className="mt-8 w-full">
              <TimingTableSkeleton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { session, timing = [] } = data;
  const fastestLapDriver = sessionBests.lap ? timing.find(d => d.bestLap === sessionBests.lap) : null;

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-xl p-4" style={{ background: `linear-gradient(135deg, #0a0a0a 0%, ${getFlagConfig(session.status).bg}15 100%)`, border: `1px solid ${getFlagConfig(session.status).bg}40` }}>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="flex flex-col">
              <span className="text-white font-bold text-sm">{session.year} {session.country} Grand Prix</span>
              <span className="text-gray-400 text-xs">{session.circuit} • {session.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <ProminentFlagBanner status={session.status} />
              {isManual && <span className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs px-2 py-0.5 rounded-full">Historical</span>}
            </div>
            <div className="lg:ml-auto flex flex-col sm:flex-row sm:items-center gap-3">
              <WeatherStrip sessionKey={manualSessionKey || session.key} />
              <SessionSelector onSessionChange={handleSessionChange} currentSessionKey={manualSessionKey} />
              <div className="flex items-center gap-2 text-xs text-gray-400">
                {connected ? <><span className="w-2 h-2 rounded-full bg-green-400 animate-pulse-dot" /><span className="text-green-400 font-semibold">LIVE</span></> : <><span className="w-2 h-2 rounded-full bg-red-500" /><span className="text-red-500">OFFLINE</span></>}
                {lastUpdate && <span className="text-gray-500 ml-2"><TimeAgo date={lastUpdate} /></span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {noLiveSession && !isManual && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-yellow-400 text-sm">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>No live session active. Showing last available data for {session.name} • {session.country} GP</span>
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="f1-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="timing-table w-full">
                <thead>
                  <tr>
                    <th className="text-left w-10">POS</th>
                    <th className="text-left w-8">DRS</th>
                    <th className="text-left">DRIVER</th>
                    <th className="text-left hidden md:table-cell">TEAM</th>
                    <th className="text-right">GAP</th>
                    <th className="text-right hidden sm:table-cell">INT</th>
                    <th className="text-right">BEST</th>
                    <th className="text-right">LAST</th>
                    <th className="text-right hidden lg:table-cell">S1</th>
                    <th className="text-right hidden lg:table-cell">S2</th>
                    <th className="text-right hidden lg:table-cell">S3</th>
                    <th className="text-center hidden xl:table-cell">SEC</th>
                    <th className="text-center">TYRE</th>
                    <th className="text-right hidden sm:table-cell">LAP</th>
                    <th className="text-right hidden md:table-cell">PITS</th>
                  </tr>
                </thead>
                <tbody>
                  {timing.length === 0 ? (
                    <tr><td colSpan={15} className="py-16 text-center text-gray-600">No timing data — waiting for session...</td></tr>
                  ) : timing.map((driver) => {
                    const teamColor = driver.teamColor ? `#${driver.teamColor}` : getTeamColor(driver.team);
                    const flash = flashMap.get(driver.driverNumber);
                    const posChange = positionChanges.get(driver.driverNumber);
                    const driverBest = driverBests.get(driver.driverNumber);
                    const isFastestLap = fastestLapDriver?.driverNumber === driver.driverNumber;
                    return (
                      <tr key={driver.driverNumber}
                        className={`${flash === 'purple' ? 'flash-session-best' : flash === 'green' ? 'flash-improved' : ''} ${driver.position === 1 ? 'pos-leader' : ''} ${driver.isInPit ? 'bg-orange-500/10' : ''}`}
                        style={{ background: driver.position === 1 ? `linear-gradient(90deg, ${teamColor}20 0%, transparent 30%)` : undefined }}
                      >
                        <td>
                          <div className="flex items-center gap-1">
                            <span className={driver.position === 1 ? 'pos-1 mono' : driver.position === 2 ? 'pos-2 mono' : driver.position === 3 ? 'pos-3 mono' : 'pos-n mono'}>{driver.position}</span>
                            {posChange === 'up' && <span className="text-green-400 text-[10px]">▲</span>}
                            {posChange === 'down' && <span className="text-red-400 text-[10px]">▼</span>}
                          </div>
                        </td>
                        <td><DrsCell drs={driver.drs} /></td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-1 h-6 rounded-full shrink-0" style={{ backgroundColor: teamColor }} />
                            <span className="font-bold text-white text-[13px] uppercase tracking-wide">{driver.acronym}</span>
                            {isFastestLap && <span className="text-[#BF00FF]" title="Fastest Lap">💜</span>}
                            {driver.isInPit && (
                              <span className="text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded font-bold animate-pulse-fast">PIT IN</span>
                            )}
                            {driver.isPitOut && !driver.isInPit && <span className="text-[9px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded font-bold">PIT</span>}
                          </div>
                        </td>
                        <td className="hidden md:table-cell">
                          <span className="text-gray-400 text-[10px] uppercase tracking-wide truncate max-w-[100px] block">
                            {driver.team?.replace(' F1 Team', '').replace('Oracle Red Bull Racing', 'Red Bull')}
                          </span>
                        </td>
                        <td className="text-right"><GapCell gap={driver.gapToLeader} pos={driver.position} /></td>
                        <td className="text-right hidden sm:table-cell"><IntervalCell interval={driver.interval} /></td>
                        <td className="text-right">
                          <BestLapCell time={driver.bestLap} isSessionBest={isFastestLap} />
                        </td>
                        <td className="text-right"><LapCell time={driver.lastLap} best={driver.bestLap} sessionBest={sessionBests.lap} /></td>
                        <td className="text-right hidden lg:table-cell">
                          <SectorCell time={driver.sector1} personalBest={driverBest?.s1 ?? null} sessionBest={sessionBests.s1} />
                        </td>
                        <td className="text-right hidden lg:table-cell">
                          <SectorCell time={driver.sector2} personalBest={driverBest?.s2 ?? null} sessionBest={sessionBests.s2} />
                        </td>
                        <td className="text-right hidden lg:table-cell">
                          <SectorCell time={driver.sector3} personalBest={driverBest?.s3 ?? null} sessionBest={sessionBests.s3} />
                        </td>
                        <td className="text-center hidden xl:table-cell">
                          <MiniSectors s1={driver.sector1} s2={driver.sector2} s3={driver.sector3} 
                            bestS1={driverBest?.s1 ?? null} bestS2={driverBest?.s2 ?? null} bestS3={driverBest?.s3 ?? null}
                            sessionBestS1={sessionBests.s1} sessionBestS2={sessionBests.s2} sessionBestS3={sessionBests.s3} />
                        </td>
                        <td className="text-center">
                          <TyreBadgeWithTooltip compound={driver.tyre} age={driver.tyreAge} />
                        </td>
                        <td className="text-right hidden sm:table-cell">
                          <span className="mono text-[10px] text-gray-400 tabular-nums">{driver.lapNumber ?? '—'}</span>
                        </td>
                        <td className="text-right hidden md:table-cell">
                          <span className="mono text-[10px] text-gray-400 tabular-nums">{driver.pits ?? 0}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <aside className="w-48 shrink-0 hidden xl:flex flex-col gap-3">
          <div className="f1-card p-4">
            <p className="text-gray-400 text-[10px] uppercase tracking-widest mb-3 font-bold">Session</p>
            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between"><span className="text-gray-400">Type</span><span className="text-white font-semibold">{session.type}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Drivers</span><span className="text-white">{timing.length}</span></div>
              <div className="flex justify-between items-center"><span className="text-gray-400">Status</span><ProminentFlagBanner status={session.status} /></div>
            </div>
          </div>
          <div className="f1-card p-4">
            <p className="text-gray-400 text-[10px] uppercase tracking-widest mb-3 font-bold">Session Best</p>
            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between"><span className="text-gray-400">Lap</span><span className="text-[#BF00FF] mono tabular-nums">{formatLapTime(sessionBests.lap)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">S1</span><span className="text-[#BF00FF] mono tabular-nums">{sessionBests.s1 ? sessionBests.s1.toFixed(3) : '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">S2</span><span className="text-[#BF00FF] mono tabular-nums">{sessionBests.s2 ? sessionBests.s2.toFixed(3) : '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">S3</span><span className="text-[#BF00FF] mono tabular-nums">{sessionBests.s3 ? sessionBests.s3.toFixed(3) : '—'}</span></div>
            </div>
          </div>
          <div className="f1-card p-4">
            <p className="text-gray-400 text-[10px] uppercase tracking-widest mb-3 font-bold">Legend</p>
            <div className="space-y-1.5 text-[10px]">
              <div className="flex items-center gap-2"><span className="mini-sector" style={{ backgroundColor: '#BF00FF' }} /><span className="text-gray-400">Session best</span></div>
              <div className="flex items-center gap-2"><span className="mini-sector" style={{ backgroundColor: '#00FF44' }} /><span className="text-gray-400">Personal best</span></div>
              <div className="flex items-center gap-2"><span className="mini-sector" style={{ backgroundColor: '#FFE600' }} /><span className="text-gray-400">No improvement</span></div>
              <div className="flex items-center gap-2"><span className="mini-sector" style={{ backgroundColor: '#333' }} /><span className="text-gray-400">No data</span></div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
