import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hcqiuytvrsvcbaltfvrd.supabase.co';
const supabaseKey = 'sb_publishable_uScMeq5M7i5SvGOIRJPr1Q_3ZNpa4cO';

export const supabase = createClient(supabaseUrl, supabaseKey);
