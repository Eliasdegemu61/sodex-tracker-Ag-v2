import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testSync() {
  const url = 'https://raw.githubusercontent.com/Eliasdegemu61/sodex-tracker-new-v1-data-2/main/volume_summary.json';
  console.log('Fetching', url);
  const response = await fetch(url, { cache: 'no-store' });
  const data = await response.json();

  console.log('Upserting into Supabase...');
  const { error, data: resData } = await supabaseAdmin
    .from('site_data')
    .upsert({ key: 'volume_summary', data }, { onConflict: 'key' })
    .select();

  if (error) {
    console.error('Supabase Upsert Error:', error);
  } else {
    console.log('Supabase Upsert Success!', resData);
  }
}

testSync().catch(console.error);
