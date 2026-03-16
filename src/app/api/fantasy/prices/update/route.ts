// API Route: POST /api/fantasy/prices/update
// Updates driver and constructor prices (admin only)

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const ADMIN_KEY = 'pitwall2026';

interface UpdateRequest {
  drivers?: { acronym: string; price: number }[];
  constructors?: { id: string; price: number }[];
}

export async function POST(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - Missing Authorization header' },
        { status: 401 }
      );
    }
    
    const token = authHeader.slice(7);
    if (token !== ADMIN_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }
    
    const body: UpdateRequest = await request.json();
    
    // Read current data
    const driversPath = path.join(process.cwd(), 'src', 'data', 'fantasy-prices.json');
    const constructorsPath = path.join(process.cwd(), 'src', 'data', 'fantasy-constructors.json');
    
    const driversData = JSON.parse(await fs.readFile(driversPath, 'utf-8'));
    const constructorsData = JSON.parse(await fs.readFile(constructorsPath, 'utf-8'));
    
    let updatedCount = 0;
    
    // Update drivers
    if (body.drivers && Array.isArray(body.drivers)) {
      for (const update of body.drivers) {
        const driver = driversData.find((d: any) => d.acronym === update.acronym);
        if (driver && update.price !== driver.price) {
          const oldPrice = driver.price;
          const newPrice = update.price;
          
          // Update history: keep last 4 weeks + old price
          driver.history = [...driver.history.slice(-4), oldPrice];
          driver.price = newPrice;
          driver.priceChange = newPrice - oldPrice;
          
          updatedCount++;
        }
      }
    }
    
    // Update constructors
    if (body.constructors && Array.isArray(body.constructors)) {
      for (const update of body.constructors) {
        const constructor = constructorsData.find((c: any) => c.id === update.id);
        if (constructor && update.price !== constructor.price) {
          const oldPrice = constructor.price;
          const newPrice = update.price;
          
          // Update history: keep last 4 weeks + old price
          constructor.history = [...constructor.history.slice(-4), oldPrice];
          constructor.price = newPrice;
          constructor.priceChange = newPrice - oldPrice;
          
          updatedCount++;
        }
      }
    }
    
    // Write updated data back to files
    await fs.writeFile(driversPath, JSON.stringify(driversData, null, 2));
    await fs.writeFile(constructorsPath, JSON.stringify(constructorsData, null, 2));
    
    return NextResponse.json({
      ok: true,
      updated: updatedCount
    });
    
  } catch (error) {
    console.error('Error in /api/fantasy/prices/update:', error);
    return NextResponse.json(
      { error: 'Failed to update prices', details: (error as Error).message },
      { status: 500 }
    );
  }
}
