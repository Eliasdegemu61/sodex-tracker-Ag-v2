import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const windowType = searchParams.get('window_type') || 'ALL_TIME';
    const sortBy = searchParams.get('sort_by') || 'pnl';
    const pageSize = searchParams.get('page_size') || '50';
    const page = searchParams.get('page') || '1';

    const url = new URL('https://mainnet-data.sodex.dev/api/v1/leaderboard');
    url.searchParams.set('window_type', windowType);
    url.searchParams.set('sort_by', sortBy);
    url.searchParams.set('sort_order', 'desc');
    url.searchParams.set('page', page);
    url.searchParams.set('page_size', pageSize);

    const response = await fetch(url.toString(), { cache: 'no-store' });
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
