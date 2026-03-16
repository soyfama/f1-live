// API Route: GET /api/fantasy/prices
// Returns current driver prices and history

import { NextResponse } from 'next/server';
import prices from '@/data/fantasy-prices.json';
import type { DriverPrice, PriceStats, TrendType } from '@/lib/fantasy-types';

export const dynamic = 'force-dynamic';

interface DriverPriceWithTrend extends DriverPrice {
  change: number;
  changePercent: number;
  trend: TrendType;
}

export async function GET() {
  try {
    // Calculate trends and changes
    const pricesWithTrends: DriverPriceWithTrend[] = prices.map((driver: DriverPrice) => {
      const history = driver.history;
      const previousPrice = history.length >= 2 ? history[history.length - 2] : driver.price;
      const change = driver.price - previousPrice;
      const changePercent = previousPrice > 0 ? (change / previousPrice) * 100 : 0;
      
      let trend: TrendType = 'stable';
      if (change >= 0.5) {
        trend = 'hotpick';
      } else if (change > 0) {
        trend = 'rising';
      } else if (change < 0) {
        trend = 'falling';
      }
      
      return {
        ...driver,
        change,
        changePercent,
        trend
      };
    });
    
    // Calculate stats
    const totalPrice = pricesWithTrends.reduce((sum, d) => sum + d.price, 0);
    const averagePrice = totalPrice / pricesWithTrends.length;
    
    const sortedByChange = [...pricesWithTrends].sort((a, b) => b.change - a.change);
    const highestRiser = sortedByChange[0]?.change > 0 
      ? { driver: sortedByChange[0].name, change: sortedByChange[0].change }
      : null;
    const biggestFaller = sortedByChange[sortedByChange.length - 1]?.change < 0
      ? { driver: sortedByChange[sortedByChange.length - 1].name, change: sortedByChange[sortedByChange.length - 1].change }
      : null;
    
    const stats: PriceStats = {
      averagePrice: Math.round(averagePrice * 10) / 10,
      highestRiser,
      biggestFaller
    };
    
    return NextResponse.json({
      count: pricesWithTrends.length,
      stats,
      data: pricesWithTrends
    });
    
  } catch (error) {
    console.error('Error in /api/fantasy/prices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prices' },
      { status: 500 }
    );
  }
}
