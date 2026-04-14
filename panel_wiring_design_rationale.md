# Panel Wiring App - Design Rationale

This document explains the *why* behind decisions in the planning doc.
It exists so that collaborators (human or AI) do not re-open settled questions
without good reason. If you think a decision is wrong, read the rationale first.

---

## Architecture Decisions

### React PWA, not a native app
The user needs the app on both phone and PC, editing the same data. A PWA is
installable on both without an app store, shares one codebase, and works in
any browser as a fallback. Native apps were ruled out due to the overhead of
maintaining two codebases and the store submission process.

### FastAPI backend
The user is a Python developer. The backend is intentionally thin (validation,
auth token forwarding, business logic). FastAPI was chosen over Flask for
automatic request validation via Pydantic and automatic OpenAPI docs, which
will help when the schema evolves.

### Supabase
Single-user app where cloud sync is the main reason for a backend at all.
Supabase provides Postgres, Auth, and a JS client in one service with a
usable free tier. It also makes it straightforward to add row-level security
later if multi-user is ever needed.

### Dark mode from the start
The app is used in industrial environments -- machine rooms, control panels,
sometimes outdoors or in poorly lit spaces. Dark mode is not cosmetic here,
it is a usability requirement. Retrofitting dark mode is painful; it was
prioritised from day one.

---

## Data Model Decisions

### Wire is a child of Cable, not a sibling
Standalone wires and cabled wires are the same entity. `cable_id` is nullable:
null means standalone. This avoids a supertype ("Connection") with two subtypes
that share almost all fields. It keeps queries simple and the migration path to
adding cables is just setting `cable_id` on existing wires.

### end1_type is stored, not fully inferred
`end1_terminal_id` being non-null implies the end is a "terminal" connection.
However, the diagram renderer and export logic need to branch on "external" vs
"unknown" explicitly, so those values need to be stored. The rule is: if
`end1_terminal_id` is set, `end1_type` must be "terminal" and is enforced at
the API layer. The frontend does not need to show this field to the user; it
is set automatically.

### Element is the universal container type
Terminal blocks, motors, relays, push buttons -- all of these are "things with
terminals." Rather than separate tables for each (which would require union
queries everywhere), they share the Element table with a `type` field. The type
field uses a predefined list with a custom escape hatch so data stays consistent
without being over-constrained.

### Wire property defaults hierarchy: manual > cable > element
Cables often have a dominant wire color or gauge that describes the cable as a
whole ("the cable with the black wires"), but individual wires within a cable
can deviate. Element-level defaults are even lower priority -- a convenience for
when you know all connections on a terminal block share a gauge. Manual entry
always wins. This hierarchy is about pre-population of form fields, not
enforcement; nothing stops a wire from having different properties than its
cable.

### Terminal purpose is nullable
Not every terminal has a meaningful "purpose" label in practice. Forcing it
would slow down data entry for terminal blocks where the purpose is implicit
from position. It is captured when known.

### Wire designation is nullable
In "trace mode" (physically following a wire) you may not know or care what the
wire is called. Designation is an identifier for when wires are pre-labelled
(e.g. from a wiring schedule). Forcing it would make the app unusable for
unlabelled panels.

### Jumpers are allowed (both ends on same element)
Short jumpers between terminals on the same terminal block are common in real
panels. Disallowing same-element connections would be wrong. The UI must handle
this case in the terminal picker without treating it as an error.

### Project and Machine are separate records
Machine is the physical device (manufacturer, model, serial number). Project is
the job (who did it, when, why). A machine is a permanent thing; a job done on
it is an event. Separating them now avoids a future migration when multi-job
history is needed. For now, each project has exactly one machine.

---

## UX Decisions

### Separate edit modal, not inline editing
Inline editing on mobile is error-prone -- small tap targets, no clear save
action, easy to accidentally change the wrong field. A modal gives a clear
editing context, a visible save/cancel action, and keeps the list visible
behind it for orientation. The extra tap to open the modal is worth it.

### Rapid entry with enterKeyHint="next"
The dominant use case is standing in front of a panel entering data quickly.
Requiring the user to tap between fields breaks the flow. `enterKeyHint="next"`
makes the phone keyboard show a labelled "Next" button instead of a generic
return key, which signals the interaction pattern clearly.

### Wire entry: wire-first, then assign to cable
The natural workflow when standing in front of a panel is "I'm tracing this
wire" not "I'm documenting this cable." Creating a cable first and then
navigating back to add wires to it breaks the flow. Wires can be assigned to
an existing cable or trigger inline cable creation during wire entry. Cables
can also be created independently from the cables list.

### Two-step terminal picker + text parsing
A flat list of every terminal in the project becomes unusable at scale (a single
project might have hundreds of terminals). The two-step picker (element first,
then terminal) scopes the list to something manageable. The "element:terminal"
text format (e.g. "K1:14") is for users who know exactly what they want and
don't want to tap through two lists.

### Terminal autofill pairs are opt-in per element
Not all elements follow IEC standard terminal conventions, and conventions vary
by manufacturer and region. Autofill pairs are useful for relays and contactors
but would be noise on a custom terminal block. Toggling per element keeps it
helpful without being presumptuous.

### Bulk terminal generation: numeric suffix rule
"1 to 24" and "A1 to A10" are mechanical to generate. Arbitrary designation
patterns are not. Rather than building a complex parser, the rule is: if the
designation ends in a number, bulk generate works; otherwise use manual entry.
This covers the vast majority of real-world terminal blocks.

### Mode A (wire-centric) before Mode B (terminal-centric)
Both modes are useful. Mode A (create a wire, pick both ends) works adequately
for both pre-labelled and unlabelled panels even if it is not optimal for the
latter. Mode B (navigate to a terminal, add connection from there) is a better
fit for trace-mode work but requires more UI infrastructure. Building Mode A
first gets a usable product faster without blocking Mode B later.

---

## Things Deliberately Left Open

- **Mode toggle granularity:** whether the wire entry mode (schedule vs trace) is
  a session setting, per-project, or per-entry is not decided. It needs hands-on
  use of Mode A before the right answer is obvious.

- **Diagram rendering details:** deferred until wire entry is complete. The data
  model supports it; the rendering decisions (layout algorithm, how to handle
  external stubs, etc.) should be made with real data to look at.

- **CSV schema:** column names and structure for the CSV export are not specified.
  These should be decided at implementation time when the full field list is
  finalised.
