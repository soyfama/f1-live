'use client';

import { useState, useEffect, useMemo } from 'react';
import { getTeamColor } from '@/lib/f1-colors';

// Sistema de puntos F1 2026
const RACE_PTS: Record<number, number> = { 1:25, 2:18, 3:15, 4:12, 5:10, 6:8, 7:6, 8:4, 9:2, 10:1 };
const SPRINT_PTS: Record<number, number> = { 1:8, 2:7, 3:6, 4:5, 5:4, 6:3, 7:2, 8:1 };

// Fallback con datos reales calculados a mano (Australia + China Sprint + China Race)
const FALLBACK_DRIVERS = [
  { pos: 1, driver: 'Kimi Antonelli', acronym: 'ANT', team: 'Mercedes', country: 'IT', wins: 1, podiums: 2, points: 61 },
  { pos: 2, driver: 'George Russell', acronym: 'RUS', team: 'Mercedes', country: 'GB', wins: 1, podiums: 2, points: 61 },
  { pos: 3, driver: 'Lewis Hamilton', acronym: 'HAM', team: 'Ferrari', country: 'GB', wins: 0, podiums: 2, points: 48 },
  { pos: 4, driver: 'Charles Leclerc', acronym: 'LEC', team: 'Ferrari', country: 'MC', wins: 0, podiums: 2, points: 45 },
  { pos: 5, driver: 'Oliver Bearman', acronym: 'BEA', team: 'Haas', country: 'GB', wins: 0, podiums: 1, points: 26 },
  { pos: 6, driver: 'Pierre Gasly', acronym: 'GAS', team: 'Alpine', country: 'FR', wins: 0, podiums: 0, points: 25 },
  { pos: 7, driver: 'Lando Norris', acronym: 'NOR', team: 'McLaren', country: 'GB', wins: 0, podiums: 1, points: 24 },
  { pos: 8, driver: 'Liam Lawson', acronym: 'LAW', team: 'Racing Bulls', country: 'NZ', wins: 0, podiums: 0, points: 17 },
  { pos: 9, driver: 'Isack Hadjar', acronym: 'HAD', team: 'Red Bull Racing', country: 'FR', wins: 0, podiums: 0, points: 12 },
  { pos: 10, driver: 'Carlos Sainz', acronym: 'SAI', team: 'Williams', country: 'ES', wins: 0, podiums: 0, points: 10 },
  { pos: 11, driver: 'Franco Colapinto', acronym: 'COL', team: 'Alpine', country: 'AR', wins: 0, podiums: 0, points: 9 },
  { pos: 12, driver: 'Max Verstappen', acronym: 'VER', team: 'Red Bull Racing', country: 'NL', wins: 0, podiums: 0, points: 8 },
  { pos: 13, driver: 'Arvid Lindblad', acronym: 'LIN', team: 'Racing Bulls', country: 'GB', wins: 0, podiums: 0, points: 8 },
  { pos: 14, driver: 'Gabriel Bortoleto', acronym: 'BOR', team: 'Audi', country: 'BR', wins: 0, podiums: 0, points: 6 },
  { pos: 15, driver: 'Oscar Piastri', acronym: 'PIA', team: 'McLaren', country: 'AU', wins: 0, podiums: 1, points: 6 },
  { pos: 16, driver: 'Alexander Albon', acronym: 'ALB', team: 'Williams', country: 'TH', wins: 0, podiums: 0, points: 0 },
  { pos: 17, driver: 'Fernando Alonso', acronym: 'ALO', team: 'Aston Martin', country: 'ES', wins: 0, podiums: 0, points: 0 },
  { pos: 18, driver: 'Lance Stroll', acronym: 'STR', team: 'Aston Martin', country: 'CA', wins: 0, podiums: 0, points: 0 },
  { pos: 19, driver: 'Nico Hülkenberg', acronym: 'HUL', team: 'Audi', country: 'DE', wins: 0, podiums: 0, points: 0 },
  { pos: 20, driver: 'Esteban Ocon', acronym: 'OCO', team: 'Haas', country: 'FR', wins: 0, podiums: 0, points: 0 },
  { pos: 21, driver: 'Sergio Perez', acronym: 'PER', team: 'Cadillac', country: 'MX', wins: 0, podiums: 0, points: 0 },
  { pos: 22, driver: 'Valtteri Bottas', acronym: 'BOT', team: 'Cadillac', country: 'FI', wins: 0, podiums: 0, points: 0 },
];

