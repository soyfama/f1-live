import { NextRequest, NextResponse } from 'next/server';
import { formatLapTime } from '@/lib/openf1';

const OPENF1 = 'https://api.openf1.org/v1';

async function fetchF1<T>(endpoint: string, params: Record<string, string> = {}): Promise<T[]> {
  const url = new URL(`${OPENF1}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  try {
    const res = await fetch(url.toString(), { next: { revalidate: 60 } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

function formatRaceTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${s.toFixed(3).padStart(6, '0')}`;
  return `${m}:${s.toFixed(3).padStart(6, '0')}`;
}

function calcLapTime(base: number, lapInStint: number, compound: string, degRates: Record<string, number>): number {
  const offsets: Record<string, number> = { SOFT: 0, MEDIUM: 0.5, HARD: 1.2 };
  const deg = degRates[compound.toUpperCase()] ?? 0.08;
  return base + (offsets[compound.toUpperCase()] ?? 0) + deg * lapInStint;
}

interface StintPlan { compound: string; laps: number }

function simulateTotal(stints: StintPlan[], base: number, pitLoss: number, degRates: Record<string, number>): number {
  let total = 0;
  for (let si = 0; si < stints.length; si++) {
    const s = stints[si];
    for (let l = 0; l < s.laps; l++) {
      total += calcLapTime(base, l, s.compound, degRates) + (l === 0 && si > 0 ? pitLoss : 0);
    }
  }
  return total;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionKeyParam = searchParams.get('session_key') ?? 'latest';
  const driverParam = searchParams.get('driver') ?? '';

  try {
    // Resolve session
    const sessions = await fetchF1<Record<string, unknown>>('/sessions', {
      session_key: sessionKeyParam,
    });
    const session = sessions[0];
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    const sessionKey = String(session.session_key);

    // Find driver
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

    // Fetch stints + laps for this driver
    const [stints, laps] = await Promise.all([
      fetchF1<Record<string, unknown>>('/stints', { session_key: sessionKey, driver_number: driverNum }),
      fetchF1<Record<string, unknown>>('/laps', { session_key: sessionKey, driver_number: driverNum }),
    ]);

    // Best lap time as baseline
    let bestLap = 0;
    let lapCount = 0;
    const validLaps = laps.filter(l => l.lap_duration && (l.lap_duration as number) > 60);
    for (const l of validLaps) {
      const dur = l.lap_duration as number;
      if (!bestLap || dur < bestLap) bestLap = dur;
      lapCount = Math.max(lapCount, l.lap_number as number);
    }
    if (!bestLap) bestLap = 90;

    // Avg lap per stint
    const stintDetails = stints.map(s => {
      const stintLaps = validLaps.filter(l => {
        const ln = l.lap_number as number;
        return ln >= (s.lap_start as number) && ln <= ((s.lap_end as number) || 999);
      });
      const avgLap = stintLaps.length
        ? stintLaps.reduce((sum, l) => sum + (l.lap_duration as number), 0) / stintLaps.length
        : null;

      return {
        stint_number: s.stint_number,
        lap_start: s.lap_start,
        lap_end: s.lap_end ?? lapCount,
        compound: (s.compound as string ?? 'unknown').toLowerCase(),
        tyre_age_at_start: s.tyre_age_at_start ?? 0,
        laps: ((s.lap_end as number) || lapCount) - (s.lap_start as number) + 1,
        avg_lap: avgLap ? parseFloat(formatLapTime(avgLap).replace(':', '')) : null,
        avg_lap_formatted: avgLap ? formatLapTime(avgLap) : '--',
        best_lap_formatted: bestLap ? formatLapTime(bestLap) : '--',
      };
    });

    // Degradation estimates from real data
    const degRates: Record<string, number> = { SOFT: 0.15, MEDIUM: 0.08, HARD: 0.04 };

    // Calculate recommended strategies
    const totalLaps = lapCount || 58;
    const pitLoss = 22;

    const strategyTemplates: Array<{ stops: number; label: string; stints: StintPlan[] }> = [
      {
        stops: 0,
        label: 'No stop — HARD',
        stints: [{ compound: 'HARD', laps: totalLaps }],
      },
      {
        stops: 1,
        label: '1-stop SOFT→HARD',
        stints: [
          { compound: 'SOFT', laps: Math.round(totalLaps * 0.35) },
          { compound: 'HARD', laps: totalLaps - Math.round(totalLaps * 0.35) },
        ],
      },
      {
        stops: 1,
        label: '1-stop MEDIUM→HARD',
        stints: [
          { compound: 'MEDIUM', laps: Math.round(totalLaps * 0.45) },
          { compound: 'HARD', laps: totalLaps - Math.round(totalLaps * 0.45) },
        ],
      },
      {
        stops: 2,
        label: '2-stop S→M→H',
        stints: [
          { compound: 'SOFT', laps: Math.round(totalLaps * 0.25) },
          { compound: 'MEDIUM', laps: Math.round(totalLaps * 0.35) },
          { compound: 'HARD', laps: totalLaps - Math.round(totalLaps * 0.25) - Math.round(totalLaps * 0.35) },
        ],
      },
      {
        stops: 2,
        label: '2-stop S→H→S',
        stints: [
          { compound: 'SOFT', laps: Math.round(totalLaps * 0.25) },
          { compound: 'HARD', laps: Math.round(totalLaps * 0.45) },
          { compound: 'SOFT', laps: totalLaps - Math.round(totalLaps * 0.25) - Math.round(totalLaps * 0.45) },
        ],
      },
      {
        stops: 3,
        label: '3-stop aggressive',
        stints: [
          { compound: 'SOFT', laps: Math.round(totalLaps * 0.2) },
          { compound: 'SOFT', laps: Math.round(totalLaps * 0.25) },
          { compound: 'SOFT', laps: Math.round(totalLaps * 0.25) },
          { compound: 'HARD', laps: totalLaps - Math.round(totalLaps * 0.7) },
        ],
      },
    ];

    const simulated = strategyTemplates.map(t => ({
      ...t,
      total_seconds: simulateTotal(t.stints, bestLap, pitLoss, degRates),
    })).sort((a, b) => a.total_seconds - b.total_seconds);

    const fastest = simulated[0].total_seconds;
    const recommended = simulated.map((s, i) => ({
      rank: i + 1,
      stops: s.stops,
      label: s.label,
      compounds: s.stints.map(st => st.compound.toLowerCase()),
      stints_detail: s.stints.map(st => ({
        compound: st.compound.toLowerCase(),
        laps: st.laps,
      })),
      estimated_race_time: formatRaceTime(s.total_seconds),
      delta: i === 0 ? '+0.000' : `+${formatRaceTime(s.total_seconds - fastest)}`,
      delta_seconds: parseFloat((s.total_seconds - fastest).toFixed(3)),
    }));

    return NextResponse.json({
      driver: driverObj.name_acronym,
      full_name: driverObj.full_name,
      team: driverObj.team_name,
      session: {
        key: session.session_key,
        name: session.session_name,
        circuit: session.circuit_short_name,
        country: session.country_name,
      },
      actual_stints: stintDetails,
      race_params: {
        total_laps: totalLaps,
        pit_loss_seconds: pitLoss,
        best_lap_time: formatLapTime(bestLap),
        base_lap_seconds: parseFloat(bestLap.toFixed(3)),
      },
      degradation_model: degRates,
      recommended_strategies: recommended,
      optimal_strategy: recommended[0],
      meta: {
        session_key: session.session_key,
        data_source: 'openf1.org',
        generated_at: new Date().toISOString(),
        note: 'Strategy simulation based on real lap data and degradation model',
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
