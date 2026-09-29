import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ArrowLeft, Check, Moon, Settings, Share2, Sparkles, Sun, SunMoon, TerminalSquare, } from 'lucide-react';
import clsx from 'clsx';
import type { Project } from '@/types';
import { useEditorStore } from '@/stores/editorStore';
import { useCollabStore } from '@/stores/collabStore';
import { useUiStore } from '@/stores/uiStore';
import { useWorkspaceActions } from '@/hooks/useWorkspaceActions';
import { AvatarStack } from '@/components/common/Avatar';
import { IconButton } from '@/components/common/IconButton';
import { relativeTime } from '@/utils/time';
import styles from './Workspace.module.css';

interface HeaderProps {
  project: Project;
}

const THEME_ICON = { dark: Moon, light: Sun, midnight: SunMoon } as const;
export function Header({ project }: HeaderProps) {
  const actions = useWorkspaceActions();
  const dirtyCount = useEditorStore((s) => Object.keys(s.dirty).length);
  const autoSave = useEditorStore((s) => s.settings.autoSave);
  const users = useCollabStore(useShallow((s) => s.users));
  const theme = useUiStore((s) => s.theme);
  const demoPanelOpen = useUiStore((s) => s.demoPanelOpen);
  const visibleUsers = useMemo(
    () => users.filter((u) => u.status !== 'offline'),
    [users],
  );

  const ThemeIcon = THEME_ICON[theme];
  return (
    <header className={styles.header}>
      <IconButton label="Back to projects" onClick={actions.backToDashboard}>
        <ArrowLeft size={16} />
      </IconButton>

      <span className={styles.brand}>
        <span className={styles.brandMark} aria-hidden="true">
          <Sparkles size={13} />
        </span>
        <span className={styles.brandName}>CodeCollab</span>
      </span>

      <span className={styles.divider} aria-hidden="true" />

      <h1 className={styles.projectName} title={project.name}>
        {project.name}
      </h1>

      <span
        className={clsx(styles.saveState, dirtyCount > 0 && styles.saveStateDirty)}
        aria-live="polite"
      >
        {dirtyCount > 0 ? (
          <>
            <span aria-hidden="true">●</span>
            {dirtyCount} unsaved
          </>
        ) : (
          <>
            <Check size={12} aria-hidden="true" />
            {autoSave ? 'Auto-saved' : 'Saved'} {relativeTime(project.updatedAt)}
          </>
        )}
      </span>

      <span className={styles.headerSpacer} />

      <div className={styles.headerUsers}>
        <AvatarStack users={visibleUsers} />
      </div>

      <div className={styles.headerActions}>
        <IconButton
          label="Demo controls"
          active={demoPanelOpen}
          onClick={actions.toggleDemoPanel}
        >
          <TerminalSquare size={16} />
        </IconButton>

        <IconButton label="Share project" onClick={actions.openShare}>
          <Share2 size={16} />
        </IconButton>

        <IconButton
          label={`Switch theme (current: ${theme})`}
          onClick={actions.cycleTheme}
        >
          <ThemeIcon size={16} />
        </IconButton>

        <IconButton label="Settings" onClick={actions.openSettings}>
          <Settings size={16} />
        </IconButton>
      </div>
    </header>
  );
}