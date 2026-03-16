'use client';

import { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown, Minus, Flame, Info } from 'lucide-react';
import type { DriverPrice, TrendType } from '@/lib/fantasy-types';

interface ConstructorPrice {
  id: string;
  name: string;
  price: number;
  history: number[];
  priceChange: number;
}

type FilterType = 'all' | 'rising' | 'falling' | 'under15';

interface DriverWithTrend extends DriverPrice {
  change: number;
  changePercent: number;
  trend: TrendType;
}

function getTrendIcon(trend: TrendType) {
  switch (trend) {
    case 'rising':
      return <ArrowUp size={14} className="text-[#00FF44]" />;
    case 'falling':
      return <ArrowDown size={14} className="text-[#FF3333]" />;
    case 'hotpick':
      return <Flame size={14} className="text-[#FF8C00]" />;
    default:
      return <Minus size={14} className="text-[#7878A0]" />;
  }
}

function getTrendLabel(trend: TrendType): string {
  switch (trend) {
    case 'rising':
      return '🚀 RISING';
    case 'falling':
      return '📉 FALLING';
    case 'hotpick':
      return '🔥 HOTPICK';
    default:
      return '➡ STABLE';
  }
}

function getTrendColor(trend: TrendType): string {
  switch (trend) {
    case 'rising':
      return 'text-[#00FF44] bg-[rgba(0,255,68,0.1)]';
    case 'falling':
      return 'text-[#FF3333] bg-[rgba(255,51,51,0.1)]';
    case 'hotpick':
      return 'text-[#FF8C00] bg-[rgba(255,140,0,0.1)]';
    default:
      return 'text-[#7878A0] bg-[rgba(120,120,160,0.1)]';
  }
}

// Simple SVG sparkline
function Sparkline({ data }: { data: number[] }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 60;
    const y = 20 - ((value - min) / range) * 20;
    return `${x},${y}`;
  }).join(' ');
  
  const isRising = data[data.length - 1] > data[0];
  const strokeColor = isRising ? '#00FF44' : '#FF3333';
  
  return (
    <svg width="60" height="24" viewBox="0 0 60 24" className="overflow-visible">
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        points={points}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="60" cy={20 - ((data[data.length - 1] - min) / range) * 20} r="2" fill={strokeColor} />
    </svg>
  );
}

