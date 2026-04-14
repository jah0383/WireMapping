import { type InputHTMLAttributes, type RefObject } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  /** Called when Enter is pressed. Use to advance focus to the next field. */
  onNext?: () => void;
}

export function FormField({
  label,
  error,
  inputRef,
  onNext,
  id,
  ...inputProps
}: FormFieldProps) {
  const fieldId = id || label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-1.5">
      <Label htmlFor={fieldId}>{label}</Label>
      <Input
        id={fieldId}
        ref={inputRef}
        enterKeyHint={onNext ? 'next' : 'done'}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onNext) {
            e.preventDefault();
            onNext();
          }
        }}
        {...inputProps}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
