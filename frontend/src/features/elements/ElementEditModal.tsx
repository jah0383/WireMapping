import { useState, useRef, useEffect, type FormEvent } from 'react';
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
import { ELEMENT_TYPES } from '@/lib/types';
import type { Element } from '@/lib/types';

interface ElementEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  element: Element;
  onSave: (changes: Partial<Element>) => void;
}

export function ElementEditModal({
  open,
  onOpenChange,
  element,
  onSave,
}: ElementEditModalProps) {
  const [name, setName] = useState(element.name ?? '');
  const [designation, setDesignation] = useState(element.designation ?? '');
  const [type, setType] = useState<string | null>(element.type);
  const [rating, setRating] = useState(element.rating ?? '');
  const [partNumber, setPartNumber] = useState(element.part_number ?? '');
  const [coilRating, setCoilRating] = useState(element.coil_rating ?? '');
  const [defaultGauge, setDefaultGauge] = useState(element.default_wire_gauge ?? '');
  const [defaultColor, setDefaultColor] = useState(element.default_wire_color ?? '');
  const [defaultWireType, setDefaultWireType] = useState(element.default_wire_type ?? '');

  const nameRef = useRef<HTMLInputElement>(null);
  const ratingRef = useRef<HTMLInputElement>(null);
  const partNumberRef = useRef<HTMLInputElement>(null);
  const coilRatingRef = useRef<HTMLInputElement>(null);
  const gaugeRef = useRef<HTMLInputElement>(null);
  const colorRef = useRef<HTMLInputElement>(null);
  const wireTypeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(element.name ?? '');
    setDesignation(element.designation ?? '');
    setType(element.type);
    setRating(element.rating ?? '');
    setPartNumber(element.part_number ?? '');
    setCoilRating(element.coil_rating ?? '');
    setDefaultGauge(element.default_wire_gauge ?? '');
    setDefaultColor(element.default_wire_color ?? '');
    setDefaultWireType(element.default_wire_type ?? '');
  }, [element]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSave({
      name: name.trim() || null,
      designation: designation.trim() || null,
      type,
      rating: rating.trim() || null,
      part_number: partNumber.trim() || null,
      coil_rating: coilRating.trim() || null,
      default_wire_gauge: defaultGauge.trim() || null,
      default_wire_color: defaultColor.trim() || null,
      default_wire_type: defaultWireType.trim() || null,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Element</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            label="Designation"
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            onNext={() => nameRef.current?.focus()}
            placeholder="e.g. K1, TB1, M1"
          />
          <FormField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            inputRef={nameRef}
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
          />

          <div className="border-t pt-4">
            <p className="mb-2 text-sm text-muted-foreground">
              Wire property defaults
            </p>
            <div className="space-y-4">
              <FormField
                label="Default Wire Gauge"
                value={defaultGauge}
                onChange={(e) => setDefaultGauge(e.target.value)}
                inputRef={gaugeRef}
                onNext={() => colorRef.current?.focus()}
              />
              <FormField
                label="Default Wire Color"
                value={defaultColor}
                onChange={(e) => setDefaultColor(e.target.value)}
                inputRef={colorRef}
                onNext={() => wireTypeRef.current?.focus()}
              />
              <FormField
                label="Default Wire Type"
                value={defaultWireType}
                onChange={(e) => setDefaultWireType(e.target.value)}
                inputRef={wireTypeRef}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
