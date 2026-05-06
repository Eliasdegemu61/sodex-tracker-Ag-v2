import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const windowType = searchParams.get('window_type') || '30D';
    const sortBy = searchParams.get('sort_by') || 'volume';
    const walletAddress = searchParams.get('wallet_address');

    if (!walletAddress) {
      return NextResponse.json({ error: 'wallet_address is required' }, { status: 400 });
    }

    const url = new URL('https://mainnet-data.sodex.dev/api/v1/leaderboard/rank');
    url.searchParams.set('window_type', windowType);
    url.searchParams.set('sort_by', sortBy);
    url.searchParams.set('wallet_address', walletAddress);

    const response = await fetch(url.toString(), { cache: 'no-store' });
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch rank' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
