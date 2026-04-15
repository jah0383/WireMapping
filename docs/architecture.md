# WireMapping - Architecture & Code Reference

How the codebase is organized, how data flows, and where to find things. For the *why* behind design decisions, see [`panel_wiring_design_rationale.md`](../panel_wiring_design_rationale.md).

---

## Repo Structure

```
WireMapping/
├── supabase/
│   └── migrations/
│       └── 00001_initial_schema.sql   # Postgres schema (source of truth for DB)
├── frontend/                          # Vite + React 19 + TypeScript PWA
│   ├── vite.config.ts                 # Vite config (Tailwind, PWA, path aliases)
│   ├── tsconfig.app.json              # TypeScript config
│   └── src/
│       ├── main.tsx                   # Entry point
│       ├── App.tsx                    # Router + auth provider + layout
│       ├── index.css                  # Tailwind v4 imports + oklch theme vars
│       ├── lib/                       # Core libraries
│       ├── hooks/                     # Shared React hooks
│       ├── components/                # Shared UI components
│       └── features/                  # Feature modules (auth, projects, etc.)
└── backend/                           # FastAPI (Python) via uv
    ├── pyproject.toml
    └── src/app/
        ├── main.py                    # FastAPI app, CORS, router mounting
        ├── config.py                  # Pydantic settings (env vars)
        ├── dependencies.py            # Supabase admin client, JWT auth
        ├── routers/
        │   └── export.py              # CSV/PDF export endpoints
        └── services/
            ├── csv_export.py          # ZIP of CSVs generation
            └── pdf_export.py          # Formatted PDF via reportlab
```

---

## Data Model

Six entity tables in a strict hierarchy:

```
Project (1) ──→ Machine (1)
                  ├──→ Element (many) ──→ Terminal (many)
                  ├──→ Cable (many)
                  └──→ Wire (many)
                          ├── end1 → Terminal (or external/unknown)
                          ├── end2 → Terminal (or external/unknown)
                          └── cable_id → Cable (optional)
```

- **1:1 Project→Machine** in v1 (machine auto-created with project)
- **Wire ends** are interchangeable (no directional meaning)
- Each wire end has a `type` enum: `terminal` (linked to a Terminal), `external` (leaves the machine), or `unknown`
- Schema: [`supabase/migrations/00001_initial_schema.sql`](../supabase/migrations/00001_initial_schema.sql)
- TypeScript types: [`frontend/src/lib/types.ts`](../frontend/src/lib/types.ts)

---

## Offline-First Architecture

All reads and writes go through **Dexie.js** (IndexedDB wrapper) as the local source of truth. Changes are queued for sync to Supabase when online.

### Key files

| File | Purpose |
|---|---|
| [`lib/db.ts`](../frontend/src/lib/db.ts) | Dexie database definition (7 tables: 6 entities + syncQueue) |
| [`lib/sync.ts`](../frontend/src/lib/sync.ts) | Sync engine: `enqueueChange()`, `processSyncQueue()`, `pullFromServer()`, `fullSync()` |
| [`lib/supabase.ts`](../frontend/src/lib/supabase.ts) | Supabase client singleton |
| [`hooks/useEntityCRUD.ts`](../frontend/src/hooks/useEntityCRUD.ts) | Generic CRUD hook wrapping Dexie + sync queue |
| [`hooks/useOnlineStatus.ts`](../frontend/src/hooks/useOnlineStatus.ts) | Reactive `navigator.onLine` via `useSyncExternalStore` |
| [`hooks/useSyncStatus.ts`](../frontend/src/hooks/useSyncStatus.ts) | Pending count, error count, syncing flag from syncQueue table |

### Data flow

```
User action
  → useEntityCRUD.create/update/remove()
    → Dexie write (immediate, UI updates via useLiveQuery)
    → enqueueChange() appends to syncQueue table
      → if online: processSyncQueue() pushes to Supabase immediately
      → if offline: stays in queue until online event fires fullSync()
```

### Sync queue ordering

Inserts are pushed in FK dependency order, deletes in reverse:
```
Insert order: projects → machines → elements → terminals → cables → wires
Delete order: wires → cables → terminals → elements → machines → projects
```

Defined as `TABLE_ORDER` in [`lib/types.ts`](../frontend/src/lib/types.ts), used by `processSyncQueue()` in [`lib/sync.ts`](../frontend/src/lib/sync.ts).

---

