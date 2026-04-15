import { useState, useRef, useEffect, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { FormField } from '@/components/FormField';
import { TerminalPicker, type TerminalPickerValue } from './TerminalPicker';
import { CableCreateModal } from '@/features/cables/CableCreateModal';
import { resolveWireDefaults } from './wireDefaults';
import { useEntityCRUD } from '@/hooks/useEntityCRUD';
import { db } from '@/lib/db';
import type { Wire, Cable } from '@/lib/types';

const NONE = '__none__';
const NEW_CABLE = '__new__';

export function WireEntryPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { create } = useEntityCRUD<Wire>('wires');

  const machine = useLiveQuery(
    () =>
      projectId
        ? db.machines.where('project_id').equals(projectId).first()
        : undefined,
    [projectId],
  );

  const cables = useLiveQuery(
    () =>
      machine
        ? db.cables.where('machine_id').equals(machine.id).toArray()
        : [],
    [machine?.id],
  );

  const [designation, setDesignation] = useState('');
  const [gauge, setGauge] = useState('');
  const [wireType, setWireType] = useState('');
  const [color, setColor] = useState('');
  const [length, setLength] = useState('');
  const [cableSelection, setCableSelection] = useState(NONE);
  const [end1, setEnd1] = useState<TerminalPickerValue | null>(null);
  const [end2, setEnd2] = useState<TerminalPickerValue | null>(null);
  const [end1Note, setEnd1Note] = useState('');
  const [end2Note, setEnd2Note] = useState('');
  const [showNewCable, setShowNewCable] = useState(false);

  const gaugeRef = useRef<HTMLInputElement>(null);
  const wireTypeRef = useRef<HTMLInputElement>(null);
  const colorRef = useRef<HTMLInputElement>(null);
  const lengthRef = useRef<HTMLInputElement>(null);
  const end1NoteRef = useRef<HTMLInputElement>(null);
  const end2NoteRef = useRef<HTMLInputElement>(null);

  // Apply wire defaults when cable or terminal selections change
  useEffect(() => {
    const cableId = cableSelection !== NONE && cableSelection !== NEW_CABLE ? cableSelection : null;
    resolveWireDefaults(
      cableId,
      end1?.terminalId ?? null,
      end2?.terminalId ?? null,
    ).then((defaults) => {
      // Only pre-fill empty fields (don't overwrite manual entries)
      setGauge((prev) => prev || defaults.gauge || '');
      setColor((prev) => prev || defaults.color || '');
      setWireType((prev) => prev || defaults.wire_type || '');
    });
  }, [cableSelection, end1?.terminalId, end2?.terminalId]);

  if (!machine) {
    return <p className="py-8 text-center text-muted-foreground">Loading...</p>;
  }

  function resetForm() {
    setDesignation('');
    setGauge('');
    setWireType('');
    setColor('');
    setLength('');
    setCableSelection(NONE);
    setEnd1(null);
    setEnd2(null);
    setEnd1Note('');
    setEnd2Note('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!machine) return;

    const cableId =
      cableSelection !== NONE && cableSelection !== NEW_CABLE
        ? cableSelection
        : null;

    await create({
      id: crypto.randomUUID(),
      machine_id: machine.id,
      cable_id: cableId,
      designation: designation.trim() || null,
      gauge: gauge.trim() || null,
      wire_type: wireType.trim() || null,
      color: color.trim() || null,
      length: length.trim() || null,
      end1_terminal_id: end1?.terminalId ?? null,
      end1_type: end1?.endType ?? 'unknown',
      end1_note: end1Note.trim() || null,
      end2_terminal_id: end2?.terminalId ?? null,
      end2_type: end2?.endType ?? 'unknown',
      end2_note: end2Note.trim() || null,
      created_at: '',
      updated_at: '',
    });

    toast.success('Wire saved');
    resetForm();
    // Stay on the page for rapid entry
  }

  function handleCableChange(value: string | null) {
    if (value === null) return;
    if (value === NEW_CABLE) {
      setShowNewCable(true);
      return;
    }
    setCableSelection(value);
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Add Wire</h2>
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          Done
        </Button>
      </div>

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-base">Wire Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 pb-4 pt-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              label="Designation"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              onNext={() => gaugeRef.current?.focus()}
              placeholder="Wire label (optional)"
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                label="Gauge"
                value={gauge}
                onChange={(e) => setGauge(e.target.value)}
                inputRef={gaugeRef}
                onNext={() => colorRef.current?.focus()}
                placeholder="e.g. 16AWG"
              />
              <FormField
                label="Color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                inputRef={colorRef}
                onNext={() => wireTypeRef.current?.focus()}
                placeholder="e.g. Black"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                label="Wire Type"
                value={wireType}
                onChange={(e) => setWireType(e.target.value)}
                inputRef={wireTypeRef}
                onNext={() => lengthRef.current?.focus()}
                placeholder="e.g. THHN"
              />
              <FormField
                label="Length"
                value={length}
                onChange={(e) => setLength(e.target.value)}
                inputRef={lengthRef}
              />
            </div>

            {/* Cable assignment */}
            <div className="space-y-1.5">
              <Label>Cable</Label>
              <Select
                value={cableSelection}
                onValueChange={handleCableChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Standalone (no cable)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Standalone (no cable)</SelectItem>
                  <SelectItem value={NEW_CABLE}>+ New Cable...</SelectItem>
                  {(cables ?? []).map((cable: Cable) => (
                    <SelectItem key={cable.id} value={cable.id}>
                      {cable.designation || 'Unnamed cable'}
                      {cable.wire_gauge ? ` (${cable.wire_gauge})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* End 1 */}
            <div className="border-t pt-4">
              <TerminalPicker
                machineId={machine.id}
                label="End 1"
                value={end1}
                onChange={setEnd1}
              />
              <div className="mt-2">
                <FormField
                  label="End 1 Note"
                  value={end1Note}
                  onChange={(e) => setEnd1Note(e.target.value)}
                  inputRef={end1NoteRef}
                  placeholder="Optional note"
                />
              </div>
            </div>

            {/* End 2 */}
            <div className="border-t pt-4">
              <TerminalPicker
                machineId={machine.id}
                label="End 2"
                value={end2}
                onChange={setEnd2}
              />
              <div className="mt-2">
                <FormField
                  label="End 2 Note"
                  value={end2Note}
                  onChange={(e) => setEnd2Note(e.target.value)}
                  inputRef={end2NoteRef}
                  placeholder="Optional note"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => navigate(-1)}
              >
                Done
              </Button>
              <Button type="submit" className="flex-1">
                Save & Next
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Inline cable creation */}
      <CableCreateModal
        open={showNewCable}
        onOpenChange={setShowNewCable}
        machineId={machine.id}
        onCreated={(cableId) => setCableSelection(cableId)}
      />
    </div>
  );
}
