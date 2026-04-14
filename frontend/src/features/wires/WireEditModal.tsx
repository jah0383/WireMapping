import { useState, useRef, useEffect, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/FormField';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { TerminalPicker, type TerminalPickerValue } from './TerminalPicker';
import { useEntityCRUD } from '@/hooks/useEntityCRUD';
import { db } from '@/lib/db';
import type { Wire, Cable } from '@/lib/types';

const NONE = '__none__';

interface WireEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wire: Wire;
  machineId: string;
}

async function buildPickerValue(
  terminalId: string | null,
  endType: string,
): Promise<TerminalPickerValue | null> {
  if (endType === 'external') return { terminalId: null, endType: 'external', label: 'External' };
  if (endType === 'unknown' && !terminalId) return null;
  if (!terminalId) return null;

  const terminal = await db.terminals.get(terminalId);
  if (!terminal) return null;
  const element = await db.elements.get(terminal.element_id);
  return {
    terminalId,
    endType: 'terminal',
    label: `${element?.designation || element?.name || '?'}:${terminal.designation || '?'}`,
  };
}

export function WireEditModal({
  open,
  onOpenChange,
  wire,
  machineId,
}: WireEditModalProps) {
  const { update, remove } = useEntityCRUD<Wire>('wires');

  const cables = useLiveQuery(
    () => db.cables.where('machine_id').equals(machineId).toArray(),
    [machineId],
  );

  const [designation, setDesignation] = useState(wire.designation ?? '');
  const [gauge, setGauge] = useState(wire.gauge ?? '');
  const [wireType, setWireType] = useState(wire.wire_type ?? '');
  const [color, setColor] = useState(wire.color ?? '');
  const [length, setLength] = useState(wire.length ?? '');
  const [cableSelection, setCableSelection] = useState(wire.cable_id ?? NONE);
  const [end1, setEnd1] = useState<TerminalPickerValue | null>(null);
  const [end2, setEnd2] = useState<TerminalPickerValue | null>(null);
  const [end1Note, setEnd1Note] = useState(wire.end1_note ?? '');
  const [end2Note, setEnd2Note] = useState(wire.end2_note ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const gaugeRef = useRef<HTMLInputElement>(null);
  const wireTypeRef = useRef<HTMLInputElement>(null);
  const colorRef = useRef<HTMLInputElement>(null);
  const lengthRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDesignation(wire.designation ?? '');
    setGauge(wire.gauge ?? '');
    setWireType(wire.wire_type ?? '');
    setColor(wire.color ?? '');
    setLength(wire.length ?? '');
    setCableSelection(wire.cable_id ?? NONE);
    setEnd1Note(wire.end1_note ?? '');
    setEnd2Note(wire.end2_note ?? '');

    // Async: build picker values
    buildPickerValue(wire.end1_terminal_id, wire.end1_type).then(setEnd1);
    buildPickerValue(wire.end2_terminal_id, wire.end2_type).then(setEnd2);
  }, [wire]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const cableId = cableSelection !== NONE ? cableSelection : null;

    update(wire.id, {
      designation: designation.trim() || null,
      gauge: gauge.trim() || null,
      wire_type: wireType.trim() || null,
      color: color.trim() || null,
      length: length.trim() || null,
      cable_id: cableId,
      end1_terminal_id: end1?.terminalId ?? null,
      end1_type: end1?.endType ?? 'unknown',
      end1_note: end1Note.trim() || null,
      end2_terminal_id: end2?.terminalId ?? null,
      end2_type: end2?.endType ?? 'unknown',
      end2_note: end2Note.trim() || null,
    });
    onOpenChange(false);
  }

  async function handleDelete() {
    await remove(wire.id);
    onOpenChange(false);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90svh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Wire</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              label="Designation"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              onNext={() => gaugeRef.current?.focus()}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                label="Gauge"
                value={gauge}
                onChange={(e) => setGauge(e.target.value)}
                inputRef={gaugeRef}
                onNext={() => colorRef.current?.focus()}
              />
              <FormField
                label="Color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                inputRef={colorRef}
                onNext={() => wireTypeRef.current?.focus()}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                label="Wire Type"
                value={wireType}
                onChange={(e) => setWireType(e.target.value)}
                inputRef={wireTypeRef}
                onNext={() => lengthRef.current?.focus()}
              />
              <FormField
                label="Length"
                value={length}
                onChange={(e) => setLength(e.target.value)}
                inputRef={lengthRef}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Cable</Label>
              <Select
                value={cableSelection}
                onValueChange={(v) => { if (v) setCableSelection(v); }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Standalone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Standalone (no cable)</SelectItem>
                  {(cables ?? []).map((cable: Cable) => (
                    <SelectItem key={cable.id} value={cable.id}>
                      {cable.designation || 'Unnamed'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-4">
              <TerminalPicker
                machineId={machineId}
                label="End 1"
                value={end1}
                onChange={setEnd1}
              />
              <div className="mt-2">
                <FormField
                  label="End 1 Note"
                  value={end1Note}
                  onChange={(e) => setEnd1Note(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <TerminalPicker
                machineId={machineId}
                label="End 2"
                value={end2}
                onChange={setEnd2}
              />
              <div className="mt-2">
                <FormField
                  label="End 2 Note"
                  value={end2Note}
                  onChange={(e) => setEnd2Note(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>

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
        title="Delete Wire"
        description={`Delete wire "${wire.designation || 'unnamed'}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        destructive
      />
    </>
  );
}
