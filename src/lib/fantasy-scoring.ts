// F1 Fantasy Scoring Engine
// Calculates fantasy points based on official F1 Fantasy 2026 rules

import type {
  DriverFantasyPoints,
  DriverPrice,
  OpenF1Driver,
  OpenF1Position,
  OpenF1Lap,
  OpenF1Stint,
  OpenF1Session
} from './fantasy-types';

// Points for qualifying positions
const QUALI_POINTS: Record<number, number> = {
  1: 10, 2: 9, 3: 8, 4: 7, 5: 6, 6: 5, 7: 4, 8: 3, 9: 2, 10: 1,
  // Q2 (P11-P15): +1 each
  11: 1, 12: 1, 13: 1, 14: 1, 15: 1,
  // Q1 eliminated (P16+): -1 each
  16: -1, 17: -1, 18: -1, 19: -1, 20: -1, 21: -1, 22: -1
};

// Points for race positions
const RACE_POINTS: Record<number, number> = {
  1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1
};

// Driver prices lookup
let driverPricesCache: DriverPrice[] | null = null;

async function getDriverPrices(): Promise<DriverPrice[]> {
  if (driverPricesCache) return driverPricesCache;
  
  try {
    const prices = await import('@/data/fantasy-prices.json');
    driverPricesCache = prices.default as DriverPrice[];
    return driverPricesCache;
  } catch {
    return [];
  }
}

