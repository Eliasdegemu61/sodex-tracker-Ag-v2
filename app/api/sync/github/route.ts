import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-client'

export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

// Configuration for GitHub fetching
const TARGETS = [
  { key: 'registry', url: 'https://raw.githubusercontent.com/Eliasdegemu61/Registory/refs/heads/main/registry.csv', type: 'csv_registry' },
  { key: 'volume_summary', url: 'https://raw.githubusercontent.com/Eliasdegemu61/sodex-tracker-new-v1-data-2/main/volume_summary.json', type: 'json' },
  { key: 'volume_chart', url: 'https://raw.githubusercontent.com/Eliasdegemu61/sodex-tracker-new-v1-data-2/main/volume_chart.json', type: 'json' },
  { key: 'daily_net_flows', url: 'https://raw.githubusercontent.com/Eliasdegemu61/Fund-flow-sodex/main/daily_net_flows.csv', type: 'csv_raw' },
  { key: 'overall_sodex_totals', url: 'https://raw.githubusercontent.com/Eliasdegemu61/Fund-flow-sodex/main/overall_sodex_totals.csv', type: 'csv_raw' }
]

export async function POST(req: Request) {
  try {
    const admin = supabaseAdmin
    if (!admin) {
      return NextResponse.json({ error: 'Supabase Admin client not initialized' }, { status: 500 })
    }

    const results = await Promise.all(TARGETS.map(async (target) => {
      try {
        console.log(`[SYNC] Fetching ${target.key} from ${target.url}...`)
        const response = await fetch(target.url, { cache: 'no-store' })
        
        if (!response.ok) {
          return { key: target.key, status: 'error', error: response.statusText }
        }

        if (target.type === 'csv_registry') {
          const text = await response.text();
          const lines = text.split('\n');
          const entries = [];
          
          // Parse CSV (skip header)
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const [address, userId] = line.split(',');
            if (address && userId) {
              const trimmedId = userId.trim();
              entries.push({ 
                address: address.trim().toLowerCase(), 
                user_id: parseInt(trimmedId, 10) 
              });
            }
          }

          console.log(`[SYNC] Parsed ${entries.length} entries for ${target.key}`);

          // Batch upsert to registry table
          let hasError = false;
          let errorMessage = null;
          const CHUNK_SIZE = 1000;
          
          for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
            const chunk = entries.slice(i, i + CHUNK_SIZE);
            const { error } = await admin
              .from('registry')
              .upsert(chunk, { onConflict: 'address' });
            
            if (error) {
              console.error(`[SYNC] Batch upsert error at chunk ${i}:`, error.message);
              hasError = true;
              errorMessage = error.message;
              break;
            }
          }

          return { key: target.key, status: hasError ? 'error' : 'success', error: errorMessage, count: entries.length };
        } 
        else if (target.type === 'json') {
          const data = await response.json()
          const { error } = await admin
            .from('site_data')
            .upsert({ key: target.key, data, updated_at: new Date().toISOString() }, { onConflict: 'key' })
          
          return { key: target.key, status: error ? 'error' : 'success', error: error?.message }
        }
        else if (target.type === 'csv_raw') {
          const text = await response.text()
          const data = text.split('\n').filter(line => line.trim()).map(line => line.split(','))
          const { error } = await admin
            .from('site_data')
            .upsert({ key: target.key, data, updated_at: new Date().toISOString() }, { onConflict: 'key' })
          
          return { key: target.key, status: error ? 'error' : 'success', error: error?.message }
        }
        
        return { key: target.key, status: 'error', error: 'Unknown target type' }
      } catch (err: any) {
        console.error(`[SYNC] Error processing ${target.key}:`, err)
        return { key: target.key, status: 'error', error: err.message || 'Processing failed' }
      }
    }))

    const hasErrors = results.some((r) => r.status === 'error');

    return NextResponse.json({ 
      timestamp: new Date().toISOString(),
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      results 
    }, { status: hasErrors ? 500 : 200 })

  } catch (error) {
    console.error('[SYNC] Global error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function GET(req: Request) {
    return POST(req)
}