const FALLBACK_CONSTRUCTORS = [
  { pos: 1, team: 'Mercedes', wins: 2, podiums: 4, points: 122 },
  { pos: 2, team: 'Ferrari', wins: 0, podiums: 4, points: 93 },
  { pos: 3, team: 'Alpine', wins: 0, podiums: 0, points: 34 },
  { pos: 4, team: 'Haas', wins: 0, podiums: 1, points: 26 },
  { pos: 5, team: 'McLaren', wins: 0, podiums: 2, points: 24 },
  { pos: 6, team: 'Racing Bulls', wins: 0, podiums: 0, points: 25 },
  { pos: 7, team: 'Red Bull Racing', wins: 0, podiums: 0, points: 20 },
  { pos: 8, team: 'Williams', wins: 0, podiums: 0, points: 10 },
  { pos: 9, team: 'Audi', wins: 0, podiums: 0, points: 6 },
  { pos: 10, team: 'Aston Martin', wins: 0, podiums: 0, points: 0 },
  { pos: 11, team: 'Cadillac', wins: 0, podiums: 0, points: 0 },
];

const COUNTRY_FLAGS: Record<string, string> = {
  'NL': '🇳🇱', 'GB': '🇬🇧', 'AU': '🇦🇺', 'IT': '🇮🇹', 'MC': '🇲🇨', 'TH': '🇹🇭',
  'ES': '🇪🇸', 'CA': '🇨🇦', 'JP': '🇯🇵', 'FR': '🇫🇷', 'DE': '🇩🇪', 'NZ': '🇳🇿', 'BR': '🇧🇷',
  'AR': '🇦🇷', 'MX': '🇲🇽', 'FI': '🇫🇮',
};

// Mapeo de driver_number a datos del piloto
const DRIVER_INFO: Record<number, { name: string; acronym: string; team: string; country: string }> = {
  1: { name: 'Lando Norris', acronym: 'NOR', team: 'McLaren', country: 'GB' },
  3: { name: 'Max Verstappen', acronym: 'VER', team: 'Red Bull Racing', country: 'NL' },
  5: { name: 'Gabriel Bortoleto', acronym: 'BOR', team: 'Audi', country: 'BR' },
  6: { name: 'Isack Hadjar', acronym: 'HAD', team: 'Red Bull Racing', country: 'FR' },
  10: { name: 'Pierre Gasly', acronym: 'GAS', team: 'Alpine', country: 'FR' },
  11: { name: 'Sergio Perez', acronym: 'PER', team: 'Cadillac', country: 'MX' },
  12: { name: 'Kimi Antonelli', acronym: 'ANT', team: 'Mercedes', country: 'IT' },
  14: { name: 'Fernando Alonso', acronym: 'ALO', team: 'Aston Martin', country: 'ES' },
  16: { name: 'Charles Leclerc', acronym: 'LEC', team: 'Ferrari', country: 'MC' },
  18: { name: 'Lance Stroll', acronym: 'STR', team: 'Aston Martin', country: 'CA' },
  23: { name: 'Alexander Albon', acronym: 'ALB', team: 'Williams', country: 'TH' },
  27: { name: 'Nico Hulkenberg', acronym: 'HUL', team: 'Audi', country: 'DE' },
  30: { name: 'Liam Lawson', acronym: 'LAW', team: 'Racing Bulls', country: 'NZ' },
  31: { name: 'Esteban Ocon', acronym: 'OCO', team: 'Haas', country: 'FR' },
  41: { name: 'Arvid Lindblad', acronym: 'LIN', team: 'Racing Bulls', country: 'GB' },
  43: { name: 'Franco Colapinto', acronym: 'COL', team: 'Alpine', country: 'AR' },
  44: { name: 'Lewis Hamilton', acronym: 'HAM', team: 'Ferrari', country: 'GB' },
  55: { name: 'Carlos Sainz', acronym: 'SAI', team: 'Williams', country: 'ES' },
  63: { name: 'George Russell', acronym: 'RUS', team: 'Mercedes', country: 'GB' },
  77: { name: 'Valtteri Bottas', acronym: 'BOT', team: 'Cadillac', country: 'FI' },
  81: { name: 'Oscar Piastri', acronym: 'PIA', team: 'McLaren', country: 'AU' },
  87: { name: 'Oliver Bearman', acronym: 'BEA', team: 'Haas', country: 'GB' },
};

