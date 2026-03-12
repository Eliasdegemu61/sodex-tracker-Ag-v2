import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  if (!key) {
    return NextResponse.json({ error: 'Missing key parameter' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('site_data')
      .select('data')
      .eq('key', key)
      .single();

    if (error) {
       console.warn(`[SUPABASE] Site data fetch failed for key: ${key}`, error.message);
       return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(data.data);
  } catch (err) {
    console.error(`[SUPABASE] Error fetching site data for key: ${key}`, err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
