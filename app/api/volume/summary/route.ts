import { NextResponse } from 'next/server';
import { supabaseAdmin, supabase } from '@/lib/supabase-client';

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

    // Fetch from Supabase
    const client = supabaseAdmin || supabase;
    const { data: dbData, error } = await client
      .from('site_data')
      .select('data')
      .eq('key', 'volume_summary')
      .single();

    if (error) throw new Error(`Supabase error: ${error.message}`);
    if (!dbData || !dbData.data) throw new Error('Volume summary data not found in Supabase');
    
    const data = dbData.data as VolumeApiResponse;

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