interface Session {
  session_key: number;
  session_type: string;
  date_start: string;
  meeting_key: number;
}

interface StandingDriver {
  pos: number;
  driver: string;
  acronym: string;
  team: string;
  country: string;
  wins: number;
  podiums: number;
  points: number;
}

interface StandingConstructor {
  pos: number;
  team: string;
  wins: number;
  podiums: number;
  points: number;
}

export default function StandingsClient() {
  const [activeTab, setActiveTab] = useState<'drivers' | 'constructors'>('drivers');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<StandingDriver[]>(FALLBACK_DRIVERS);
  const [constructors, setConstructors] = useState<StandingConstructor[]>(FALLBACK_CONSTRUCTORS);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    const fetchStandings = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Check cache first
        const cacheKey = 'standings_2026';
        const cacheTimeKey = 'standings_2026_time';
        const cached = localStorage.getItem(cacheKey);
        const cachedTime = localStorage.getItem(cacheTimeKey);
        const now = Date.now();
        
        if (cached && cachedTime && (now - parseInt(cachedTime)) < 5 * 60 * 1000) {
          const parsed = JSON.parse(cached);
          setDrivers(parsed.drivers);
          setConstructors(parsed.constructors);
          setLastUpdated(new Date(parseInt(cachedTime)).toLocaleString());
          setLoading(false);
          return;
        }

        // 1. Obtener todas las sesiones del año
        const sessionsRes = await fetch('https://api.openf1.org/v1/sessions?year=2026');
        if (!sessionsRes.ok) throw new Error('Failed to fetch sessions');
        const sessions: Session[] = await sessionsRes.json();
        
        // 2. Filtrar solo Race y Sprint que ya ocurrieron
        const nowDate = new Date();
        const raceSessions = sessions.filter((s: Session) => 
          (s.session_type === 'Race' || s.session_type === 'Sprint') &&
          new Date(s.date_start) < nowDate
        );

        if (raceSessions.length === 0) {
          // No races yet, use fallback
          setDrivers(FALLBACK_DRIVERS);
          setConstructors(FALLBACK_CONSTRUCTORS);
          setLoading(false);
          return;
        }

        // 3. Para cada sesión, obtener resultados finales
        const driverPoints: Record<number, { points: number; wins: number; podiums: number; bestFinish: number }> = {};
        const constructorPoints: Record<string, { points: number; wins: number; podiums: number }> = {};
        const fastestLaps: Record<number, number> = {}; // session_key -> driver_number

        for (const session of raceSessions) {
          // Obtener posiciones finales
          const positionsRes = await fetch(`https://api.openf1.org/v1/position?session_key=${session.session_key}`);
          if (!positionsRes.ok) continue;
          const positions = await positionsRes.json();
          
          // Obtener última posición de cada piloto
          const finalPositions: Record<number, { position: number; date: string }> = {};
          for (const p of positions) {
            const dn = p.driver_number;
            if (!finalPositions[dn] || p.date > finalPositions[dn].date) {
              finalPositions[dn] = { position: p.position, date: p.date };
            }
          }

          // Para fastest lap en carrera (no sprint): buscar en laps
          if (session.session_type === 'Race') {
            try {
              const lapsRes = await fetch(`https://api.openf1.org/v1/laps?session_key=${session.session_key}`);
              if (lapsRes.ok) {
                const laps = await lapsRes.json();
                let fastestLapTime = Infinity;
                let fastestDriver = 0;
                for (const lap of laps) {
                  if (lap.lap_duration && lap.lap_duration < fastestLapTime && lap.lap_duration > 0) {
                    fastestLapTime = lap.lap_duration;
                    fastestDriver = lap.driver_number;
                  }
                }
                if (fastestDriver) {
                  fastestLaps[session.session_key] = fastestDriver;
                }
              }
            } catch (e) {
              // Ignore fastest lap errors
            }
          }

          // Asignar puntos
          const pointsTable = session.session_type === 'Race' ? RACE_PTS : SPRINT_PTS;
          
          for (const [driverNum, data] of Object.entries(finalPositions)) {
            const dn = parseInt(driverNum);
            const position = data.position;
            const points = pointsTable[position] || 0;
            
            if (!driverPoints[dn]) {
              driverPoints[dn] = { points: 0, wins: 0, podiums: 0, bestFinish: 99 };
            }
            driverPoints[dn].points += points;
            if (position === 1) driverPoints[dn].wins++;
            if (position <= 3) driverPoints[dn].podiums++;
            if (position < driverPoints[dn].bestFinish) driverPoints[dn].bestFinish = position;

            // Constructor points
            const driverInfo = DRIVER_INFO[dn];
            if (driverInfo) {
              if (!constructorPoints[driverInfo.team]) {
                constructorPoints[driverInfo.team] = { points: 0, wins: 0, podiums: 0 };
              }
              constructorPoints[driverInfo.team].points += points;
              if (position === 1) constructorPoints[driverInfo.team].wins++;
              if (position <= 3) constructorPoints[driverInfo.team].podiums++;
            }
          }

          // Fastest lap point (solo en carreras, si está en top 10)
          if (session.session_type === 'Race' && fastestLaps[session.session_key]) {
            const flDriver = fastestLaps[session.session_key];
            const flPosition = finalPositions[flDriver]?.position;
            if (flPosition && flPosition <= 10) {
              driverPoints[flDriver].points += 1;
              const driverInfo = DRIVER_INFO[flDriver];
              if (driverInfo && constructorPoints[driverInfo.team]) {
                constructorPoints[driverInfo.team].points += 1;
              }
            }
          }
        }

        // Construir arrays de standings
        const driverStandings: StandingDriver[] = Object.entries(driverPoints)
          .map(([dn, data]) => {
            const info = DRIVER_INFO[parseInt(dn)] || { name: `Driver #${dn}`, acronym: `D${dn}`, team: 'Unknown', country: '??' };
            return {
              pos: 0, // Se asigna después de ordenar
              driver: info.name,
              acronym: info.acronym,
              team: info.team,
              country: info.country,
              wins: data.wins,
              podiums: data.podiums,
              points: data.points,
            };
          })
          .sort((a, b) => b.points - a.points || a.driver.localeCompare(b.driver))
          .map((d, i) => ({ ...d, pos: i + 1 }));

        const constructorStandings: StandingConstructor[] = Object.entries(constructorPoints)
          .map(([team, data]) => ({
            pos: 0,
            team,
            wins: data.wins,
            podiums: data.podiums,
            points: data.points,
          }))
          .sort((a, b) => b.points - a.points || a.team.localeCompare(b.team))
          .map((c, i) => ({ ...c, pos: i + 1 }));

        // Si tenemos datos, usarlos; si no, fallback
        if (driverStandings.length > 0) {
          setDrivers(driverStandings);
          setConstructors(constructorStandings);
          
          // Guardar en cache
          localStorage.setItem(cacheKey, JSON.stringify({
            drivers: driverStandings,
            constructors: constructorStandings
          }));
          localStorage.setItem(cacheTimeKey, now.toString());
          setLastUpdated(new Date(now).toLocaleString());
        } else {
          setDrivers(FALLBACK_DRIVERS);
          setConstructors(FALLBACK_CONSTRUCTORS);
        }
      } catch (err) {
        console.error('Error fetching standings:', err);
        setError('Failed to load live standings. Using cached data.');
        setDrivers(FALLBACK_DRIVERS);
        setConstructors(FALLBACK_CONSTRUCTORS);
      } finally {
        setLoading(false);
      }
    };

    fetchStandings();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white font-bold text-2xl">2026 Championships</h1>
          {lastUpdated && (
            <p className="text-[#7878A0] text-xs mt-1">Last updated: {lastUpdated}</p>
          )}
        </div>
        <div className="flex gap-1 bg-[#111] rounded-lg p-1">
          <button onClick={() => setActiveTab('drivers')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'drivers' ? 'bg-[#E10600] text-white' : 'text-gray-400 hover:text-white'}`}>Drivers</button>
          <button onClick={() => setActiveTab('constructors')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'constructors' ? 'bg-[#E10600] text-white' : 'text-gray-400 hover:text-white'}`}>Constructors</button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 border-2 border-[#E10600] border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-[#7878A0] text-sm">Loading standings...</p>
        </div>
      ) : error ? (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
          <p className="text-yellow-400 text-sm">⚠️ {error}</p>
        </div>
      ) : null}

      {activeTab === 'drivers' ? (
        <div className="f1-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1a1a1a] text-gray-500 text-[10px] uppercase tracking-wider">
                  <th className="py-4 px-4 text-left">Pos</th>
                  <th className="py-4 px-4 text-left">Driver</th>
                  <th className="py-4 px-4 text-left hidden sm:table-cell">Team</th>
                  <th className="py-4 px-4 text-center hidden md:table-cell">Wins</th>
                  <th className="py-4 px-4 text-center hidden md:table-cell">Podiums</th>
                  <th className="py-4 px-4 text-right">Points</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((d) => {
                  const teamColor = getTeamColor(d.team);
                  return (
                    <tr key={d.pos} className={`border-b border-[#1a1a1a]/50 hover:bg-white/[0.02] ${d.pos <= 3 ? 'bg-white/[0.02]' : ''}`}>
                      <td className="py-4 px-4">
                        <span className={`font-black text-lg ${d.pos === 1 ? 'text-[#FFD700]' : d.pos === 2 ? 'text-[#C0C0C0]' : d.pos === 3 ? 'text-[#CD7F32]' : 'text-gray-500'}`}>{d.pos}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{COUNTRY_FLAGS[d.country] || '🏁'}</span>
                          <span className="font-bold text-white">{d.driver}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 hidden sm:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-4 rounded-full" style={{ backgroundColor: teamColor }} />
                          <span className="text-gray-400 text-sm">{d.team.replace('Oracle Red Bull Racing', 'Red Bull').replace(' F1 Team', '')}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center text-gray-400 hidden md:table-cell">{d.wins}</td>
                      <td className="py-4 px-4 text-center text-gray-400 hidden md:table-cell">{d.podiums}</td>
                      <td className="py-4 px-4 text-right">
                        <span className="font-mono font-bold text-white text-lg">{d.points}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="f1-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1a1a1a] text-gray-500 text-[10px] uppercase tracking-wider">
                  <th className="py-4 px-4 text-left">Pos</th>
                  <th className="py-4 px-4 text-left">Team</th>
                  <th className="py-4 px-4 text-center hidden md:table-cell">Wins</th>
                  <th className="py-4 px-4 text-center hidden md:table-cell">Podiums</th>
                  <th className="py-4 px-4 text-right">Points</th>
                </tr>
              </thead>
              <tbody>
                {constructors.map((c) => {
                  const teamColor = getTeamColor(c.team);
                  return (
                    <tr key={c.pos} className={`border-b border-[#1a1a1a]/50 hover:bg-white/[0.02] ${c.pos <= 3 ? 'bg-white/[0.02]' : ''}`}>
                      <td className="py-4 px-4">
                        <span className={`font-black text-lg ${c.pos === 1 ? 'text-[#FFD700]' : c.pos === 2 ? 'text-[#C0C0C0]' : c.pos === 3 ? 'text-[#CD7F32]' : 'text-gray-500'}`}>{c.pos}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: teamColor }} />
                          <span className="font-bold text-white">{c.team.replace('Oracle Red Bull Racing', 'Red Bull').replace(' F1 Team', '')}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center text-gray-400 hidden md:table-cell">{c.wins}</td>
                      <td className="py-4 px-4 text-center text-gray-400 hidden md:table-cell">{c.podiums}</td>
                      <td className="py-4 px-4 text-right">
                        <span className="font-mono font-bold text-white text-lg">{c.points}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-center text-[10px] text-gray-700 mt-6">2026 Formula 1 World Championship • Data from OpenF1</p>
    </div>
  );
}
