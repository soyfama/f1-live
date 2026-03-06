import { NextRequest, NextResponse } from 'next/server';
import { formatLapTime } from '@/lib/openf1';

const OPENF1 = 'https://api.openf1.org/v1';

async function fetchF1<T>(endpoint: string, params: Record<string, string> = {}): Promise<T[]> {
  const url = new URL(`${OPENF1}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  try {
    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionKeyParam = searchParams.get('session_key') ?? 'latest';
  const driverParam = searchParams.get('driver') ?? '';
  const lapParam = searchParams.get('lap') ?? 'fastest';

  try {
    const sessions = await fetchF1<Record<string, unknown>>('/sessions', { session_key: sessionKeyParam });
    const session = sessions[0];
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    const sessionKey = String(session.session_key);
    const drivers = await fetchF1<Record<string, unknown>>('/drivers', { session_key: sessionKey });

    let driverObj = driverParam
      ? drivers.find(d =>
          String(d.name_acronym).toLowerCase() === driverParam.toLowerCase() ||
          String(d.driver_number) === driverParam
        )
      : drivers[0];
    if (!driverObj) driverObj = drivers[0];
    if (!driverObj) return NextResponse.json({ error: 'Driver not found' }, { status: 404 });

    const driverNum = String(driverObj.driver_number);

    // Get laps
    const laps = await fetchF1<Record<string, unknown>>('/laps', {
      session_key: sessionKey,
      driver_number: driverNum,
    });

    const validLaps = laps.filter(l => l.lap_duration && (l.lap_duration as number) > 60 && l.date_start);

    let targetLap: Record<string, unknown> | null = null;

    if (lapParam === 'fastest') {
      targetLap = validLaps.reduce((best: Record<string, unknown> | null, l) => {
        if (!best || (l.lap_duration as number) < (best.lap_duration as number)) return l;
        return best;
      }, null);
    } else {
      const lapNum = parseInt(lapParam);
      targetLap = validLaps.find(l => l.lap_number === lapNum) ?? null;
    }

    if (!targetLap || !targetLap.date_start) {
      return NextResponse.json({
        error: 'No lap data found',
        driver: driverObj.name_acronym,
        session: session.session_name,
        available_laps: validLaps.length,
      }, { status: 404 });
    }

    // Fetch car data for this lap
    const lapDur = (targetLap.lap_duration as number) ?? 120;
    const startTime = new Date(targetLap.date_start as string).toISOString();
    const endTime = new Date(new Date(targetLap.date_start as string).getTime() + (lapDur + 5) * 1000).toISOString();

    const carData = await fetchF1<Record<string, unknown>>('/car_data', {
      session_key: sessionKey,
      driver_number: driverNum,
      [`date>`]: startTime,
      [`date<`]: endTime,
    });

    // Process into clean format with estimated distance
    const totalPoints = carData.length;
    const estimatedLapLength = 5.3; // km (approximate average F1 circuit)

    const telemetryPoints = carData.map((p, i) => ({
      t: i,
      distance_km: parseFloat(((i / Math.max(totalPoints - 1, 1)) * estimatedLapLength).toFixed(3)),
      speed: p.speed ?? null,
      throttle: p.throttle ?? null,
      brake: p.brake ? 100 : 0,
      gear: p.n_gear ?? null,
      drs: p.drs ?? null,
      rpm: p.rpm ?? null,
      date: p.date,
    }));

    // Summary stats
    const speeds = telemetryPoints.map(p => p.speed).filter(Boolean) as number[];
    const throttleValues = telemetryPoints.map(p => p.throttle).filter(v => v !== null) as number[];
    const brakePoints = telemetryPoints.filter(p => (p.brake ?? 0) > 0).length;

    return NextResponse.json({
      driver: driverObj.name_acronym,
      full_name: driverObj.full_name,
      team: driverObj.team_name,
      session: {
        key: session.session_key,
        name: session.session_name,
        circuit: session.circuit_short_name,
      },
      lap: {
        number: targetLap.lap_number,
        duration_seconds: targetLap.lap_duration,
        duration_formatted: formatLapTime(targetLap.lap_duration as number),
        sector_1: targetLap.duration_sector_1 ? (targetLap.duration_sector_1 as number).toFixed(3) : '--',
        sector_2: targetLap.duration_sector_2 ? (targetLap.duration_sector_2 as number).toFixed(3) : '--',
        sector_3: targetLap.duration_sector_3 ? (targetLap.duration_sector_3 as number).toFixed(3) : '--',
        is_fastest: lapParam === 'fastest',
      },
      summary: {
        max_speed_kmh: speeds.length ? Math.max(...speeds) : null,
        avg_speed_kmh: speeds.length ? parseFloat((speeds.reduce((a, b) => a + b, 0) / speeds.length).toFixed(1)) : null,
        min_speed_kmh: speeds.length ? Math.min(...speeds) : null,
        avg_throttle_pct: throttleValues.length ? parseFloat((throttleValues.reduce((a, b) => a + b, 0) / throttleValues.length).toFixed(1)) : null,
        brake_applications: brakePoints,
        data_points: totalPoints,
      },
      telemetry: telemetryPoints,
      meta: {
        data_source: 'openf1.org',
        generated_at: new Date().toISOString(),
        note: 'Distance is estimated based on data point index, not GPS. Use for relative comparison only.',
      },
    }, {
      headers: {
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
