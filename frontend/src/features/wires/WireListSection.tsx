import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/EmptyState';
import { WireEditModal } from './WireEditModal';
import { db } from '@/lib/db';
import type { Wire } from '@/lib/types';

interface WireListSectionProps {
  machineId: string;
  projectId: string;
}

export function WireListSection({ machineId, projectId }: WireListSectionProps) {
  const navigate = useNavigate();
  const [editingWire, setEditingWire] = useState<Wire | null>(null);

  const wires = useLiveQuery(
    () => db.wires.where('machine_id').equals(machineId).toArray(),
    [machineId],
  );

  // Build lookup maps for display labels
  const endLabels = useLiveQuery(async () => {
    if (!wires) return {};
    const labels: Record<string, { end1: string; end2: string; cable: string }> = {};

    for (const wire of wires) {
      labels[wire.id] = {
        end1: await getEndLabel(wire.end1_terminal_id, wire.end1_type),
        end2: await getEndLabel(wire.end2_terminal_id, wire.end2_type),
        cable: wire.cable_id ? await getCableLabel(wire.cable_id) : 'standalone',
      };
    }
    return labels;
  }, [wires]);

  if (!wires) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {wires.length} wire{wires.length !== 1 ? 's' : ''}
        </span>
        <Button size="sm" onClick={() => navigate(`/projects/${projectId}/wires/new`)}>
          Add Wire
        </Button>
      </div>

      {wires.length === 0 ? (
        <EmptyState
          message="No wires yet. Start documenting connections."
          actionLabel="Add Wire"
          onAction={() => navigate(`/projects/${projectId}/wires/new`)}
        />
      ) : (
        <div className="space-y-2">
          {wires.map((wire) => {
            const info = endLabels?.[wire.id];
            return (
              <Card
                key={wire.id}
                className="cursor-pointer transition-colors hover:bg-accent/50"
                onClick={() => setEditingWire(wire)}
              >
                <CardHeader className="p-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {wire.designation || 'Unnamed'}
                    </CardTitle>
                    <div className="flex gap-1">
                      {wire.color && (
                        <Badge variant="secondary" className="text-xs">{wire.color}</Badge>
                      )}
                      {wire.gauge && (
                        <Badge variant="outline" className="text-xs">{wire.gauge}</Badge>
                      )}
                    </div>
                  </div>
                  <CardDescription className="text-sm">
                    {info?.end1 ?? '...'} &rarr; {info?.end2 ?? '...'}
                    {info?.cable && info.cable !== 'standalone' && (
                      <span className="ml-2 text-muted-foreground">({info.cable})</span>
                    )}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}

      {editingWire && (
        <WireEditModal
          open={!!editingWire}
          onOpenChange={(open) => { if (!open) setEditingWire(null); }}
          wire={editingWire}
          machineId={machineId}
        />
      )}
    </div>
  );
}

async function getEndLabel(
  terminalId: string | null,
  endType: string,
): Promise<string> {
  if (endType === 'external') return 'External';
  if (endType === 'unknown') return 'Unknown';
  if (!terminalId) return 'Unknown';

  const terminal = await db.terminals.get(terminalId);
  if (!terminal) return '?';

  const element = await db.elements.get(terminal.element_id);
  return `${element?.designation || element?.name || '?'}:${terminal.designation || '?'}`;
}

async function getCableLabel(cableId: string): Promise<string> {
  const cable = await db.cables.get(cableId);
  return cable?.designation || 'unnamed cable';
}
