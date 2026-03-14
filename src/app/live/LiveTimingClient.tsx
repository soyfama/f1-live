'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { formatLapTime } from '@/lib/openf1';
import {
  getTyreColor, getTyreLetter,
  classifySector, SECTOR_CLASS_STYLES,
  getFlagConfig,
  getTeamColor,
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

interface LiveData {
  type: string;
  session?: SessionInfo;
  timing?: DriverTiming[];
  timestamp?: number;
  message?: string;
}

interface MeetingOption {
  meetingKey: number;
  label: string;
}

interface SessionOption {
  sessionKey: number;
  label: string;
}

function TyreBadge({ compound, age }: { compound: string | null; age: number | null }) {
  if (!compound) return <span className="text-[#333] text-xs">—</span>;
  const bg = getTyreColor(compound);
  const letter = getTyreLetter(compound);
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="tyre-badge" style={{ backgroundColor: bg, color: '#000' }} title={compound}>
        {letter}
      </span>
      {age !== null && (
        <span className="text-[#555] text-[10px] mono tabular-nums">{age}</span>
      )}
    </span>
  );
}

function DrsCell({ drs }: { drs: number | null }) {
  const isActive = drs !== null && drs >= 8;
  return <span className={isActive ? 'drs-active' : 'drs-inactive'}>DRS</span>;
}

function SectorCell({ time, personalBest, sessionBest }: { time: number | null; personalBest: number | null; sessionBest: number | null }) {
  if (!time) return <span className="sector-grey mono text-[11px]">—</span>;
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
        const color = !s.t ? '#1a1a1a' : SECTOR_CLASS_STYLES[classifySector(s.t, s.pb, s.sb)].color;
        return <span key={i} className="mini-sector" style={{ backgroundColor: color }} />;
      })}
    </span>
  );
}

function FlagBanner({ status }: { status: string }) {
  const cfg = getFlagConfig(status);
  return <span className="flag-banner" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>;
}

function GapCell({ gap, pos }: { gap: number | null; pos: number }) {
  if (pos === 1) return <span className="text-[#FFD700] text-[11px] mono font-bold tracking-wider">LEADER</span>;
  if (gap === null) return <span className="sector-grey mono text-[11px]">—</span>;
  return <span className="mono text-[11px] text-gray-300 tabular-nums">+{gap.toFixed(3)}</span>;
}

function LapCell({ time, best }: { time: number | null; best: number | null }) {
  if (!time) return <span className="sector-grey mono text-[11px]">—</span>;
  const isBest = best !== null && Math.abs(time - best) < 0.001;
  return (
    <span className={`mono text-[11px] tabular-nums ${isBest ? 'sector-purple font-bold' : 'text-gray-300'}`}>
      {formatLapTime(time)}
    </span>
  );
}

