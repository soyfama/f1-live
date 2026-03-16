// API Route: GET /api/fantasy/points
// Returns fantasy points calculated for a session

import { NextRequest, NextResponse } from 'next/server';
import { calculateFantasyPoints } from '@/lib/fantasy-scoring';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionKey = searchParams.get('session_key') || 'latest';
    
    const points = await calculateFantasyPoints(sessionKey);
    
    if (points.length === 0) {
      return NextResponse.json(
        { error: 'No data available for this session' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      session_key: sessionKey,
      count: points.length,
      data: points
    });
    
  } catch (error) {
    console.error('Error in /api/fantasy/points:', error);
    return NextResponse.json(
      { error: 'Failed to calculate fantasy points' },
      { status: 500 }
    );
  }
}
