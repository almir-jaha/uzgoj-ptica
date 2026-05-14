import { supabase } from './client';
import type { RealtimeChannel } from '@supabase/supabase-js';

type Callback = (payload: any) => void;

export function listenToTable(table: string, userId: string, callback: Callback): RealtimeChannel {
  return supabase
    .channel(`${table}:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: table,
        filter: `user_id=eq.${userId}`
      },
      callback
    )
    .subscribe();
}

export function listenToKavezi(sezonaId: string, callback: Callback): RealtimeChannel {
  return supabase
    .channel(`kavezi:${sezonaId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'kavezi',
        filter: `sezona_id=eq.${sezonaId}`
      },
      callback
    )
    .subscribe();
}

export function listenToCiklusi(sezonaId: string, callback: Callback): RealtimeChannel {
  return supabase
    .channel(`ciklusi:${sezonaId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'ciklusi',
        filter: `sezona_id=eq.${sezonaId}`
      },
      callback
    )
    .subscribe();
}

export function unsubscribe(channel: RealtimeChannel) {
  supabase.removeChannel(channel);
}
