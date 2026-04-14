import { useState, useRef, useEffect, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/FormField';
import type { Machine } from '@/lib/types';

interface MachineFormProps {
  machine: Machine;
  onSave: (changes: Partial<Machine>) => void;
  onCancel: () => void;
}

export function MachineForm({ machine, onSave, onCancel }: MachineFormProps) {
  const [manufacturer, setManufacturer] = useState(machine.manufacturer ?? '');
  const [dateManufactured, setDateManufactured] = useState(
    machine.date_manufactured ?? '',
  );
  const [modelNumber, setModelNumber] = useState(machine.model_number ?? '');
  const [serialNumber, setSerialNumber] = useState(machine.serial_number ?? '');
  const [voltage, setVoltage] = useState(machine.voltage ?? '');
  const [amperage, setAmperage] = useState(machine.amperage ?? '');
  const [phases, setPhases] = useState(machine.phases ?? '');
  const [controlVoltage, setControlVoltage] = useState(
    machine.control_voltage ?? '',
  );

  const dateRef = useRef<HTMLInputElement>(null);
  const modelRef = useRef<HTMLInputElement>(null);
  const serialRef = useRef<HTMLInputElement>(null);
  const voltageRef = useRef<HTMLInputElement>(null);
  const amperageRef = useRef<HTMLInputElement>(null);
  const phasesRef = useRef<HTMLInputElement>(null);
  const controlVRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setManufacturer(machine.manufacturer ?? '');
    setDateManufactured(machine.date_manufactured ?? '');
    setModelNumber(machine.model_number ?? '');
    setSerialNumber(machine.serial_number ?? '');
    setVoltage(machine.voltage ?? '');
    setAmperage(machine.amperage ?? '');
    setPhases(machine.phases ?? '');
    setControlVoltage(machine.control_voltage ?? '');
  }, [machine]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSave({
      manufacturer: manufacturer.trim() || null,
      date_manufactured: dateManufactured || null,
      model_number: modelNumber.trim() || null,
      serial_number: serialNumber.trim() || null,
      voltage: voltage.trim() || null,
      amperage: amperage.trim() || null,
      phases: phases.trim() || null,
      control_voltage: controlVoltage.trim() || null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField
        label="Manufacturer"
        value={manufacturer}
        onChange={(e) => setManufacturer(e.target.value)}
        onNext={() => dateRef.current?.focus()}
        placeholder="e.g. Siemens, Allen-Bradley"
        autoFocus
      />
      <FormField
        label="Date Manufactured"
        type="date"
        value={dateManufactured}
        onChange={(e) => setDateManufactured(e.target.value)}
        inputRef={dateRef}
        onNext={() => modelRef.current?.focus()}
      />
      <FormField
        label="Model Number"
        value={modelNumber}
        onChange={(e) => setModelNumber(e.target.value)}
        inputRef={modelRef}
        onNext={() => serialRef.current?.focus()}
      />
      <FormField
        label="Serial Number"
        value={serialNumber}
        onChange={(e) => setSerialNumber(e.target.value)}
        inputRef={serialRef}
        onNext={() => voltageRef.current?.focus()}
      />
      <div className="grid grid-cols-2 gap-3">
        <FormField
          label="Voltage"
          value={voltage}
          onChange={(e) => setVoltage(e.target.value)}
          inputRef={voltageRef}
          onNext={() => amperageRef.current?.focus()}
          placeholder="e.g. 480V"
        />
        <FormField
          label="Amperage"
          value={amperage}
          onChange={(e) => setAmperage(e.target.value)}
          inputRef={amperageRef}
          onNext={() => phasesRef.current?.focus()}
          placeholder="e.g. 30A"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField
          label="Phases"
          value={phases}
          onChange={(e) => setPhases(e.target.value)}
          inputRef={phasesRef}
          onNext={() => controlVRef.current?.focus()}
          placeholder="e.g. 3"
        />
        <FormField
          label="Control Voltage"
          value={controlVoltage}
          onChange={(e) => setControlVoltage(e.target.value)}
          inputRef={controlVRef}
          placeholder="e.g. 24VDC"
        />
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1">
          Save Machine
        </Button>
      </div>
    </form>
  );
}
