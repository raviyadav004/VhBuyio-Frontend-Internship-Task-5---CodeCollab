import { Bell, CircleDot, Loader2, PanelLeft, Users, WifiOff } from 'lucide-react';
import clsx from 'clsx';
import type { ConnectionStatus, Project } from '@/types';
import { useCollabStore } from '@/stores/collabStore';
import { useEditorStore } from '@/stores/editorStore';
import { useCursorStore } from '@/stores/cursorStore';
import { useUiStore } from '@/stores/uiStore';
import { useWorkspaceActions } from '@/hooks/useWorkspaceActions';
import { collaborationSimulator } from '@/services/collaborationSimulator';
import { findNode } from '@/utils/fileTree';
import { languageDisplayName } from '@/utils/language';
import styles from './Workspace.module.css';

const CONNECTION_TEXT: Record<ConnectionStatus, string> = {
  connected: 'Connected',
  reconnecting: 'Reconnecting…',
  offline: 'Offline',
};

interface StatusBarProps {
  project: Project;
}

export function StatusBar({ project }: StatusBarProps) {
  const actions = useWorkspaceActions();
  const connection = useCollabStore((s) => s.connection);
  const queuedChanges = useCollabStore((s) => s.queuedChanges);
  const onlineCount = useCollabStore( (s) => s.users.filter((u) => u.status === 'online').length, );
  const activeFileId = useEditorStore((s) => s.activeFileByProject[project.id] ?? null);
  const tabSize = useEditorStore((s) => s.settings.tabSize);
  const line = useCursorStore((s) => s.line);
  const column = useCursorStore((s) => s.column);
  const selected = useCursorStore((s) => s.selected);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const setSidebarView = useUiStore((s) => s.setSidebarView);

  const activeNode = activeFileId ? findNode(project.files, activeFileId) : null;
  const languageLabel = activeNode?.language ? languageDisplayName(activeNode.language) : null;
  const ConnectionIcon = connection === 'connected' ? CircleDot : connection === 'reconnecting' ? Loader2 : WifiOff;
  return (
    <footer className={styles.statusBar}>
      <button
        type="button"
        className={styles.statusItem}
        onClick={actions.toggleSidebar}
        aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
        title="Toggle sidebar (Ctrl + B)"
      >
        <PanelLeft size={12} />
      </button>

      <button
        type="button"
        className={clsx(
          styles.statusItem,
          connection === 'connected' && styles.statusConnected,
          connection === 'reconnecting' && styles.statusReconnecting,
          connection === 'offline' && styles.statusOffline,
        )}
        onClick={() => {
          if (connection === 'connected') collaborationSimulator.simulateDisconnect();
          else collaborationSimulator.simulateReconnect();
        }}
        title={
          connection === 'connected' ? 'Simulate losing the connection' : 'Reconnect and sync'
        }
      >
        <ConnectionIcon
          size={11}
          className={connection === 'reconnecting' ? styles.spin : undefined}
          aria-hidden="true"
        />
        <span>{CONNECTION_TEXT[connection]}</span>
      </button>

      {queuedChanges > 0 && (
        <span className={clsx(styles.statusItem, styles.statusReconnecting)}>
          <Bell size={11} aria-hidden="true" />
          {queuedChanges} change{queuedChanges === 1 ? '' : 's'} queued
        </span>
      )}

      <button
        type="button"
        className={clsx(styles.statusItem, styles.statusHideSmall)}
        onClick={() => setSidebarView('collaboration')}
        title="Show collaborators"
      >
        <Users size={11} aria-hidden="true" />
        {onlineCount} online
      </button>

      <span className={styles.statusSpacer} />

      {selected > 0 && (
        <span className={clsx(styles.statusItem, styles.statusHideSmall)}>
          {selected} selected
        </span>
      )}

      <button
        type="button"
        className={clsx(styles.statusItem, styles.statusHideSmall)}
        onClick={actions.openSettings}
        title="Change indentation in settings"
      >
        Spaces: {tabSize}
      </button>

      {languageLabel && (
        <button
          type="button"
          className={styles.statusItem}
          onClick={actions.openSettings}
          title="Language is set from the file extension"
        >
          {languageLabel}
        </button>
      )}

      {activeFileId && (
        <button
          type="button"
          className={styles.statusItem}
          onClick={actions.goToLine}
          title="Go to line (Ctrl + G)"
        >
          Ln {line}, Col {column}
        </button>
      )}
    </footer>
  );
}