import Dexie, { type Table } from 'dexie';
import type {
  Project,
  Machine,
  Element,
  Terminal,
  Cable,
  Wire,
  SyncQueueEntry,
} from './types';

class WireMappingDB extends Dexie {
  projects!: Table<Project>;
  machines!: Table<Machine>;
  elements!: Table<Element>;
  terminals!: Table<Terminal>;
  cables!: Table<Cable>;
  wires!: Table<Wire>;
  syncQueue!: Table<SyncQueueEntry>;

  constructor() {
    super('WireMappingDB');

    this.version(1).stores({
      projects: 'id, name',
      machines: 'id, project_id',
      elements: 'id, machine_id, type',
      terminals: 'id, element_id',
      cables: 'id, machine_id',
      wires: 'id, machine_id, cable_id, end1_terminal_id, end2_terminal_id',
      syncQueue: '++id, table, recordId, status, timestamp',
    });
  }
}

export const db = new WireMappingDB();