export default function FantasyPricesPage() {
  const [drivers, setDrivers] = useState<DriverWithTrend[]>([]);
  const [constructors, setConstructors] = useState<ConstructorPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [lastUpdated, setLastUpdated] = useState<string>('2026-03-16');
  const [stats, setStats] = useState({
    averagePrice: 0,
    highestRiser: null as { driver: string; change: number } | null,
    biggestFaller: null as { driver: string; change: number } | null,
  });

  useEffect(() => {
    fetchPrices();
  }, []);

  const fetchPrices = async () => {
    try {
      const [driversRes, constructorsRes] = await Promise.all([
        fetch('/api/fantasy/prices'),
        fetch('/api/fantasy/prices?type=constructors'),
      ]);
      
      const driversData = await driversRes.json();
      const constructorsData = await constructorsRes.json();
      
      setDrivers(driversData.data || []);
      setConstructors(constructorsData.data || []);
      setStats(driversData.stats || { averagePrice: 0, highestRiser: null, biggestFaller: null });
      setLastUpdated(driversData.lastUpdated || '2026-03-16');
      setLoading(false);
    } catch (error) {
      console.error('Error fetching prices:', error);
      setLoading(false);
    }
  };

  const filteredDrivers = drivers.filter(driver => {
    switch (filter) {
      case 'rising':
        return driver.trend === 'rising' || driver.trend === 'hotpick';
      case 'falling':
        return driver.trend === 'falling';
      case 'under15':
        return driver.price < 15;
      default:
        return true;
    }
  });

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Info Banner */}
      <div className="f1-card mb-6 border-l-4 border-l-[#00D7B6]">
        <div className="flex items-start gap-3">
          <Info className="text-[#00D7B6] shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-[#EEEEF5] text-sm">
              Los precios se actualizan los lunes post-carrera según el rendimiento en el juego oficial F1 Fantasy.
            </p>
            <p className="text-[#7878A0] text-xs mt-1">
              Fuente: fantasy.formula1.com | Última actualización: {lastUpdated}
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            Price Tracker
          </h1>
          <p className="text-sm text-[#7878A0] mt-1">
            Monitor driver prices and market trends
          </p>
        </div>
      </div>

      {/* Stats Header */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="f1-card">
            <div className="text-xs text-[#7878A0] uppercase tracking-wider mb-1">Average Price</div>
            <div className="text-2xl font-bold text-white">${stats.averagePrice.toFixed(1)}M</div>
          </div>
          
          {stats.highestRiser && (
            <div className="f1-card border-l-4 border-l-[#00FF44]">
              <div className="text-xs text-[#7878A0] uppercase tracking-wider mb-1">🔥 Biggest Riser</div>
              <div className="text-lg font-bold text-white">{stats.highestRiser.driver}</div>
              <div className="text-sm text-[#00FF44]">+${stats.highestRiser.change.toFixed(1)}M</div>
            </div>
          )}
          
          {stats.biggestFaller && (
            <div className="f1-card border-l-4 border-l-[#FF3333]">
              <div className="text-xs text-[#7878A0] uppercase tracking-wider mb-1">📉 Biggest Faller</div>
              <div className="text-lg font-bold text-white">{stats.biggestFaller.driver}</div>
              <div className="text-sm text-[#FF3333]">${stats.biggestFaller.change.toFixed(1)}M</div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(['all', 'rising', 'falling', 'under15'] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-[#E8002D] text-white'
                : 'bg-[#1C1C2E] text-[#7878A0] hover:text-white hover:bg-[#2C2C3E]'
            }`}
          >
            {f === 'all' && 'All Drivers'}
            {f === 'rising' && 'Rising'}
            {f === 'falling' && 'Falling'}
            {f === 'under15' && 'Under $15M'}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="f1-card">
          <div className="flex items-center justify-center py-12">
            <div className="skeleton w-full h-64" />
          </div>
        </div>
      )}

      {/* Drivers Table */}
      {!loading && (
        <div className="overflow-x-auto mb-8">
          <h2 className="text-lg font-bold text-white mb-4">Drivers</h2>
          <table className="premium-table">
            <thead>
              <tr>
                <th>DRIVER</th>
                <th>TEAM</th>
                <th className="text-right">PRICE</th>
                <th className="text-right">CHANGE</th>
                <th>SPARKLINE (5W)</th>
                <th>TREND</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.map((driver) => (
                <tr key={driver.number}>
                  <td>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-white w-8">{driver.acronym}</span>
                      <span className="text-[#EEEEF5]">{driver.name}</span>
                    </div>
                  </td>
                  <td className="text-[#7878A0]">{driver.team}</td>
                  <td className="text-right">
                    <span className="font-bold text-white">${driver.price.toFixed(1)}M</span>
                  </td>
                  <td className="text-right">
                    <span className={driver.change > 0 ? 'text-[#00FF44]' : driver.change < 0 ? 'text-[#FF3333]' : 'text-[#7878A0]'}>
                      {driver.change > 0 ? '+' : ''}{driver.change.toFixed(1)}M
                    </span>
                  </td>
                  <td>
                    <Sparkline data={driver.history} />
                  </td>
                  <td>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${getTrendColor(driver.trend)}`}>
                      {getTrendIcon(driver.trend)}
                      {getTrendLabel(driver.trend)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Constructors Table */}
      {!loading && constructors.length > 0 && (
        <div className="overflow-x-auto">
          <h2 className="text-lg font-bold text-white mb-4">Constructors</h2>
          <table className="premium-table">
            <thead>
              <tr>
                <th>CONSTRUCTOR</th>
                <th className="text-right">PRICE</th>
                <th className="text-right">CHANGE</th>
                <th>SPARKLINE (5W)</th>
              </tr>
            </thead>
            <tbody>
              {constructors.map((constructor) => (
                <tr key={constructor.id}>
                  <td>
                    <span className="font-bold text-white">{constructor.name}</span>
                  </td>
                  <td className="text-right">
                    <span className="font-bold text-white">${constructor.price.toFixed(1)}M</span>
                  </td>
                  <td className="text-right">
                    <span className={constructor.priceChange > 0 ? 'text-[#00FF44]' : constructor.priceChange < 0 ? 'text-[#FF3333]' : 'text-[#7878A0]'}>
                      {constructor.priceChange > 0 ? '+' : ''}{constructor.priceChange.toFixed(1)}M
                    </span>
                  </td>
                  <td>
                    <Sparkline data={constructor.history} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
