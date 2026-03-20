import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const prefix = searchParams.get('prefix')?.toLowerCase() || '';
    const suffix = searchParams.get('suffix')?.toLowerCase() || '';

    if (!prefix && !suffix) {
      return NextResponse.json({ data: [] });
    }

    console.log('[REVERSE-SEARCH] Searching for:', { prefix, suffix });

    if (!supabaseAdmin) {
      throw new Error('Supabase Admin client not initialized');
    }

    let query = supabaseAdmin
      .from('registry')
      .select('address, user_id')
      .limit(1500);

    if (prefix) {
      query = query.like('address', `${prefix}%`);
    }
    if (suffix) {
      query = query.like('address', `%${suffix}`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[REVERSE-SEARCH] Supabase error:', error);
      throw error;
    }

    console.log(`[REVERSE-SEARCH] Found ${data?.length || 0} matches`);

    return NextResponse.json({ 
      data: data.map(item => ({
        address: item.address,
        userId: item.user_id
      }))
    });
  } catch (error) {
    console.error('[REVERSE-SEARCH] Critical error:', error);
    return NextResponse.json(
      { error: 'Failed to perform reverse search' },
      { status: 500 }
    );
  }
}
