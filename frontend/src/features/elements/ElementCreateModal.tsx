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
import { SelectWithCustom } from '@/components/SelectWithCustom';
import { useEntityCRUD } from '@/hooks/useEntityCRUD';
import { ELEMENT_TYPES } from '@/lib/types';
import type { Element } from '@/lib/types';

interface ElementCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  machineId: string;
}

export function ElementCreateModal({
  open,
  onOpenChange,
  machineId,
}: ElementCreateModalProps) {
  const { create } = useEntityCRUD<Element>('elements');

  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('');
  const [type, setType] = useState<string | null>(null);
  const [rating, setRating] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [coilRating, setCoilRating] = useState('');
  const [defaultGauge, setDefaultGauge] = useState('');
  const [defaultColor, setDefaultColor] = useState('');
  const [defaultWireType, setDefaultWireType] = useState('');

  const nameRef = useRef<HTMLInputElement>(null);
  const ratingRef = useRef<HTMLInputElement>(null);
  const partNumberRef = useRef<HTMLInputElement>(null);
  const coilRatingRef = useRef<HTMLInputElement>(null);
  const gaugeRef = useRef<HTMLInputElement>(null);
  const colorRef = useRef<HTMLInputElement>(null);
  const wireTypeRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setName('');
    setDesignation('');
    setType(null);
    setRating('');
    setPartNumber('');
    setCoilRating('');
    setDefaultGauge('');
    setDefaultColor('');
    setDefaultWireType('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    await create({
      id: crypto.randomUUID(),
      machine_id: machineId,
      name: name.trim() || null,
      designation: designation.trim() || null,
      type,
      rating: rating.trim() || null,
      part_number: partNumber.trim() || null,
      coil_rating: coilRating.trim() || null,
      default_wire_gauge: defaultGauge.trim() || null,
      default_wire_color: defaultColor.trim() || null,
      default_wire_type: defaultWireType.trim() || null,
      autofill_enabled: false,
      created_at: '',
      updated_at: '',
    });

    toast.success('Element added');
    resetForm();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Element</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            label="Designation"
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            onNext={() => nameRef.current?.focus()}
            placeholder="e.g. K1, TB1, M1"
            autoFocus
          />
          <FormField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            inputRef={nameRef}
            placeholder="e.g. Main Contactor, Terminal Strip 1"
          />
          <SelectWithCustom
            label="Type"
            options={[...ELEMENT_TYPES]}
            value={type}
            onChange={setType}
          />
          <FormField
            label="Rating"
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            inputRef={ratingRef}
            onNext={() => partNumberRef.current?.focus()}
            placeholder="e.g. 10A, 24VDC"
          />
          <FormField
            label="Part Number"
            value={partNumber}
            onChange={(e) => setPartNumber(e.target.value)}
            inputRef={partNumberRef}
            onNext={() => coilRatingRef.current?.focus()}
          />
          <FormField
            label="Coil Rating"
            value={coilRating}
            onChange={(e) => setCoilRating(e.target.value)}
            inputRef={coilRatingRef}
            onNext={() => gaugeRef.current?.focus()}
            placeholder="e.g. 24VDC, 230VAC"
          />

          <div className="border-t pt-4">
            <p className="mb-2 text-sm text-muted-foreground">
              Wire property defaults (lowest priority in the hierarchy)
            </p>
            <div className="space-y-4">
              <FormField
                label="Default Wire Gauge"
                value={defaultGauge}
                onChange={(e) => setDefaultGauge(e.target.value)}
                inputRef={gaugeRef}
                onNext={() => colorRef.current?.focus()}
                placeholder="e.g. 16AWG"
              />
              <FormField
                label="Default Wire Color"
                value={defaultColor}
                onChange={(e) => setDefaultColor(e.target.value)}
                inputRef={colorRef}
                onNext={() => wireTypeRef.current?.focus()}
                placeholder="e.g. Black"
              />
              <FormField
                label="Default Wire Type"
                value={defaultWireType}
                onChange={(e) => setDefaultWireType(e.target.value)}
                inputRef={wireTypeRef}
                placeholder="e.g. THHN"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>
              Cancel
            </Button>
            <Button type="submit">Add Element</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
