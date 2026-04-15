import { useState, useRef, type FormEvent } from 'react';
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
import { useEntityCRUD } from '@/hooks/useEntityCRUD';
import type { Cable } from '@/lib/types';

interface CableCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  machineId: string;
  /** Called with the new cable ID after creation (for inline wire entry) */
  onCreated?: (cableId: string) => void;
}

export function CableCreateModal({
  open,
  onOpenChange,
  machineId,
  onCreated,
}: CableCreateModalProps) {
  const { create } = useEntityCRUD<Cable>('cables');

  const [designation, setDesignation] = useState('');
  const [wireGauge, setWireGauge] = useState('');
  const [numWires, setNumWires] = useState('');
  const [cableType, setCableType] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [wireColor, setWireColor] = useState('');
  const [diameter, setDiameter] = useState('');
  const [length, setLength] = useState('');

  const gaugeRef = useRef<HTMLInputElement>(null);
  const numWiresRef = useRef<HTMLInputElement>(null);
  const typeRef = useRef<HTMLInputElement>(null);
  const partRef = useRef<HTMLInputElement>(null);
  const colorRef = useRef<HTMLInputElement>(null);
  const diameterRef = useRef<HTMLInputElement>(null);
  const lengthRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setDesignation('');
    setWireGauge('');
    setNumWires('');
    setCableType('');
    setPartNumber('');
    setWireColor('');
    setDiameter('');
    setLength('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const cableId = crypto.randomUUID();
    await create({
      id: cableId,
      machine_id: machineId,
      designation: designation.trim() || null,
      wire_gauge: wireGauge.trim() || null,
      num_wires: numWires ? parseInt(numWires, 10) : null,
      cable_type: cableType.trim() || null,
      part_number: partNumber.trim() || null,
      has_ground: null,
      wire_color: wireColor.trim() || null,
      diameter: diameter.trim() || null,
      length: length.trim() || null,
      created_at: '',
      updated_at: '',
    });

    toast.success('Cable added');
    resetForm();
    onOpenChange(false);
    onCreated?.(cableId);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Cable</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            label="Designation"
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            onNext={() => gaugeRef.current?.focus()}
            placeholder="e.g. C1, Cable A"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Wire Gauge"
              value={wireGauge}
              onChange={(e) => setWireGauge(e.target.value)}
              inputRef={gaugeRef}
              onNext={() => numWiresRef.current?.focus()}
              placeholder="e.g. 16AWG"
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
            placeholder="e.g. SJO, SOOW"
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
            placeholder="Default color for wires in this cable"
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
            <Button type="button" variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>
              Cancel
            </Button>
            <Button type="submit">Add Cable</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
