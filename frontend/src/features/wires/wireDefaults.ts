import { db } from '@/lib/db';
import type { Cable, Element } from '@/lib/types';

interface WireDefaults {
  gauge: string | null;
  color: string | null;
  wire_type: string | null;
}

/**
 * Resolve wire property defaults from the hierarchy:
 *   manual value > cable defaults > element defaults
 *
 * Returns defaults from cable and element levels (the manual
 * values are what the user types, so they override in the form).
 */
export async function resolveWireDefaults(
  cableId: string | null,
  end1TerminalId: string | null,
  end2TerminalId: string | null,
): Promise<WireDefaults> {
  const defaults: WireDefaults = { gauge: null, color: null, wire_type: null };

  // Cable-level defaults (medium priority)
  if (cableId) {
    const cable = await db.cables.get(cableId);
    if (cable) {
      applyCableDefaults(defaults, cable);
    }
  }

  // Element-level defaults (lowest priority — only fill nulls)
  const elementIds = new Set<string>();
  for (const termId of [end1TerminalId, end2TerminalId]) {
    if (!termId) continue;
    const terminal = await db.terminals.get(termId);
    if (terminal) elementIds.add(terminal.element_id);
  }

  for (const elId of elementIds) {
    const element = await db.elements.get(elId);
    if (element) {
      applyElementDefaults(defaults, element);
    }
  }

  return defaults;
}

function applyCableDefaults(d: WireDefaults, cable: Cable) {
  if (!d.gauge && cable.wire_gauge) d.gauge = cable.wire_gauge;
  if (!d.color && cable.wire_color) d.color = cable.wire_color;
}

function applyElementDefaults(d: WireDefaults, element: Element) {
  if (!d.gauge && element.default_wire_gauge) d.gauge = element.default_wire_gauge;
  if (!d.color && element.default_wire_color) d.color = element.default_wire_color;
  if (!d.wire_type && element.default_wire_type) d.wire_type = element.default_wire_type;
}