function TimeAgo({ date }: { date: Date }) {
  const [seconds, setSeconds] = useState(0);
  
  useEffect(() => {
    const update = () => {
      const diff = Math.floor((Date.now() - date.getTime()) / 1000);
      setSeconds(diff);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [date]);

  if (seconds < 5) return <span className="text-[#00FF00]">Just now</span>;
  if (seconds < 60) return <span className="text-gray-400">{seconds}s ago</span>;
  return <span className="text-gray-500">{Math.floor(seconds / 60)}m ago</span>;
}

function CircuitSVG({ circuit }: { circuit: string }) {
  const trackPath = [
    "M 55,40", "L 290,40", "C 330,40 345,55 345,90", "L 345,120",
    "C 345,138 332,145 320,140", "C 308,135 302,148 305,165", "L 308,205",
    "C 310,235 292,258 265,262", "C 238,266 215,258 205,240",
    "C 195,222 198,205 210,195", "L 225,170", "C 238,155 235,138 222,130",
    "L 195,125", "C 178,120 168,108 170,90", "L 172,65",
    "C 174,50 165,40 150,40", "L 55,40",
  ].join(" ");

  return (
    <div className="relative w-full flex flex-col items-center justify-center gap-2">
      <svg viewBox="0 0 400 300" className="w-full h-36">
        <path d={trackPath} fill="none" stroke="#1a1a1a" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
        <path d={trackPath} fill="none" stroke="#222" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
        <path d={trackPath} fill="none" stroke="#333" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        <path d={trackPath} fill="none" stroke="#E10600" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.6" />
        <line x1="55" y1="33" x2="55" y2="47" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
        <line x1="60" y1="33" x2="60" y2="47" stroke="#E10600" strokeWidth="2" strokeLinecap="round" />
        <circle cx="345" cy="90" r="3" fill="#E10600" opacity="0.5" />
        <circle cx="235" cy="262" r="3" fill="#E10600" opacity="0.5" />
      </svg>
      <span className="text-[10px] text-[#444] truncate max-w-full px-1 text-center uppercase tracking-wider">{circuit}</span>
    </div>
  );
}

function SessionSelector({ onSessionChange, currentSessionKey }: { onSessionChange: (key: number | null) => void; currentSessionKey: number | null }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [meetings, setMeetings] = useState<MeetingOption[]>([]);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
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
    const t = setTimeout(() => setConnectionTimeout(true), 25000);
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
      <div className="space-y-4 p-4">
        <div className="f1-card p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div><h1 className="text-white font-bold text-lg">Live Timing</h1><p className="text-gray-600 text-xs">OpenF1 • Real-time telemetry</p></div>
            <div className="ml-auto"><SessionSelector onSessionChange={handleSessionChange} currentSessionKey={manualSessionKey} /></div>
          </div>
        </div>
        {noLiveSession && <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-yellow-400 text-sm flex items-center gap-2"><span>⚠️</span><span>No live F1 session active. Loading latest available session data...</span></div>}
        {connectionTimeout ? (
          <div className="f1-card p-10 text-center">
            <p className="text-4xl mb-3">📡</p>
            <p className="text-white font-semibold mb-1">No active F1 session found</p>
            <p className="text-gray-500 text-sm mb-4">There is no live session right now. Select a past session above to explore historical data.</p>
            <button onClick={() => { setConnectionTimeout(false); connect(manualSessionKey); }} className="bg-[#E10600] hover:bg-[#c00500] text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors">Retry connection</button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-gray-600">
            <div className="w-10 h-10 border-2 border-[#E10600] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm">{noLiveSession ? 'Loading last session data...' : 'Connecting to live timing...'}</p>
            <p className="text-xs mt-1 text-gray-700">{noLiveSession ? 'Historical' : 'Live'} session</p>
          </div>
        )}
      </div>
    );
  }

  const { session, timing = [] } = data;
  const flagCfg = getFlagConfig(session.status);

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-xl p-4 flex flex-wrap items-center gap-3" style={{ background: `linear-gradient(135deg, #0a0a0a 0%, ${flagCfg.bg}10 100%)`, border: `1px solid ${flagCfg.bg}40` }}>
        <div className="flex flex-col">
          <span className="text-white font-bold text-sm">{session.year} {session.country} Grand Prix</span>
          <span className="text-gray-500 text-xs">{session.circuit} • {session.name}</span>
        </div>
        <FlagBanner status={session.status} />
        {isManual && <span className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs px-2 py-0.5 rounded-full">Historical</span>}
        <div className="ml-auto flex items-center gap-3">
          <SessionSelector onSessionChange={handleSessionChange} currentSessionKey={manualSessionKey} />
          <div className="flex items-center gap-2 text-xs text-gray-600">
            {connected ? <><span className="w-2 h-2 rounded-full bg-[#00FF00] animate-pulse-dot" /><span className="text-[#00FF00] font-semibold">LIVE</span></> : <><span className="w-2 h-2 rounded-full bg-[#FF3333]" /><span className="text-[#FF3333]">OFFLINE</span></>}
            {lastUpdate && <span className="text-gray-500 ml-2"><TimeAgo date={lastUpdate} /></span>}
          </div>
        </div>
      </div>

      {noLiveSession && !isManual && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-yellow-400 text-sm flex items-center gap-2">
          <span>⚠️</span><span>No live session active. Showing last available data for {session.name} • {session.country} GP</span>
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
                  </tr>
                </thead>
                <tbody>
                  {timing.length === 0 ? (
                    <tr><td colSpan={14} className="py-16 text-center text-gray-600">No timing data — waiting for session...</td></tr>
                  ) : timing.map((driver) => {
                    const teamColor = driver.teamColor ? `#${driver.teamColor}` : getTeamColor(driver.team);
                    const flash = flashMap.get(driver.driverNumber);
                    const posChange = positionChanges.get(driver.driverNumber);
                    const driverBest = driverBests.get(driver.driverNumber);
                    return (
                      <tr key={driver.driverNumber}
                        className={`${flash === 'purple' ? 'flash-session-best' : flash === 'green' ? 'flash-improved' : ''} ${driver.position === 1 ? 'pos-leader' : ''} ${posChange === 'up' ? 'bg-green-500/5' : posChange === 'down' ? 'bg-red-500/5' : ''}`}
                        style={{ background: driver.position === 1 ? `linear-gradient(90deg, ${teamColor}20 0%, transparent 30%)` : undefined }}>
                        <td>
                          <div className="flex items-center gap-1">
                            <span className={driver.position === 1 ? 'pos-1 mono' : driver.position === 2 ? 'pos-2 mono' : driver.position === 3 ? 'pos-3 mono' : 'pos-n mono'}>{driver.position}</span>
                            {posChange === 'up' && <span className="text-[#00FF00] text-[10px]">▲</span>}
                            {posChange === 'down' && <span className="text-[#FF4444] text-[10px]">▼</span>}
                          </div>
                        </td>
                        <td><DrsCell drs={driver.drs} /></td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-1 h-6 rounded-full shrink-0" style={{ backgroundColor: teamColor }} />
                            <span className="font-bold text-white text-[13px] uppercase tracking-wide">{driver.acronym}</span>
                            {driver.isPitOut && <span className="text-[9px] bg-[#FF8C00]/20 text-[#FF8C00] px-1.5 py-0.5 rounded font-bold">PIT</span>}
                          </div>
                        </td>
                        <td className="hidden md:table-cell"><span className="text-gray-500 text-[10px] uppercase tracking-wide truncate max-w-[100px] block">{driver.team?.replace(' F1 Team', '').replace('Oracle Red Bull Racing', 'Red Bull')}</span></td>
                        <td className="text-right"><GapCell gap={driver.gapToLeader} pos={driver.position} /></td>
                        <td className="text-right hidden sm:table-cell"><span className="mono text-[11px] text-gray-500 tabular-nums">{driver.interval !== null ? `+${driver.interval.toFixed(3)}` : '—'}</span></td>
                        <td className="text-right"><span className="mono text-[11px] sector-purple tabular-nums font-bold">{formatLapTime(driver.bestLap)}</span></td>
                        <td className="text-right"><LapCell time={driver.lastLap} best={driver.bestLap} /></td>
                        <td className="text-right hidden lg:table-cell"><SectorCell time={driver.sector1} personalBest={driverBest?.s1 ?? null} sessionBest={sessionBests.s1} /></td>
                        <td className="text-right hidden lg:table-cell"><SectorCell time={driver.sector2} personalBest={driverBest?.s2 ?? null} sessionBest={sessionBests.s2} /></td>
                        <td className="text-right hidden lg:table-cell"><SectorCell time={driver.sector3} personalBest={driverBest?.s3 ?? null} sessionBest={sessionBests.s3} /></td>
                        <td className="text-center hidden xl:table-cell"><MiniSectors s1={driver.sector1} s2={driver.sector2} s3={driver.sector3} bestS1={driverBest?.s1 ?? null} bestS2={driverBest?.s2 ?? null} bestS3={driverBest?.s3 ?? null} sessionBestS1={sessionBests.s1} sessionBestS2={sessionBests.s2} sessionBestS3={sessionBests.s3} /></td>
                        <td className="text-center"><TyreBadge compound={driver.tyre} age={driver.tyreAge} /></td>
                        <td className="text-right hidden sm:table-cell"><span className="mono text-[10px] text-gray-500 tabular-nums">{driver.lapNumber ?? '—'}</span></td>
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
            <p className="text-gray-600 text-[10px] uppercase tracking-widest mb-3 font-bold">Circuit</p>
            <CircuitSVG circuit={session.circuit} />
          </div>
          <div className="f1-card p-4">
            <p className="text-gray-600 text-[10px] uppercase tracking-widest mb-3 font-bold">Session</p>
            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between"><span className="text-gray-500">Type</span><span className="text-white font-semibold">{session.type}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Drivers</span><span className="text-white">{timing.length}</span></div>
              <div className="flex justify-between items-center"><span className="text-gray-500">Status</span><FlagBanner status={session.status} /></div>
            </div>
          </div>
          <div className="f1-card p-4">
            <p className="text-gray-600 text-[10px] uppercase tracking-widest mb-3 font-bold">Session Best</p>
            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between"><span className="sector-grey">Lap</span><span className="sector-purple mono tabular-nums">{formatLapTime(sessionBests.lap)}</span></div>
              <div className="flex justify-between"><span className="sector-grey">S1</span><span className="sector-purple mono tabular-nums">{sessionBests.s1 ? sessionBests.s1.toFixed(3) : '—'}</span></div>
              <div className="flex justify-between"><span className="sector-grey">S2</span><span className="sector-purple mono tabular-nums">{sessionBests.s2 ? sessionBests.s2.toFixed(3) : '—'}</span></div>
              <div className="flex justify-between"><span className="sector-grey">S3</span><span className="sector-purple mono tabular-nums">{sessionBests.s3 ? sessionBests.s3.toFixed(3) : '—'}</span></div>
            </div>
          </div>
          <div className="f1-card p-4">
            <p className="text-gray-600 text-[10px] uppercase tracking-widest mb-3 font-bold">Legend</p>
            <div className="space-y-1.5 text-[10px]">
              <div className="flex items-center gap-2"><span className="mini-sector" style={{ backgroundColor: '#BF00FF' }} /><span className="text-gray-500">Session best</span></div>
              <div className="flex items-center gap-2"><span className="mini-sector" style={{ backgroundColor: '#00FF00' }} /><span className="text-gray-500">Personal best</span></div>
              <div className="flex items-center gap-2"><span className="mini-sector" style={{ backgroundColor: '#FFFF00' }} /><span className="text-gray-500">No improvement</span></div>
              <div className="flex items-center gap-2"><span className="mini-sector" style={{ backgroundColor: '#1a1a1a' }} /><span className="text-gray-500">No data</span></div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
