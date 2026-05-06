import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const accountId = searchParams.get('account_id');
    const cursor = searchParams.get('cursor');
    const limit = searchParams.get('limit') || '500';

    if (!accountId) {
      return NextResponse.json(
        { error: 'account_id is required' },
        { status: 400 }
      );
    }

    const url = new URL('https://mainnet-data.sodex.dev/api/v1/perps/positions');
    url.searchParams.set('account_id', accountId);
    url.searchParams.set('limit', limit);
    if (cursor) {
      url.searchParams.set('cursor', cursor);
    }

    const response = await fetch(url.toString(), {
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('[perps/positions] Upstream API error:', response.status);
      return NextResponse.json(
        { error: `Failed to fetch positions: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[perps/positions] Fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch positions' },
      { status: 500 }
    );
  }
}
