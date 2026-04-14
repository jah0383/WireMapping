# Panel Wiring App - Planning Document

## Overview

A mobile-first web app (React PWA) for recording the wiring of control panels,
with eventual PDF/CSV export and a point-to-point wiring diagram view.
Single user, cloud-backed so the same data is accessible from phone and PC.

---

## Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | React PWA | Installable on phone + desktop, no app store, sets up well for react-flow diagrams later |
| Styling | Tailwind + shadcn/ui | Mobile-first, accessible components, dark mode support built in |
| Backend | FastAPI (Python) | Thin validation/logic layer |
| Auth | Supabase Auth | Email/password, single user, built into the same Supabase project |
| Database | Supabase (Postgres) | Free tier, works well with both phone and PC |
| Diagrams (later) | react-flow | Point-to-point wiring diagrams |

---

## Data Model

### Project
```
id
name
date_started
performed_by          -- free text name, not an account system
reason_for_work
```

### Machine
```
id
project_id            FK -> Project
manufacturer
date_manufactured
model_number
serial_number
voltage
amperage
phases
control_voltage
```

### Element
Any container of terminal connection points: motors, relays, contactors,
terminal blocks, push buttons, etc.

```
id
machine_id            FK -> Machine
name
designation
type                  -- enum with custom escape hatch (see Predefined Lists)
rating
part_number
coil_rating

-- Wire property defaults for wires connected to this element's terminals.
-- Lowest priority in the defaults hierarchy (manual > cable > element).
-- All nullable.
default_wire_gauge
default_wire_color
default_wire_type
```

### Terminal
A connection point on an element.

```
id
element_id            FK -> Element
designation           -- e.g. 1, 2, A1, L1, U
purpose               -- enum with custom escape hatch (see Predefined Lists), nullable
```

### Cable
An optional grouping of wires running together.

```
id
machine_id            FK -> Machine
designation
wire_gauge            nullable
num_wires             nullable
cable_type            nullable
part_number           nullable
has_ground            nullable boolean
wire_color            nullable   -- descriptive default color, not enforced on all wires
diameter              nullable
length                nullable
```

### Wire
The atomic unit of connection. Standalone wire = cable_id is null.

```
id
machine_id            FK -> Machine
cable_id              FK -> Cable, nullable
designation           nullable
gauge                 nullable
wire_type             nullable
color                 nullable
length                nullable

-- End 1
end1_terminal_id      FK -> Terminal, nullable
end1_type             inferred: "terminal" if end1_terminal_id set,
                               else "external" or "unknown" (stored as enum)
end1_note             free text, nullable

-- End 2
end2_terminal_id      FK -> Terminal, nullable
end2_type             same as above
end2_note             free text, nullable
```

Wire property defaults hierarchy (highest to lowest priority):
1. Manually entered value on the wire record
2. Parent cable's wire_gauge / wire_color
3. Parent element's default_wire_gauge / default_wire_color / default_wire_type

Rules:
- All end fields nullable -- partial records are valid during data entry
- Jumpers (both ends on the same element) are explicitly allowed
- If end_type is "external" or "unknown", end_terminal_id must be null

### Entity Hierarchy
```
Project
  └── Machine
        ├── Element
        │     └── Terminal  <-- Wire.end1 / Wire.end2 reference here
        └── Cable
              └── Wire  (cable_id nullable for standalone)
                    ├── end1 -> Terminal | external | unknown
                    └── end2 -> Terminal | external | unknown
```

---

## Predefined Lists

Both use a dropdown with a "Custom..." escape hatch that reveals a free text field.

### Element Types
- Motor
- Relay
- Contactor
- Terminal Block
- Push Button
- Selector Switch
- Pilot Light
- Circuit Breaker
- Fuse
- Timer Relay
- Variable Frequency Drive (VFD)
- Power Supply
- PLC
- Custom...

### Terminal Purpose
- Lead
- Supply
- Supply Common
- Logic
- Logic Common
- Coil +
- Coil -
- NO (Normally Open)
- NC (Normally Closed)
- Trigger
- Trigger Common
- Ground
- Custom...

---

## Terminal Autofill Pairs

When a terminal designation is entered, the app can suggest the paired terminal
and pre-populate the next terminal row. Togglable per element (off by default,
since not all elements follow standard conventions).

**Flag for review: these follow IEC conventions and may vary by manufacturer.**

