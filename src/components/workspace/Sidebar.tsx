import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, Files, PanelLeftClose, Users } from 'lucide-react';
import clsx from 'clsx';
import type { Project, SidebarView } from '@/types';
import { useUiStore, SIDEBAR_MAX, SIDEBAR_MIN } from '@/stores/uiStore';
import { useCollabStore } from '@/stores/collabStore';
import { useIsCompact } from '@/hooks/useMediaQuery';
import { IconButton } from '@/components/common/IconButton';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { FileExplorer } from './FileExplorer';
import { PresencePanel } from './PresencePanel';
import { ActivityPanel } from './ActivityPanel';
import styles from './Workspace.module.css';

const VIEWS: Array<{ id: SidebarView; label: string; icon: typeof Files }> = [
  { id: 'explorer', label: 'Explorer', icon: Files },
  { id: 'collaboration', label: 'Collaboration', icon: Users },
  { id: 'activity', label: 'Activity', icon: Activity },
];

export function ActivityBar() {
  const sidebarView = useUiStore((s) => s.sidebarView);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const setSidebarView = useUiStore((s) => s.setSidebarView);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const onlineCount = useCollabStore(
    (s) => s.users.filter((u) => u.status === 'online').length,
  );

  return (
    <nav className={styles.activityBar} aria-label="Sidebar views">
      {VIEWS.map((view) => {
        const Icon = view.icon;
        const isActive = sidebarOpen && sidebarView === view.id;

        return (
          <button
            key={view.id}
            type="button"
            className={clsx(styles.railButton, isActive && styles.railButtonActive)}
            aria-label={view.label}
            aria-pressed={isActive}
            title={view.label}
            onClick={() => {
              if (sidebarOpen && sidebarView === view.id) toggleSidebar();
              else setSidebarView(view.id);
            }}
          >
            <Icon size={19} />

            {view.id === 'collaboration' && onlineCount > 0 && (
              <span className={styles.railBadge} aria-hidden="true">
                {onlineCount}
              </span>
            )}
          </button>
        );
      })}

      <span className={styles.railSpacer} />

      <button
        type="button"
        className={styles.railButton}
        aria-label="Hide sidebar"
        title="Hide sidebar (Ctrl + B)"
        onClick={toggleSidebar}
      >
        <PanelLeftClose size={18} />
      </button>
    </nav>
  );
}

interface SidebarProps {
  project: Project;
}

export function Sidebar({ project }: SidebarProps) {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const sidebarView = useUiStore((s) => s.sidebarView);
  const sidebarWidth = useUiStore((s) => s.sidebarWidth);
  const setSidebarWidth = useUiStore((s) => s.setSidebarWidth);
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen);
  const isCompact = useIsCompact();
  const [resizing, setResizing] = useState(false);
  const asideRef = useRef<HTMLElement>(null);
  const startResize = useCallback(
    (event: React.PointerEvent) => {
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = sidebarWidth;
      setResizing(true);

      const onMove = (e: PointerEvent) => {
        setSidebarWidth(startWidth + (e.clientX - startX));
      };

      const onUp = () => {
        setResizing(false);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [setSidebarWidth, sidebarWidth],
  );

  const onResizerKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const step = event.shiftKey ? 40 : 10;

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setSidebarWidth(sidebarWidth - step);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        setSidebarWidth(sidebarWidth + step);
      }
    },
    [setSidebarWidth, sidebarWidth],
  );

  useEffect(() => {
    if (!isCompact || !sidebarOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (asideRef.current?.contains(target)) return;
      if ((target as HTMLElement).closest?.(`.${styles.activityBar}`)) return;
      setSidebarOpen(false);
    };

    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [isCompact, setSidebarOpen, sidebarOpen]);

  if (!sidebarOpen) return null;

  return (
    <aside
      ref={asideRef}
      className={clsx(styles.sidebar, isCompact && styles.sidebarFloating)}
      style={{ width: sidebarWidth }}
      aria-label="Workspace sidebar"
    >
      <ErrorBoundary area="Sidebar">
        {sidebarView === 'explorer' && <FileExplorer project={project} />}
        {sidebarView === 'collaboration' && <PresencePanel project={project} />}
        {sidebarView === 'activity' && <ActivityPanel />}
      </ErrorBoundary>

      {!isCompact && (
        <div
          role="separator"
          aria-label="Resize sidebar"
          aria-orientation="vertical"
          aria-valuenow={sidebarWidth}
          aria-valuemin={SIDEBAR_MIN}
          aria-valuemax={SIDEBAR_MAX}
          tabIndex={0}
          className={clsx(styles.resizer, resizing && styles.resizerActive)}
          onPointerDown={startResize}
          onKeyDown={onResizerKeyDown}
        />
      )}
    </aside>
  );
}

export function SidebarBackdrop() {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen);
  const isCompact = useIsCompact();
  if (!isCompact || !sidebarOpen) return null;

  return (
    <div
      className={styles.sidebarBackdrop}
      role="presentation"
      onClick={() => setSidebarOpen(false)}
    />
  );
}

export { IconButton };