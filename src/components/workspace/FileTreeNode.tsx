import { memo, useEffect, useRef, useState } from 'react';
import { ChevronRight, File as FileIcon, FileCode, FileJson, FileText, Folder, FolderOpen, Pencil, Trash2, } from 'lucide-react';
import clsx from 'clsx';
import type { FileNode } from '@/types';
import { colorFor } from '@/utils/colors';
import { extensionOf } from '@/utils/language';
import { defer } from '@/utils/defer';
import styles from './Workspace.module.css';

const INDENT_PX = 10;
const BASE_PAD = 8;
function iconFor(name: string) {
  const ext = extensionOf(name);
  switch (ext) {
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
    case 'py':
      return FileCode;
    case 'json':
      return FileJson;
    case 'md':
    case 'txt':
      return FileText;
    case 'css':
    case 'scss':
    case 'less':
    case 'html':
      return FileCode;
    default:
      return FileIcon;
  }
}

const ICON_COLORS: Record<string, string> = {
  ts: '#4ea1f3',
  tsx: '#4ea1f3',
  js: '#e6c15c',
  jsx: '#e6c15c',
  json: '#e6c15c',
  css: '#5aa9e6',
  scss: '#e07ba8',
  html: '#e8763a',
  md: '#7f8ea3',
  py: '#57b56b',
};

interface FileTreeNodeProps {
  node: FileNode;
  depth: number;
  expanded: boolean;
  selected: boolean;
  active: boolean;
  dirty: boolean;
  renaming: boolean;
  viewers: number[];
  dragging: boolean;
  dropTarget: boolean;
  onSelect: (node: FileNode) => void;
  onToggle: (node: FileNode) => void;
  onRenameCommit: (nodeId: string, name: string) => void;
  onRenameCancel: () => void;
  onStartRename: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onDragStart: (nodeId: string) => void;
  onDragEnd: () => void;
  onDragOverNode: (nodeId: string | null) => void;
  onDropNode: (targetId: string) => void;
}

export const FileTreeNode = memo(function FileTreeNode({
  node,
  depth,
  expanded,
  selected,
  active,
  dirty,
  renaming,
  viewers,
  dragging,
  dropTarget,
  onSelect,
  onToggle,
  onRenameCommit,
  onRenameCancel,
  onStartRename,
  onDelete,
  onDragStart,
  onDragEnd,
  onDragOverNode,
  onDropNode,
}: FileTreeNodeProps) {
  const isFolder = node.type === 'folder';
  const Icon = isFolder ? (expanded ? FolderOpen : Folder) : iconFor(node.name);
  const iconColor = isFolder ? 'var(--text-muted)' : ICON_COLORS[extensionOf(node.name)];
  const [draft, setDraft] = useState(node.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!renaming) return;

    setDraft(node.name);
    defer(() => {
      const input = inputRef.current;
      if (!input) return;

      input.focus();
      const dot = node.name.lastIndexOf('.');
      if (!isFolder && dot > 0) input.setSelectionRange(0, dot);
      else input.select();
    });
  }, [renaming, node.name, isFolder]);

  const paddingLeft = BASE_PAD + depth * INDENT_PX;
  if (renaming) {
    return (
      <li>
        <div className={clsx(styles.treeRow, styles.treeRowSelected)} style={{ paddingLeft }}>
          <span className={styles.twistySpacer} />
          <span className={styles.nodeIcon} style={{ color: iconColor }}>
            <Icon size={14} />
          </span>

          <input
            ref={inputRef}
            className={styles.inlineInput}
            value={draft}
            aria-label={`Rename ${node.name}`}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => onRenameCommit(node.id, draft)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') {
                e.preventDefault();
                onRenameCommit(node.id, draft);
              } else if (e.key === 'Escape') {
                e.preventDefault();
                onRenameCancel();
              }
            }}
          />
        </div>
      </li>
    );
  }

  return (
    <li
      role="treeitem"
      aria-expanded={isFolder ? expanded : undefined}
      aria-selected={selected}
      aria-level={depth + 1}
    >
      <div
        className={clsx(
          styles.treeRow,
          selected && styles.treeRowSelected,
          active && styles.treeRowActive,
          dragging && styles.treeRowDragging,
          dropTarget && styles.treeRowDropTarget,
        )}
        style={{ paddingLeft }}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', node.id);
          onDragStart(node.id);
        }}
        onDragEnd={onDragEnd}
        onDragOver={(e) => {
          if (!isFolder) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          onDragOverNode(node.id);
        }}
        onDragLeave={() => {
          if (isFolder) onDragOverNode(null);
        }}
        onDrop={(e) => {
          if (!isFolder) return;
          e.preventDefault();
          e.stopPropagation();
          onDropNode(node.id);
        }}
      >
        <button
          type="button"
          className={styles.nodeButton}
          onClick={() => (isFolder ? onToggle(node) : onSelect(node))}
          onDoubleClick={() => !isFolder && onSelect(node)}
          tabIndex={-1}
        >
          {isFolder ? (
            <span className={clsx(styles.twisty, expanded && styles.twistyOpen)}>
              <ChevronRight size={12} />
            </span>
          ) : (
            <span className={styles.twistySpacer} />
          )}

          <span className={styles.nodeIcon} style={{ color: iconColor }}>
            <Icon size={14} />
          </span>

          <span className={styles.nodeName}>{node.name}</span>
        </button>

        {viewers.length > 0 && (
          <span
            className={styles.nodeViewers}
            title={`${viewers.length} collaborator${viewers.length === 1 ? '' : 's'} here`}
          >
            {viewers.slice(0, 3).map((colorIndex, i) => (
              <span
                key={i}
                className={styles.viewerPip}
                style={{ background: colorFor(colorIndex).hex }}
              />
            ))}
          </span>
        )}

        {dirty && <span className={styles.nodeDirty} title="Unsaved changes" />}

        <span className={styles.rowActions}>
          <button
            type="button"
            className={styles.rowAction}
            aria-label={`Rename ${node.name}`}
            title="Rename"
            onClick={(e) => {
              e.stopPropagation();
              onStartRename(node.id);
            }}
          >
            <Pencil size={11} />
          </button>

          <button
            type="button"
            className={styles.rowAction}
            aria-label={`Delete ${node.name}`}
            title="Delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(node.id);
            }}
          >
            <Trash2 size={11} />
          </button>
        </span>
      </div>
    </li>
  );
});