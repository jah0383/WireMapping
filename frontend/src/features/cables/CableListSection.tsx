import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/EmptyState';
import { CableCreateModal } from './CableCreateModal';
import { CableEditModal } from './CableEditModal';
import { db } from '@/lib/db';
import type { Cable } from '@/lib/types';

interface CableListSectionProps {
  machineId: string;
}

export function CableListSection({ machineId }: CableListSectionProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingCable, setEditingCable] = useState<Cable | null>(null);

  const cables = useLiveQuery(
    () => db.cables.where('machine_id').equals(machineId).toArray(),
    [machineId],
  );

  const wireCounts = useLiveQuery(async () => {
    if (!cables) return {};
    const counts: Record<string, number> = {};
    for (const c of cables) {
      counts[c.id] = await db.wires.where('cable_id').equals(c.id).count();
    }
    return counts;
  }, [cables]);

  if (!cables) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {cables.length} cable{cables.length !== 1 ? 's' : ''}
        </span>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          Add Cable
        </Button>
      </div>

      {cables.length === 0 ? (
        <EmptyState
          message="No cables yet. Cables are optional — wires can be standalone."
          actionLabel="Add Cable"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <div className="space-y-2">
          {cables.map((cable) => (
            <Card
              key={cable.id}
              className="cursor-pointer transition-colors hover:bg-accent/50"
              onClick={() => setEditingCable(cable)}
            >
              <CardHeader className="flex flex-row items-center justify-between p-4">
                <div>
                  <CardTitle className="text-base">
                    {cable.designation || 'Unnamed Cable'}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {[cable.cable_type, cable.wire_gauge, cable.wire_color]
                      .filter(Boolean)
                      .join(' \u2022 ')}
                  </CardDescription>
                </div>
                <Badge variant="secondary">
                  {wireCounts?.[cable.id] ?? 0} wire{(wireCounts?.[cable.id] ?? 0) !== 1 ? 's' : ''}
                </Badge>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <CableCreateModal
        open={showCreate}
        onOpenChange={setShowCreate}
        machineId={machineId}
      />

      {editingCable && (
        <CableEditModal
          open={!!editingCable}
          onOpenChange={(open) => { if (!open) setEditingCable(null); }}
          cable={editingCable}
        />
      )}
    </div>
  );
}
