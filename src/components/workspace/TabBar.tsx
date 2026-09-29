import { memo, useCallback, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { PanelBottom, SplitSquareHorizontal, X } from 'lucide-react';
import clsx from 'clsx';
import type { OpenTab } from '@/types';
import { useEditorStore } from '@/stores/editorStore';
import { useUiStore } from '@/stores/uiStore';
import { IconButton } from '@/components/common/IconButton';
import styles from './Workspace.module.css';

interface TabProps {
  tab: OpenTab;
  active: boolean;
  dirty: boolean;
  dragging: boolean;
  dropBefore: boolean;
  onActivate: (fileId: string) => void;
  onClose: (fileId: string) => void;
  onPin: (fileId: string) => void;
  onDragStart: (fileId: string) => void;
  onDragEnd: () => void;
  onDragOverTab: (fileId: string) => void;
  onDrop: (fileId: string) => void;
}

const Tab = memo(function Tab({
  tab,
  active,
  dirty,
  dragging,
  dropBefore,
  onActivate,
  onClose,
  onPin,
  onDragStart,
  onDragEnd,
  onDragOverTab,
  onDrop,
}: TabProps) {
  return (
    <div
      role="tab"
      aria-selected={active}
      tabIndex={active ? 0 : -1}
      title={tab.path}
      className={clsx(
        styles.tab,
        active && styles.tabActive,
        !tab.pinned && styles.tabPreview,
        dragging && styles.tabDragging,
        dropBefore && styles.tabDropBefore,
      )}
      draggable
      onClick={() => onActivate(tab.fileId)}
      onDoubleClick={() => onPin(tab.fileId)}
      onAuxClick={(e) => {
        if (e.button === 1) {
          e.preventDefault();
          onClose(tab.fileId);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onActivate(tab.fileId);
        }
      }}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', tab.fileId);
        onDragStart(tab.fileId);
      }}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOverTab(tab.fileId);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(tab.fileId);
      }}
    >
      <span className={styles.tabLabel}>{tab.name}</span>

      {dirty ? (
        <span
          className={styles.tabDirtyDot}
          title={`${tab.name} has unsaved changes`}
          aria-label="Unsaved changes"
          role="img"
        />
      ) : null}

      <button
        type="button"
        className={styles.tabClose}
        aria-label={`Close ${tab.name}`}
        title={`Close ${tab.name}`}
        onClick={(e) => {
          e.stopPropagation();
          onClose(tab.fileId);
        }}
      >
        <X size={12} />
      </button>
    </div>
  );
});

interface TabBarProps {
  projectId: string;
}

export function TabBar({ projectId }: TabBarProps) {
  const tabs = useEditorStore(useShallow((s) => s.tabsByProject[projectId] ?? []));
  const activeFileId = useEditorStore((s) => s.activeFileByProject[projectId] ?? null);
  const dirty = useEditorStore(useShallow((s) => s.dirty));

  const setActiveFile = useEditorStore((s) => s.setActiveFile);
  const closeTab = useEditorStore((s) => s.closeTab);
  const closeAllTabs = useEditorStore((s) => s.closeAllTabs);
  const pinTab = useEditorStore((s) => s.pinTab);
  const moveTab = useEditorStore((s) => s.moveTab);

  const togglePanel = useUiStore((s) => s.togglePanel);
  const panelOpen = useUiStore((s) => s.panelOpen);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  const handleActivate = useCallback(
    (fileId: string) => setActiveFile(projectId, fileId),
    [projectId, setActiveFile],
  );

  const handleClose = useCallback(
    (fileId: string) => closeTab(projectId, fileId),
    [closeTab, projectId],
  );

  const handlePin = useCallback(
    (fileId: string) => pinTab(projectId, fileId),
    [pinTab, projectId],
  );

  const handleDrop = useCallback(
    (targetFileId: string) => {
      const sourceId = draggingId;
      setDraggingId(null);
      setDropTargetId(null);
      if (!sourceId || sourceId === targetFileId) return;

      const toIndex = tabs.findIndex((t) => t.fileId === targetFileId);
      if (toIndex !== -1) moveTab(projectId, sourceId, toIndex);
    },
    [draggingId, moveTab, projectId, tabs],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

      const index = tabs.findIndex((t) => t.fileId === activeFileId);
      if (index === -1) return;

      event.preventDefault();
      const delta = event.key === 'ArrowRight' ? 1 : -1;
      const next = tabs[(index + delta + tabs.length) % tabs.length];
      if (next) setActiveFile(projectId, next.fileId);
    },
    [activeFileId, projectId, setActiveFile, tabs],
  );

  if (tabs.length === 0) return null;

  return (
    <div className={styles.tabBar}>
      <div
        ref={stripRef}
        className={styles.tabStrip}
        role="tablist"
        aria-label="Open files"
        onKeyDown={handleKeyDown}
      >
        {tabs.map((tab) => (
          <Tab
            key={tab.fileId}
            tab={tab}
            active={tab.fileId === activeFileId}
            dirty={Boolean(dirty[tab.fileId])}
            dragging={draggingId === tab.fileId}
            dropBefore={dropTargetId === tab.fileId && draggingId !== tab.fileId}
            onActivate={handleActivate}
            onClose={handleClose}
            onPin={handlePin}
            onDragStart={setDraggingId}
            onDragEnd={() => {
              setDraggingId(null);
              setDropTargetId(null);
            }}
            onDragOverTab={setDropTargetId}
            onDrop={handleDrop}
          />
        ))}
      </div>

      <div className={styles.tabBarActions}>
        <IconButton
          label="Toggle bottom panel"
          active={panelOpen}
          onClick={togglePanel}
        >
          <PanelBottom size={14} />
        </IconButton>

        <IconButton label="Close all tabs" onClick={() => closeAllTabs(projectId)}>
          <SplitSquareHorizontal size={14} />
        </IconButton>
      </div>
    </div>
  );
}