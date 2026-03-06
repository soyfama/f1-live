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
  } catch { return []; }
}

interface PaceEntry {
  pos: number;
  driver: string;
  full_name: string;
  team: string;
  best_lap: string;
  best_lap_seconds: number;
  avg_lap: string;
  gap_to_leader: number;
  laps_completed: number;
  best_s1: string;
  best_s2: string;
  best_s3: string;
  max_speed: number | null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionKeyParam = searchParams.get('session_key') ?? 'latest';

  try {
    const sessions = await fetchF1<Record<string, unknown>>('/sessions', { session_key: sessionKeyParam });
    const session = sessions[0];
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    const sessionKey = String(session.session_key);

    const [drivers, laps, stints] = await Promise.all([
      fetchF1<Record<string, unknown>>('/drivers', { session_key: sessionKey }),
      fetchF1<Record<string, unknown>>('/laps', { session_key: sessionKey }),
      fetchF1<Record<string, unknown>>('/stints', { session_key: sessionKey }),
    ]);

    const driverMap: Record<number, Record<string, unknown>> = {};
    for (const d of drivers) driverMap[d.driver_number as number] = d;

    const bestLap: Record<number, number> = {};
    const allLaps: Record<number, number[]> = {};
    const bestS1: Record<number, number> = {};
    const bestS2: Record<number, number> = {};
    const bestS3: Record<number, number> = {};
    const maxSpeed: Record<number, number> = {};

    for (const l of laps) {
      const dn = l.driver_number as number;
      const dur = l.lap_duration as number;
      if (dur && dur > 60) {
        if (!bestLap[dn] || dur < bestLap[dn]) bestLap[dn] = dur;
        if (!allLaps[dn]) allLaps[dn] = [];
        allLaps[dn].push(dur);
      }
      if (l.duration_sector_1 && (!bestS1[dn] || (l.duration_sector_1 as number) < bestS1[dn])) bestS1[dn] = l.duration_sector_1 as number;
      if (l.duration_sector_2 && (!bestS2[dn] || (l.duration_sector_2 as number) < bestS2[dn])) bestS2[dn] = l.duration_sector_2 as number;
      if (l.duration_sector_3 && (!bestS3[dn] || (l.duration_sector_3 as number) < bestS3[dn])) bestS3[dn] = l.duration_sector_3 as number;
      const sp = ((l.st_speed ?? l.i2_speed ?? l.i1_speed) as number | null) ?? 0;
      if (sp && (!maxSpeed[dn] || sp > maxSpeed[dn])) maxSpeed[dn] = sp;
    }

    const overallBest = Math.min(...Object.values(bestLap).filter(Boolean));

    const paceRanking: PaceEntry[] = Object.entries(bestLap)
      .filter(([dn]) => driverMap[Number(dn)])
      .map(([dn, best]) => {
        const d = driverMap[Number(dn)];
        const avgLap = allLaps[Number(dn)]?.length
          ? allLaps[Number(dn)].reduce((a, b) => a + b, 0) / allLaps[Number(dn)].length
          : best;
        return {
          pos: 0,
          driver: String(d.name_acronym ?? ''),
          full_name: String(d.full_name ?? ''),
          team: String(d.team_name ?? ''),
          best_lap: formatLapTime(best),
          best_lap_seconds: parseFloat(best.toFixed(3)),
          avg_lap: formatLapTime(avgLap),
          gap_to_leader: parseFloat((best - overallBest).toFixed(3)),
          laps_completed: allLaps[Number(dn)]?.length ?? 0,
          best_s1: bestS1[Number(dn)] ? bestS1[Number(dn)].toFixed(3) : '--',
          best_s2: bestS2[Number(dn)] ? bestS2[Number(dn)].toFixed(3) : '--',
          best_s3: bestS3[Number(dn)] ? bestS3[Number(dn)].toFixed(3) : '--',
          max_speed: maxSpeed[Number(dn)] ?? null,
        };
      })
      .sort((a, b) => a.best_lap_seconds - b.best_lap_seconds)
      .map((d, i) => ({ ...d, pos: i + 1 }));

    // Team pace
    const teamBest: Record<string, number> = {};
    for (const entry of paceRanking) {
      if (!teamBest[entry.team] || entry.best_lap_seconds < teamBest[entry.team]) {
        teamBest[entry.team] = entry.best_lap_seconds;
      }
    }

    const teamBestOverall = Math.min(...Object.values(teamBest));
    const teamPace = Object.entries(teamBest)
      .map(([team, best]) => ({
        team: team.replace('Oracle Red Bull Racing', 'Red Bull').replace(' F1 Team', ''),
        best_lap: formatLapTime(best),
        gap_to_leader: parseFloat((best - teamBestOverall).toFixed(3)),
      }))
      .sort((a, b) => a.gap_to_leader - b.gap_to_leader)
      .map((t, i) => ({ pos: i + 1, ...t }));

    // Long run pace
    const longRunPace: Array<{
      driver: string; team: string; compound: string;
      laps: number; avg_lap: string; deg_per_lap: string;
    }> = [];

    for (const s of stints) {
      const lapEnd = (s.lap_end as number) ?? 0;
      const lapStart = s.lap_start as number;
      const stintLen = lapEnd - lapStart + 1;
      if (stintLen < 5) continue;
      const dn = s.driver_number as number;
      const d = driverMap[dn];
      if (!d) continue;
      const stintLaps = (allLaps[dn] ?? []).slice(lapStart - 1, lapEnd);
      if (stintLaps.length < 3) continue;
      const avgTime = stintLaps.reduce((a, b) => a + b, 0) / stintLaps.length;
      let degPerLap = 0;
      if (stintLaps.length > 2) {
        const n = stintLaps.length;
        const sumX = n * (n - 1) / 2;
        const sumX2 = (n - 1) * n * (2 * n - 1) / 6;
        const sumY = stintLaps.reduce((a, b) => a + b, 0);
        const sumXY = stintLaps.reduce((acc, y, x) => acc + x * y, 0);
        degPerLap = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      }
      longRunPace.push({
        driver: String(d.name_acronym ?? ''),
        team: String(d.team_name ?? ''),
        compound: String(s.compound ?? 'unknown').toLowerCase(),
        laps: stintLen,
        avg_lap: formatLapTime(avgTime),
        deg_per_lap: `${degPerLap >= 0 ? '+' : ''}${degPerLap.toFixed(3)}s/lap`,
      });
    }
    longRunPace.sort((a, b) => a.avg_lap.localeCompare(b.avg_lap));

    const insights: string[] = [];
    if (paceRanking.length > 0) {
      const p1 = paceRanking[0];
      const teamFirst = p1.team.split(' ')[0];
      insights.push(`${p1.driver} (${teamFirst}) led ${String(session.session_name)} with best lap ${p1.best_lap}`);
    }
    if (paceRanking.length > 1) {
      insights.push(`P2 gap: ${paceRanking[1].driver} +${paceRanking[1].gap_to_leader}s behind on single-lap pace`);
    }
    if (teamPace.length > 0) {
      insights.push(`${teamPace[0].team} showed strongest team pace in ${String(session.session_name)}`);
    }
    if (longRunPace[0]) {
      const r = longRunPace[0];
      insights.push(`Best long-run pace: ${r.driver} on ${r.compound.toUpperCase()} (${r.avg_lap} avg, ${r.deg_per_lap} deg)`);
    }

    return NextResponse.json({
      session: `${String(session.session_name)} — ${String(session.country_name)} ${session.year}`,
      session_key: session.session_key,
      circuit: session.circuit_short_name,
      pace_ranking: paceRanking,
      team_pace: teamPace,
      long_run_pace: longRunPace,
      best_sectors: {
        s1: paceRanking.filter(d => d.best_s1 !== '--').sort((a, b) => parseFloat(a.best_s1) - parseFloat(b.best_s1)).slice(0, 5).map((d, i) => ({ pos: i + 1, driver: d.driver, time: d.best_s1 })),
        s2: paceRanking.filter(d => d.best_s2 !== '--').sort((a, b) => parseFloat(a.best_s2) - parseFloat(b.best_s2)).slice(0, 5).map((d, i) => ({ pos: i + 1, driver: d.driver, time: d.best_s2 })),
        s3: paceRanking.filter(d => d.best_s3 !== '--').sort((a, b) => parseFloat(a.best_s3) - parseFloat(b.best_s3)).slice(0, 5).map((d, i) => ({ pos: i + 1, driver: d.driver, time: d.best_s3 })),
      },
      speed_trap: paceRanking.filter(d => d.max_speed).sort((a, b) => (b.max_speed ?? 0) - (a.max_speed ?? 0)).slice(0, 10).map((d, i) => ({ pos: i + 1, driver: d.driver, team: d.team, max_speed_kmh: d.max_speed })),
      key_insights: insights,
      meta: { data_source: 'openf1.org', generated_at: new Date().toISOString() },
    }, { headers: { 'Cache-Control': 'no-cache, max-age=60', 'Access-Control-Allow-Origin': '*' } });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
