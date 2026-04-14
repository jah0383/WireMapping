import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MachineForm } from './MachineForm';
import type { Machine } from '@/lib/types';

interface MachineEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  machine: Machine;
  onSave: (changes: Partial<Machine>) => void;
}

export function MachineEditModal({
  open,
  onOpenChange,
  machine,
  onSave,
}: MachineEditModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Machine Details</DialogTitle>
        </DialogHeader>
        <MachineForm
          machine={machine}
          onSave={(changes) => {
            onSave(changes);
            onOpenChange(false);
          }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
