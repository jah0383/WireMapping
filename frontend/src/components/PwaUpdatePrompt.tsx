import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/button';

export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm rounded-lg border border-border bg-card p-4 shadow-lg">
      <p className="text-sm">New version available.</p>
      <div className="mt-2 flex gap-2">
        <Button size="sm" onClick={() => updateServiceWorker(true)}>
          Reload
        </Button>
      </div>
    </div>
  );
}
