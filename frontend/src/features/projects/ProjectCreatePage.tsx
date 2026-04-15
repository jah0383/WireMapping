import { useState, useRef, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/FormField';
import { useEntityCRUD } from '@/hooks/useEntityCRUD';
import type { Project, Machine } from '@/lib/types';

export function ProjectCreatePage() {
  const navigate = useNavigate();
  const { create: createProject } = useEntityCRUD<Project>('projects');
  const { create: createMachine } = useEntityCRUD<Machine>('machines');

  const [name, setName] = useState('');
  const [dateStarted, setDateStarted] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [performedBy, setPerformedBy] = useState('');
  const [reason, setReason] = useState('');

  const dateRef = useRef<HTMLInputElement>(null);
  const performedByRef = useRef<HTMLInputElement>(null);
  const reasonRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const projectId = crypto.randomUUID();
    const machineId = crypto.randomUUID();

    await createProject({
      id: projectId,
      name: name.trim(),
      date_started: dateStarted || null,
      performed_by: performedBy.trim() || null,
      reason_for_work: reason.trim() || null,
      created_at: '',
      updated_at: '',
    });

    // Create a blank machine record for this project (1:1 in v1)
    await createMachine({
      id: machineId,
      project_id: projectId,
      manufacturer: null,
      date_manufactured: null,
      model_number: null,
      serial_number: null,
      voltage: null,
      amperage: null,
      phases: null,
      control_voltage: null,
      created_at: '',
      updated_at: '',
    });

    toast.success('Project created');
    navigate(`/projects/${projectId}`);
  }

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>New Project</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              label="Project Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onNext={() => dateRef.current?.focus()}
              placeholder="e.g. Panel rewire - Building A"
              required
              autoFocus
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
              placeholder="Your name"
            />
            <FormField
              label="Reason for Work"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              inputRef={reasonRef}
              placeholder="e.g. Documentation, troubleshooting"
            />
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => navigate(-1)}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Create Project
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
