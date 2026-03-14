
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Read .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
const env = {}
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=')
  if (key && value) env[key.trim()] = value.trim()
})

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function check() {
  console.log('Checking site_data...')
  const { data, error } = await supabase
    .from('site_data')
    .select('id, key, created_at, updated_at')
  
  if (error) {
    console.error('Error fetching site_data:', error)
    return
  }

  console.log('Total rows in site_data:', data.length)
  console.log('Rows:', data)

  const counts = {}
  data.forEach(row => {
    counts[row.key] = (counts[row.key] || 0) + 1
  })

  const duplicates = Object.entries(counts).filter(([key, count]) => count > 1)
  if (duplicates.length > 0) {
    console.log('FOUND DUPLICATES:', duplicates)
  } else {
    console.log('No duplicates found.')
  }
}

check()
