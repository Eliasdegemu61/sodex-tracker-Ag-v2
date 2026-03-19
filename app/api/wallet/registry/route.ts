import { NextRequest, NextResponse } from 'next/server';
import { cacheManager } from '@/lib/cache';

const CACHE_DURATION = 3600; // 1 hour
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

interface RegistryUser {
  userId: string;
  address: string;
}

export async function GET(request: NextRequest) {
  try {
    const cacheKey = 'github_registry_supabase_fallback';

    // 1. Try to get from cache first
    const cached = await cacheManager.get(cacheKey);
    if (cached) {
      console.log('[REGISTRY] Serving from cache');
      return NextResponse.json({ data: cached, fromCache: true });
    }

    // 2. Fetch from Supabase (Source of Truth)
    console.log('[REGISTRY] Fetching from Supabase...');
    const { supabase } = await import('@/lib/supabase-client');
    
    // We limit to 1000 to avoid huge payloads. 
    // Real lookups should use the /api/wallet/lookup endpoint.
    const { data, error } = await supabase
      .from('registry')
      .select('address, user_id')
      .limit(1000);

    if (error) throw error;

    const formattedData = data.map(item => ({
      address: item.address,
      userId: item.user_id
    }));

    // Cache the result
    await cacheManager.set(cacheKey, formattedData, CACHE_DURATION);

    return NextResponse.json({ 
      data: formattedData, 
      fromCache: false,
      message: 'Note: Results are limited to 1000. Use /api/wallet/lookup for specific address lookups.' 
    });
  } catch (error) {
    console.error('[REGISTRY] Critical error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch registry' },
      { status: 500 }
    );
  }
}