// Fetch from OpenF1 API
async function fetchOpenF1<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`https://api.openf1.org/v1/${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });
  }
  
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`OpenF1 API error: ${response.status}`);
  }
  return response.json() as T;
}

// Get latest session key
async function getLatestSession(): Promise<OpenF1Session | null> {
  try {
    const sessions = await fetchOpenF1<OpenF1Session[]>('sessions', { session_type: 'Race' });
    if (sessions.length === 0) return null;
    
    // Sort by date, most recent first
    return sessions.sort((a, b) => 
      new Date(b.date_start).getTime() - new Date(a.date_start).getTime()
    )[0];
  } catch {
    return null;
  }
}

// Get qualifying session for the same meeting
async function getQualifyingSession(meetingKey: number): Promise<OpenF1Session | null> {
  try {
    const sessions = await fetchOpenF1<OpenF1Session[]>('sessions', { 
      meeting_key: meetingKey.toString(),
      session_type: 'Qualifying'
    });
    return sessions[0] || null;
  } catch {
    return null;
  }
}

// Get fastest lap info from laps data
function getFastestLap(laps: OpenF1Lap[]): { driverNumber: number; lapTime: number } | null {
  let fastest: { driverNumber: number; lapTime: number } | null = null;
  
  for (const lap of laps) {
    if (lap.lap_duration && (!fastest || lap.lap_duration < fastest.lapTime)) {
      fastest = {
        driverNumber: lap.driver_number,
        lapTime: lap.lap_duration
      };
    }
  }
  
  return fastest;
}

// Count pit stops from stints (each stint change = 1 pit stop)
function countPitStops(stints: OpenF1Stint[]): number {
  if (stints.length === 0) return 0;
  
  // Sort by lap_start
  const sortedStints = [...stints].sort((a, b) => a.lap_start - b.lap_start);
  
  // Number of stints minus 1 = number of pit stops
  return Math.max(0, sortedStints.length - 1);
}

// Check if driver has DNF (Did Not Finish)
function checkDNF(driverNumber: number, positions: OpenF1Position[], totalLaps: number): { isDNF: boolean; dnfType: 'driver' | 'car' | null } {
  const driverPositions = positions.filter(p => p.driver_number === driverNumber);
  
  if (driverPositions.length === 0) {
    return { isDNF: true, dnfType: 'car' };
  }
  
  // Get the last recorded position
  const lastPosition = driverPositions[driverPositions.length - 1];
  const maxLap = Math.max(...positions.map(p => {
    // Extract lap number from position data if available
    return 0;
  }));
  
  // If driver has significantly fewer laps than race length, they DNF'd
  // This is a heuristic since we don't have direct DNF data
  if (driverPositions.length < totalLaps * 0.7) {
    return { isDNF: true, dnfType: 'car' };
  }
  
  return { isDNF: false, dnfType: null };
}

// Main calculation function
export async function calculateFantasyPoints(sessionKey?: string): Promise<DriverFantasyPoints[]> {
  const prices = await getDriverPrices();
  
  try {
    // Determine session to use
    let targetSession: OpenF1Session | null = null;
    
    if (sessionKey && sessionKey !== 'latest') {
      const sessions = await fetchOpenF1<OpenF1Session[]>('sessions', { session_key: sessionKey });
      targetSession = sessions[0] || null;
    } else {
      targetSession = await getLatestSession();
    }
    
    if (!targetSession) {
      console.error('No session found');
      return [];
    }
    
    const key = targetSession.session_key.toString();
    const meetingKey = targetSession.meeting_key;
    
    // Fetch all necessary data in parallel
    const [drivers, positions, laps, stints] = await Promise.all([
      fetchOpenF1<OpenF1Driver[]>('drivers', { session_key: key }),
      fetchOpenF1<OpenF1Position[]>('position', { session_key: key }),
      fetchOpenF1<OpenF1Lap[]>('laps', { session_key: key }),
      fetchOpenF1<OpenF1Stint[]>('stints', { session_key: key })
    ]);
    
    // Get qualifying session for grid positions
    const qualiSession = await getQualifyingSession(meetingKey);
    let gridPositions: OpenF1Position[] = [];
    
    if (qualiSession) {
      gridPositions = await fetchOpenF1<OpenF1Position[]>('position', { 
        session_key: qualiSession.session_key.toString() 
      });
    }
    
    // Get fastest lap info
    const fastestLapInfo = getFastestLap(laps);
    
    // Calculate total laps in race (for DNF detection)
    const totalRaceLaps = Math.max(...positions.map(p => {
      // Approximate based on position data timestamps
      return 0;
    }), 50); // Default to 50 if unknown
    
    // Build result for each driver
    const results: DriverFantasyPoints[] = [];
    
    // Group data by driver for easier processing
    const driversByNumber = new Map<number, OpenF1Driver>();
    drivers.forEach(d => driversByNumber.set(d.driver_number, d));
    
    const positionsByDriver = new Map<number, OpenF1Position[]>();
    positions.forEach(p => {
      if (!positionsByDriver.has(p.driver_number)) {
        positionsByDriver.set(p.driver_number, []);
      }
      positionsByDriver.get(p.driver_number)!.push(p);
    });
    
    const lapsByDriver = new Map<number, OpenF1Lap[]>();
    laps.forEach(l => {
      if (!lapsByDriver.has(l.driver_number)) {
        lapsByDriver.set(l.driver_number, []);
      }
      lapsByDriver.get(l.driver_number)!.push(l);
    });
    
    const stintsByDriver = new Map<number, OpenF1Stint[]>();
    stints.forEach(s => {
      if (!stintsByDriver.has(s.driver_number)) {
        stintsByDriver.set(s.driver_number, []);
      }
      stintsByDriver.get(s.driver_number)!.push(s);
    });
    
    const qualiPositionsByDriver = new Map<number, OpenF1Position[]>();
    gridPositions.forEach(p => {
      if (!qualiPositionsByDriver.has(p.driver_number)) {
        qualiPositionsByDriver.set(p.driver_number, []);
      }
      qualiPositionsByDriver.get(p.driver_number)!.push(p);
    });
    
    // Process each driver
    for (const driver of drivers) {
      const driverNum = driver.driver_number;
      
      // Get price from our data
      const priceData = prices.find(p => p.number === driverNum);
      
      // Get final race position (last recorded position)
      const driverRacePositions = positionsByDriver.get(driverNum) || [];
      const racePosition = driverRacePositions.length > 0 
        ? driverRacePositions[driverRacePositions.length - 1].position 
        : null;
      
      // Get qualifying/grid position
      const driverQualiPositions = qualiPositionsByDriver.get(driverNum) || [];
      const gridPosition = driverQualiPositions.length > 0
        ? driverQualiPositions[driverQualiPositions.length - 1].position
        : null;
      
      // Calculate position delta
      const positionsDelta = (racePosition !== null && gridPosition !== null)
        ? racePosition - gridPosition
        : null;
      
      // Calculate points components
      const qualifyingPoints = gridPosition !== null ? (QUALI_POINTS[gridPosition] || 0) : 0;
      const racePoints = racePosition !== null ? (RACE_POINTS[racePosition] || 0) : 0;
      
      // Position bonus: +2 per position gained, -1 per position lost
      let positionBonus = 0;
      if (positionsDelta !== null) {
        if (positionsDelta < 0) {
          positionBonus = Math.abs(positionsDelta) * 2; // Gained positions
        } else if (positionsDelta > 0) {
          positionBonus = -positionsDelta; // Lost positions
        }
      }
      
      // Fastest lap bonus (+5 if in top 10)
      const hasFastestLap = fastestLapInfo?.driverNumber === driverNum;
      const fastestLapBonus = (hasFastestLap && racePosition !== null && racePosition <= 10) ? 5 : 0;
      
      // Pit stop penalty (-1 per pit after the first)
      const driverStints = stintsByDriver.get(driverNum) || [];
      const pitCount = countPitStops(driverStints);
      const pitPenalty = Math.max(0, pitCount - 1) * -1;
      
      // DNF check
      const dnfInfo = checkDNF(driverNum, driverRacePositions, totalRaceLaps);
      
      // Teammate bonus will be calculated after we have all results
      
      const result: DriverFantasyPoints = {
        driverNumber: driverNum,
        acronym: driver.name_acronym,
        fullName: driver.full_name,
        team: driver.team_name,
        teamColor: driver.team_colour || 'CCCCCC',
        price: priceData?.price || 10.0,
        
        qualifyingPoints,
        racePoints,
        positionBonus,
        fastestLapBonus,
        pitPenalty,
        teammateBeatBonus: 0, // Calculated later
        dotdBonus: 0,
        total: 0, // Calculated after teammate bonus
        
        racePosition,
        gridPosition,
        positionsDelta,
        fastestLap: hasFastestLap,
        pitStops: pitCount,
        isDNF: dnfInfo.isDNF,
        dnfType: dnfInfo.dnfType
      };
      
      results.push(result);
    }
    
    // Calculate teammate bonuses
    // Group by team
    const byTeam = new Map<string, DriverFantasyPoints[]>();
    results.forEach(r => {
      if (!byTeam.has(r.team)) {
        byTeam.set(r.team, []);
      }
      byTeam.get(r.team)!.push(r);
    });
    
    // For each team with 2 drivers, give +3 to the one with better race position
    for (const [team, teamDrivers] of byTeam) {
      if (teamDrivers.length === 2) {
        const [d1, d2] = teamDrivers;
        
        if (d1.racePosition !== null && d2.racePosition !== null) {
          if (d1.racePosition < d2.racePosition) {
            d1.teammateBeatBonus = 3;
          } else if (d2.racePosition < d1.racePosition) {
            d2.teammateBeatBonus = 3;
          }
        }
      }
    }
    
    // Calculate totals
    results.forEach(r => {
      // DNF penalties
      let dnfPenalty = 0;
      if (r.isDNF) {
        dnfPenalty = r.dnfType === 'driver' ? -15 : -10;
      }
      
      r.total = 
        r.qualifyingPoints +
        r.racePoints +
        r.positionBonus +
        r.fastestLapBonus +
        r.pitPenalty +
        r.teammateBeatBonus +
        r.dotdBonus +
        dnfPenalty;
    });
    
    // Sort by total points descending, then by race position
    results.sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return (a.racePosition || 99) - (b.racePosition || 99);
    });
    
    return results;
    
  } catch (error) {
    console.error('Error calculating fantasy points:', error);
    return [];
  }
}

// Get latest available race results (for when there's no live session)
export async function getLatestRaceResults(): Promise<DriverFantasyPoints[]> {
  return calculateFantasyPoints('latest');
}
