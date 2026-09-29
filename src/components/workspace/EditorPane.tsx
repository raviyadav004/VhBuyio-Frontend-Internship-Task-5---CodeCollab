import { CloudOff, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import type { Project } from '@/types';
import { useEditorStore } from '@/stores/editorStore';
import { useCollabStore } from '@/stores/collabStore';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Button } from '@/components/common/IconButton';
import { TabBar } from './TabBar';
import { MonacoEditor } from './MonacoEditor';
import { collaborationSimulator } from '@/services/collaborationSimulator';
import { SHORTCUT_LABELS } from '@/hooks/useKeyboardShortcuts';
import styles from './Workspace.module.css';

interface EditorPaneProps {
  project: Project;
}

export function EditorPane({ project }: EditorPaneProps) {
  const activeFileId = useEditorStore((s) => s.activeFileByProject[project.id] ?? null);
  const connection = useCollabStore((s) => s.connection);
  return (
    <div className={styles.editorRegion}>
      <TabBar projectId={project.id} />

      {connection === 'offline' && (
        <div className={styles.offlineBanner} role="status">
          <CloudOff size={13} aria-hidden="true" />
          <span>
            <strong>Offline.</strong> Edits are saved in this browser and will sync when
            the connection returns.
          </span>

          <span style={{ flex: 1 }} />

          <Button
            variant="ghost"
            onClick={() => collaborationSimulator.simulateReconnect()}
            style={{ height: 22 }}
          >
            Reconnect
          </Button>
        </div>
      )}

      <div className={styles.editorHost}>
        {!activeFileId && <WelcomeScreen />}

        <ErrorBoundary area="Editor">
          <div
            className={clsx(activeFileId ? undefined : styles.editorHidden)}
            style={{ height: '100%' }}
          >
            <MonacoEditor projectId={project.id} activeFileId={activeFileId} />
          </div>
        </ErrorBoundary>
      </div>
    </div>
  );
}

function WelcomeScreen() {
  const rows: Array<[string, string]> = [
    ['Command palette', SHORTCUT_LABELS.commandPalette],
    ['Go to file', SHORTCUT_LABELS.quickOpen],
    ['Save', SHORTCUT_LABELS.save],
    ['Toggle sidebar', SHORTCUT_LABELS.toggleSidebar],
    ['Demo controls', SHORTCUT_LABELS.demoPanel],
  ];

  return (
    <div className={styles.welcome}>
      <span className={styles.welcomeMark} aria-hidden="true">
        <Sparkles size={24} />
      </span>

      <div>
        <h2 className={styles.welcomeTitle}>No file open</h2>
        <p className={styles.welcomeHint}> Pick a file from the explorer, or jump straight to one with Quick Open. </p>
      </div>

      <dl className={styles.shortcutList}>
        {rows.map(([label, keys]) => (
          <div key={label} className={styles.shortcutRow}>
            <dt>{label}</dt>
            <dd>
              <kbd className={styles.kbd}>{keys}</kbd>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}