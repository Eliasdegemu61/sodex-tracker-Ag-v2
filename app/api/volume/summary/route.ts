import { NextResponse } from 'next/server';

const VOLUME_SUMMARY_URL = 'https://raw.githubusercontent.com/Eliasdegemu61/sodex-tracker-new-v1-data-2/main/volume_summary.json';
const CACHE_DURATION = 300; // 5 minutes

interface VolumeApiResponse {
  updated_at: string;
  all_time_stats: {
    total_combined_volume: number;
    total_spot_volume: number;
    total_futures_volume: number;
    top_5_spot: Array<{ pair: string; volume: number }>;
    top_5_futures: Array<{ pair: string; volume: number }>;
  };
  today_stats: {
    date: string;
    top_5_spot: Array<{ pair: string; volume: number }>;
    top_5_futures: Array<{ pair: string; volume: number }>;
  };
}

// In-memory cache
let cachedData: VolumeApiResponse | null = null;
let lastCacheTime = 0;

export async function GET() {
  try {
    const now = Date.now();

    // Check in-memory cache
    if (cachedData && now - lastCacheTime < CACHE_DURATION * 1000) {
      return NextResponse.json(cachedData);
    }

    // Try Supabase first
    try {
      const { supabase } = await import('@/lib/supabase-client');
      const { data: dbData, error: dbError } = await supabase
        .from('site_data')
        .select('data')
        .eq('key', 'volume_summary')
        .single();
      
      if (!dbError && dbData) {
        cachedData = dbData.data as any;
        lastCacheTime = now;
        console.log('[SUPABASE] Volume Summary fetched from DB');
        return NextResponse.json(cachedData);
      }
    } catch (e) {
      console.warn('[SUPABASE] Volume Summary DB fetch failed, falling back to GitHub:', e);
    }

    // Fallback: Fetch from GitHub
    const token = process.env.GITHUB_TOKEN;
    const response = await fetch(VOLUME_SUMMARY_URL, {
      headers: token ? { Authorization: `token ${token}` } : {},
      cache: 'no-store'
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data: VolumeApiResponse = await response.json();

    cachedData = data;
    lastCacheTime = now;

    return NextResponse.json(data);
  } catch (error) {
    console.error('[v0] Failed to fetch volume summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch volume summary' },
      { status: 500 }
    );
  }
}
