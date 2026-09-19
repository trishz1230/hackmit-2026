/**
 * Supabase client. Credentials come from the committed constants below so
 * teammates need no local setup; the anon key is a public, client-side key.
 * Override per machine with EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY.
 */
import 'react-native-url-polyfill/auto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** e.g. https://abcdefgh.supabase.co — Supabase dashboard → Settings → API */
const PROJECT_URL = 'https://ezsuvyiiooxshswnxyws.supabase.co';
/** The `anon` `public` key from the same page. Safe to commit. */
const ANON_KEY = 'sb_publishable_4httacI9cXrsOtIWTY6Xvw_3ohO834I';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || PROJECT_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ANON_KEY;

export const supabaseUrl = url;
export const supabaseAnonKey = anonKey;

/** When false the app runs entirely on mock data, so it always boots. */
export const isSupabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Set PROJECT_URL and ANON_KEY in lib/supabase.ts.');
  }
  if (!client) {
    client = createClient(url, anonKey, { auth: { persistSession: false } });
  }
  return client;
}
