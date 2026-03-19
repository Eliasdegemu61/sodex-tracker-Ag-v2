import { NextRequest, NextResponse } from 'next/server';
import { cacheManager } from '@/lib/cache';

interface RegistryUser {
  userId: string;
  address: string;
}

const CACHE_DURATION = 3600; // 1 hour
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();

    if (!address || typeof address !== 'string') {
      return NextResponse.json(
        { error: 'Address is required and must be a string' },
        { status: 400 }
      );
    }

    const normalizedAddress = address.toLowerCase().trim();
    const cacheKey = `wallet_lookup_${normalizedAddress}`;

    console.log('[LOOKUP] Querying address:', normalizedAddress);

    // 1. Try to get from Redis/Internal cache first
    const cachedId = await cacheManager.get(cacheKey);
    if (cachedId) {
      console.log('[LOOKUP] Cache HIT:', normalizedAddress);
      return NextResponse.json({ userId: cachedId, fromCache: true, source: 'cache' });
    }

    // 2. Query Supabase (The Source of Truth)
    // We use the 'registry' table which is indexed for O(1) lookups.
    const { supabaseAdmin } = await import('@/lib/supabase-client');
    if (!supabaseAdmin) {
      throw new Error('Supabase Admin client not initialized. Check your environment variables.');
    }
    
    const { data, error } = await supabaseAdmin
      .from('registry')
      .select('user_id')
      .eq('address', normalizedAddress)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') { // Not found
        console.log('[LOOKUP] Address not found in Supabase:', normalizedAddress);
        return NextResponse.json(
          { error: `Address ${address} not found in registry.` },
          { status: 404 }
        );
      }
      throw error;
    }

    if (data) {
      console.log('[LOOKUP] Supabase HIT:', normalizedAddress);
      // Cache the result to reduce database load
      await cacheManager.set(cacheKey, data.user_id, CACHE_DURATION);
      return NextResponse.json({ userId: data.user_id, fromCache: false, source: 'supabase' });
    }

    return NextResponse.json(
      { error: `Address ${address} not found in registry.` },
      { status: 404 }
    );
  } catch (error: any) {
    console.error('[LOOKUP] Critical error:', error);
    return NextResponse.json(
      { error: 'Internal server error during lookup' },
      { status: 500 }
    );
  }
}
