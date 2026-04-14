import { useSyncStatus } from '@/hooks/useSyncStatus';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export function SyncStatusIndicator() {
  const online = useOnlineStatus();
  const { pendingCount, isSyncing } = useSyncStatus();

  let color = 'bg-green-500'; // synced
  let label = 'Synced';

  if (!online) {
    color = 'bg-gray-400';
    label = 'Offline';
  } else if (isSyncing) {
    color = 'bg-yellow-500 animate-pulse';
    label = 'Syncing...';
  } else if (pendingCount > 0) {
    color = 'bg-yellow-500';
    label = `${pendingCount} pending`;
  }

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
      <span>{label}</span>
    </div>
  );
}
