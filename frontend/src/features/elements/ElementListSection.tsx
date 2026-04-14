import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/EmptyState';
import { ElementCreateModal } from './ElementCreateModal';
import { db } from '@/lib/db';
import type { Element } from '@/lib/types';

interface ElementListSectionProps {
  machineId: string;
  projectId: string;
}

export function ElementListSection({ machineId, projectId }: ElementListSectionProps) {
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);

  const elements = useLiveQuery(
    () => db.elements.where('machine_id').equals(machineId).toArray(),
    [machineId],
  );

  // Get terminal counts per element
  const terminalCounts = useLiveQuery(async () => {
    if (!elements) return {};
    const counts: Record<string, number> = {};
    for (const el of elements) {
      counts[el.id] = await db.terminals.where('element_id').equals(el.id).count();
    }
    return counts;
  }, [elements]);

  if (!elements) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {elements.length} element{elements.length !== 1 ? 's' : ''}
        </span>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          Add Element
        </Button>
      </div>

      {elements.length === 0 ? (
        <EmptyState
          message="No elements yet. Add motors, relays, terminal blocks, etc."
          actionLabel="Add Element"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <div className="space-y-2">
          {elements.map((element) => (
            <ElementCard
              key={element.id}
              element={element}
              terminalCount={terminalCounts?.[element.id] ?? 0}
              onClick={() => navigate(`/projects/${projectId}/elements/${element.id}`)}
            />
          ))}
        </div>
      )}

      <ElementCreateModal
        open={showCreate}
        onOpenChange={setShowCreate}
        machineId={machineId}
      />
    </div>
  );
}

function ElementCard({
  element,
  terminalCount,
  onClick,
}: {
  element: Element;
  terminalCount: number;
  onClick: () => void;
}) {
  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-accent/50"
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between p-4">
        <div>
          <CardTitle className="text-base">
            {element.designation || element.name || 'Unnamed'}
          </CardTitle>
          <CardDescription className="text-sm">
            {[element.type, element.name && element.designation ? element.name : null]
              .filter(Boolean)
              .join(' \u2022 ')}
          </CardDescription>
        </div>
        <Badge variant="secondary">
          {terminalCount} terminal{terminalCount !== 1 ? 's' : ''}
        </Badge>
      </CardHeader>
    </Card>
  );
}
