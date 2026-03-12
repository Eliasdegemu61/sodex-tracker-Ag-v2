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
    const cacheKey = 'github_registry_csv';

    // Try to get from cache first
    const cached = await cacheManager.get(cacheKey);
    if (cached) {
      console.log('[v0] Registry (CSV) served from cache');
      return NextResponse.json({ data: cached, fromCache: true });
    }

    console.log('[STRICT-ID] Fetching registry CSV from GitHub');

    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3.raw',
      'User-Agent': 'Sodex-Tracker',
    };

    if (GITHUB_TOKEN) {
      headers['Authorization'] = `token ${GITHUB_TOKEN}`;
    }

    const response = await fetch(
      'https://raw.githubusercontent.com/Eliasdegemu61/Registory/refs/heads/main/registry.csv',
      {
        headers,
        cache: 'no-store'
      }
    );

    if (!response.ok) {
      console.error('[v0] GitHub API error:', response.status, response.statusText);
      return NextResponse.json(
        { error: `Failed to fetch registry: ${response.statusText}` },
        { status: response.status }
      );
    }

    const csvText = await response.text();
    const lines = csvText.split('\n');
    const data: RegistryUser[] = [];

    // Parse CSV (skip header)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const [address, userId] = line.split(',');
      if (address && userId) {
        data.push({
          address: address.trim(),
          userId: userId.trim()
        });
      }
    }

    console.log('[v0] Registry CSV fetched and parsed, entries:', data.length);

    // Cache the parsed result
    await cacheManager.set(cacheKey, data, CACHE_DURATION);

    return NextResponse.json({ data, fromCache: false });
  } catch (error) {
    console.error('[v0] Registry fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch registry from GitHub' },
      { status: 500 }
    );
  }
}
