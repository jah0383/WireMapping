// Shared TypeScript types matching the Supabase schema.
// Used by both Dexie (local DB) and Supabase (remote) operations.

export type EndType = 'terminal' | 'external' | 'unknown';

export interface Project {
  id: string;
  name: string;
  date_started: string | null;
  performed_by: string | null;
  reason_for_work: string | null;
  created_at: string;
  updated_at: string;
}

export interface Machine {
  id: string;
  project_id: string;
  manufacturer: string | null;
  date_manufactured: string | null;
  model_number: string | null;
  serial_number: string | null;
  voltage: string | null;
  amperage: string | null;
  phases: string | null;
  control_voltage: string | null;
  created_at: string;
  updated_at: string;
}

export interface Element {
  id: string;
  machine_id: string;
  name: string | null;
  designation: string | null;
  type: string | null;
  rating: string | null;
  part_number: string | null;
  coil_rating: string | null;
  default_wire_gauge: string | null;
  default_wire_color: string | null;
  default_wire_type: string | null;
  autofill_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Terminal {
  id: string;
  element_id: string;
  designation: string | null;
  purpose: string | null;
  created_at: string;
  updated_at: string;
}

export interface Cable {
  id: string;
  machine_id: string;
  designation: string | null;
  wire_gauge: string | null;
  num_wires: number | null;
  cable_type: string | null;
  part_number: string | null;
  has_ground: boolean | null;
  wire_color: string | null;
  diameter: string | null;
  length: string | null;
  created_at: string;
  updated_at: string;
}

export interface Wire {
  id: string;
  machine_id: string;
  cable_id: string | null;
  designation: string | null;
  gauge: string | null;
  wire_type: string | null;
  color: string | null;
  length: string | null;
  end1_terminal_id: string | null;
  end1_type: EndType;
  end1_note: string | null;
  end2_terminal_id: string | null;
  end2_type: EndType;
  end2_note: string | null;
  created_at: string;
  updated_at: string;
}

// Sync queue entry for offline support
export interface SyncQueueEntry {
  id?: number;
  table: string;
  recordId: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  data?: Record<string, unknown>;
  timestamp: number;
  status: 'pending' | 'synced' | 'error';
  errorMessage?: string;
}

// Predefined lists with "Custom..." escape hatch

export const ELEMENT_TYPES = [
  'Motor',
  'Relay',
  'Contactor',
  'Terminal Block',
  'Push Button',
  'Selector Switch',
  'Pilot Light',
  'Circuit Breaker',
  'Fuse',
  'Timer Relay',
  'Variable Frequency Drive (VFD)',
  'Power Supply',
  'PLC',
] as const;

export const TERMINAL_PURPOSES = [
  'Lead',
  'Supply',
  'Supply Common',
  'Logic',
  'Logic Common',
  'Coil +',
  'Coil -',
  'NO (Normally Open)',
  'NC (Normally Closed)',
  'Trigger',
  'Trigger Common',
  'Ground',
] as const;

// Table dependency order for sync operations.
// Inserts must follow this order; deletes use reverse order.
export const TABLE_ORDER = [
  'projects',
  'machines',
  'elements',
  'terminals',
  'cables',
  'wires',
] as const;

export type TableName = (typeof TABLE_ORDER)[number];
