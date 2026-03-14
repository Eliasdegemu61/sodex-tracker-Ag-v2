
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function check() {
  console.log('Checking site_data for duplicates...')
  const { data, error } = await supabase
    .from('site_data')
    .select('key')
  
  if (error) {
    console.error('Error fetching site_data:', error)
    return
  }

  const counts: Record<string, number> = {}
  data.forEach(row => {
    counts[row.key] = (counts[row.key] || 0) + 1
  })

  console.log('Key counts:', counts)
  
  const duplicates = Object.entries(counts).filter(([key, count]) => count > 1)
  if (duplicates.length > 0) {
    console.log('FOUND DUPLICATES:', duplicates)
  } else {
    console.log('No duplicates found.')
  }
}

check()
