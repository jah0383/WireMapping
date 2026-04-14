import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ProjectEditModal } from './ProjectEditModal';
import { MachineEditModal } from '@/features/machines/MachineEditModal';
import { useEntityCRUD } from '@/hooks/useEntityCRUD';
import { db } from '@/lib/db';
import type { Project, Machine } from '@/lib/types';

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { update: updateProject, remove: removeProject } =
    useEntityCRUD<Project>('projects');
  const { update: updateMachine } = useEntityCRUD<Machine>('machines');

  const project = useLiveQuery(() => (id ? db.projects.get(id) : undefined), [id]);
  const machine = useLiveQuery(
    () => (id ? db.machines.where('project_id').equals(id).first() : undefined),
    [id],
  );
  const elements = useLiveQuery(
    () =>
      machine
        ? db.elements.where('machine_id').equals(machine.id).toArray()
        : [],
    [machine?.id],
  );
  const cables = useLiveQuery(
    () =>
      machine
        ? db.cables.where('machine_id').equals(machine.id).toArray()
        : [],
    [machine?.id],
  );
  const wires = useLiveQuery(
    () =>
      machine
        ? db.wires.where('machine_id').equals(machine.id).toArray()
        : [],
    [machine?.id],
  );

  const [editProject, setEditProject] = useState(false);
  const [editMachine, setEditMachine] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!project) {
    return <p className="py-8 text-center text-muted-foreground">Loading project...</p>;
  }

  async function handleDeleteProject() {
    if (!id) return;
    await removeProject(id);
    navigate('/projects', { replace: true });
  }

  return (
    <div className="space-y-4">
      {/* Project header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold">{project.name}</h2>
          <p className="text-sm text-muted-foreground">
            {[project.date_started, project.performed_by].filter(Boolean).join(' \u2022 ')}
          </p>
          {project.reason_for_work && (
            <p className="text-sm text-muted-foreground">{project.reason_for_work}</p>
          )}
        </div>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={() => setEditProject(true)}>
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive"
            onClick={() => setConfirmDelete(true)}
          >
            Delete
          </Button>
        </div>
      </div>

      <Separator />

      {/* Machine info */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between p-4">
          <CardTitle className="text-base">Machine Details</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setEditMachine(true)}>
            {machine && hasMachineData(machine) ? 'Edit' : 'Add Details'}
          </Button>
        </CardHeader>
        {machine && hasMachineData(machine) && (
          <CardContent className="px-4 pb-4 pt-0">
            <MachineInfoGrid machine={machine} />
          </CardContent>
        )}
      </Card>

      {/* Entity tabs */}
      <Tabs defaultValue="elements">
        <TabsList className="w-full">
          <TabsTrigger value="elements" className="flex-1">
            Elements ({elements?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="cables" className="flex-1">
            Cables ({cables?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="wires" className="flex-1">
            Wires ({wires?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="elements">
          <EntityPlaceholder
            label="Elements"
            count={elements?.length ?? 0}
            onAdd={() => {/* Phase 4 */}}
          />
        </TabsContent>
        <TabsContent value="cables">
          <EntityPlaceholder
            label="Cables"
            count={cables?.length ?? 0}
            onAdd={() => {/* Phase 5 */}}
          />
        </TabsContent>
        <TabsContent value="wires">
          <EntityPlaceholder
            label="Wires"
            count={wires?.length ?? 0}
            onAdd={() => {/* Phase 5 */}}
          />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <ProjectEditModal
        open={editProject}
        onOpenChange={setEditProject}
        project={project}
        onSave={(changes) => updateProject(project.id, changes)}
      />

      {machine && (
        <MachineEditModal
          open={editMachine}
          onOpenChange={setEditMachine}
          machine={machine}
          onSave={(changes) => updateMachine(machine.id, changes)}
        />
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete Project"
        description="This will permanently delete this project and all its data (machine, elements, terminals, cables, wires). This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDeleteProject}
        destructive
      />
    </div>
  );
}

function hasMachineData(m: Machine): boolean {
  return !!(
    m.manufacturer ||
    m.model_number ||
    m.serial_number ||
    m.voltage ||
    m.amperage ||
    m.phases ||
    m.control_voltage
  );
}

function MachineInfoGrid({ machine }: { machine: Machine }) {
  const fields = [
    ['Manufacturer', machine.manufacturer],
    ['Model', machine.model_number],
    ['Serial', machine.serial_number],
    ['Voltage', machine.voltage],
    ['Amperage', machine.amperage],
    ['Phases', machine.phases],
    ['Control Voltage', machine.control_voltage],
    ['Date Manufactured', machine.date_manufactured],
  ].filter(([, val]) => val);

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
      {fields.map(([label, value]) => (
        <div key={label}>
          <span className="text-muted-foreground">{label}: </span>
          <span>{value}</span>
        </div>
      ))}
    </div>
  );
}

function EntityPlaceholder({
  label,
  count,
  onAdd,
}: {
  label: string;
  count: number;
  onAdd: () => void;
}) {
  return (
    <div className="py-8 text-center">
      {count === 0 ? (
        <div className="space-y-2">
          <p className="text-muted-foreground">No {label.toLowerCase()} yet.</p>
          <Button variant="outline" onClick={onAdd}>
            Add {label.slice(0, -1)}
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground">
          {count} {label.toLowerCase()} — detail view coming in the next phase.
        </p>
      )}
    </div>
  );
}
