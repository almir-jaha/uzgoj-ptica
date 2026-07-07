import { supabase } from '../supabase/client';
import { db, getOfflineQueue, clearOfflineQueue } from '../db/dexie';
import type { OfflineAction } from '../db/schema';

export class SyncEngine {
  private _isSyncing = false;

  // FIX #3 i #4: Čuvamo referencu na handlere da bi removeEventListener radio ispravno
  private handleOnline: () => void;
  private handleOffline: () => void;

  constructor() {
    this.handleOnline = () => {
      console.log('Vratili ste se online!');
      this.fullSync();
    };

    this.handleOffline = () => {
      console.log('Otišli ste offline');
    };

    // FIX #4: Samo jedan set listenera, u konstruktoru
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  // Cleanup metoda - pozovi kad se komponenta unmountuje
  destroy() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }

  // FIX #1: fullSync uvijek prvo upload, pa tek onda download
  async fullSync(userId?: string): Promise<boolean> {
    const uploadOk = await this.sync();
    if (!uploadOk) return false;

    if (userId) {
      return await this.downloadChanges(userId);
    }

    return true;
  }

  async sync(): Promise<boolean> {
    if (this._isSyncing) return false;
    this._isSyncing = true;

    try {
      const queue = await getOfflineQueue();

      if (queue.length === 0) {
        console.log('Nema stavki za sinhronizaciju');
        return true;
      }

      console.log(`Sinhronizujem ${queue.length} stavki...`);

      const grouped = this.groupByTable(queue);

      // FIX #2: Pratimo koje akcije su uspješno syncirane
      const successfulIds: number[] = [];

      for (const [table, actions] of Object.entries(grouped)) {
        try {
          await this.syncTable(table, actions);
          // Samo ako je cijela tabela uspješna, dodaj ID-eve
          actions.forEach((a) => {
            if (a.id !== undefined) successfulIds.push(a.id);
          });
        } catch (err) {
          console.error(`Greška pri sinhronizaciji tabele ${table}:`, err);
          // Nastavi sa ostalim tabelama, ne baci grešku odmah
        }
      }

      // FIX #2: Briši samo uspješno syncirane akcije, ne sve
      if (successfulIds.length > 0) {
        await db.offlineQueue.bulkDelete(successfulIds);
        console.log(`✓ Sinhronizovano ${successfulIds.length} stavki`);
      }

      const remaining = await getOfflineQueue();
      if (remaining.length > 0) {
        console.warn(`⚠ ${remaining.length} stavki nije sinhronizovano`);
        return false;
      }

      console.log('✓ Sinhronizacija potpuno uspješna!');
      return true;
    } catch (err) {
      console.error('Greška pri sinhronizaciji:', err);
      return false;
    } finally {
      this._isSyncing = false;
    }
  }

  private groupByTable(queue: OfflineAction[]) {
    return queue.reduce(
      (acc, action) => {
        if (!acc[action.table]) acc[action.table] = [];
        acc[action.table].push(action);
        return acc;
      },
      {} as Record<string, OfflineAction[]>
    );
  }

  private async syncTable(table: string, actions: OfflineAction[]) {
    const creates = actions.filter((a) => a.action === 'create');
    const updates = actions.filter((a) => a.action === 'update');
    const deletes = actions.filter((a) => a.action === 'delete');

    if (creates.length > 0) {
      const data = creates.map((a) => a.data);
      const { error } = await supabase.from(table).insert(data);
      if (error && error.code !== '23505') {
        // 23505 = duplicate key, već postoji — OK
        console.error(`Greška pri kreiranju u ${table}:`, error);
        throw error;
      }
    }

    for (const action of updates) {
      // FIX #5: Preimenovano u 'fields' da ne zasjenjuje parametar
      const { id, ...fields } = action.data;
      const { error } = await supabase.from(table).update(fields).eq('id', id);
      if (error) {
        console.error(`Greška pri ažuriranju u ${table}:`, error);
        throw error;
      }
    }

    for (const action of deletes) {
      const { error } = await supabase.from(table).delete().eq('id', action.data.id);
      if (error) {
        console.error(`Greška pri brisanju iz ${table}:`, error);
        throw error;
      }
    }
  }

  async downloadChanges(userId: string): Promise<boolean> {
    try {
      console.log('Preuzimam promjene...');

      // Tabele koje imaju direktan user_id filter
      const userTables = ['ptice', 'sezona', 'kavezi'];

      // Tabele bez direktnog user_id (RLS štiti, ali ne filtriramo eksplicitno)
      const globalTables = ['vrsta_ptica', 'faze_ciklusa'];

      // Tabele koje trebaju join (dohvatamo sve za korisnika via sezona)
      const sezonaTables = ['parovi', 'ciklusi', 'aktivnosti_ciklusa'];

      // FIX #6: Svaka tabela se filtrira po userId gdje je moguće
      for (const table of userTables) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq('user_id', userId);

        if (error) {
          console.error(`Greška pri preuzimanju ${table}:`, error);
          continue;
        }

        if (data && data.length > 0) {
          await (db as any)[table].bulkPut(data);
          console.log(`✓ ${table}: ${data.length} stavki`);
        }
      }

      for (const table of globalTables) {
        const { data, error } = await supabase.from(table).select('*');

        if (error) {
          console.error(`Greška pri preuzimanju ${table}:`, error);
          continue;
        }

        if (data && data.length > 0) {
          await (db as any)[table].bulkPut(data);
          console.log(`✓ ${table}: ${data.length} stavki`);
        }
      }

      // Dohvati sezona ID-eve za ovog korisnika, pa filtriraj ostale tabele
      const { data: sezoneData } = await supabase
        .from('sezona')
        .select('id')
        .eq('user_id', userId);

      if (sezoneData && sezoneData.length > 0) {
        const sezonaIds = sezoneData.map((s) => s.id);

        for (const table of sezonaTables) {
          const { data, error } = await supabase
            .from(table)
            .select('*')
            .in('sezona_id', sezonaIds);

          if (error) {
            console.error(`Greška pri preuzimanju ${table}:`, error);
            continue;
          }

          if (data && data.length > 0) {
            await (db as any)[table].bulkPut(data);
            console.log(`✓ ${table}: ${data.length} stavki`);
          }
        }
      }

      return true;
    } catch (err) {
      console.error('Greška pri preuzimanju promjena:', err);
      return false;
    }
  }

  // FIX #8: Pravo ime bez $ sufiksa ($ je rezervisan za Svelte stores)
  isSyncing(): boolean {
    return this._isSyncing;
  }
}

export const syncEngine = new SyncEngine();

// FIX #3: Ispravna implementacija sa čuvanjem referenci na handlere
export function detectOnlineStatus(callback: (online: boolean) => void): () => void {
  callback(navigator.onLine);

  const onOnline = () => callback(true);
  const onOffline = () => callback(false);

  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  // Vraća cleanup funkciju — pozovi je u onDestroy() u Svelte komponenti
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}
