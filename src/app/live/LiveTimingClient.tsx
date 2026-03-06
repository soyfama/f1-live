'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { formatLapTime } from '@/lib/openf1';
import {
  getTyreColor, getTyreLetter,
  classifySector, SECTOR_CLASS_STYLES,
  getPosStyle, getFlagConfig,
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

// ─── Tyre Badge ──────────────────────────────────────────────────────────────
function TyreBadge({ compound, age }: { compound: string | null; age: number | null }) {
  if (!compound) return <span className="text-[#374151] text-xs">—</span>;
  const bg = getTyreColor(compound);
  const letter = getTyreLetter(compound);
  const textColor = ['MEDIUM', 'SOFT'].includes(compound.toUpperCase()) ? '#000' : '#000';
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="tyre-badge"
        style={{ backgroundColor: bg, color: textColor }}
        title={compound}
      >
        {letter}
      </span>
      {age !== null && (
        <span className="text-[#6b7280] text-[10px] mono tabular-nums">{age}</span>
      )}
    </span>
  );
}

// ─── DRS Indicator ───────────────────────────────────────────────────────────
function DrsCell({ drs }: { drs: number | null }) {
  const isActive = drs !== null && drs >= 8;
  return (
    <span className={isActive ? 'drs-active' : 'drs-inactive'}>
      DRS
    </span>
  );
}

// ─── Sector Time Cell ─────────────────────────────────────────────────────────
function SectorCell({
  time,
  personalBest,
  sessionBest,
}: {
  time: number | null;
  personalBest: number | null;
  sessionBest: number | null;
}) {
  if (!time) return <span className="sector-grey mono text-[10px]">—</span>;
  const cls = classifySector(time, personalBest, sessionBest);
  const style = SECTOR_CLASS_STYLES[cls];
  return (
    <span
      className="mono text-[11px] tabular-nums px-0.5 rounded"
      style={{ color: style.color, background: style.bg }}
    >
      {time.toFixed(3)}
    </span>
  );
}

// ─── Mini Sector Bars ─────────────────────────────────────────────────────────
function MiniSectors({
  s1, s2, s3,
  bestS1, bestS2, bestS3,
  sessionBestS1, sessionBestS2, sessionBestS3,
}: {
  s1: number | null; s2: number | null; s3: number | null;
  bestS1: number | null; bestS2: number | null; bestS3: number | null;
  sessionBestS1: number | null; sessionBestS2: number | null; sessionBestS3: number | null;
}) {
  const sectors = [
    { t: s1, pb: bestS1, sb: sessionBestS1 },
    { t: s2, pb: bestS2, sb: sessionBestS2 },
    { t: s3, pb: bestS3, sb: sessionBestS3 },
  ];
  const colors = sectors.map(s => {
    if (!s.t) return '#1f2533';
    const cls = classifySector(s.t, s.pb, s.sb);
    return SECTOR_CLASS_STYLES[cls].color;
  });

  return (
    <span className="inline-flex items-center gap-[2px]">
      {colors.map((c, i) => (
        <span
          key={i}
          className="mini-sector"
          style={{ backgroundColor: c }}
        />
      ))}
    </span>
  );
}

