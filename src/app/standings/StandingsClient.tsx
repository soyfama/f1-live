'use client';

import { useState } from 'react';
import { getTeamColor } from '@/lib/f1-colors';

// 2026 Championship Standings - Sample Data (to be updated with real data)
const DRIVERS_2026 = [
  { pos: 1, driver: 'Max Verstappen', team: 'Red Bull Racing', country: 'NL', wins: 4, podiums: 8, points: 185 },
  { pos: 2, driver: 'Lando Norris', team: 'McLaren', country: 'GB', wins: 3, podiums: 7, points: 162 },
  { pos: 3, driver: 'Oscar Piastri', team: 'McLaren', country: 'AU', wins: 2, podiums: 6, points: 149 },
  { pos: 4, driver: 'Kimi Antonelli', team: 'Mercedes', country: 'IT', wins: 1, podiums: 4, points: 128 },
  { pos: 5, driver: 'George Russell', team: 'Mercedes', country: 'GB', wins: 0, podiums: 3, points: 115 },
  { pos: 6, driver: 'Charles Leclerc', team: 'Ferrari', country: 'MC', wins: 1, podiums: 4, points: 108 },
  { pos: 7, driver: 'Lewis Hamilton', team: 'Ferrari', country: 'GB', wins: 0, podiums: 2, points: 95 },
  { pos: 8, driver: 'Alexander Albon', team: 'Williams', country: 'TH', wins: 0, podiums: 1, points: 72 },
  { pos: 9, driver: 'Fernando Alonso', team: 'Aston Martin', country: 'ES', wins: 0, podiums: 1, points: 64 },
  { pos: 10, driver: 'Lance Stroll', team: 'Aston Martin', country: 'CA', wins: 0, podiums: 0, points: 48 },
  { pos: 11, driver: 'Yuki Tsunoda', team: 'Racing Bulls', country: 'JP', wins: 0, podiums: 0, points: 42 },
  { pos: 12, driver: 'Carlos Sainz', team: 'Williams', country: 'ES', wins: 0, podiums: 0, points: 38 },
  { pos: 13, driver: 'Pierre Gasly', team: 'Alpine', country: 'FR', wins: 0, podiums: 0, points: 35 },
  { pos: 14, driver: 'Nico Hülkenberg', team: 'Kick Sauber', country: 'DE', wins: 0, podiums: 0, points: 28 },
  { pos: 15, driver: 'Esteban Ocon', team: 'Alpine', country: 'FR', wins: 0, podiums: 0, points: 24 },
  { pos: 16, driver: 'Liam Lawson', team: 'Racing Bulls', country: 'NZ', wins: 0, podiums: 0, points: 18 },
  { pos: 17, driver: 'Gabriel Bortoleto', team: 'Kick Sauber', country: 'BR', wins: 0, podiums: 0, points: 12 },
  { pos: 18, driver: 'Oliver Bearman', team: 'Haas', country: 'GB', wins: 0, podiums: 0, points: 8 },
  { pos: 19, driver: 'Isack Hadjar', team: 'Haas', country: 'FR', wins: 0, podiums: 0, points: 4 },
  { pos: 20, driver: 'Jack Doohan', team: 'Alpine', country: 'AU', wins: 0, podiums: 0, points: 0 },
];

const CONSTRUCTORS_2026 = [
  { pos: 1, team: 'McLaren', wins: 5, podiums: 13, points: 311 },
  { pos: 2, team: 'Red Bull Racing', wins: 4, podiums: 9, points: 258 },
  { pos: 3, team: 'Mercedes', wins: 1, podiums: 7, points: 243 },
  { pos: 4, team: 'Ferrari', wins: 1, podiums: 6, points: 203 },
  { pos: 5, team: 'Williams', wins: 0, podiums: 1, points: 110 },
  { pos: 6, team: 'Aston Martin', wins: 0, podiums: 2, points: 112 },
  { pos: 7, team: 'Racing Bulls', wins: 0, podiums: 0, points: 60 },
  { pos: 8, team: 'Alpine', wins: 0, podiums: 0, points: 59 },
  { pos: 9, team: 'Kick Sauber', wins: 0, podiums: 0, points: 40 },
  { pos: 10, team: 'Haas', wins: 0, podiums: 0, points: 12 },
];

const COUNTRY_FLAGS: Record<string, string> = {
  'NL': '🇳🇱', 'GB': '🇬🇧', 'AU': '🇦🇺', 'IT': '🇮🇹', 'MC': '🇲🇨', 'TH': '🇹🇭',
  'ES': '🇪🇸', 'CA': '🇨🇦', 'JP': '🇯🇵', 'FR': '🇫🇷', 'DE': '🇩🇪', 'NZ': '🇳🇿', 'BR': '🇧🇷',
};

export default function StandingsClient() {
  const [activeTab, setActiveTab] = useState<'drivers' | 'constructors'>('drivers');

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-white font-bold text-2xl">2026 Championships</h1>
        <div className="flex gap-1 bg-[#111] rounded-lg p-1">
          <button onClick={() => setActiveTab('drivers')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'drivers' ? 'bg-[#E10600] text-white' : 'text-gray-400 hover:text-white'}`}>Drivers</button>
          <button onClick={() => setActiveTab('constructors')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'constructors' ? 'bg-[#E10600] text-white' : 'text-gray-400 hover:text-white'}`}>Constructors</button>
        </div>
      </div>

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
                {DRIVERS_2026.map((d) => {
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
                {CONSTRUCTORS_2026.map((c) => {
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

      <p className="text-center text-[10px] text-gray-700 mt-6">2026 Formula 1 World Championship • Sample Data</p>
    </div>
  );
}
