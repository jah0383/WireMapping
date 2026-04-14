import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/EmptyState';
import { TerminalCreateModal } from './TerminalCreateModal';
import { TerminalEditModal } from './TerminalEditModal';
import { TerminalBulkGenerateModal } from './TerminalBulkGenerateModal';
import { db } from '@/lib/db';
import type { Terminal, Element } from '@/lib/types';

interface TerminalListSectionProps {
  element: Element;
}

export function TerminalListSection({ element }: TerminalListSectionProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editingTerminal, setEditingTerminal] = useState<Terminal | null>(null);

  const terminals = useLiveQuery(
    () => db.terminals.where('element_id').equals(element.id).toArray(),
    [element.id],
  );

  if (!terminals) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {terminals.length} terminal{terminals.length !== 1 ? 's' : ''}
        </span>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => setShowBulk(true)}>
            Bulk Generate
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            Add
          </Button>
        </div>
      </div>

      {terminals.length === 0 ? (
        <EmptyState
          message="No terminals yet."
          actionLabel="Add Terminal"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          {terminals.map((terminal) => (
            <button
              key={terminal.id}
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm transition-colors hover:bg-accent/50"
              onClick={() => setEditingTerminal(terminal)}
            >
              <span className="font-medium">{terminal.designation || '?'}</span>
              {terminal.purpose && (
                <Badge variant="secondary" className="text-xs">
                  {terminal.purpose}
                </Badge>
              )}
            </button>
          ))}
        </div>
      )}

      <TerminalCreateModal
        open={showCreate}
        onOpenChange={setShowCreate}
        element={element}
      />

      <TerminalBulkGenerateModal
        open={showBulk}
        onOpenChange={setShowBulk}
        elementId={element.id}
      />

      {editingTerminal && (
        <TerminalEditModal
          open={!!editingTerminal}
          onOpenChange={(open) => { if (!open) setEditingTerminal(null); }}
          terminal={editingTerminal}
        />
      )}
    </div>
  );
}
