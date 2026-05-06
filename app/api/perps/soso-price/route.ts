import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const url = 'https://gw-sodex.sosovalue.com/quote/token/price/soso';
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch SOSO price: ${response.statusText}` }, { status: response.status });
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
