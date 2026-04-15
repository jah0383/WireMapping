import { useState, useRef, useEffect, type FormEvent } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/FormField';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useEntityCRUD } from '@/hooks/useEntityCRUD';
import type { Cable } from '@/lib/types';

interface CableEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cable: Cable;
}

export function CableEditModal({
  open,
  onOpenChange,
  cable,
}: CableEditModalProps) {
  const { update, remove } = useEntityCRUD<Cable>('cables');

  const [designation, setDesignation] = useState(cable.designation ?? '');
  const [wireGauge, setWireGauge] = useState(cable.wire_gauge ?? '');
  const [numWires, setNumWires] = useState(cable.num_wires?.toString() ?? '');
  const [cableType, setCableType] = useState(cable.cable_type ?? '');
  const [partNumber, setPartNumber] = useState(cable.part_number ?? '');
  const [wireColor, setWireColor] = useState(cable.wire_color ?? '');
  const [diameter, setDiameter] = useState(cable.diameter ?? '');
  const [length, setLength] = useState(cable.length ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const gaugeRef = useRef<HTMLInputElement>(null);
  const numWiresRef = useRef<HTMLInputElement>(null);
  const typeRef = useRef<HTMLInputElement>(null);
  const partRef = useRef<HTMLInputElement>(null);
  const colorRef = useRef<HTMLInputElement>(null);
  const diameterRef = useRef<HTMLInputElement>(null);
  const lengthRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDesignation(cable.designation ?? '');
    setWireGauge(cable.wire_gauge ?? '');
    setNumWires(cable.num_wires?.toString() ?? '');
    setCableType(cable.cable_type ?? '');
    setPartNumber(cable.part_number ?? '');
    setWireColor(cable.wire_color ?? '');
    setDiameter(cable.diameter ?? '');
    setLength(cable.length ?? '');
  }, [cable]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    update(cable.id, {
      designation: designation.trim() || null,
      wire_gauge: wireGauge.trim() || null,
      num_wires: numWires ? parseInt(numWires, 10) : null,
      cable_type: cableType.trim() || null,
      part_number: partNumber.trim() || null,
      wire_color: wireColor.trim() || null,
      diameter: diameter.trim() || null,
      length: length.trim() || null,
    });
    onOpenChange(false);
  }

  async function handleDelete() {
    await remove(cable.id);
    toast.success('Cable deleted');
    onOpenChange(false);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90svh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Cable</DialogTitle>
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
                label="Wire Gauge"
                value={wireGauge}
                onChange={(e) => setWireGauge(e.target.value)}
                inputRef={gaugeRef}
                onNext={() => numWiresRef.current?.focus()}
              />
              <FormField
                label="# Wires"
                type="number"
                value={numWires}
                onChange={(e) => setNumWires(e.target.value)}
                inputRef={numWiresRef}
                onNext={() => typeRef.current?.focus()}
              />
            </div>
            <FormField
              label="Cable Type"
              value={cableType}
              onChange={(e) => setCableType(e.target.value)}
              inputRef={typeRef}
              onNext={() => partRef.current?.focus()}
            />
            <FormField
              label="Part Number"
              value={partNumber}
              onChange={(e) => setPartNumber(e.target.value)}
              inputRef={partRef}
              onNext={() => colorRef.current?.focus()}
            />
            <FormField
              label="Wire Color"
              value={wireColor}
              onChange={(e) => setWireColor(e.target.value)}
              inputRef={colorRef}
              onNext={() => diameterRef.current?.focus()}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                label="Diameter"
                value={diameter}
                onChange={(e) => setDiameter(e.target.value)}
                inputRef={diameterRef}
                onNext={() => lengthRef.current?.focus()}
              />
              <FormField
                label="Length"
                value={length}
                onChange={(e) => setLength(e.target.value)}
                inputRef={lengthRef}
              />
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
        title="Delete Cable"
        description={`Delete cable "${cable.designation || 'unnamed'}"? Wires assigned to this cable will become standalone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        destructive
      />
    </>
  );
}
