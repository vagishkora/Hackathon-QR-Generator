import { supabase } from './client';

export async function signInUser(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: (email || '').trim().toLowerCase(),
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) console.error('Sign out error:', error);
  // Clear any local participant session caches
  localStorage.removeItem('hackpass_active_session');
}

export async function resetPasswordForEmail(email) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(
    (email || '').trim().toLowerCase(),
    {
      redirectTo: `${window.location.origin}/reset-password`,
    }
  );
  if (error) throw error;
  return data;
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
