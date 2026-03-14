'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getTeamColor } from '@/lib/f1-colors';

const FEATURES = [
  { href: '/live',      icon: '●', color: '#E10600', title: 'Live Timing',   desc: 'Real-time positions, gaps, sectors & tyre data' },
  { href: '/analytics', icon: '◈', color: '#3671C6', title: 'Analytics',     desc: 'Performance metrics, sectors & speed trap' },
  { href: '/strategy',  icon: '◎', color: '#FF8000', title: 'Strategy',      desc: 'Pit stop optimization & race simulation' },
  { href: '/telemetry', icon: '◐', color: '#00D2BE', title: 'Telemetry',     desc: 'Lap-by-lap speed & throttle comparison' },
  { href: '/standings', icon: '◧', color: '#FFD700', title: 'Standings',     desc: 'Driver & Constructor Championships' },
  { href: '/calendar',  icon: '◷', color: '#BF00FF', title: 'Calendar',      desc: 'Full 2026 season schedule & countdowns' },
];

interface LiveSession {
  key: number;
  name: string;
  type: string;
  status: string;
  circuit: string;
  country: string;
  year: number;
}

interface LiveDriver {
  pos: number;
  driver: string;
  full_name: string;
  team: string;
  gap: string;
  best_lap: string;
  tyre: string;
}

interface NextRace {
  name: string;
  circuit: string;
  country: string;
  date: string;
  countdown: string;
}

