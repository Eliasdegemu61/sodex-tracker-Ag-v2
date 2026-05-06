import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const url = 'https://mainnet-gw.sodex.dev/bolt/symbols?names';
    const response = await fetch(url, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch symbols: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[perps/symbols] Fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch symbols' },
      { status: 500 }
    );
  }
}
