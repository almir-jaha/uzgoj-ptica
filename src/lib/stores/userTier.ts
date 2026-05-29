import { writable, derived } from 'svelte/store';
import { supabase } from '$lib/supabase/client';

export type Tier = 'free' | 'paid_1' | 'paid_2' | 'paid_3' | 'admin';

export interface TierLimits {
  max_uzgajivacnice: number | null; // null = neograničeno
  max_ptice: number | null;
  label: string;
}

export interface UserTierRow {
  user_id: string;
  email: string;
  tier: Tier;
  updated_at: string;
  updated_by?: string;
}

export const TIER_LIMITS: Record<Tier, TierLimits> = {
  free:   { max_uzgajivacnice: 1,    max_ptice: 50,    label: 'Besplatno' },
  paid_1: { max_uzgajivacnice: 1,    max_ptice: 1000,  label: 'Plaćeno 1' },
  paid_2: { max_uzgajivacnice: 2,    max_ptice: 4000,  label: 'Plaćeno 2' },
  paid_3: { max_uzgajivacnice: 3,    max_ptice: 10000, label: 'Plaćeno 3' },
  admin:  { max_uzgajivacnice: null, max_ptice: null,  label: 'Admin' },
};

export const userTier = writable<Tier>('free');
export const tierLimits = derived(userTier, ($tier) => TIER_LIMITS[$tier]);
export const allUserTiers = writable<UserTierRow[]>([]);

export async function loadUserTier(userId: string, email: string): Promise<void> {
  const { data } = await supabase
    .from('user_tiers')
    .select('tier')
    .eq('user_id', userId)
    .maybeSingle();

  if (data) {
    userTier.set(data.tier as Tier);
  } else {
    // Prvi login — kreiraj free tier
    await supabase.from('user_tiers').insert({
      user_id: userId,
      email,
      tier: 'free',
      updated_at: new Date().toISOString()
    });
    userTier.set('free');
  }
}

export async function loadAllUserTiers(): Promise<void> {
  const { data } = await supabase
    .from('user_tiers')
    .select('*')
    .order('email');
  if (data) allUserTiers.set(data as UserTierRow[]);
}

export async function setUserTier(userId: string, tier: Tier): Promise<void> {
  const currentUser = await supabase.auth.getUser();
  const { error } = await supabase
    .from('user_tiers')
    .update({
      tier,
      updated_at: new Date().toISOString(),
      updated_by: currentUser.data.user?.id
    })
    .eq('user_id', userId);
  if (error) throw error;
  allUserTiers.update((list) =>
    list.map((u) => (u.user_id === userId ? { ...u, tier } : u))
  );
}

// Pomoćna: je li korisnik dostigao limit uzgajivačnica?
export function jeNaLimitUzgajivacnica(
  brUzgajivacnica: number,
  limiti: TierLimits
): boolean {
  if (limiti.max_uzgajivacnice === null) return false;
  return brUzgajivacnica >= limiti.max_uzgajivacnice;
}

// Pomoćna: je li korisnik dostigao limit ptica?
export function jeNaLimitPtica(brPtica: number, limiti: TierLimits): boolean {
  if (limiti.max_ptice === null) return false;
  return brPtica >= limiti.max_ptice;
}
