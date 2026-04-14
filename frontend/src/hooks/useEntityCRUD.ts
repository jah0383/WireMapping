import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { enqueueChange } from '@/lib/sync';
import type { TableName } from '@/lib/types';

/**
 * Generic CRUD hook over Dexie + sync queue.
 * All reads come from Dexie (reactive via useLiveQuery).
 * All writes go to Dexie and are enqueued for sync.
 */
export function useEntityCRUD<T extends { id: string }>(
  tableName: TableName,
  indexFilter?: { index: string; value: string },
) {
  const items = useLiveQuery(() => {
    const table = db.table<T>(tableName);
    if (indexFilter) {
      return table.where(indexFilter.index).equals(indexFilter.value).toArray();
    }
    return table.toArray();
  }, [tableName, indexFilter?.index, indexFilter?.value]);

  async function create(record: T): Promise<void> {
    const now = new Date().toISOString();
    const withTimestamps = {
      ...record,
      created_at: now,
      updated_at: now,
    };
    await db.table(tableName).put(withTimestamps);
    await enqueueChange(
      tableName,
      record.id,
      'INSERT',
      withTimestamps as unknown as Record<string, unknown>,
    );
  }

  async function update(
    id: string,
    changes: Partial<T>,
  ): Promise<void> {
    const updated = { ...changes, updated_at: new Date().toISOString() };
    await db.table(tableName).update(id, updated);

    // Fetch the full record to send to Supabase
    const full = await db.table(tableName).get(id);
    if (full) {
      await enqueueChange(
        tableName,
        id,
        'UPDATE',
        full as unknown as Record<string, unknown>,
      );
    }
  }

  async function remove(id: string): Promise<void> {
    await db.table(tableName).delete(id);
    await enqueueChange(tableName, id, 'DELETE');
  }

  async function getById(id: string): Promise<T | undefined> {
    return db.table<T>(tableName).get(id);
  }

  return {
    items: items ?? [],
    loading: items === undefined,
    create,
    update,
    remove,
    getById,
  };
}
