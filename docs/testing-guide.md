# WireMapping - Testing Guide

Step-by-step manual testing checklist for all features. Run through these in order — later steps depend on data created in earlier ones.

---

## Prerequisites

### Start the frontend
```bash
cd frontend
npm run dev
```
Open `http://localhost:5173` in a browser. Use DevTools (F12) to toggle a mobile viewport (e.g. iPhone 14, 390×844).

### Start the backend (needed for PDF/CSV export only)
```bash
cd backend
cp .env.example .env  # fill in SUPABASE_URL, SUPABASE_SERVICE_KEY
uv run uvicorn src.app.main:app --reload --port 8000
```

### Environment variables
Frontend needs a `.env` file in `frontend/`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:8000
```

---

## 1. Auth

### Sign Up
1. Navigate to `/signup`
2. Enter email, password, confirm password
3. Click **Sign Up**
4. Expected: redirected to `/projects` (or email confirmation depending on Supabase settings)

### Sign In
1. Navigate to `/login`
2. Enter credentials
3. Click **Sign In**
4. Expected: redirected to `/projects`, header shows "WireMapping" + sync indicator + "Sign Out"

### Sign Out
1. Click **Sign Out** in the header
2. Expected: redirected to `/login`

### Auth Guard
1. While signed out, navigate to `/projects`
2. Expected: redirected to `/login`

---

## 2. Projects

### Create a Project
1. From `/projects`, click **New Project**
2. Fill in:
   - Name: "Test Panel A"
   - Date Started: today's date (pre-filled)
   - Performed By: "Your Name"
   - Reason for Work: "Documentation"
3. Click **Create Project**
4. Expected: toast "Project created", navigated to project detail page
5. Expected: project header shows name, date, performed by, reason

### Edit a Project
1. On the project detail page, click **Edit**
2. Change the name to "Test Panel A (edited)"
3. Save
4. Expected: name updates in the header

### Project List
1. Navigate to `/projects`
2. Expected: "Test Panel A (edited)" appears as a card
3. Click the card — navigates back to the project detail page

---

## 3. Machine Details

### Add Machine Details
1. On the project detail page, find the "Machine Details" card
2. Click **Add Details**
3. Fill in manufacturer, model number, serial number, voltage (e.g. "480V"), amperage, phases (e.g. "3"), control voltage (e.g. "24VDC")
4. Save
5. Expected: machine details grid appears in the card

### Edit Machine Details
1. Click **Edit** on the Machine Details card
2. Change a field, save
3. Expected: updated value shown in the grid

---

## 4. Elements

### Create Elements
1. On the project detail page, select the **Elements** tab
2. Click **Add Element**
3. Create 3 elements:
   - Designation: "K1", Name: "Main Contactor", Type: "Contactor"
   - Designation: "TB1", Name: "Terminal Strip", Type: "Terminal Block"
   - Designation: "M1", Name: "Pump Motor", Type: "Motor"
4. Expected: toast "Element added" each time, elements appear in the list with their type badges

### Element Detail Page
1. Click on "K1" in the element list
2. Expected: navigated to element detail page showing designation, name, type, and other fields
3. Verify the **Details** card shows type, rating, etc. (if populated)

### Edit / Delete Element
1. Click **Edit** on the element detail page, change the rating, save
2. Create a throwaway element, then delete it via the **Delete** button + confirm dialog
3. Expected: toast "Element deleted", navigated back to project detail

---

## 5. Terminals

### Add Terminals Manually
1. On K1's element detail page, click **Add Terminal**
2. Add terminals one by one:
   - Designation: "A1", Purpose: "Coil +"
   - Designation: "A2", Purpose: "Coil -"
3. Expected: terminals appear as chips/buttons in the terminal section

### Autofill Pairs
1. Toggle **Terminal autofill pairs (IEC conventions)** ON
2. Add a terminal with designation "13"
3. Expected: after saving, the next terminal form is pre-filled with "14" (NO pair for contactors)
4. Toggle autofill OFF when done testing

### Bulk Generate Terminals
1. Click **Bulk Generate**
2. Start designation: "1", End designation: "10"
3. Optional: set a purpose (e.g. "Lead")
4. Click preview — should show 1, 2, 3, ... 10
5. Confirm — all 10 terminals created at once
6. Expected: terminals appear in the list

### Edit / Delete Terminal
1. Click a terminal chip to open the edit modal
2. Change the purpose, save
3. Delete a terminal via the modal's Delete button

### Repeat for TB1 and M1
Add a few terminals to each element so there are endpoints for wires later.

---

## 6. Cables

### Create a Cable
1. On the project detail page, select the **Cables** tab
2. Click **Add Cable**
3. Fill in:
   - Designation: "C1"
   - Wire Gauge: "16AWG"
   - # Wires: 4
   - Cable Type: "SOOW"
   - Wire Color: "Black"
4. Save
5. Expected: toast "Cable added", cable appears in the list showing wire count

### Edit / Delete Cable
1. Click the cable card to open the edit modal
2. Change the length, save
3. Create a throwaway cable, delete it, verify toast "Cable deleted"

---

## 7. Wires

### Navigate to Wire Entry
1. On the project detail page, select the **Wires** tab
2. Click **Add Wire**
3. Expected: navigated to the full-page wire entry form

### Add a Standard Wire
1. Fill in:
   - Designation: "W1"
   - Gauge: "16AWG"
   - Color: "Red"
   - Wire Type: "THHN"
2. **End 1**: type "K1:A1" in the search, or use the two-step picker (select K1 → select A1)
3. **End 2**: type "TB1:1" or pick TB1 → terminal 1
4. Click **Save & Next**
5. Expected: toast "Wire saved", form resets, you stay on the page

### Add a Wire with Cable Assignment
1. Cable dropdown: select "C1"
2. Expected: gauge and color fields auto-populate from the cable defaults (only if empty)
3. Fill in ends, save

### Add a Wire with "New Cable..." 
1. Cable dropdown: select **+ New Cable...**
2. Expected: cable creation modal opens
3. Create the cable, close modal
4. Expected: the new cable is now selected in the dropdown

### Add an External Wire
1. **End 1**: select an element terminal
2. **End 2**: select "External Connection" from the top of the picker
3. Save

### Add an Unknown Wire
1. **End 1**: select "Unknown" from the top of the picker
2. **End 2**: select "Unknown"
3. Save

### Wire List
1. Click **Done** to go back to the project detail page
2. Select the **Wires** tab
3. Expected: all wires listed with "element:terminal → element:terminal" endpoint labels, color/gauge badges

### Edit / Delete Wire
1. Click a wire card to open the edit modal
2. Verify all fields load correctly (including terminal picker values)
3. Change a field, save
4. Delete a wire via the modal's Delete button
5. Expected: toast "Wire deleted"

---

## 8. Wire Defaults Hierarchy

Test that wire property defaults resolve correctly:

1. Edit an element (e.g. K1) and set Default Wire Gauge: "14AWG", Default Wire Color: "Blue"
2. Go to Add Wire, pick K1:A1 as End 1
3. Expected: gauge pre-fills to "14AWG", color pre-fills to "Blue" (element defaults)
4. Now select a cable that has Wire Gauge: "16AWG"
5. Expected: gauge overrides to "16AWG" (cable > element), color stays "Blue" (cable has no color override)
6. Type "12AWG" manually in the gauge field
7. Expected: manual entry sticks, not overwritten

---

## 9. Export

### CSV Export (Online)
1. On the project detail page, find the **Export** card at the bottom
2. Click **Export CSV**
3. Expected: toast "CSV export downloaded", a ZIP file downloads
4. Unzip and verify CSVs: project, machines, elements, terminals, cables, wires
5. Wires CSV should have resolved endpoint labels ("K1:A1") not UUIDs

### PDF Export (Online)
1. Click **Export PDF**
2. Expected: toast "PDF export downloaded", a PDF file downloads
3. Verify sections: cover page (project info), machine details, elements & terminals table, cable summary, wire schedule
4. Wire schedule should show "K1:A1" style endpoint labels

### CSV Export (Offline Fallback)
1. Open DevTools → Network tab → toggle **Offline**
2. Expected: Export card shows "PDF export requires an internet connection" message
3. Click **Export CSV (offline)**
4. Expected: ZIP downloads with same CSV structure generated from local Dexie data
5. Toggle back online

---

## 10. Sync

### Basic Sync
1. Create a project while online
2. Check Supabase dashboard — the project should appear in the `projects` table
3. Expected: sync indicator shows green "Synced"

### Offline → Online Sync
1. Toggle offline in DevTools
2. Expected: sync indicator shows grey "Offline"
3. Create a new element or wire
4. Toggle back online
5. Expected: sync indicator briefly shows yellow "Syncing...", then green "Synced"
6. Verify the new record appears in Supabase

### Sync Error State
1. If a sync error occurs (e.g. Supabase credentials wrong), the indicator should show red with error count

---

## 11. PWA

### Install
1. In Chrome, look for the install icon in the address bar (or three-dot menu → "Install WireMapping")
2. Install and verify it opens as a standalone app

### Update Prompt
1. After a code change and rebuild, the service worker detects a new version
2. Expected: a bottom banner appears: "New version available." with a **Reload** button

---

## 12. Responsive / Mobile UX

1. Test all flows above in a mobile viewport (390px width)
2. Verify:
   - Forms are full-width, fields don't overflow
   - Dialogs/modals scroll vertically if content exceeds viewport (`max-h-[90svh] overflow-y-auto`)
   - `enterKeyHint` shows "next" on mobile keyboard for intermediate fields, "done" for last fields
   - Enter key advances focus between form fields (rapid entry)
   - Header is sticky, back button navigates correctly

---

## 13. Delete Project (Cascade)

1. Create a throwaway project with a machine, 2 elements, several terminals, a cable, and 3 wires
2. Go to the project detail page, click **Delete** → confirm
3. Expected: toast "Project deleted", navigated to `/projects`
4. Verify: all child records gone from Dexie (check DevTools → Application → IndexedDB) and Supabase
