import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ohiwmjqheitytulhfdpo.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_MVD7gBK4vVrtfmtdp4iXUA_gl2GrZki';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);


