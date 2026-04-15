import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/db';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface ExportPanelProps {
  projectId: string;
  projectName: string;
}

async function downloadFromApi(
  endpoint: string,
  filename: string,
  token: string,
) {
  const response = await fetch(`${API_BASE}/api${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Export failed (${response.status})`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9 _-]/g, '_').trim();
}

/** Build a CSV string from rows and column definitions. */
function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const header = columns.join(',');
  const body = rows
    .map((row) =>
      columns
        .map((col) => {
          const val = String(row[col] ?? '');
          // Escape quotes and wrap if contains comma/quote/newline
          if (val.includes(',') || val.includes('"') || val.includes('\n')) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        })
        .join(','),
    )
    .join('\n');
  return `${header}\n${body}`;
}

/** Generate CSVs from local Dexie data and trigger a ZIP download. */
async function generateOfflineCsv(projectId: string, projectName: string) {
  // Dynamic import to avoid bundling jszip when not needed
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const safeName = sanitizeFilename(projectName);

  // Fetch from Dexie
  const project = await db.projects.get(projectId);
  if (!project) throw new Error('Project not found in local database');

  const machine = await db.machines.where('project_id').equals(projectId).first();
  const machineId = machine?.id;

  const elements = machineId
    ? await db.elements.where('machine_id').equals(machineId).toArray()
    : [];
  const elementsMap = Object.fromEntries(elements.map((e) => [e.id, e]));

  const elementIds = elements.map((e) => e.id);
  const allTerminals = [];
  for (const eid of elementIds) {
    const terms = await db.terminals.where('element_id').equals(eid).toArray();
    allTerminals.push(...terms);
  }
  const terminalsMap = Object.fromEntries(allTerminals.map((t) => [t.id, t]));

  const cables = machineId
    ? await db.cables.where('machine_id').equals(machineId).toArray()
    : [];
  const cablesMap = Object.fromEntries(cables.map((c) => [c.id, c]));

  const wires = machineId
    ? await db.wires.where('machine_id').equals(machineId).toArray()
    : [];

  // Project CSV
  zip.file(
    `${safeName}_project.csv`,
    toCsv(
      [project as unknown as Record<string, unknown>],
      ['id', 'name', 'date_started', 'performed_by', 'reason_for_work'],
    ),
  );

  // Machine CSV
  if (machine) {
    zip.file(
      `${safeName}_machines.csv`,
      toCsv(
        [machine as unknown as Record<string, unknown>],
        [
          'id', 'manufacturer', 'model_number', 'serial_number',
          'voltage', 'amperage', 'phases', 'control_voltage', 'date_manufactured',
        ],
      ),
    );
  }

  // Elements CSV
  if (elements.length) {
    zip.file(
      `${safeName}_elements.csv`,
      toCsv(
        elements as unknown as Record<string, unknown>[],
        [
          'id', 'designation', 'name', 'type', 'rating',
          'part_number', 'coil_rating', 'default_wire_gauge',
          'default_wire_color', 'default_wire_type',
        ],
      ),
    );
  }

  // Terminals CSV
  if (allTerminals.length) {
    const termRows = allTerminals.map((t) => {
      const el = elementsMap[t.element_id];
      return {
        ...t,
        element_designation: el?.designation || el?.name || '',
      };
    });
    zip.file(
      `${safeName}_terminals.csv`,
      toCsv(
        termRows as unknown as Record<string, unknown>[],
        ['id', 'element_designation', 'designation', 'purpose'],
      ),
    );
  }

  // Cables CSV
  if (cables.length) {
    zip.file(
      `${safeName}_cables.csv`,
      toCsv(
        cables as unknown as Record<string, unknown>[],
        [
          'id', 'designation', 'cable_type', 'wire_gauge',
          'num_wires', 'part_number', 'has_ground', 'wire_color',
          'diameter', 'length',
        ],
      ),
    );
  }

  // Wires CSV (with resolved labels)
  if (wires.length) {
    const wireRows = wires.map((w) => {
      const resolveEnd = (
        terminalId: string | null,
        endType: string,
      ): string => {
        if (endType === 'external') return 'External';
        if (endType === 'unknown') return 'Unknown';
        if (!terminalId) return 'Unknown';
        const terminal = terminalsMap[terminalId];
        if (!terminal) return '?';
        const el = elementsMap[terminal.element_id];
        return `${el?.designation || el?.name || '?'}:${terminal.designation || '?'}`;
      };

      return {
        designation: w.designation || '',
        gauge: w.gauge || '',
        color: w.color || '',
        wire_type: w.wire_type || '',
        length: w.length || '',
        end1: resolveEnd(w.end1_terminal_id, w.end1_type),
        end1_note: w.end1_note || '',
        end2: resolveEnd(w.end2_terminal_id, w.end2_type),
        end2_note: w.end2_note || '',
        cable: w.cable_id && cablesMap[w.cable_id]
          ? cablesMap[w.cable_id].designation || ''
          : '',
      };
    });
    zip.file(
      `${safeName}_wires.csv`,
      toCsv(
        wireRows as unknown as Record<string, unknown>[],
        [
          'designation', 'gauge', 'color', 'wire_type', 'length',
          'end1', 'end1_note', 'end2', 'end2_note', 'cable',
        ],
      ),
    );
  }

  // Generate and download
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeName}_export.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ExportPanel({ projectId, projectName }: ExportPanelProps) {
  const online = useOnlineStatus();
  const [csvLoading, setCsvLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCsvExport() {
    setCsvLoading(true);
    setError(null);
    try {
      if (online) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('Not authenticated');
        const safeName = sanitizeFilename(projectName);
        await downloadFromApi(
          `/export/${projectId}/csv`,
          `${safeName}_export.zip`,
          session.access_token,
        );
      } else {
        await generateOfflineCsv(projectId, projectName);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'CSV export failed');
    } finally {
      setCsvLoading(false);
    }
  }

  async function handlePdfExport() {
    setPdfLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');
      const safeName = sanitizeFilename(projectName);
      await downloadFromApi(
        `/export/${projectId}/pdf`,
        `${safeName}_report.pdf`,
        session.access_token,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF export failed');
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="p-4">
        <CardTitle className="text-base">Export</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleCsvExport}
            disabled={csvLoading}
          >
            {csvLoading ? 'Exporting...' : online ? 'Export CSV' : 'Export CSV (offline)'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handlePdfExport}
            disabled={pdfLoading || !online}
          >
            {pdfLoading ? 'Exporting...' : 'Export PDF'}
          </Button>
        </div>
        {!online && (
          <p className="mt-2 text-xs text-muted-foreground">
            PDF export requires an internet connection. CSV uses local data when offline.
          </p>
        )}
        {error && (
          <p className="mt-2 text-xs text-destructive">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}
