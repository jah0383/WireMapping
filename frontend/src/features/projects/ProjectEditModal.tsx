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
import type { Project } from '@/lib/types';

interface ProjectEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  onSave: (changes: Partial<Project>) => void;
}

export function ProjectEditModal({
  open,
  onOpenChange,
  project,
  onSave,
}: ProjectEditModalProps) {
  const [name, setName] = useState(project.name);
  const [dateStarted, setDateStarted] = useState(project.date_started ?? '');
  const [performedBy, setPerformedBy] = useState(project.performed_by ?? '');
  const [reason, setReason] = useState(project.reason_for_work ?? '');

  const dateRef = useRef<HTMLInputElement>(null);
  const performedByRef = useRef<HTMLInputElement>(null);
  const reasonRef = useRef<HTMLInputElement>(null);

  // Reset form when project changes
  useEffect(() => {
    setName(project.name);
    setDateStarted(project.date_started ?? '');
    setPerformedBy(project.performed_by ?? '');
    setReason(project.reason_for_work ?? '');
  }, [project]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      date_started: dateStarted || null,
      performed_by: performedBy.trim() || null,
      reason_for_work: reason.trim() || null,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            label="Project Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onNext={() => dateRef.current?.focus()}
            required
          />
          <FormField
            label="Date Started"
            type="date"
            value={dateStarted}
            onChange={(e) => setDateStarted(e.target.value)}
            inputRef={dateRef}
            onNext={() => performedByRef.current?.focus()}
          />
          <FormField
            label="Performed By"
            value={performedBy}
            onChange={(e) => setPerformedBy(e.target.value)}
            inputRef={performedByRef}
            onNext={() => reasonRef.current?.focus()}
          />
          <FormField
            label="Reason for Work"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            inputRef={reasonRef}
          />
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
