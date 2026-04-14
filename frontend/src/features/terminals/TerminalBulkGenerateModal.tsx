import { useState, type FormEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/FormField';
import { SelectWithCustom } from '@/components/SelectWithCustom';
import { Badge } from '@/components/ui/badge';
import { useEntityCRUD } from '@/hooks/useEntityCRUD';
import { TERMINAL_PURPOSES } from '@/lib/types';
import type { Terminal } from '@/lib/types';

interface TerminalBulkGenerateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  elementId: string;
}

/**
 * Parse a designation into a prefix and numeric suffix.
 * e.g. "A1" -> { prefix: "A", num: 1 }
 *      "14" -> { prefix: "", num: 14 }
 *      "L1" -> { prefix: "L", num: 1 }
 */
function parseDesignation(d: string): { prefix: string; num: number } | null {
  const match = d.match(/^(.*?)(\d+)$/);
  if (!match) return null;
  return { prefix: match[1], num: parseInt(match[2], 10) };
}

function generateDesignations(start: string, end: string): string[] | null {
  const s = parseDesignation(start);
  const e = parseDesignation(end);
  if (!s || !e) return null;
  if (s.prefix !== e.prefix) return null;
  if (s.num > e.num) return null;
  if (e.num - s.num > 999) return null; // sanity limit

  const result: string[] = [];
  for (let i = s.num; i <= e.num; i++) {
    result.push(s.prefix + i);
  }
  return result;
}

export function TerminalBulkGenerateModal({
  open,
  onOpenChange,
  elementId,
}: TerminalBulkGenerateModalProps) {
  const { create } = useEntityCRUD<Terminal>('terminals');

  const [startDesig, setStartDesig] = useState('');
  const [endDesig, setEndDesig] = useState('');
  const [purpose, setPurpose] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const preview = startDesig && endDesig ? generateDesignations(startDesig.trim(), endDesig.trim()) : null;

  function resetForm() {
    setStartDesig('');
    setEndDesig('');
    setPurpose(null);
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!preview || preview.length === 0) {
      setError('Cannot generate terminals. Check that both designations end in a number and share the same prefix.');
      return;
    }

    for (const designation of preview) {
      await create({
        id: crypto.randomUUID(),
        element_id: elementId,
        designation,
        purpose,
        created_at: '',
        updated_at: '',
      });
    }

    resetForm();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Generate Terminals</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Start"
              value={startDesig}
              onChange={(e) => setStartDesig(e.target.value)}
              placeholder="e.g. 1, A1"
              autoFocus
            />
            <FormField
              label="End"
              value={endDesig}
              onChange={(e) => setEndDesig(e.target.value)}
              placeholder="e.g. 24, A10"
            />
          </div>
          <SelectWithCustom
            label="Purpose (applied to all)"
            options={[...TERMINAL_PURPOSES]}
            value={purpose}
            onChange={setPurpose}
            placeholder="Optional"
          />

          {preview && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Preview: {preview.length} terminal{preview.length !== 1 ? 's' : ''}
              </p>
              <div className="flex flex-wrap gap-1">
                {preview.slice(0, 50).map((d) => (
                  <Badge key={d} variant="secondary" className="text-xs">
                    {d}
                  </Badge>
                ))}
                {preview.length > 50 && (
                  <Badge variant="outline" className="text-xs">
                    +{preview.length - 50} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={!preview || preview.length === 0}>
              Generate {preview ? preview.length : 0} Terminals
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
