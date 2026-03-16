'use client';

import { useEffect, useState } from 'react';
import { Trophy, Zap, AlertCircle, RefreshCw } from 'lucide-react';
import type { DriverFantasyPoints } from '@/lib/fantasy-types';

function getTotalColor(total: number): string {
  if (total > 40) return 'text-[#00FF44] font-bold';
  if (total >= 25) return 'text-[#00FF44]';
  if (total >= 10) return 'text-[#FFE600]';
  return 'text-[#FF3333]';
}

function getTeamBadgeColor(teamName: string): string {
  const colors: Record<string, string> = {
    'McLaren': 'bg-[#F47600]',
    'Red Bull Racing': 'bg-[#4781D7]',
    'Audi': 'bg-[#F50537]',
    'Alpine': 'bg-[#00A1E8]',
    'Cadillac': 'bg-[#909090]',
    'Mercedes': 'bg-[#00D7B6]',
    'Aston Martin': 'bg-[#229971]',
    'Ferrari': 'bg-[#ED1131]',
    'Williams': 'bg-[#1868DB]',
    'Racing Bulls': 'bg-[#6C98FF]',
    'Haas': 'bg-[#9C9FA2]',
    'Haas F1 Team': 'bg-[#9C9FA2]',
    'Kick Sauber': 'bg-[#52E252]',
  };
  return colors[teamName] || 'bg-[#666666]';
}

export default function FantasyLivePage() {
  const [points, setPoints] = useState<DriverFantasyPoints[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchPoints = async () => {
    try {
      const response = await fetch('/api/fantasy/points?session_key=latest');
      if (!response.ok) {
        throw new Error('Failed to fetch points');
      }
      const data = await response.json();
      setPoints(data.data || []);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError('No data available for the latest session');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPoints();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchPoints, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Trophy className="text-[#E8002D]" size={24} />
            Live Fantasy Points
          </h1>
          <p className="text-sm text-[#7878A0] mt-1">
            Real-time scoring based on latest race session
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="text-xs text-[#7878A0]">
              Updated: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchPoints}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#1C1C2E] text-white rounded-lg text-sm font-medium hover:bg-[#2C2C3E] transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Status Banner */}
      {error && (
        <div className="f1-card mb-6 border-l-4 border-l-[#FFE600]">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-[#FFE600]" size={20} />
            <div>
              <p className="text-white font-medium">{error}</p>
              <p className="text-sm text-[#7878A0]">
                Showing data from the most recent available session
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="f1-card">
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <RefreshCw size={20} className="animate-spin text-[#E8002D]" />
              <span className="text-[#7878A0]">Loading fantasy points...</span>
            </div>
          </div>
        </div>
      )}

      {/* Points Table */}
      {!loading && points.length > 0 && (
        <div className="overflow-x-auto">
          <table className="premium-table">
            <thead>
              <tr>
                <th className="text-center w-12">POS</th>
                <th>DRIVER</th>
                <th className="text-right">PRICE</th>
                <th className="text-center">QUAL</th>
                <th className="text-center">RACE</th>
                <th className="text-center">+/-</th>
                <th className="text-center">FL</th>
                <th className="text-center">PITS</th>
                <th className="text-center">BEAT</th>
                <th className="text-right">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {points.map((driver, index) => (
                <tr 
                  key={driver.driverNumber}
                  className={driver.isDNF ? 'bg-[rgba(255,51,51,0.08)]' : ''}
                >
                  <td className="text-center">
                    <span className={`font-bold ${
                      index === 0 ? 'text-[#FFD700]' :
                      index === 1 ? 'text-[#C0C0C0]' :
                      index === 2 ? 'text-[#CD7F32]' :
                      'text-[#7878A0]'
                    }`}>
                      {index + 1}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className={`w-1 h-8 rounded-full ${getTeamBadgeColor(driver.team)}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{driver.acronym}</span>
                          {driver.fastestLap && (
                            <span className="text-[#BF00FF]" title="Fastest Lap">⚡</span>
                          )}
                          {driver.isDNF && (
                            <span className="text-[#FF3333]" title={`DNF - ${driver.dnfType}`}>💥</span>
                          )}
                        </div>
                        <div className="text-xs text-[#7878A0]">{driver.team}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-right text-[#7878A0]">
                    ${driver.price.toFixed(1)}M
                  </td>
                  <td className="text-center">
                    <span className={driver.qualifyingPoints > 0 ? 'text-[#00FF44]' : driver.qualifyingPoints < 0 ? 'text-[#FF3333]' : 'text-[#7878A0]'}>
                      {driver.qualifyingPoints > 0 ? '+' : ''}{driver.qualifyingPoints || 0}
                    </span>
                  </td>
                  <td className="text-center">
                    <span className={driver.racePoints > 0 ? 'text-white font-medium' : 'text-[#7878A0]'}>
                      {driver.racePoints || 0}
                    </span>
                  </td>
                  <td className="text-center">
                    <span className={
                      (driver.positionBonus || 0) > 0 ? 'text-[#00FF44]' :
                      (driver.positionBonus || 0) < 0 ? 'text-[#FF3333]' :
                      'text-[#7878A0]'
                    }>
                      {(driver.positionBonus || 0) > 0 ? '+' : ''}{driver.positionBonus || 0}
                    </span>
                  </td>
                  <td className="text-center">
                    <span className={driver.fastestLapBonus > 0 ? 'text-[#BF00FF]' : 'text-[#7878A0]'}>
                      {driver.fastestLapBonus > 0 ? `+${driver.fastestLapBonus}` : 0}
                    </span>
                  </td>
                  <td className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <RefreshCw size={12} className="text-[#7878A0]" />
                      <span className={driver.pitPenalty < 0 ? 'text-[#FF3333]' : 'text-[#7878A0]'}>
                        {driver.pitStops}
                      </span>
                      {driver.pitPenalty < 0 && (
                        <span className="text-[#FF3333] text-xs">({driver.pitPenalty})</span>
                      )}
                    </div>
                  </td>
                  <td className="text-center">
                    <span className={driver.teammateBeatBonus > 0 ? 'text-[#00FF44]' : 'text-[#7878A0]'}>
                      {driver.teammateBeatBonus > 0 ? `+${driver.teammateBeatBonus}` : 0}
                    </span>
                  </td>
                  <td className="text-right">
                    <span className={`text-lg ${getTotalColor(driver.total)}`}>
                      {driver.total} pts
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!loading && points.length === 0 && (
        <div className="f1-card">
          <div className="empty-state">
            <Trophy size={48} className="text-[#4A4A6A]" />
            <h3 className="text-lg font-medium text-white">No data available</h3>
            <p className="text-sm text-[#7878A0]">
              Fantasy points will appear here when a race session is active.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
