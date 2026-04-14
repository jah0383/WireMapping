import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SelectWithCustomProps {
  label: string;
  options: readonly string[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
}

const CUSTOM_KEY = '__custom__';

/**
 * Dropdown with predefined options plus a "Custom..." escape hatch
 * that reveals a free text input.
 */
export function SelectWithCustom({
  label,
  options,
  value,
  onChange,
  placeholder,
}: SelectWithCustomProps) {
  const isCustomValue = value !== null && !options.includes(value);
  const [showCustom, setShowCustom] = useState(isCustomValue);
  const [customText, setCustomText] = useState(isCustomValue ? value : '');

  useEffect(() => {
    const custom = value !== null && !options.includes(value);
    setShowCustom(custom);
    if (custom) setCustomText(value);
  }, [value, options]);

  const handleSelectChange = (selected: string | null) => {
    if (selected === null) return;
    if (selected === CUSTOM_KEY) {
      setShowCustom(true);
      setCustomText('');
      onChange(null);
    } else {
      setShowCustom(false);
      setCustomText('');
      onChange(selected);
    }
  };

  const handleCustomChange = (text: string) => {
    setCustomText(text);
    onChange(text || null);
  };

  const fieldId = label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-1.5">
      <Label htmlFor={fieldId}>{label}</Label>
      <Select
        value={showCustom ? CUSTOM_KEY : value || undefined}
        onValueChange={handleSelectChange}
      >
        <SelectTrigger id={fieldId}>
          <SelectValue placeholder={placeholder || `Select ${label.toLowerCase()}...`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
          <SelectItem value={CUSTOM_KEY}>Custom...</SelectItem>
        </SelectContent>
      </Select>
      {showCustom && (
        <Input
          placeholder={`Enter custom ${label.toLowerCase()}`}
          value={customText}
          onChange={(e) => handleCustomChange(e.target.value)}
          autoFocus
        />
      )}
    </div>
  );
}
