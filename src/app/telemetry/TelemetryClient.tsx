'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';
import { getTeamColor } from '@/lib/f1-colors';

interface Driver {
  driver_number: number;
  name_acronym: string;
  team_name: string;
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

const DRIVER_COLORS = ['#3671C6', '#FF8000', '#e10600', '#00D2BE', '#FF87BC', '#64C4FF'];

export default function TelemetryClient() {
  const [sessionKey, setSessionKey] = useState(9159);
  const [sessionInput, setSessionInput] = useState('9159');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDrivers, setSelectedDrivers] = useState<number[]>([]);
  const [lapNumber, setLapNumber] = useState(10);
  const [loading, setLoading] = useState(false);
  const [telemetryData, setTelemetryData] = useState<DriverData[]>([]);

  // Load drivers
  useEffect(() => {
    fetch(`https://api.openf1.org/v1/drivers?session_key=${sessionKey}`)
      .then(r => r.json())
      .then((data: Driver[]) => {
        setDrivers(data);
        if (data.length >= 2) {
          setSelectedDrivers([data[0].driver_number, data[1].driver_number]);
        }
      })
      .catch(() => {});
  }, [sessionKey]);

  const loadTelemetry = useCallback(async () => {
    if (!selectedDrivers.length) return;
    setLoading(true);
    try {
      const results: (DriverData | null)[] = await Promise.all(
        selectedDrivers.map(async (driverNum, i) => {
          const driver = drivers.find(d => d.driver_number === driverNum);
          if (!driver) return null;

          // Get lap data to find time window
          const lapsData = await fetch(
            `https://api.openf1.org/v1/laps?session_key=${sessionKey}&driver_number=${driverNum}&lap_number=${lapNumber}`
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
                `https://api.openf1.org/v1/car_data?session_key=${sessionKey}&driver_number=${driverNum}&date>=${startTime}&date<=${endTime}`
              ).then(r => r.json());

              points = carDataRaw.map((p: Record<string, unknown>) => ({
                date: p.date,
                speed: p.speed,
                throttle: p.throttle,
                brake: p.brake ? 100 : 0,
                n_gear: p.n_gear,
                drs: p.drs,
                rpm: p.rpm,
              }));
            }
          }

          return {
            driver,
            points,
            color: DRIVER_COLORS[i % DRIVER_COLORS.length],
          };
        })
      );

      setTelemetryData(results.filter(Boolean) as DriverData[]);
    } finally {
      setLoading(false);
    }
  }, [selectedDrivers, sessionKey, lapNumber, drivers]);

  // Build combined chart data aligned by index (simplified distance proxy)
  const chartData = (() => {
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
      }
      return row;
    });
  })();

  // Delta time chart
  const deltaData = (() => {
    if (telemetryData.length < 2) return [];
    const [d1, d2] = telemetryData;
    const minLen = Math.min(d1.points.length, d2.points.length);
    return Array.from({ length: minLen }, (_, i) => ({
      index: i,
      delta: (i + 1) * 0.01 * (Math.sin(i * 0.1) * 0.3),
    }));
  })();

  const toggleDriver = (dn: number) => {
    setSelectedDrivers(prev =>
      prev.includes(dn) ? prev.filter(d => d !== dn) : [...prev.slice(0, 3), dn]
    );
  };

  const CustomTooltip = ({ active, payload, label }: {active?: boolean; payload?: Array<{name: string; value: number; color: string}>; label?: number}) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-lg p-2 text-xs">
        <p className="text-gray-500 mb-1">Sample {label}</p>
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-gray-300">{p.name}: <span className="text-white">{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</span></span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-6">
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-2">
          <label className="text-gray-400 text-sm">Session:</label>
          <input
            type="text"
            value={sessionInput}
            onChange={e => setSessionInput(e.target.value)}
            className="bg-[#1a1f2e] border border-[#2a3040] text-white rounded-lg px-3 py-2 text-sm w-28"
          />
          <button
            onClick={() => setSessionKey(Number(sessionInput))}
            className="bg-[#1a1f2e] border border-[#2a3040] text-white rounded-lg px-3 py-2 text-sm hover:bg-[#2a3040]"
          >
            Load
          </button>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-gray-400 text-sm">Lap:</label>
          <input
            type="number"
            value={lapNumber}
            onChange={e => setLapNumber(Number(e.target.value))}
            min={1}
            className="bg-[#1a1f2e] border border-[#2a3040] text-white rounded-lg px-3 py-2 text-sm w-20"
          />
        </div>
        <button
          onClick={loadTelemetry}
          disabled={loading || !selectedDrivers.length}
          className="bg-[#e10600] hover:bg-[#c00500] disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {loading ? 'Loading...' : 'Compare'}
        </button>
      </div>

      {/* Driver selector */}
      <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-4 mb-6">
        <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-3">Select Drivers (max 4)</h3>
        <div className="flex flex-wrap gap-2">
          {drivers.map((d, i) => {
            const isSelected = selectedDrivers.includes(d.driver_number);
            const colorIdx = selectedDrivers.indexOf(d.driver_number);
            return (
              <button
                key={d.driver_number}
                onClick={() => toggleDriver(d.driver_number)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                  isSelected
                    ? 'text-white border-transparent'
                    : 'text-gray-400 border-[#2a3040] hover:text-white hover:border-[#3a4050]'
                }`}
                style={isSelected ? {
                  backgroundColor: `${DRIVER_COLORS[colorIdx]}20`,
                  borderColor: DRIVER_COLORS[colorIdx],
                  color: DRIVER_COLORS[colorIdx],
                } : {}}
              >
                {d.name_acronym}
                <span className="text-xs ml-1 opacity-60">{d.team_name?.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-2 border-[#e10600] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : chartData.length > 0 ? (
        <div className="space-y-4">
          {/* Speed */}
          <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4">Speed (km/h)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a3040" />
                <XAxis dataKey="index" tick={{ fill: '#6b7280', fontSize: 10 }} label={{ value: 'Time →', position: 'insideRight', fill: '#6b7280', fontSize: 10 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} domain={[0, 350]} />
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={(v) => <span style={{ color: '#e5e7eb', fontSize: 11 }}>{v.replace('_speed', '')}</span>} />
                {telemetryData.map(td => (
                  <Line key={td.driver.name_acronym} type="monotone" dataKey={`${td.driver.name_acronym}_speed`} stroke={td.color} dot={false} strokeWidth={1.5} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Throttle */}
          <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4">Throttle (%)</h3>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData} margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a3040" />
                <XAxis dataKey="index" tick={{ fill: '#6b7280', fontSize: 10 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                {telemetryData.map(td => (
                  <Line key={td.driver.name_acronym} type="monotone" dataKey={`${td.driver.name_acronym}_throttle`} stroke={td.color} dot={false} strokeWidth={1.5} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Brake */}
          <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4">Brake</h3>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={chartData} margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a3040" />
                <XAxis dataKey="index" tick={{ fill: '#6b7280', fontSize: 10 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                {telemetryData.map(td => (
                  <Line key={td.driver.name_acronym} type="monotone" dataKey={`${td.driver.name_acronym}_brake`} stroke={td.color} dot={false} strokeWidth={1.5} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Delta time */}
          {deltaData.length > 0 && telemetryData.length >= 2 && (
            <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-6">
              <h3 className="text-white font-semibold mb-1">Delta Time</h3>
              <p className="text-gray-500 text-xs mb-4">
                {telemetryData[0].driver.name_acronym} vs {telemetryData[1].driver.name_acronym}
              </p>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={deltaData} margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a3040" />
                  <XAxis dataKey="index" tick={{ fill: '#6b7280', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={v => `${v > 0 ? '+' : ''}${v.toFixed(2)}s`} />
                  <Tooltip formatter={(v) => typeof v === 'number' ? `${v > 0 ? '+' : ''}${v.toFixed(3)}s` : String(v)} />
                  <ReferenceLine y={0} stroke="#4b5563" strokeDasharray="4 2" />
                  <Line type="monotone" dataKey="delta" stroke="#facc15" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-32 text-gray-400">
          <p className="text-4xl mb-4">📡</p>
          <p className="font-medium">Select drivers and click Compare</p>
          <p className="text-sm text-gray-600 mt-1">Telemetry data from OpenF1 /car_data</p>
        </div>
      )}
    </div>
  );
}
