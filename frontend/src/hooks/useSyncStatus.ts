import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';

interface SyncStatus {
  pendingCount: number;
  errorCount: number;
  isSyncing: boolean;
}

// Module-level syncing state shared with the sync engine
let syncing = false;
export function setSyncing(v: boolean) {
  syncing = v;
}

export function useSyncStatus(): SyncStatus {
  const pendingCount =
    useLiveQuery(() => db.syncQueue.where('status').equals('pending').count()) ?? 0;

  const errorCount =
    useLiveQuery(() => db.syncQueue.where('status').equals('error').count()) ?? 0;

  return {
    pendingCount,
    errorCount,
    isSyncing: syncing,
  };
}