| Element Type | Terminal | Suggested Pair |
|---|---|---|
| Relay, Timer Relay | A1 | A2 |
| Relay, Timer Relay | 11 | 12 (NC) |
| Relay, Timer Relay | 13 | 14 (NO) |
| Relay, Timer Relay | 21 | 22 (NC) |
| Relay, Timer Relay | 23 | 24 (NO) |
| Relay, Timer Relay | 31 | 32 (NC) |
| Relay, Timer Relay | 33 | 34 (NO) |
| Relay, Timer Relay | 41 | 42 (NC) |
| Relay, Timer Relay | 43 | 44 (NO) |
| Contactor | A1 | A2 |
| Contactor | 1 | 2 |
| Contactor | 3 | 4 |
| Contactor | 5 | 6 |
| Contactor | 13 | 14 (aux NO) |
| Contactor | 11 | 12 (aux NC) |
| Push Button | 13 | 14 (NO) |
| Push Button | 11 | 12 (NC) |
| Push Button | 23 | 24 (NO) |
| Push Button | 21 | 22 (NC) |
| Circuit Breaker | 1 | 2 |
| Circuit Breaker | 3 | 4 |
| Circuit Breaker | 5 | 6 |
| Motor | U1 | V1 then W1 |
| Motor | U2 | V2 then W2 |

---

## UX Patterns

### General
- Mobile-first layout throughout
- Dark mode supported from the start (industrial environments, poorly lit panels)
- `enterKeyHint="next"` on all inputs so phone keyboard shows a "Next" button
- Pressing Enter/Next moves focus to the next input in the form
- After the last field in a record, Enter saves and opens the next record
- Separate edit modal per record (overlay, not inline) -- keeps list context visible

### Home Screen
Project list/dashboard. Each project shows name, date started, performed by.
Tap to open. Button to create new project.

### Rapid Entry Flow

Entry order enforced by data dependencies:
1. Project + Machine details
2. Elements + their Terminals
3. Wires (standalone or assigned to a cable during entry)
4. Cables (can also be created ad hoc during wire entry)

### Terminal Bulk Entry

Two options when adding terminals to an element:

**Bulk generate:** Enter start and end designation (or count), optional purpose
applied to all. Works for numeric suffixes: "1 to 24", "A1 to A10", "L1 to L3".
Falls back to manual for non-patterned designations.

**Manual:** One terminal at a time with rapid-entry flow, with optional autofill
pair suggestion (see Terminal Autofill Pairs above, togglable per element).

### Wire Property Defaults + Bulk Override
- Element-level defaults pre-populate wire entry fields (lowest priority)
- Cable-level defaults override element defaults when a wire is assigned to a cable
- Manually entered values always win
- Multi-select terminals to apply a property to several at once
  (e.g. select terminals 1, 2, 3 -> "set gauge = 16AWG")

### Wire Entry Modes

**Mode A: Wire-centric / Schedule mode** (v1)
- Create a wire record directly
- Pick end1 and end2 using a two-step terminal picker (select element, then terminal)
- Also accepts typed "element:terminal" format (e.g. "K1:14") in the picker field
- Optionally assign the wire to a cable, or create a new cable inline
- Best for: pre-labelled wires, working from a wiring schedule

**Mode B: Terminal-centric / Trace mode** (v2)
- Navigate to an element and terminal
- Tap "add connection" on that terminal
- Pick or create the other end
- Best for: unmarked wires, physically tracing connections in the panel

Mode is toggleable. Deferred decision: whether this is a session-level setting,
per-project, or per-entry choice.

### Terminal Picker (Wire Entry)
- Two-step: select element first (searchable list), then terminal within it
- Alternatively, type "element_designation:terminal_designation" (e.g. "K1:14")
  and the app parses and resolves it
- Must handle the jumper case: both ends on the same element

---

## Export

- PDF: formatted report (layout TBD at implementation time)
- CSV: one file per entity type -- Projects, Machines, Elements, Terminals, Cables, Wires

---

## Build Order

1. Supabase project + schema migration (SQL migrations, not GUI)
2. Supabase Auth setup (email/password)
3. FastAPI scaffold with Supabase client
4. React PWA scaffold -- mobile-first, Tailwind + shadcn, dark mode
5. Auth screens (login, basic session management)
6. Project list / dashboard (home screen)
7. Project + Machine entry flow
8. Element + Terminal entry flow (bulk generate + manual + autofill pairs)
9. Wire entry flow -- Mode A, including inline cable creation
10. List/browse views for all entities
11. Edit modals
12. PDF/CSV export
13. Wire entry Mode B (trace mode)
14. Diagram view (react-flow, point-to-point)

---

## Open / Deferred Decisions

### Deferred to v2
- Multi-machine projects
- Wire entry Mode B (trace mode)
- Diagram view
- Multi-user / sharing
- Diagram rendering of external connections (dashed stub) and unknown (question mark node)
- Wire entry mode toggle granularity (session vs project vs per-entry)

### Needs UX exploration at implementation time
- How to surface partially-traced wires (one end set, other end null) in the browse view
- Inline cable creation UX during wire entry without breaking the rapid-entry flow
- How to handle a cable where num_wires doesn't match the number of wires assigned to it

---

## Notes for Diagram Phase (Not Blocking)

- Data model already captures everything needed for point-to-point diagrams
- Terminal needs no positional data for a logical wiring diagram
- Physical layout diagram would require slot/position fields on Terminal -- skip for now
- External end renders as labelled stub; unknown end renders as question mark node
- react-flow is the candidate library; evaluate properly when diagram phase starts
