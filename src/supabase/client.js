import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wgkqgaiviybihkimnlvr.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indna3FnYWl2aXliaWhraW1ubHZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5MTExNTYsImV4cCI6MjEwMzQ4NzE1Nn0.6twm--yRHRWakJC6DBKMR6qfTF8BDCF7gp-Rg5hLY0g';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase URL or Anon Key is missing from environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const HACKATHON_CONFIG = {
  name: import.meta.env.VITE_HACKATHON_NAME || 'HACKDAYS',
  date: import.meta.env.VITE_HACKATHON_DATE || '1 October 2026',
  venue: import.meta.env.VITE_HACKATHON_VENUE || 'NMAMIT',
  time: '9:00 AM – 5:00 PM',
  lunchTime: '1:00 PM – 2:00 PM',
  organizer: 'ACM Student Chapter, NMAMIT',
};
