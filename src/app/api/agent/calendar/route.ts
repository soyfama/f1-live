import { NextRequest, NextResponse } from 'next/server';

const OPENF1 = 'https://api.openf1.org/v1';

async function fetchF1<T>(endpoint: string, params: Record<string, string> = {}): Promise<T[]> {
  const url = new URL(`${OPENF1}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  try {
    const res = await fetch(url.toString(), { next: { revalidate: 300 } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'now';
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const year = searchParams.get('year') ?? String(new Date().getFullYear());
  const upcomingOnly = searchParams.get('upcoming') !== 'false';

  try {
    const [meetings, sessions] = await Promise.all([
      fetchF1<Record<string, unknown>>('/meetings', { year }),
      fetchF1<Record<string, unknown>>('/sessions', { year }),
    ]);

    const now = Date.now();

    // Group sessions by meeting
    const sessionsByMeeting: Record<number, Array<Record<string, unknown>>> = {};
    for (const s of sessions) {
      const mk = s.meeting_key as number;
      if (!sessionsByMeeting[mk]) sessionsByMeeting[mk] = [];
      sessionsByMeeting[mk].push(s);
    }

    // Build calendar entries
    const calendar = meetings.map(m => {
      const mk = m.meeting_key as number;
      const meetingSessions = (sessionsByMeeting[mk] ?? []).sort((a, b) =>
        new Date(a.date_start as string).getTime() - new Date(b.date_start as string).getTime()
      );

      const raceSession = meetingSessions.find(s =>
        String(s.session_name).toLowerCase().includes('race') &&
        !String(s.session_name).toLowerCase().includes('sprint')
      );
      const raceDate = raceSession?.date_start ?? m.date_start;
      const raceDateMs = new Date(raceDate as string).getTime();
      const isPast = raceDateMs < now;
      const isCurrent = Math.abs(raceDateMs - now) < 7 * 86400000 && !isPast;

      const countdown = !isPast ? formatCountdown(raceDateMs - now) : null;

      return {
        round: null, // OpenF1 doesn't expose round number directly
        meeting_key: mk,
        name: m.meeting_name,
        official_name: m.meeting_official_name,
        location: m.location,
        country: m.country_name,
        country_code: m.country_code,
        circuit: m.circuit_short_name,
        race_date: raceDate,
        race_date_utc: raceDate,
        // UTC-3 (Buenos Aires) — just shift
        race_date_ar: raceDate ? new Date(new Date(raceDate as string).getTime() - 3 * 3600000).toISOString().replace('T', ' ').slice(0, 16) + ' ART' : null,
        is_past: isPast,
        is_current_week: isCurrent,
        countdown,
        sessions: meetingSessions.map(s => ({
          session_key: s.session_key,
          name: s.session_name,
          type: s.session_type,
          date_start: s.date_start,
          date_end: s.date_end,
          status: s.session_status,
          countdown: !isPast ? formatCountdown(new Date(s.date_start as string).getTime() - now) : null,
        })),
      };
    }).sort((a, b) => new Date(a.race_date as string).getTime() - new Date(b.race_date as string).getTime());

    // Upcoming 5
    const upcoming = calendar
      .filter(c => !c.is_past)
      .slice(0, 5);

    // Next session across all meetings
    const allFutureSessions = sessions
      .filter(s => new Date(s.date_start as string).getTime() > now)
      .sort((a, b) => new Date(a.date_start as string).getTime() - new Date(b.date_start as string).getTime());

    const nextSession = allFutureSessions[0];
    const nextMeeting = nextSession ? meetings.find(m => m.meeting_key === nextSession.meeting_key) : null;

    return NextResponse.json({
      year: parseInt(year),
      total_rounds: meetings.length,
      next_session: nextSession ? {
        session_key: nextSession.session_key,
        name: nextSession.session_name,
        type: nextSession.session_type,
        date: nextSession.date_start,
        countdown: formatCountdown(new Date(nextSession.date_start as string).getTime() - now),
        meeting: nextMeeting?.meeting_name ?? null,
        country: nextMeeting?.country_name ?? null,
        circuit: nextMeeting?.circuit_short_name ?? null,
      } : null,
      upcoming_sessions: allFutureSessions.slice(0, 5).map(s => {
        const mt = meetings.find(m => m.meeting_key === s.meeting_key);
        return {
          session_key: s.session_key,
          name: s.session_name,
          country: mt?.country_name ?? null,
          circuit: mt?.circuit_short_name ?? null,
          date: s.date_start,
          countdown: formatCountdown(new Date(s.date_start as string).getTime() - now),
        };
      }),
      upcoming_races: upcoming,
      full_calendar: upcomingOnly ? upcoming : calendar,
      meta: {
        data_source: 'openf1.org',
        generated_at: new Date().toISOString(),
        timezone_note: 'race_date_ar in UTC-3 (Buenos Aires)',
      },
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
