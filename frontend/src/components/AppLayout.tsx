import { type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SyncStatusIndicator } from '@/components/SyncStatusIndicator';
import { PwaUpdatePrompt } from '@/components/PwaUpdatePrompt';
import { useAuth } from '@/features/auth/AuthContext';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const isHome = location.pathname === '/projects' || location.pathname === '/';

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          {!isHome && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              aria-label="Go back"
            >
              &larr;
            </Button>
          )}
          <h1 className="text-lg font-semibold">WireMapping</h1>
        </div>
        <div className="flex items-center gap-3">
          <SyncStatusIndicator />
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={handleSignOut}
          >
            Sign Out
          </Button>
        </div>
      </header>

      <main className="flex-1 px-4 py-4">{children}</main>

      <PwaUpdatePrompt />
    </div>
  );
}
