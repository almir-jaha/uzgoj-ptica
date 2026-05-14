import { writable, derived } from 'svelte/store';
import type { AuthSession } from '@supabase/supabase-js';
import { onAuthStateChange, signOut } from '../supabase/auth';

export const session = writable<AuthSession | null>(null);
export const user = derived(session, ($session) => $session?.user ?? null);
export const isAuthenticated = derived(session, ($session) => $session !== null);

// Initialize auth state
onAuthStateChange((newSession) => {
  session.set(newSession);
});

export const auth = {
  signOut: async () => {
    const { error } = await signOut();
    if (error) throw error;
    session.set(null);
  }
};
