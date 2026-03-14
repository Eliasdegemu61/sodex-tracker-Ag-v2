import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  if (!key) {
    return NextResponse.json({ error: 'Missing key parameter' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('site_data')
      .select('data, updated_at')
      .eq('key', key)
      .maybeSingle();

    if (error) {
       console.warn(`[SUPABASE] Site data fetch error for key: ${key}`, error.message);
       return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
        return NextResponse.json({ error: `No data found for key: ${key}` }, { status: 404 });
    }

    return NextResponse.json({
        data: data.data,
        updated_at: data.updated_at
    });
  } catch (err) {
    console.error(`[SUPABASE] Global error fetching site data for key: ${key}`, err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
