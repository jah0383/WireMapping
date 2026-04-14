import { useState, useRef, type FormEvent } from 'react';
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
import { useEntityCRUD } from '@/hooks/useEntityCRUD';
import { TERMINAL_PURPOSES } from '@/lib/types';
import { getAutofillSuggestion } from './autofillPairs';
import type { Terminal, Element } from '@/lib/types';

interface TerminalCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  element: Element;
}

export function TerminalCreateModal({
  open,
  onOpenChange,
  element,
}: TerminalCreateModalProps) {
  const { create } = useEntityCRUD<Terminal>('terminals');

  const [designation, setDesignation] = useState('');
  const [purpose, setPurpose] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  const designationRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setDesignation('');
    setPurpose(null);
    setSuggestion(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!designation.trim()) return;

    await create({
      id: crypto.randomUUID(),
      element_id: element.id,
      designation: designation.trim(),
      purpose,
      created_at: '',
      updated_at: '',
    });

    // Check for autofill suggestion
    if (element.autofill_enabled) {
      const pair = getAutofillSuggestion(element.type, designation.trim());
      if (pair) {
        setSuggestion(pair.designation);
        setDesignation(pair.designation);
        setPurpose(null);
        designationRef.current?.focus();
        return;
      }
    }

    // Reset for next entry
    setDesignation('');
    setPurpose(null);
    setSuggestion(null);
    designationRef.current?.focus();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Terminal</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {suggestion && (
            <p className="text-sm text-muted-foreground">
              Autofill suggestion applied: <span className="font-medium">{suggestion}</span>
            </p>
          )}
          <FormField
            label="Designation"
            value={designation}
            onChange={(e) => { setDesignation(e.target.value); setSuggestion(null); }}
            inputRef={designationRef}
            placeholder="e.g. 1, A1, L1, U"
            autoFocus
          />
          <SelectWithCustom
            label="Purpose"
            options={[...TERMINAL_PURPOSES]}
            value={purpose}
            onChange={setPurpose}
            placeholder="Optional"
          />
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>
              Done
            </Button>
            <Button type="submit">
              Add & Next
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
