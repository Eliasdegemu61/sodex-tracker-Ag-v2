import { NextResponse } from 'next/server';
import { supabaseAdmin, supabase } from '@/lib/supabase-client';

const CACHE_DURATION = 300; // 5 minutes

// In-memory cache
let cachedData: string[][] | null = null;
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
      .eq('key', 'overall_sodex_totals')
      .single();

    if (error) throw new Error(`Supabase error: ${error.message}`);
    if (!dbData || !dbData.data) throw new Error('overall_sodex_totals data not found');

    const data = dbData.data as string[][];

    cachedData = data;
    lastCacheTime = now;

    return NextResponse.json(data);
  } catch (error) {
    console.error('[SUPABASE] Failed to fetch overall_sodex_totals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch overall_sodex_totals' },
      { status: 500 }
    );
  }
}
