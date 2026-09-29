import { useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import { useProjectStore, selectActiveProject } from '@/stores/projectStore';
import { useCollabStore } from '@/stores/collabStore';
import { useUiStore } from '@/stores/uiStore';
import { useTheme } from '@/hooks/useTheme';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { Workspace } from '@/components/workspace/Workspace';
import { CommandPalette } from '@/components/modals/CommandPalette';
import { QuickOpen } from '@/components/modals/QuickOpen';
import { SettingsModal } from '@/components/modals/SettingsModal';
import { ShareModal } from '@/components/modals/ShareModal';
import { isStorageAvailable, onStorageError } from '@/services/storage';

export default function App() {
  useTheme();
  const project = useProjectStore(selectActiveProject);
  const hydrated = useProjectStore((s) => s.hydrated);
  const theme = useUiStore((s) => s.theme);

  useEffect(() => {
    if (!isStorageAvailable()) {
      toast.warning('Browser storage is unavailable', {
        description: 'Your work will not survive a refresh in this browser mode.',
        duration: 8000,
      });
    }

    return onStorageError((error) => {
      if (error.kind === 'parse') {
        toast.warning('Saved data could not be read', {
          description: 'CodeCollab reset it and loaded the sample workspace.',
        });
      } else if (error.kind === 'quota') {
        toast.error('Browser storage is full', { description: error.message });
      }
    });
  }, []);

  useEffect(() => {
    let previous = useCollabStore.getState().connection;
    return useCollabStore.subscribe((state) => {
      const next = state.connection;
      if (next === previous) return;

      const wasOffline = previous !== 'connected';
      previous = next;

      if (next === 'offline') {
        toast.warning('Connection lost', {
          description: 'You can keep editing — changes are stored locally.',
        });
      } else if (next === 'connected' && wasOffline) {
        toast.success('All changes synchronized');
      }
    });
  }, []);

  if (!hydrated) {
    return (
      <div
        style={{
          display: 'grid',
          placeItems: 'center',
          height: '100%',
          color: 'var(--text-muted)',
          fontSize: 13,
        }}
      >
        Loading your workspace…
      </div>
    );
  }

  return (
    <>
      <ErrorBoundary area="CodeCollab">
        {project ? <Workspace key={project.id} project={project} /> : <Dashboard />}
      </ErrorBoundary>

      {/* Modals are mounted once and self-gate on the ui store. */}
      <CommandPalette />
      <QuickOpen />
      <SettingsModal />
      <ShareModal />

      <Toaster
        theme={theme === 'light' ? 'light' : 'dark'}
        position="bottom-right"
        richColors
        closeButton
        toastOptions={{ style: { fontFamily: 'var(--font-ui)' } }}
      />
    </>
  );
}