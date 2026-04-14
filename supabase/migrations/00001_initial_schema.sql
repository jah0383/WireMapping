-- Panel Wiring App - Initial Schema
-- All tables use UUID primary keys generated client-side for offline support.
-- RLS enabled on all tables: any authenticated user has full access (single-user app).

-- =============================================================================
-- Enums
-- =============================================================================

CREATE TYPE end_type_enum AS ENUM ('terminal', 'external', 'unknown');

-- =============================================================================
-- Helper: updated_at trigger function
-- =============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Projects
-- =============================================================================

CREATE TABLE projects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  date_started  DATE,
  performed_by  TEXT,
  reason_for_work TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- Machines
-- =============================================================================

CREATE TABLE machines (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  manufacturer      TEXT,
  date_manufactured DATE,
  model_number      TEXT,
  serial_number     TEXT,
  voltage           TEXT,
  amperage          TEXT,
  phases            TEXT,
  control_voltage   TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_machines_project_id ON machines(project_id);

CREATE TRIGGER machines_updated_at
  BEFORE UPDATE ON machines
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- Elements
-- =============================================================================

CREATE TABLE elements (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id          UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  name                TEXT,
  designation         TEXT,
  type                TEXT,
  rating              TEXT,
  part_number         TEXT,
  coil_rating         TEXT,
  default_wire_gauge  TEXT,
  default_wire_color  TEXT,
  default_wire_type   TEXT,
  autofill_enabled    BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_elements_machine_id ON elements(machine_id);

CREATE TRIGGER elements_updated_at
  BEFORE UPDATE ON elements
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- Terminals
-- =============================================================================

CREATE TABLE terminals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  element_id  UUID NOT NULL REFERENCES elements(id) ON DELETE CASCADE,
  designation TEXT,
  purpose     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_terminals_element_id ON terminals(element_id);

CREATE TRIGGER terminals_updated_at
  BEFORE UPDATE ON terminals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- Cables
-- =============================================================================

CREATE TABLE cables (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id  UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  designation TEXT,
  wire_gauge  TEXT,
  num_wires   INTEGER,
  cable_type  TEXT,
  part_number TEXT,
  has_ground  BOOLEAN,
  wire_color  TEXT,
  diameter    TEXT,
  length      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cables_machine_id ON cables(machine_id);

CREATE TRIGGER cables_updated_at
  BEFORE UPDATE ON cables
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- Wires
-- =============================================================================

CREATE TABLE wires (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id        UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  cable_id          UUID REFERENCES cables(id) ON DELETE SET NULL,
  designation       TEXT,
  gauge             TEXT,
  wire_type         TEXT,
  color             TEXT,
  length            TEXT,

  -- End 1
  end1_terminal_id  UUID REFERENCES terminals(id) ON DELETE SET NULL,
  end1_type         end_type_enum NOT NULL DEFAULT 'unknown',
  end1_note         TEXT,

  -- End 2
  end2_terminal_id  UUID REFERENCES terminals(id) ON DELETE SET NULL,
  end2_type         end_type_enum NOT NULL DEFAULT 'unknown',
  end2_note         TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- If end_type is 'terminal', terminal_id must be set.
  -- If end_type is 'external' or 'unknown', terminal_id must be null.
  CONSTRAINT chk_end1_consistency CHECK (
    (end1_type = 'terminal' AND end1_terminal_id IS NOT NULL) OR
    (end1_type IN ('external', 'unknown') AND end1_terminal_id IS NULL)
  ),
  CONSTRAINT chk_end2_consistency CHECK (
    (end2_type = 'terminal' AND end2_terminal_id IS NOT NULL) OR
    (end2_type IN ('external', 'unknown') AND end2_terminal_id IS NULL)
  )
);

CREATE INDEX idx_wires_machine_id ON wires(machine_id);
CREATE INDEX idx_wires_cable_id ON wires(cable_id);
CREATE INDEX idx_wires_end1_terminal_id ON wires(end1_terminal_id);
CREATE INDEX idx_wires_end2_terminal_id ON wires(end2_terminal_id);

CREATE TRIGGER wires_updated_at
  BEFORE UPDATE ON wires
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE projects  ENABLE ROW LEVEL SECURITY;
ALTER TABLE machines  ENABLE ROW LEVEL SECURITY;
ALTER TABLE elements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE terminals ENABLE ROW LEVEL SECURITY;
ALTER TABLE cables    ENABLE ROW LEVEL SECURITY;
ALTER TABLE wires     ENABLE ROW LEVEL SECURITY;

-- Single-user app: any authenticated user has full access.
CREATE POLICY "Authenticated access" ON projects  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated access" ON machines  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated access" ON elements  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated access" ON terminals FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated access" ON cables    FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated access" ON wires     FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
