import { NextResponse } from 'next/server';

const OPENF1 = 'https://api.openf1.org/v1';

async function fetchLatest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T[]> {
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionKeyParam = searchParams.get('session_key');

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const tick = async () => {
        try {
          const sessions = await fetchLatest<Record<string, unknown>>('/sessions', {
            session_key: sessionKeyParam ?? 'latest',
          });
          const session = sessions[0];
          if (!session) {
            send({ type: 'error', message: 'No active session found' });
            return;
          }

          const sessionKey = String(session.session_key);

          const [drivers, positions, laps, stints, intervals, pits] = await Promise.all([
            fetchLatest<Record<string, unknown>>('/drivers', { session_key: sessionKey }),
            fetchLatest<Record<string, unknown>>('/position', { session_key: sessionKey }),
            fetchLatest<Record<string, unknown>>('/laps', { session_key: sessionKey }),
            fetchLatest<Record<string, unknown>>('/stints', { session_key: sessionKey }),
            fetchLatest<Record<string, unknown>>('/intervals', { session_key: sessionKey }),
            fetchLatest<Record<string, unknown>>('/pit', { session_key: sessionKey }),
          ]);

          const driverMap: Record<number, Record<string, unknown>> = {};
          for (const d of drivers) {
            driverMap[d.driver_number as number] = d;
          }

          const latestPos: Record<number, Record<string, unknown>> = {};
          for (const p of positions) {
            const dn = p.driver_number as number;
            if (!latestPos[dn] || new Date(p.date as string) > new Date(latestPos[dn].date as string)) {
              latestPos[dn] = p;
            }
          }

          const latestLap: Record<number, Record<string, unknown>> = {};
          for (const l of laps) {
            const dn = l.driver_number as number;
            const lapNum = l.lap_number as number;
            if (!latestLap[dn] || lapNum > (latestLap[dn].lap_number as number)) {
              latestLap[dn] = l;
            }
          }

          const bestLap: Record<number, number> = {};
          for (const l of laps) {
            const dn = l.driver_number as number;
            const dur = l.lap_duration as number;
            if (dur && dur > 0 && (!bestLap[dn] || dur < bestLap[dn])) {
              bestLap[dn] = dur;
            }
          }

          const latestStint: Record<number, Record<string, unknown>> = {};
          for (const s of stints) {
            const dn = s.driver_number as number;
            const stintNum = s.stint_number as number;
            if (!latestStint[dn] || stintNum > (latestStint[dn].stint_number as number)) {
              latestStint[dn] = s;
            }
          }

          const latestInterval: Record<number, Record<string, unknown>> = {};
          for (const i of intervals) {
            const dn = i.driver_number as number;
            if (!latestInterval[dn] || new Date(i.date as string) > new Date(latestInterval[dn].date as string)) {
              latestInterval[dn] = i;
            }
          }

          const pitCount: Record<number, number> = {};
          const isInPit: Record<number, boolean> = {};
          for (const p of pits) {
            const dn = p.driver_number as number;
            pitCount[dn] = (pitCount[dn] || 0) + 1;
            // Check if pit entry is recent and no exit yet
            const pitDate = new Date(p.date as string);
            const now = new Date();
            const secondsSincePit = (now.getTime() - pitDate.getTime()) / 1000;
            if (secondsSincePit < 60) {
              isInPit[dn] = true;
            }
          }

          const timing = Object.values(driverMap).map((driver) => {
            const dn = driver.driver_number as number;
            const pos = latestPos[dn];
            const lap = latestLap[dn];
            const stint = latestStint[dn];
            const interval = latestInterval[dn];
            return {
              driverNumber: dn,
              position: pos?.position ?? 99,
              acronym: driver.name_acronym,
              fullName: driver.full_name,
              team: driver.team_name,
              teamColor: driver.team_colour,
              lastLap: lap?.lap_duration ?? null,
              bestLap: bestLap[dn] ?? null,
              sector1: lap?.duration_sector_1 ?? null,
              sector2: lap?.duration_sector_2 ?? null,
              sector3: lap?.duration_sector_3 ?? null,
              lapNumber: lap?.lap_number ?? null,
              tyre: stint?.compound ?? null,
              tyreAge: stint ? ((lap?.lap_number as number || 0) - (stint.lap_start as number) + (stint.tyre_age_at_start as number || 0)) : null,
              gapToLeader: interval?.gap_to_leader ?? null,
              interval: interval?.interval ?? null,
              isPitOut: lap?.is_pit_out_lap ?? false,
              drs: null,
              pits: pitCount[dn] || 0,
              isInPit: isInPit[dn] || false,
            };
          }).sort((a, b) => (a.position as number) - (b.position as number));

          send({
            type: 'timing',
            session: {
              key: session.session_key,
              name: session.session_name,
              type: session.session_type,
              status: session.session_status,
              circuit: session.circuit_short_name,
              country: session.country_name,
              year: session.year,
            },
            timing,
            timestamp: Date.now(),
          });
        } catch (err) {
          send({ type: 'error', message: String(err) });
        }
      };

      await tick();

      const interval = setInterval(async () => {
        try {
          await tick();
        } catch {
          clearInterval(interval);
          controller.close();
        }
      }, 3000);

      setTimeout(() => {
        clearInterval(interval);
        controller.close();
      }, 5 * 60 * 1000);
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
