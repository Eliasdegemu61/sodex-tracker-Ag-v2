import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const url = 'https://mainnet-gw.sodex.dev/futures/fapi/market/v1/public/q/agg-tickers';
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch agg tickers: ${response.statusText}` }, { status: response.status });
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