// ─── Flag Banner ──────────────────────────────────────────────────────────────
function FlagBanner({ status }: { status: string }) {
  const cfg = getFlagConfig(status);
  return (
    <span className="flag-banner" style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

// ─── Gap display ──────────────────────────────────────────────────────────────
function GapCell({ gap, pos }: { gap: number | null; pos: number }) {
  if (pos === 1) return <span className="text-[#FFD700] text-[11px] mono font-bold">LEADER</span>;
  if (gap === null) return <span className="sector-grey mono text-[11px]">—</span>;
  return <span className="mono text-[11px] text-gray-300 tabular-nums">+{gap.toFixed(3)}</span>;
}

// ─── Lap time cell ────────────────────────────────────────────────────────────
function LapCell({ time, best }: { time: number | null; best: number | null }) {
  if (!time) return <span className="sector-grey mono text-[11px]">—</span>;
  const isBest = best !== null && Math.abs(time - best) < 0.001;
  return (
    <span className={`mono text-[11px] tabular-nums ${isBest ? 'sector-purple' : 'text-[#e5e7eb]'}`}>
      {formatLapTime(time)}
    </span>
  );
}

// ─── Circuit SVG ──────────────────────────────────────────────────────────────
function CircuitSVG({ circuit }: { circuit: string }) {
  return (
    <div className="relative w-full aspect-[4/3] flex items-center justify-center">
      <svg viewBox="0 0 200 150" className="w-full h-full">
        {/* Generic F1-style circuit silhouette */}
        <path
          d="M 30,75 Q 30,25 70,20 L 130,20 Q 170,25 170,75 Q 170,125 130,130 L 70,130 Q 30,125 30,75 Z"
          fill="none" stroke="#1e2538" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"
        />
        <path
          d="M 30,75 Q 30,25 70,20 L 130,20 Q 170,25 170,75 Q 170,125 130,130 L 70,130 Q 30,125 30,75 Z"
          fill="none" stroke="#3671C6" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"
          opacity="0.7"
        />
        {/* Start/finish line */}
        <line x1="30" y1="65" x2="30" y2="85" stroke="#E10600" strokeWidth="3" />
        {/* DRS zone indicator */}
        <path d="M 30,70 L 50,70" stroke="#00FF00" strokeWidth="2" opacity="0.8" strokeDasharray="3 2" />
      </svg>
      <span className="absolute bottom-1 left-0 right-0 text-center text-[10px] text-[#374151] truncate px-1">
        {circuit}
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LiveTimingClient() {
  const [data, setData] = useState<LiveData | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [flashMap, setFlashMap] = useState<Map<number, 'green' | 'purple'>>(new Map());
  const prevRef = useRef<Map<number, DriverTiming>>(new Map());
  const esRef = useRef<EventSource | null>(null);

  // Track session-best per sector
  const [sessionBests, setSessionBests] = useState<{
    s1: number | null; s2: number | null; s3: number | null; lap: number | null;
  }>({ s1: null, s2: null, s3: null, lap: null });

  // Best per driver for sector classification
  const [driverBests, setDriverBests] = useState<Map<number, {
    s1: number | null; s2: number | null; s3: number | null;
  }>>(new Map());

  const connect = useCallback(() => {
    const es = new EventSource('/api/live');
    esRef.current = es;

    es.onopen = () => setConnected(true);
    es.onerror = () => {
      setConnected(false);
      es.close();
      setTimeout(connect, 5000);
    };

    es.onmessage = (e) => {
      try {
        const parsed: LiveData = JSON.parse(e.data);
        if (parsed.type === 'timing' && parsed.timing) {
          // Update flashes
          const newFlash = new Map<number, 'green' | 'purple'>();
          const newBests = new Map(driverBests);
          let sbChanged = false;
          let newSB = { ...sessionBests };

          for (const d of parsed.timing) {
            const prev = prevRef.current.get(d.driverNumber);
            const prevBests = driverBests.get(d.driverNumber) ?? { s1: null, s2: null, s3: null };

            // Track session bests
            if (d.bestLap && (!newSB.lap || d.bestLap < newSB.lap)) {
              newSB.lap = d.bestLap; sbChanged = true;
              newFlash.set(d.driverNumber, 'purple');
            } else if (prev && d.bestLap && d.bestLap !== prev.bestLap) {
              newFlash.set(d.driverNumber, 'green');
            }
            if (d.sector1 && (!newSB.s1 || d.sector1 < newSB.s1)) { newSB.s1 = d.sector1; sbChanged = true; }
            if (d.sector2 && (!newSB.s2 || d.sector2 < newSB.s2)) { newSB.s2 = d.sector2; sbChanged = true; }
            if (d.sector3 && (!newSB.s3 || d.sector3 < newSB.s3)) { newSB.s3 = d.sector3; sbChanged = true; }

            // Update driver bests
            newBests.set(d.driverNumber, {
              s1: prevBests.s1 === null ? d.sector1 : d.sector1 ? Math.min(prevBests.s1, d.sector1) : prevBests.s1,
              s2: prevBests.s2 === null ? d.sector2 : d.sector2 ? Math.min(prevBests.s2, d.sector2) : prevBests.s2,
              s3: prevBests.s3 === null ? d.sector3 : d.sector3 ? Math.min(prevBests.s3, d.sector3) : prevBests.s3,
            });
          }

          if (sbChanged) setSessionBests(newSB);
          setDriverBests(newBests);

          if (newFlash.size) {
            setFlashMap(newFlash);
            setTimeout(() => setFlashMap(new Map()), 1200);
          }

          // Update prev map
          const map = new Map<number, DriverTiming>();
          for (const d of parsed.timing) map.set(d.driverNumber, d);
          prevRef.current = map;
        }
        setData(parsed);
        setLastUpdate(new Date());
      } catch { /* ignore */ }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    connect();
    return () => esRef.current?.close();
  }, [connect]);

  if (!data || !data.session) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-gray-500">
        <div className="w-8 h-8 border-2 border-[#E10600] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm">Connecting to live timing...</p>
        <p className="text-xs mt-1 text-[#374151]">OpenF1 API · Latest session</p>
      </div>
    );
  }

  const { session, timing = [] } = data;
  const flagCfg = getFlagConfig(session.status);

  return (
    <div className="flex gap-4">
      {/* Main table area */}
      <div className="flex-1 min-w-0 overflow-hidden">

        {/* Session banner */}
        <div
          className="rounded-xl p-3 mb-3 flex flex-wrap items-center gap-3"
          style={{
            background: `linear-gradient(135deg, #12172a 0%, ${flagCfg.bg}15 100%)`,
            border: `1px solid ${flagCfg.bg}30`,
          }}
        >
          <div className="flex flex-col">
            <span className="text-white font-bold text-sm">
              {session.year} {session.country} Grand Prix
            </span>
            <span className="text-[#6b7280] text-xs">{session.circuit} · {session.name}</span>
          </div>

          <FlagBanner status={session.status} />

          <div className="ml-auto flex items-center gap-2 text-xs text-[#4b5563]">
            {connected
              ? <><span className="w-1.5 h-1.5 rounded-full bg-[#00FF00] animate-pulse-dot" /><span>LIVE</span></>
              : <><span className="w-1.5 h-1.5 rounded-full bg-[#FF3333]" /><span>RECONNECTING</span></>
            }
            {lastUpdate && <span>{lastUpdate.toLocaleTimeString()}</span>}
          </div>
        </div>

        {/* Timing table */}
        <div className="f1-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="timing-table w-full">
              <thead>
                <tr>
                  <th className="text-left w-8">POS</th>
                  <th className="text-left w-6">DRS</th>
                  <th className="text-left">DRIVER</th>
                  <th className="text-left hidden md:table-cell">TEAM</th>
                  <th className="text-right">GAP</th>
                  <th className="text-right hidden sm:table-cell">INT</th>
                  <th className="text-right">BEST</th>
                  <th className="text-right">LAST</th>
                  <th className="text-right hidden lg:table-cell">S1</th>
                  <th className="text-right hidden lg:table-cell">S2</th>
                  <th className="text-right hidden lg:table-cell">S3</th>
                  <th className="text-center hidden xl:table-cell">SECTORS</th>
                  <th className="text-center">TYRE</th>
                  <th className="text-right hidden sm:table-cell">LAP</th>
                </tr>
              </thead>
              <tbody>
                {timing.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="py-16 text-center text-[#4b5563]">
                      No timing data — waiting for session...
                    </td>
                  </tr>
                ) : timing.map((driver) => {
                  const teamColor = driver.teamColor
                    ? `#${driver.teamColor}`
                    : getTeamColor(driver.team);
                  const flash = flashMap.get(driver.driverNumber);
                  const driverBest = driverBests.get(driver.driverNumber);

                  return (
                    <tr
                      key={driver.driverNumber}
                      className={
                        flash === 'purple' ? 'flash-session-best' :
                        flash === 'green' ? 'flash-improved' : ''
                      }
                      style={{
                        background: `${teamColor}0d`, // 5% opacity team color
                      }}
                    >
                      {/* Position */}
                      <td>
                        <span className={
                          driver.position === 1 ? 'pos-1 mono' :
                          driver.position === 2 ? 'pos-2 mono' :
                          driver.position === 3 ? 'pos-3 mono' :
                          'pos-n mono'
                        }>
                          {driver.position}
                        </span>
                      </td>

                      {/* DRS */}
                      <td><DrsCell drs={driver.drs} /></td>

                      {/* Driver */}
                      <td>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-[3px] h-5 rounded-full shrink-0"
                            style={{ backgroundColor: teamColor }}
                          />
                          <span className="font-bold text-white text-[12px] uppercase tracking-wide">
                            {driver.acronym}
                          </span>
                          {driver.isPitOut && (
                            <span className="text-[9px] bg-[#FF8C00]/20 text-[#FF8C00] px-1 py-0 rounded font-bold">
                              PIT
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Team */}
                      <td className="hidden md:table-cell">
                        <span className="text-[#6b7280] text-[10px] uppercase tracking-wide truncate max-w-[100px] block">
                          {driver.team?.replace(' F1 Team', '').replace('Oracle Red Bull Racing', 'Red Bull')}
                        </span>
                      </td>

                      {/* Gap to leader */}
                      <td className="text-right">
                        <GapCell gap={driver.gapToLeader} pos={driver.position} />
                      </td>

                      {/* Interval */}
                      <td className="text-right hidden sm:table-cell">
                        <span className="mono text-[11px] text-[#4b5563] tabular-nums">
                          {driver.interval !== null ? `+${driver.interval.toFixed(3)}` : '—'}
                        </span>
                      </td>

                      {/* Best lap */}
                      <td className="text-right">
                        <span className="mono text-[11px] sector-purple tabular-nums">
                          {formatLapTime(driver.bestLap)}
                        </span>
                      </td>

                      {/* Last lap */}
                      <td className="text-right">
                        <LapCell time={driver.lastLap} best={driver.bestLap} />
                      </td>

                      {/* Sectors */}
                      <td className="text-right hidden lg:table-cell">
                        <SectorCell
                          time={driver.sector1}
                          personalBest={driverBest?.s1 ?? null}
                          sessionBest={sessionBests.s1}
                        />
                      </td>
                      <td className="text-right hidden lg:table-cell">
                        <SectorCell
                          time={driver.sector2}
                          personalBest={driverBest?.s2 ?? null}
                          sessionBest={sessionBests.s2}
                        />
                      </td>
                      <td className="text-right hidden lg:table-cell">
                        <SectorCell
                          time={driver.sector3}
                          personalBest={driverBest?.s3 ?? null}
                          sessionBest={sessionBests.s3}
                        />
                      </td>

                      {/* Mini sectors */}
                      <td className="text-center hidden xl:table-cell">
                        <MiniSectors
                          s1={driver.sector1} s2={driver.sector2} s3={driver.sector3}
                          bestS1={driverBest?.s1 ?? null} bestS2={driverBest?.s2 ?? null} bestS3={driverBest?.s3 ?? null}
                          sessionBestS1={sessionBests.s1} sessionBestS2={sessionBests.s2} sessionBestS3={sessionBests.s3}
                        />
                      </td>

                      {/* Tyre */}
                      <td className="text-center">
                        <TyreBadge compound={driver.tyre} age={driver.tyreAge} />
                      </td>

                      {/* Lap number */}
                      <td className="text-right hidden sm:table-cell">
                        <span className="mono text-[10px] text-[#4b5563] tabular-nums">
                          {driver.lapNumber ?? '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Right sidebar */}
      <aside className="w-44 shrink-0 hidden xl:flex flex-col gap-3">
        {/* Circuit */}
        <div className="f1-card p-3">
          <p className="text-[#4b5563] text-[10px] uppercase tracking-wider mb-2">Circuit</p>
          <CircuitSVG circuit={session.circuit} />
        </div>

        {/* Session info */}
        <div className="f1-card p-3">
          <p className="text-[#4b5563] text-[10px] uppercase tracking-wider mb-2">Session</p>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-[#6b7280]">Type</span>
              <span className="text-white font-medium">{session.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6b7280]">Drivers</span>
              <span className="text-white">{timing.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#6b7280]">Status</span>
              <FlagBanner status={session.status} />
            </div>
          </div>
        </div>

        {/* Session bests */}
        <div className="f1-card p-3">
          <p className="text-[#4b5563] text-[10px] uppercase tracking-wider mb-2">Session Best</p>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="sector-grey">Lap</span>
              <span className="sector-purple mono tabular-nums">{formatLapTime(sessionBests.lap)}</span>
            </div>
            <div className="flex justify-between">
              <span className="sector-grey">S1</span>
              <span className="sector-purple mono tabular-nums">{sessionBests.s1 ? sessionBests.s1.toFixed(3) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="sector-grey">S2</span>
              <span className="sector-purple mono tabular-nums">{sessionBests.s2 ? sessionBests.s2.toFixed(3) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="sector-grey">S3</span>
              <span className="sector-purple mono tabular-nums">{sessionBests.s3 ? sessionBests.s3.toFixed(3) : '—'}</span>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="f1-card p-3">
          <p className="text-[#4b5563] text-[10px] uppercase tracking-wider mb-2">Legend</p>
          <div className="space-y-1 text-[10px]">
            <div className="flex items-center gap-2">
              <span className="mini-sector" style={{ backgroundColor: '#BF00FF' }} />
              <span className="text-[#6b7280]">Session best</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="mini-sector" style={{ backgroundColor: '#00FF00' }} />
              <span className="text-[#6b7280]">Personal best</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="mini-sector" style={{ backgroundColor: '#FFFF00' }} />
              <span className="text-[#6b7280]">No improvement</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="mini-sector" style={{ backgroundColor: '#1f2533' }} />
              <span className="text-[#6b7280]">No data</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
