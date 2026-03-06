import { NextResponse } from 'next/server';
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

export async function GET() {
  try {
    const sessions = await fetchF1<Record<string, unknown>>('/sessions', { session_key: 'latest' });
    const session = sessions[0];

    if (!session) {
      return NextResponse.json({ error: 'No active session found' }, { status: 404 });
    }

    const sessionKey = String(session.session_key);

    const [drivers, positions, laps, stints, intervals] = await Promise.all([
      fetchF1<Record<string, unknown>>('/drivers', { session_key: sessionKey }),
      fetchF1<Record<string, unknown>>('/position', { session_key: sessionKey }),
      fetchF1<Record<string, unknown>>('/laps', { session_key: sessionKey }),
      fetchF1<Record<string, unknown>>('/stints', { session_key: sessionKey }),
      fetchF1<Record<string, unknown>>('/intervals', { session_key: sessionKey }),
    ]);

    // Build maps
    const driverMap: Record<number, Record<string, unknown>> = {};
    for (const d of drivers) driverMap[d.driver_number as number] = d;

    const latestPos: Record<number, number> = {};
    const latestPosDate: Record<number, string> = {};
    for (const p of positions) {
      const dn = p.driver_number as number;
      const date = p.date as string;
      if (!latestPosDate[dn] || date > latestPosDate[dn]) {
        latestPos[dn] = p.position as number;
        latestPosDate[dn] = date;
      }
    }

    const latestLap: Record<number, Record<string, unknown>> = {};
    const bestLap: Record<number, number> = {};
    for (const l of laps) {
      const dn = l.driver_number as number;
      const lapNum = l.lap_number as number;
      if (!latestLap[dn] || lapNum > (latestLap[dn].lap_number as number)) latestLap[dn] = l;
      const dur = l.lap_duration as number;
      if (dur && dur > 0 && (!bestLap[dn] || dur < bestLap[dn])) bestLap[dn] = dur;
    }

    const latestStint: Record<number, Record<string, unknown>> = {};
    for (const s of stints) {
      const dn = s.driver_number as number;
      const sn = s.stint_number as number;
      if (!latestStint[dn] || sn > (latestStint[dn].stint_number as number)) latestStint[dn] = s;
    }

    const latestInterval: Record<number, Record<string, unknown>> = {};
    for (const i of intervals) {
      const dn = i.driver_number as number;
      if (!latestInterval[dn] || (i.date as string) > (latestInterval[dn].date as string)) latestInterval[dn] = i;
    }

    const driversList = Object.values(driverMap).map((d) => {
      const dn = d.driver_number as number;
      const lap = latestLap[dn];
      const stint = latestStint[dn];
      const interval = latestInterval[dn];
      const lapNum = lap?.lap_number as number || 0;
      const tyreAge = stint ? lapNum - (stint.lap_start as number) + ((stint.tyre_age_at_start as number) || 0) : null;

      const gapRaw = interval?.gap_to_leader as number | null;
      const pos = latestPos[dn] ?? 99;

      return {
        pos,
        driver: d.name_acronym,
        full_name: d.full_name,
        team: d.team_name,
        gap: pos === 1 ? 'leader' : gapRaw !== null && gapRaw !== undefined ? `+${gapRaw.toFixed(3)}` : '--',
        interval: interval?.interval != null ? `+${(interval.interval as number).toFixed(3)}` : '--',
        best_lap: formatLapTime(bestLap[dn] ?? null),
        last_lap: formatLapTime(lap?.lap_duration as number ?? null),
        tyre: (stint?.compound as string ?? 'unknown').toLowerCase(),
        tyre_age: tyreAge,
        laps: lapNum,
        s1: lap?.duration_sector_1 != null ? (lap.duration_sector_1 as number).toFixed(3) : '--',
        s2: lap?.duration_sector_2 != null ? (lap.duration_sector_2 as number).toFixed(3) : '--',
        s3: lap?.duration_sector_3 != null ? (lap.duration_sector_3 as number).toFixed(3) : '--',
        is_pit_out: lap?.is_pit_out_lap ?? false,
      };
    }).sort((a, b) => a.pos - b.pos);

    // Estimate session remaining (best-effort)
    const dateEnd = session.date_end as string;
    let remaining = '--';
    if (dateEnd) {
      const diff = new Date(dateEnd).getTime() - Date.now();
      if (diff > 0) {
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        remaining = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      } else {
        remaining = '00:00:00';
      }
    }

    const statusMap: Record<string, string> = {
      started: 'green', green: 'green', yellow: 'yellow', sc: 'safety_car',
      safety_car: 'safety_car', red: 'red', finished: 'finished', inactive: 'inactive',
    };

    return NextResponse.json({
      session: {
        key: session.session_key,
        name: session.session_name,
        type: session.session_type,
        status: statusMap[String(session.session_status).toLowerCase()] ?? session.session_status,
        circuit: session.circuit_short_name,
        country: session.country_name,
        year: session.year,
        remaining,
        fetched_at: new Date().toISOString(),
      },
      drivers: driversList,
      meta: {
        total_drivers: driversList.length,
        session_key: session.session_key,
        data_source: 'openf1.org',
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
