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

    console.log('[v0] Looking up wallet address:', normalizedAddress);

    // 1. Try to get from individual address cache first
    const cachedId = await cacheManager.get(cacheKey);
    if (cachedId) {
      console.log('[v0] Wallet lookup cache HIT:', normalizedAddress);
      return NextResponse.json({ userId: cachedId, fromCache: true });
    }

    // 2. Try to get from Supabase
    try {
      const { supabase } = await import('@/lib/supabase-client');
      const { data, error } = await supabase
        .from('registry')
        .select('user_id')
        .eq('address', normalizedAddress)
        .single();
      
      if (!error && data) {
        console.log('[SUPABASE] Wallet lookup HIT:', normalizedAddress);
        await cacheManager.set(cacheKey, data.user_id, CACHE_DURATION);
        return NextResponse.json({ userId: data.user_id, fromCache: false, source: 'supabase' });
      }
    } catch (e) {
      console.warn('[SUPABASE] Lookup failed, falling back to GitHub:', e);
    }

    // 3. Fallback: Try to get from full registry cache or GitHub
    let registry: RegistryUser[] | null = await cacheManager.get('github_registry_csv');

    if (!registry) {
      console.log('[v0] Wallet lookup cache MISS, fetching registry from GitHub CSV...');
      // ... existing github fetch logic ...
      const registryResponse = await fetch(
        'https://raw.githubusercontent.com/Eliasdegemu61/Registory/refs/heads/main/registry.csv',
        { cache: 'no-store' }
      );

      if (registryResponse.ok) {
        const csvText = await registryResponse.text();
        const lines = csvText.split('\n');
        registry = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const [addr, id] = line.split(',');
          if (addr && id) {
            registry.push({ address: addr.trim(), userId: id.trim() });
          }
        }
        await cacheManager.set('github_registry_csv', registry, CACHE_DURATION);
      }
    }

    if (registry) {
      const user = registry.find((u) => u.address.toLowerCase() === normalizedAddress);
      if (user) {
        await cacheManager.set(cacheKey, user.userId, CACHE_DURATION);
        return NextResponse.json({ userId: user.userId, fromCache: false, source: 'github' });
      }
    }

    return NextResponse.json(
      { error: `Address ${address} not found in registry.` },
      { status: 404 }
    );
  } catch (error) {
    console.error('[v0] Wallet lookup error:', error);
    return NextResponse.json(
      { error: 'Failed to lookup wallet' },
      { status: 500 }
    );
  }
}
