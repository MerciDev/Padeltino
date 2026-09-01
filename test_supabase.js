import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://hcqiuytvrsvcbaltfvrd.supabase.co', 'sb_publishable_uScMeq5M7i5SvGOIRJPr1Q_3ZNpa4cO');

async function test() {
  const { data, error } = await supabase.from('communities').select('*');
  console.log('Data:', data);
  console.log('Error:', error);
}

test();
