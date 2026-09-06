import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('users').select('id, installed, notifications_enabled, notification_token').limit(1);
  console.log('Data:', data);
  console.log('Error:', error);
}
check();
