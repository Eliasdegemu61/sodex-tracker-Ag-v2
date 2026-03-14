import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-client'

export const maxDuration = 600; // Set max duration to 10 minutes (Vercel Pro/Enterprise or Hobby max)
export const dynamic = 'force-dynamic';

// Configuration for GitHub fetching
const TARGETS = [
  { key: 'registry', url: 'https://raw.githubusercontent.com/Eliasdegemu61/Registory/refs/heads/main/registry.csv', type: 'csv_registry' },
  { key: 'volume_summary', url: 'https://raw.githubusercontent.com/Eliasdegemu61/sodex-tracker-new-v1-data-2/main/volume_summary.json', type: 'json' },
  { key: 'volume_chart', url: 'https://raw.githubusercontent.com/Eliasdegemu61/sodex-tracker-new-v1-data-2/main/volume_chart.json', type: 'json' },
  { key: 'daily_net_flows', url: 'https://raw.githubusercontent.com/Eliasdegemu61/Fund-flow-sodex/main/daily_net_flows.csv', type: 'csv_raw' },
  { key: 'overall_sodex_totals', url: 'https://raw.githubusercontent.com/Eliasdegemu61/Fund-flow-sodex/main/overall_sodex_totals.csv', type: 'csv_raw' },
  { key: 'live_stats', url: 'https://raw.githubusercontent.com/Eliasdegemu61/Sodex-Tracker-new-v1/main/live_stats.json', type: 'json' }
]

export async function POST(req: Request) {
  try {
    // Optional: Add secret token check for security (cron only)
    const authHeader = req.headers.get('Authorization')
    if (process.env.CACHE_REFRESH_SECRET && authHeader !== `Bearer ${process.env.CACHE_REFRESH_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase Admin client not initialized' }, { status: 500 })
    }

    const supabase = supabaseAdmin!

    const results = await Promise.all(TARGETS.map(async (target) => {
      try {
        console.log(`[SYNC] Fetching ${target.key} from ${target.url}...`)
        const response = await fetch(target.url, { cache: 'no-store' })
        
        if (!response.ok) {
          return { key: target.key, status: 'error', error: response.statusText }
        }

        if (target.type === 'csv_registry') {
          const text = await response.text()
          const lines = text.split('\n')
          const entries = []
          
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim()
            if (!line) continue
            const [address, userId] = line.split(',')
            if (address && userId) {
              entries.push({ address: address.trim(), user_id: parseInt(userId.trim(), 10) })
            }
          }

          // Batch upsert to registry table to prevent statement timeouts
          let hasError = false;
          let errorMessage = null;
          for (let i = 0; i < entries.length; i += 1000) {
            const chunk = entries.slice(i, i + 1000);
            const { error } = await supabase
              .from('registry')
              .upsert(chunk, { onConflict: 'address' });
            if (error) {
              hasError = true;
              errorMessage = error.message;
              break;
            }
          }

          return { key: target.key, status: hasError ? 'error' : 'success', error: errorMessage }
        } 
        else if (target.type === 'json') {
          const data = await response.json()
          const { error } = await supabase
            .from('site_data')
            .upsert({ key: target.key, data }, { onConflict: 'key' })
          
          return { key: target.key, status: error ? 'error' : 'success', error: error?.message }
        }
        else if (target.type === 'csv_raw') {
          const text = await response.text()
          // Store raw CSV as JSON string or array of rows
          const data = text.split('\n').filter(line => line.trim()).map(line => line.split(','))
          const { error } = await supabase
            .from('site_data')
            .upsert({ key: target.key, data }, { onConflict: 'key' })
          
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
      results 
    }, { status: hasErrors ? 500 : 200 })

  } catch (error) {
    console.error('[SYNC] Global error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// Support GET for manual testing
export async function GET(req: Request) {
    return POST(req)
}
