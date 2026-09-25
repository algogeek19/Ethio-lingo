import { createClient } from '@supabase/supabase-js';
import { ENV } from '../config/env.js';

/**
 * Service-role Supabase client used to mint short-lived signed upload URLs so
 * the browser's publishable key never needs Storage write access.
 *
 * Deliberately lazy: `createClient` throws when the URL is missing, and this
 * module is imported at server boot. Building the client on first use keeps the
 * API running (with a clear error on upload routes) when Supabase env vars are
 * absent, instead of crashing the whole process at startup.
 *
 * Never expose SUPABASE_SECRET_KEY to the browser — it bypasses Row Level Security.
 */
let cachedClient = null;

export const isSupabaseAdminConfigured = () =>
  Boolean(ENV.SUPABASE_URL && ENV.SUPABASE_SECRET_KEY);

export const getSupabaseAdmin = () => {
  if (!cachedClient) {
    if (!isSupabaseAdminConfigured()) {
      throw new Error(
        'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY on the server.',
      );
    }
    cachedClient = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_SECRET_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return cachedClient;
};