export default function Home() {
  const [liveData, setLiveData] = useState<{ session: LiveSession | null; drivers: LiveDriver[] } | null>(null);
  const [nextRace, setNextRace] = useState<NextRace | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const fetchLiveData = async () => {
      try {
        const res = await fetch('/api/agent/live', { cache: 'no-store' });
        const data = await res.json();
        if (data.session) {
          setLiveData({ session: data.session, drivers: data.drivers?.slice(0, 5) || [] });
        }
      } catch (e) {
        console.error('Failed to fetch live data:', e);
      }
    };

    const fetchCalendar = async () => {
      try {
        const res = await fetch('/api/agent/calendar', { cache: 'no-store' });
        const data = await res.json();
        if (data.next_session) {
          setNextRace({
            name: data.next_session.name,
            circuit: data.next_session.circuit,
            country: data.next_session.country,
            date: data.next_session.date,
            countdown: data.next_session.countdown,
          });
        }
      } catch (e) {
        console.error('Failed to fetch calendar:', e);
      }
      setLoading(false);
    };

    fetchLiveData();
    fetchCalendar();

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatSessionType = (type: string) => {
    const types: Record<string, string> = {
      'Race': 'RACE',
      'Qualifying': 'QUALIFYING',
      'Practice': 'PRACTICE',
      'Practice 1': 'FP1',
      'Practice 2': 'FP2',
      'Practice 3': 'FP3',
      'Sprint': 'SPRINT',
      'Sprint Qualifying': 'SQ',
    };
    return types[type] || type?.toUpperCase();
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      {/* Hero Section */}
      <div className="hero-gradient relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 lg:py-16">
          {/* Main Hero */}
          <div className="text-center mb-8 md:mb-12">
            <div className="inline-flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
              <span className="text-[#E10600] font-black text-4xl sm:text-5xl md:text-6xl lg:text-7xl tracking-tighter">F1</span>
              <span className="text-white font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl tracking-tighter">Live</span>
              <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-[#E10600] animate-pulse-dot ml-1 md:ml-2 mt-1 md:mt-2" />
            </div>
            <p className="text-base md:text-lg text-gray-300 max-w-2xl mx-auto px-4">
              Real-time Formula 1 data, analytics & strategy tools powered by OpenF1 API
            </p>
            <div className="flex items-center justify-center gap-2 mt-3 text-xs text-gray-500">
              <span className="mono">{currentTime.toLocaleTimeString('en-US', { hour12: false })} UTC</span>
              <span>•</span>
              <span>2026 Season</span>
            </div>
          </div>

          {/* Live Banner */}
          {loading ? (
            <div className="f1-card p-4 md:p-6 mb-6 md:mb-8 animate-pulse">
              <div className="h-20 md:h-24 bg-white/5 rounded-lg skeleton-shimmer" />
            </div>
          ) : liveData?.session ? (
            <Link href="/live" className="block group">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#111] via-[#151515] to-[#111] border border-[#E10600]/30 hover:border-[#E10600]/60 transition-all duration-300 shadow-[0_0_60px_rgba(225,6,0,0.15)] group-hover:shadow-[0_0_80px_rgba(225,6,0,0.25)]">
                {/* Live indicator bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#E10600] to-transparent animate-pulse" />
                
                <div className="p-4 sm:p-6 md:p-8">
                  {/* Session Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 md:mb-6">
                    <div className="flex flex-wrap items-center gap-3 md:gap-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-[#E10600] animate-pulse-dot" />
                        <span className="text-[#E10600] font-bold text-sm tracking-widest uppercase">Live Now</span>
                      </div>
                      <div className="w-px h-4 bg-white/10 hidden sm:block" />
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-white font-bold text-base md:text-lg">{liveData.session.year} {liveData.session.country} GP</span>
                        <span className="text-gray-400 text-sm">• {liveData.session.circuit}</span>
                      </div>
                    </div>
                    <span className="text-xl md:text-2xl font-black text-white/10 uppercase tracking-widest">
                      {formatSessionType(liveData.session.type)}
                    </span>
                  </div>

                  {/* Top 5 - Scrollable on mobile */}
                  <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                    <div className="grid grid-cols-5 gap-2 md:gap-4 min-w-[400px] sm:min-w-0">
                      {liveData.drivers.map((driver, idx) => {
                        const teamColor = getTeamColor(driver.team);
                        return (
                          <div 
                            key={driver.driver}
                            className={`relative rounded-xl p-3 md:p-4 transition-all duration-200 hover:scale-105 ${
                              idx === 0 ? 'podium-1' : 
                              idx === 1 ? 'podium-2' : 
                              idx === 2 ? 'podium-3' : 
                              'bg-white/[0.02] border border-white/5'
                            }`}
                          >
                            <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ backgroundColor: teamColor }} />
                            <div className="text-center">
                              <div className={`font-black text-2xl md:text-3xl lg:text-4xl mb-1 ${
                                idx === 0 ? 'text-[#FFD700]' : 
                                idx === 1 ? 'text-[#C0C0C0]' : 
                                idx === 2 ? 'text-[#CD7F32]' : 
                                'text-gray-500'
                              }`}>
                                {driver.pos}
                              </div>
                              <div className="font-bold text-white text-sm md:text-base lg:text-lg">{driver.driver}</div>
                              <div className="text-[10px] md:text-xs text-gray-400 uppercase tracking-wider truncate">{driver.team?.split(' ')[0]}</div>
                              <div className="mt-1 md:mt-2 text-[10px] md:text-xs mono">
                                {driver.gap === 'leader' ? (
                                  <span className="text-[#FFD700]">LEADER</span>
                                ) : (
                                  <span className="text-gray-400">{driver.gap}</span>
                                )}
                              </div>
                              {driver.best_lap && driver.best_lap !== '--' && (
                                <div className="mt-1 text-[9px] md:text-[10px] mono text-[#BF00FF]">{driver.best_lap}</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ) : nextRace ? (
            <div className="f1-card p-4 sm:p-6 md:p-8 mb-6 md:mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-400 uppercase tracking-widest">Next Race</span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-white mb-1">{nextRace.name}</h2>
                  <p className="text-gray-300 text-sm md:text-base">{nextRace.circuit} • {nextRace.country}</p>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-3xl md:text-4xl lg:text-5xl font-black text-[#E10600] mono tracking-tight">
                    {nextRace.countdown}
                  </div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mt-1">Until Race Start</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Features Grid - Centrado y con padding correcto */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Grid principal: 3 columnas en desktop, 2 en tablet, 1 en mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.slice(0, 3).map((feature) => (
            <Link
              key={feature.href}
              href={feature.href}
              className="group f1-card p-4 md:p-5 hover:border-[#E10600]/30 transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-3 md:mb-4">
                <span className="text-xl md:text-2xl font-bold" style={{ color: feature.color }}>{feature.icon}</span>
                <span className="text-[10px] text-gray-400 uppercase tracking-wider group-hover:text-[#E10600] transition-colors">
                  View →
                </span>
              </div>
              <h3 className="text-white font-semibold text-base md:text-lg mb-1.5 group-hover:text-[#E10600] transition-colors">
                {feature.title}
              </h3>
              <p className="text-gray-300 text-sm leading-relaxed">{feature.desc}</p>
            </Link>
          ))}
        </div>
        
        {/* Segunda fila: 2 cards centradas en desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 lg:max-w-2xl lg:mx-auto">
          {FEATURES.slice(3).map((feature) => (
            <Link
              key={feature.href}
              href={feature.href}
              className="group f1-card p-4 md:p-5 hover:border-[#E10600]/30 transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-3 md:mb-4">
                <span className="text-xl md:text-2xl font-bold" style={{ color: feature.color }}>{feature.icon}</span>
                <span className="text-[10px] text-gray-400 uppercase tracking-wider group-hover:text-[#E10600] transition-colors">
                  View →
                </span>
              </div>
              <h3 className="text-white font-semibold text-base md:text-lg mb-1.5 group-hover:text-[#E10600] transition-colors">
                {feature.title}
              </h3>
              <p className="text-gray-300 text-sm leading-relaxed">{feature.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="border-t border-white/5 pt-6 text-center">
          <p className="text-xs text-gray-400">
            Data provided by{' '}
            <a href="https://openf1.org" target="_blank" rel="noopener" className="text-gray-300 hover:text-white transition-colors underline">
              OpenF1
            </a>
            {' '}— Not affiliated with Formula 1
          </p>
        </div>
      </div>
    </div>
  );
}