## Frontend Architecture

### Routing ([`App.tsx`](../frontend/src/App.tsx))

| Route | Component | Description |
|---|---|---|
| `/login` | `LoginPage` | Public |
| `/signup` | `SignUpPage` | Public |
| `/projects` | `ProjectListPage` | Home screen, card list |
| `/projects/new` | `ProjectCreatePage` | Create project + blank machine |
| `/projects/:id` | `ProjectDetailPage` | Hub: machine info, element/cable/wire tabs, export |
| `/projects/:projectId/elements/:elementId` | `ElementDetailPage` | Element info + terminal list |
| `/projects/:projectId/wires/new` | `WireEntryPage` | Full-page rapid wire entry |

All protected routes are wrapped in `AuthGuard` → `AppLayout`.

### Auth ([`features/auth/`](../frontend/src/features/auth/))

| File | Purpose |
|---|---|
| `AuthContext.tsx` | React context wrapping `supabase.auth.onAuthStateChange()`, triggers `fullSync()` on login |
| `AuthGuard.tsx` | Redirects to `/login` if no session |
| `LoginPage.tsx` | Email/password sign-in form |
| `SignUpPage.tsx` | Registration with password confirmation |

### Layout & Shared Components ([`components/`](../frontend/src/components/))

| File | Purpose |
|---|---|
| `AppLayout.tsx` | Sticky header (back button, title, sync indicator, sign out), main content area, PWA update prompt |
| `FormField.tsx` | Label + Input with `enterKeyHint` and `onNext` for rapid-entry UX |
| `SelectWithCustom.tsx` | Dropdown with predefined options + "Custom..." free text escape hatch |
| `ConfirmDialog.tsx` | Reusable destructive confirmation dialog |
| `EmptyState.tsx` | Friendly empty state with action button |
| `SyncStatusIndicator.tsx` | Green/yellow/red/grey dot reflecting sync state |
| `PwaUpdatePrompt.tsx` | "New version available" banner with reload button |

### Feature Modules

Each feature lives in `features/<name>/` and typically contains list sections, create/edit modals, and detail pages.

#### Projects ([`features/projects/`](../frontend/src/features/projects/))
- `ProjectListPage.tsx` — home screen with project cards
- `ProjectCreatePage.tsx` — form that creates both a Project and a blank Machine
- `ProjectDetailPage.tsx` — hub page with machine card, tabbed sections (Elements/Cables/Wires), export panel
- `ProjectEditModal.tsx` — edit project fields in a dialog

#### Machines ([`features/machines/`](../frontend/src/features/machines/))
- `MachineForm.tsx` — reusable form with all machine fields
- `MachineEditModal.tsx` — wraps MachineForm in a dialog

#### Elements ([`features/elements/`](../frontend/src/features/elements/))
- `ElementListSection.tsx` — card list with terminal counts
- `ElementCreateModal.tsx` — full form with `SelectWithCustom` for type, wire default fields
- `ElementEditModal.tsx` — edit all element fields
- `ElementDetailPage.tsx` — element info + autofill toggle + terminal list

#### Terminals ([`features/terminals/`](../frontend/src/features/terminals/))
- `TerminalListSection.tsx` — compact chip layout
- `TerminalCreateModal.tsx` — "Add & Next" rapid entry with autofill suggestion
- `TerminalEditModal.tsx` — edit/delete terminal
- `TerminalBulkGenerateModal.tsx` — range generation (e.g. "1" to "10"), preview before confirm
- `autofillPairs.ts` — IEC pair rules (e.g. relay "13"→"14"), `getAutofillSuggestion()` function

#### Cables ([`features/cables/`](../frontend/src/features/cables/))
- `CableListSection.tsx` — card list with wire counts
- `CableCreateModal.tsx` — full form with `onCreated` callback for inline wire entry
- `CableEditModal.tsx` — edit/delete cable

#### Wires ([`features/wires/`](../frontend/src/features/wires/))
- `WireEntryPage.tsx` — full-page rapid entry: wire fields, cable dropdown, two terminal pickers, "Save & Next" loop
- `WireListSection.tsx` — card list with resolved endpoint labels ("K1:A1 → TB1:1")
- `WireEditModal.tsx` — edit all wire fields, async-loads terminal picker values
- `TerminalPicker.tsx` — two-step element→terminal selection, supports "K1:14" text parsing, External/Unknown options
- `wireDefaults.ts` — resolves effective wire properties: manual > cable > element defaults

