import { useCallback, useState } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';
import type { Project } from '@/types';
import { useUiStore, PANEL_MAX, PANEL_MIN } from '@/stores/uiStore';
import { IconButton } from '@/components/common/IconButton';
import { ActivityPanel } from './ActivityPanel';
import { PresencePanel } from './PresencePanel';
import styles from './Workspace.module.css';

type PanelTab = 'activity' | 'collaborators';
interface BottomPanelProps {
  project: Project;
}

export function BottomPanel({ project }: BottomPanelProps) {
  const panelOpen = useUiStore((s) => s.panelOpen);
  const panelHeight = useUiStore((s) => s.panelHeight);
  const setPanelHeight = useUiStore((s) => s.setPanelHeight);
  const setPanelOpen = useUiStore((s) => s.setPanelOpen);
  const [tab, setTab] = useState<PanelTab>('activity');
  const [resizing, setResizing] = useState(false);
  const startResize = useCallback(
    (event: React.PointerEvent) => {
      event.preventDefault();
      const startY = event.clientY;
      const startHeight = panelHeight;
      setResizing(true);

      const onMove = (e: PointerEvent) => {
        setPanelHeight(startHeight - (e.clientY - startY));
      };

      const onUp = () => {
        setResizing(false);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [panelHeight, setPanelHeight],
  );

  const onResizerKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const step = event.shiftKey ? 40 : 10;

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setPanelHeight(panelHeight + step);
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        setPanelHeight(panelHeight - step);
      }
    },
    [panelHeight, setPanelHeight],
  );

  if (!panelOpen) return null;

  return (
    <section
      className={styles.bottomPanel}
      style={{ height: panelHeight }}
      aria-label="Workspace panel"
    >
      <div
        role="separator"
        aria-label="Resize panel"
        aria-orientation="horizontal"
        aria-valuenow={panelHeight}
        aria-valuemin={PANEL_MIN}
        aria-valuemax={PANEL_MAX}
        tabIndex={0}
        className={clsx(
          styles.resizer,
          styles.resizerHorizontal,
          resizing && styles.resizerActive,
        )}
        onPointerDown={startResize}
        onKeyDown={onResizerKeyDown}
      />

      <div className={styles.panelTabs} role="tablist" aria-label="Panel sections">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'activity'}
          className={clsx(styles.panelTab, tab === 'activity' && styles.panelTabActive)}
          onClick={() => setTab('activity')}
        >
          Activity
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={tab === 'collaborators'}
          className={clsx(
            styles.panelTab,
            tab === 'collaborators' && styles.panelTabActive,
          )}
          onClick={() => setTab('collaborators')}
        >
          Collaborators
        </button>

        <span style={{ flex: 1 }} />

        <IconButton label="Close panel" onClick={() => setPanelOpen(false)}>
          <X size={14} />
        </IconButton>
      </div>

      <div className={styles.panelBody}>
        {tab === 'activity' ? (
          <ActivityPanel embedded />
        ) : (
          <PresencePanel project={project} />
        )}
      </div>
    </section>
  );
}