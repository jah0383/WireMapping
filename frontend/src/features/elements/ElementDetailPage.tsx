import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ElementEditModal } from './ElementEditModal';
import { TerminalListSection } from '@/features/terminals/TerminalListSection';
import { useEntityCRUD } from '@/hooks/useEntityCRUD';
import { db } from '@/lib/db';
import type { Element } from '@/lib/types';

export function ElementDetailPage() {
  const { projectId, elementId } = useParams<{
    projectId: string;
    elementId: string;
  }>();
  const navigate = useNavigate();

  const { update, remove } = useEntityCRUD<Element>('elements');

  const element = useLiveQuery(
    () => (elementId ? db.elements.get(elementId) : undefined),
    [elementId],
  );

  const [showEdit, setShowEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!element) {
    return (
      <p className="py-8 text-center text-muted-foreground">Loading element...</p>
    );
  }

  async function handleDelete() {
    if (!elementId || !projectId) return;
    await remove(elementId);
    navigate(`/projects/${projectId}`, { replace: true });
  }

  const infoFields = [
    ['Type', element.type],
    ['Rating', element.rating],
    ['Part Number', element.part_number],
    ['Coil Rating', element.coil_rating],
    ['Default Gauge', element.default_wire_gauge],
    ['Default Color', element.default_wire_color],
    ['Default Wire Type', element.default_wire_type],
  ].filter(([, val]) => val);

  return (
    <div className="space-y-4">
      {/* Element header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold">
            {element.designation || element.name || 'Unnamed Element'}
          </h2>
          {element.designation && element.name && (
            <p className="text-sm text-muted-foreground">{element.name}</p>
          )}
          {element.type && (
            <Badge variant="secondary" className="mt-1">
              {element.type}
            </Badge>
          )}
        </div>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>
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

      {/* Element info */}
      {infoFields.length > 0 && (
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {infoFields.map(([label, value]) => (
                <div key={label}>
                  <span className="text-muted-foreground">{label}: </span>
                  <span>{value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Autofill toggle */}
      <div className="flex items-center gap-2">
        <Switch
          id="autofill"
          checked={element.autofill_enabled}
          onCheckedChange={(checked) =>
            update(element.id, { autofill_enabled: checked })
          }
        />
        <Label htmlFor="autofill" className="text-sm">
          Terminal autofill pairs (IEC conventions)
        </Label>
      </div>

      {/* Terminals */}
      <TerminalListSection element={element} />

      {/* Modals */}
      <ElementEditModal
        open={showEdit}
        onOpenChange={setShowEdit}
        element={element}
        onSave={(changes) => update(element.id, changes)}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete Element"
        description={`Delete "${element.designation || element.name || 'this element'}" and all its terminals? Wires connected to its terminals will have those ends set to unknown.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        destructive
      />
    </div>
  );
}
