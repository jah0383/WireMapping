import { db } from './db';
import { supabase } from './supabase';
import { TABLE_ORDER, type TableName, type SyncQueueEntry } from './types';

let isSyncing = false;

/**
 * Enqueue a local mutation for later sync to Supabase.
 * Called after every Dexie write.
 */
export async function enqueueChange(
  table: TableName,
  recordId: string,
  operation: SyncQueueEntry['operation'],
  data?: Record<string, unknown>,
): Promise<void> {
  await db.syncQueue.add({
    table,
    recordId,
    operation,
    data,
    timestamp: Date.now(),
    status: 'pending',
  });

  // Optimistic: try to push immediately if online
  if (navigator.onLine) {
    processSyncQueue().catch(() => {
      // Silently fail -- will retry on next trigger
    });
  }
}

/**
 * Drain the pending sync queue by replaying mutations against Supabase.
 * Inserts are processed in FK dependency order; deletes in reverse.
 */
export async function processSyncQueue(): Promise<{
  processed: number;
  errors: number;
}> {
  if (isSyncing) return { processed: 0, errors: 0 };
  isSyncing = true;

  let processed = 0;
  let errors = 0;

  try {
    const pending = await db.syncQueue
      .where('status')
      .equals('pending')
      .sortBy('timestamp');

    if (pending.length === 0) return { processed: 0, errors: 0 };

    // Sort: inserts/updates in FK order, deletes in reverse FK order
    const sorted = [...pending].sort((a, b) => {
      const orderA = TABLE_ORDER.indexOf(a.table as TableName);
      const orderB = TABLE_ORDER.indexOf(b.table as TableName);

      if (a.operation === 'DELETE' && b.operation === 'DELETE') {
        return orderB - orderA; // reverse for deletes
      }
      if (a.operation === 'DELETE') return 1; // deletes after inserts/updates
      if (b.operation === 'DELETE') return -1;

      // Same operation type: sort by table dependency, then timestamp
      if (orderA !== orderB) return orderA - orderB;
      return a.timestamp - b.timestamp;
    });

    for (const entry of sorted) {
      try {
        await pushEntry(entry);
        await db.syncQueue.update(entry.id!, { status: 'synced' });
        processed++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        // Network errors: stop processing, will retry later
        if (isNetworkError(err)) {
          break;
        }

        // Data errors: mark as error, continue to next
        await db.syncQueue.update(entry.id!, {
          status: 'error',
          errorMessage: message,
        });
        errors++;
      }
    }

    // Clean up synced entries
    await db.syncQueue.where('status').equals('synced').delete();
  } finally {
    isSyncing = false;
  }

  return { processed, errors };
}

async function pushEntry(entry: SyncQueueEntry): Promise<void> {
  const { table, recordId, operation, data } = entry;

  switch (operation) {
    case 'INSERT': {
      // Use upsert to handle re-push of already-synced inserts
      const { error } = await supabase.from(table).upsert(data!);
      if (error) throw new Error(`INSERT ${table}/${recordId}: ${error.message}`);
      break;
    }
    case 'UPDATE': {
      const { error } = await supabase
        .from(table)
        .update(data!)
        .eq('id', recordId);
      if (error) throw new Error(`UPDATE ${table}/${recordId}: ${error.message}`);
      break;
    }
    case 'DELETE': {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', recordId);
      if (error) throw new Error(`DELETE ${table}/${recordId}: ${error.message}`);
      break;
    }
  }
}

/**
 * Pull all data from Supabase and upsert into Dexie.
 * Handles server-side deletes by removing local records not present on server.
 */
export async function pullFromServer(): Promise<void> {
  if (!navigator.onLine) return;

  for (const table of TABLE_ORDER) {
    const { data, error } = await supabase.from(table).select('*');
    if (error) {
      console.error(`Pull failed for ${table}:`, error.message);
      continue;
    }

    if (!data) continue;

    const dexieTable = db.table(table);

    // Upsert all server records into Dexie
    await dexieTable.bulkPut(data);

    // Remove local records not present on server (handles server-side deletes)
    const serverIds = new Set(data.map((r: { id: string }) => r.id));
    const localRecords = await dexieTable.toArray();
    const toDelete = localRecords
      .filter((r: { id: string }) => !serverIds.has(r.id))
      .map((r: { id: string }) => r.id);

    if (toDelete.length > 0) {
      await dexieTable.bulkDelete(toDelete);
    }
  }
}

/**
 * Full sync: push local changes, then pull server state.
 */
export async function fullSync(): Promise<void> {
  await processSyncQueue();
  await pullFromServer();
}

function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError && err.message.includes('fetch')) return true;
  if (err instanceof Error && err.message.includes('NetworkError')) return true;
  return !navigator.onLine;
}

// Auto-sync when coming back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    fullSync().catch(console.error);
  });
}