#### Export ([`features/export/`](../frontend/src/features/export/))
- `ExportPanel.tsx` — two buttons (CSV/PDF), fetches from backend API when online, generates CSV from Dexie when offline

### Wire Defaults Hierarchy

When a wire form loads or selections change, [`wireDefaults.ts`](../frontend/src/features/wires/wireDefaults.ts) resolves default values:

```
Priority: manual entry > cable defaults > element defaults

1. If a cable is selected → use cable.wire_gauge, cable.wire_color
2. If end1 or end2 connects to a terminal → look up that terminal's element's
   default_wire_gauge, default_wire_color, default_wire_type
3. Only fill empty fields (never overwrite manual entries)
```

### Terminal Autofill ([`autofillPairs.ts`](../frontend/src/features/terminals/autofillPairs.ts))

When autofill is enabled on an element, after creating a terminal the system suggests the next terminal designation based on IEC conventions. E.g. for a Contactor:
- "A1" → suggests "A2" (coil pair)
- "13" → suggests "14" (NO contact pair)
- "21" → suggests "22" (NC contact pair)

---

## Backend Architecture

The backend is intentionally thin — only used for export operations that need server-side processing (PDF generation via reportlab).

### Key files

| File | Purpose |
|---|---|
| [`main.py`](../backend/src/app/main.py) | FastAPI app, CORS config, mounts export router at `/api` |
| [`config.py`](../backend/src/app/config.py) | Pydantic `BaseSettings` reading from `.env` |
| [`dependencies.py`](../backend/src/app/dependencies.py) | `SupabaseAdmin` (service role client), `CurrentUser` (JWT validation) |
| [`routers/export.py`](../backend/src/app/routers/export.py) | `GET /api/export/{project_id}/csv` and `/pdf` endpoints |
| [`services/csv_export.py`](../backend/src/app/services/csv_export.py) | Queries all project data, generates ZIP of CSV files |
| [`services/pdf_export.py`](../backend/src/app/services/pdf_export.py) | Generates formatted PDF with reportlab (cover page, tables) |

### API Endpoints

| Method | Path | Auth | Response |
|---|---|---|---|
| `GET` | `/health` | None | `{"status": "ok"}` |
| `GET` | `/api/export/{project_id}/csv` | Bearer token | ZIP file (`application/zip`) |
| `GET` | `/api/export/{project_id}/pdf` | Bearer token | PDF file (`application/pdf`) |

Both export endpoints validate the JWT via `CurrentUser` dependency, then use `SupabaseAdmin` (service role) to query all project data from Supabase.

### Export Details

**CSV export** produces a ZIP containing:
- `{project}_project.csv`
- `{project}_machines.csv`
- `{project}_elements.csv`
- `{project}_terminals.csv` (with element_designation column)
- `{project}_cables.csv`
- `{project}_wires.csv` (with resolved "K1:A1" endpoint labels, not UUIDs)

**PDF export** produces a formatted report with sections:
1. Cover page (project name, date, performed by, reason)
2. Machine details (key-value list)
3. Elements & Terminals table
4. Cable summary table
5. Wire schedule table (the primary deliverable)

---

## PWA Configuration

Configured in [`vite.config.ts`](../frontend/vite.config.ts) via `vite-plugin-pwa`:

- **Register type**: `prompt` — shows a "New version available" banner instead of silently updating
- **Strategy**: `GenerateSW` (Workbox generates the service worker)
- **Precache**: all JS, CSS, HTML, fonts, icons
- **Manifest**: standalone display, portrait orientation, dark theme color (`#0f172a`)
- **Update prompt**: [`PwaUpdatePrompt.tsx`](../frontend/src/components/PwaUpdatePrompt.tsx) uses `useRegisterSW` from `virtual:pwa-register/react`

---

## Styling

- **Tailwind CSS v4** via `@tailwindcss/vite` plugin
- **shadcn/ui** components in `components/ui/`
- **Dark mode**: always on — `<div className="dark">` wraps the entire app in `App.tsx`
- **Theme**: oklch color variables defined in [`index.css`](../frontend/src/index.css)
- **Font**: Geist Variable (via `@fontsource-variable/geist`)
- **Toast notifications**: sonner (via shadcn's `Toaster` wrapper in [`components/ui/sonner.tsx`](../frontend/src/components/ui/sonner.tsx))
