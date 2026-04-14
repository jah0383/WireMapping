import { useState, useEffect, type FormEvent } from 'react';
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
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useEntityCRUD } from '@/hooks/useEntityCRUD';
import { TERMINAL_PURPOSES } from '@/lib/types';
import type { Terminal } from '@/lib/types';

interface TerminalEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  terminal: Terminal;
}

export function TerminalEditModal({
  open,
  onOpenChange,
  terminal,
}: TerminalEditModalProps) {
  const { update, remove } = useEntityCRUD<Terminal>('terminals');

  const [designation, setDesignation] = useState(terminal.designation ?? '');
  const [purpose, setPurpose] = useState<string | null>(terminal.purpose);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setDesignation(terminal.designation ?? '');
    setPurpose(terminal.purpose);
  }, [terminal]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    update(terminal.id, {
      designation: designation.trim() || null,
      purpose,
    });
    onOpenChange(false);
  }

  async function handleDelete() {
    await remove(terminal.id);
    onOpenChange(false);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Terminal</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              label="Designation"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
            />
            <SelectWithCustom
              label="Purpose"
              options={[...TERMINAL_PURPOSES]}
              value={purpose}
              onChange={setPurpose}
              placeholder="Optional"
            />
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                className="text-destructive"
                onClick={() => setConfirmDelete(true)}
              >
                Delete
              </Button>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete Terminal"
        description={`Delete terminal "${terminal.designation || '?'}"? Any wires connected to this terminal will have that end set to unknown.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        destructive
      />
    </>
  );
}
