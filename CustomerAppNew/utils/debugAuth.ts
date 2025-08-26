/**
 * Debug Authentication Helper
 * Use this to test authentication status in components
 */

import { supabase, getCurrentUser, isAuthenticated } from '../config/supabaseClient';

export const debugAuth = async (): Promise<void> => {
  console.log('=== AUTHENTICATION DEBUG ===');
  
  try {
    // Check session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('Session:', session?.user?.id ? `User ID: ${session.user.id}` : 'No session');
    console.log('Session error:', sessionError);
    
    // Check user
    const user = await getCurrentUser();
    console.log('Current user:', user?.id ? `User ID: ${user.id}, Email: ${user.email}` : 'No user');
    
    // Check authentication status
    const authenticated = await isAuthenticated();
    console.log('Is authenticated:', authenticated);
    
    // Check local storage
    const token = await supabase.auth.getSession();
    console.log('Has session token:', !!token.data.session?.access_token);
    
  } catch (error) {
    console.error('Debug auth error:', error);
  }
  
  console.log('=== END DEBUG ===');
};

export const logUserInfo = async (): Promise<string> => {
  const user = await getCurrentUser();
  const info = user ? `Authenticated as: ${user.email} (${user.id})` : 'Not authenticated';
  console.log(info);
  return info;
};
