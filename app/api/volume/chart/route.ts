import { NextResponse } from 'next/server';

const VOLUME_CHART_URL = 'https://raw.githubusercontent.com/Eliasdegemu61/sodex-tracker-new-v1-data-2/main/volume_chart.json';
const CACHE_DURATION = 300; // 5 minutes

interface ChartDataPoint {
  day: string;
  spot_vol: number;
  futures_vol: number;
  total_day_vol: number;
}

// In-memory cache
let cachedData: ChartDataPoint[] | null = null;
let lastCacheTime = 0;

export async function GET() {
  try {
    const now = Date.now();

    // Check in-memory cache
    if (cachedData && now - lastCacheTime < CACHE_DURATION * 1000) {
      return NextResponse.json(cachedData);
    }

    // Fetch from GitHub
    const token = process.env.GITHUB_TOKEN;
    const response = await fetch(VOLUME_CHART_URL, {
      headers: token ? { Authorization: `token ${token}` } : {},
      cache: 'no-store'
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data: ChartDataPoint[] = await response.json();

    cachedData = data;
    lastCacheTime = now;

    return NextResponse.json(data);
  } catch (error) {
    console.error('[v0] Failed to fetch volume chart:', error);
    return NextResponse.json(
      { error: 'Failed to fetch volume chart' },
      { status: 500 }
    );
  }
}
