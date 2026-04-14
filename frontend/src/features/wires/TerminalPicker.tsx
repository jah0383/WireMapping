import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/db';
import type { EndType } from '@/lib/types';

export interface TerminalPickerValue {
  terminalId: string | null;
  endType: EndType;
  /** Display label like "K1:14" or "External" */
  label: string;
}

interface TerminalPickerProps {
  machineId: string;
  label: string;
  value: TerminalPickerValue | null;
  onChange: (value: TerminalPickerValue) => void;
}

type Step = 'element' | 'terminal';

/**
 * Two-step terminal picker with text parsing.
 * Step 1: Select element (or External/Unknown)
 * Step 2: Select terminal within that element
 * Also accepts "element:terminal" text format (e.g. "K1:14")
 */
export function TerminalPicker({
  machineId,
  label,
  value,
  onChange,
}: TerminalPickerProps) {
  const [step, setStep] = useState<Step>('element');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const elements = useLiveQuery(
    () => db.elements.where('machine_id').equals(machineId).toArray(),
    [machineId],
  );

  const terminals = useLiveQuery(
    () =>
      selectedElementId
        ? db.terminals.where('element_id').equals(selectedElementId).toArray()
        : [],
    [selectedElementId],
  );

  const filteredElements = useMemo(() => {
    if (!elements || !search) return elements ?? [];
    const q = search.toLowerCase();
    return elements.filter(
      (el) =>
        el.designation?.toLowerCase().includes(q) ||
        el.name?.toLowerCase().includes(q) ||
        el.type?.toLowerCase().includes(q),
    );
  }, [elements, search]);

  const filteredTerminals = useMemo(() => {
    if (!terminals || !search) return terminals ?? [];
    const q = search.toLowerCase();
    return terminals.filter(
      (t) =>
        t.designation?.toLowerCase().includes(q) ||
        t.purpose?.toLowerCase().includes(q),
    );
  }, [terminals, search]);

  function handleTextParse(text: string) {
    const trimmed = text.trim().toLowerCase();

    // Check special keywords
    if (trimmed === 'external') {
      onChange({ terminalId: null, endType: 'external', label: 'External' });
      setIsOpen(false);
      setSearch('');
      return;
    }
    if (trimmed === 'unknown') {
      onChange({ terminalId: null, endType: 'unknown', label: 'Unknown' });
      setIsOpen(false);
      setSearch('');
      return;
    }

    // Try "element:terminal" format
    const colonIdx = text.indexOf(':');
    if (colonIdx === -1 || !elements) return;

    const elDesig = text.slice(0, colonIdx).trim();
    const termDesig = text.slice(colonIdx + 1).trim();
    if (!elDesig || !termDesig) return;

    const el = elements.find(
      (e) => e.designation?.toLowerCase() === elDesig.toLowerCase(),
    );
    if (!el) return;

    // Look up terminal synchronously from the search
    db.terminals
      .where('element_id')
      .equals(el.id)
      .toArray()
      .then((terms) => {
        const term = terms.find(
          (t) => t.designation?.toLowerCase() === termDesig.toLowerCase(),
        );
        if (term) {
          onChange({
            terminalId: term.id,
            endType: 'terminal',
            label: `${el.designation || el.name}:${term.designation}`,
          });
          setIsOpen(false);
          setSearch('');
        }
      });
  }

  function handleSelectElement(elementId: string) {
    setSelectedElementId(elementId);
    setStep('terminal');
    setSearch('');
  }

  function handleSelectTerminal(terminalId: string) {
    const el = elements?.find((e) => e.id === selectedElementId);
    const term = terminals?.find((t) => t.id === terminalId);
    if (!el || !term) return;

    onChange({
      terminalId: term.id,
      endType: 'terminal',
      label: `${el.designation || el.name}:${term.designation}`,
    });
    setIsOpen(false);
    setStep('element');
    setSelectedElementId(null);
    setSearch('');
  }

  function handleSelectSpecial(endType: 'external' | 'unknown') {
    onChange({
      terminalId: null,
      endType,
      label: endType === 'external' ? 'External' : 'Unknown',
    });
    setIsOpen(false);
    setSearch('');
  }

  function handleClear() {
    onChange({ terminalId: null, endType: 'unknown', label: '' });
    setStep('element');
    setSelectedElementId(null);
    setSearch('');
  }

  function handleBack() {
    setStep('element');
    setSelectedElementId(null);
    setSearch('');
  }

  if (!isOpen) {
    return (
      <div className="space-y-1.5">
        <Label>{label}</Label>
        <div
          className="flex min-h-10 cursor-pointer items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
          onClick={() => setIsOpen(true)}
        >
          {value?.label ? (
            <span>{value.label}</span>
          ) : (
            <span className="text-muted-foreground">Select endpoint...</span>
          )}
          {value?.label && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-1 text-muted-foreground"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
            >
              &times;
            </Button>
          )}
        </div>
      </div>
    );
  }

  const selectedElement = elements?.find((e) => e.id === selectedElementId);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      {/* Text input for parsing */}
      <Input
        placeholder={
          step === 'element'
            ? 'Type "K1:14" or search elements...'
            : `Search terminals in ${selectedElement?.designation || selectedElement?.name}...`
        }
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleTextParse(search);
          }
          if (e.key === 'Escape') {
            setIsOpen(false);
            setSearch('');
            setStep('element');
            setSelectedElementId(null);
          }
        }}
        autoFocus
      />

      <div className="max-h-48 overflow-y-auto rounded-md border border-border">
        {step === 'element' ? (
          <div className="divide-y divide-border">
            {/* Special options at top */}
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent/50"
              onClick={() => handleSelectSpecial('external')}
            >
              <Badge variant="outline" className="text-xs">ext</Badge>
              External Connection
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent/50"
              onClick={() => handleSelectSpecial('unknown')}
            >
              <Badge variant="outline" className="text-xs">?</Badge>
              Unknown
            </button>

            {/* Elements */}
            {filteredElements.map((el) => (
              <button
                key={el.id}
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-accent/50"
                onClick={() => handleSelectElement(el.id)}
              >
                <span>
                  <span className="font-medium">{el.designation || el.name || 'Unnamed'}</span>
                  {el.designation && el.name && (
                    <span className="ml-1 text-muted-foreground">{el.name}</span>
                  )}
                </span>
                {el.type && (
                  <Badge variant="secondary" className="text-xs">{el.type}</Badge>
                )}
              </button>
            ))}

            {filteredElements.length === 0 && (
              <p className="px-3 py-2 text-sm text-muted-foreground">No elements found</p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {/* Back button */}
            <button
              type="button"
              className="flex w-full items-center gap-1 px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-accent/50"
              onClick={handleBack}
            >
              &larr; Back to elements
            </button>

            {/* Terminals */}
            {filteredTerminals.map((t) => (
              <button
                key={t.id}
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-accent/50"
                onClick={() => handleSelectTerminal(t.id)}
              >
                <span className="font-medium">{t.designation || '?'}</span>
                {t.purpose && (
                  <Badge variant="secondary" className="text-xs">{t.purpose}</Badge>
                )}
              </button>
            ))}

            {filteredTerminals.length === 0 && (
              <p className="px-3 py-2 text-sm text-muted-foreground">No terminals found</p>
            )}
          </div>
        )}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          setIsOpen(false);
          setSearch('');
          setStep('element');
          setSelectedElementId(null);
        }}
      >
        Cancel
      </Button>
    </div>
  );
}
