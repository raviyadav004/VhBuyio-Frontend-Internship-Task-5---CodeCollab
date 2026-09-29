import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { File as FileIcon, FolderPlus, FilePlus } from 'lucide-react';
import { toast } from 'sonner';
import type { FileNode, Project } from '@/types';
import { useProjectStore } from '@/stores/projectStore';
import { useEditorStore } from '@/stores/editorStore';
import { useCollabStore } from '@/stores/collabStore';
import { useUiStore } from '@/stores/uiStore';
import { useWorkspaceActions } from '@/hooks/useWorkspaceActions';
import { useIsCompact } from '@/hooks/useMediaQuery';
import { IconButton } from '@/components/common/IconButton';
import { FileTreeNode } from './FileTreeNode';
import { sortNodes } from '@/utils/fileTree';
import { defer } from '@/utils/defer';
import styles from './Workspace.module.css';

interface FlatRow {
  node: FileNode;
  depth: number;
  expanded: boolean;
}

function flatten(
  nodes: FileNode[],
  expanded: Record<string, boolean>,
  depth = 0,
  out: FlatRow[] = [],
): FlatRow[] {
  for (const node of sortNodes(nodes)) {
    const isOpen = node.type === 'folder' && Boolean(expanded[node.id]);
    out.push({ node, depth, expanded: isOpen });
    if (isOpen && node.children) flatten(node.children, expanded, depth + 1, out);
  }
  return out;
}

interface FileExplorerProps {
  project: Project;
}

export function FileExplorer({ project }: FileExplorerProps) {
  const actions = useWorkspaceActions();
  const expandedFolders = useUiStore(useShallow((s) => s.expandedFolders));
  const selectedNodeId = useUiStore((s) => s.selectedNodeId);
  const setSelectedNode = useUiStore((s) => s.setSelectedNode);
  const toggleFolder = useUiStore((s) => s.toggleFolder);
  const setFolderExpanded = useUiStore((s) => s.setFolderExpanded);
  const pendingCreate = useUiStore((s) => s.pendingCreate);
  const cancelCreate = useUiStore((s) => s.cancelCreate);
  const renamingNodeId = useUiStore((s) => s.renamingNodeId);
  const cancelRename = useUiStore((s) => s.cancelRename);
  const startRename = useUiStore((s) => s.startRename);

  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen);
  const isCompact = useIsCompact();

  const activeFileId = useEditorStore((s) => s.activeFileByProject[project.id] ?? null);
  const dirty = useEditorStore(useShallow((s) => s.dirty));

  const createAtPath = useProjectStore((s) => s.createAtPath);
  const moveNode = useProjectStore((s) => s.moveNode);
  const collabUsers = useCollabStore(useShallow((s) => s.users));
  const connection = useCollabStore((s) => s.connection);

  const viewersByFile = useMemo(() => {
    const map: Record<string, number[]> = {};
    if (connection !== 'connected') return map;
    for (const user of collabUsers) {
      if (user.isLocal || user.status === 'offline' || !user.activeFileId) continue;
      (map[user.activeFileId] ??= []).push(user.colorIndex);
    }
    return map;
  }, [collabUsers, connection]);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [createDraft, setCreateDraft] = useState('');
  const createInputRef = useRef<HTMLInputElement>(null);
  const treeRef = useRef<HTMLUListElement>(null);
  const rows = useMemo(
    () => flatten(project.files, expandedFolders),
    [project.files, expandedFolders],
  );

  useEffect(() => {
    if (!pendingCreate) return;
    setCreateDraft('');
    defer(() => createInputRef.current?.focus());
  }, [pendingCreate]);

  const handleSelect = useCallback(
    (node: FileNode) => {
      setSelectedNode(node.id);
      if (node.type !== 'file') return;

      actions.openFile(node.id);
      if (isCompact) setSidebarOpen(false);
    },
    [actions, isCompact, setSelectedNode, setSidebarOpen],
  );

  const handleToggle = useCallback(
    (node: FileNode) => {
      setSelectedNode(node.id);
      toggleFolder(node.id);
    },
    [setSelectedNode, toggleFolder],
  );

  const handleRenameCommit = useCallback(
    (nodeId: string, name: string) => {
      actions.commitRename(nodeId, name);
      cancelRename();
    },
    [actions, cancelRename],
  );

  const handleCreateCommit = useCallback(() => {
    if (!pendingCreate) return;

    const name = createDraft.trim();
    if (!name) {
      cancelCreate();
      return;
    }

    const node = createAtPath(
      project.id,
      pendingCreate.parentId,
      name,
      pendingCreate.type,
    );

    if (node) {
      if (pendingCreate.type === 'file') {
        actions.openFile(node.id, { preview: false });
      } else {
        setFolderExpanded(node.id, true);
      }

      const label = pendingCreate.type === 'folder' ? `folder ${node.name}` : node.name;
      useCollabStore.getState().pushActivity('create', `You created ${label}`, 'user_you');
      toast.success(`Created ${node.name}`);
    }

    cancelCreate();
  }, [
    actions,
    cancelCreate,
    createAtPath,
    createDraft,
    pendingCreate,
    project.id,
    setFolderExpanded,
  ]);

  const handleDrop = useCallback(
    (targetId: string) => {
      const sourceId = draggingId;
      setDraggingId(null);
      setDropTargetId(null);
      if (!sourceId) return;

      const ok = moveNode(project.id, sourceId, targetId);
      if (!ok) toast.error('Cannot move an item into itself');
    },
    [draggingId, moveNode, project.id],
  );

  const handleRootDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const sourceId = draggingId;
      setDraggingId(null);
      setDropTargetId(null);
      if (sourceId) moveNode(project.id, sourceId, null);
    },
    [draggingId, moveNode, project.id],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const index = rows.findIndex((r) => r.node.id === selectedNodeId);
      const move = (delta: number) => {
        event.preventDefault();
        const next = rows[Math.max(0, Math.min(rows.length - 1, index + delta))];
        if (next) setSelectedNode(next.node.id);
      };

      switch (event.key) {
        case 'ArrowDown':
          move(index === -1 ? 0 : 1);
          break;

        case 'ArrowUp':
          move(index === -1 ? 0 : -1);
          break;

        case 'ArrowRight': {
          const row = rows[index];
          if (!row) break;
          event.preventDefault();

          if (row.node.type === 'folder' && !row.expanded) {
            setFolderExpanded(row.node.id, true);
          } else {
            move(1);
          }
          break;
        }

        case 'ArrowLeft': {
          const row = rows[index];
          if (!row) break;
          event.preventDefault();

          if (row.node.type === 'folder' && row.expanded) {
            setFolderExpanded(row.node.id, false);
          } else {
            for (let i = index - 1; i >= 0; i -= 1) {
              if (rows[i].depth < row.depth) {
                setSelectedNode(rows[i].node.id);
                break;
              }
            }
          }
          break;
        }

        case 'Enter': {
          const row = rows[index];
          if (!row) break;
          event.preventDefault();

          if (row.node.type === 'folder') toggleFolder(row.node.id);
          else actions.openFile(row.node.id, { preview: false });
          break;
        }

        case 'F2': {
          const row = rows[index];
          if (row) {
            event.preventDefault();
            startRename(row.node.id);
          }
          break;
        }

        case 'Delete': {
          const row = rows[index];
          if (row) {
            event.preventDefault();
            actions.deleteNode(row.node.id);
          }
          break;
        }

        default:
          break;
      }
    },
    [actions, rows, selectedNodeId, setFolderExpanded, setSelectedNode, startRename, toggleFolder],
  );

  const createRow = pendingCreate && (
    <li>
      <div
        className={styles.treeRow}
        style={{
          paddingLeft:
            8 +
            (pendingCreate.parentId
              ? ((rows.find((r) => r.node.id === pendingCreate.parentId)?.depth ?? 0) + 1) * 10
              : 0),
        }}
      >
        <span className={styles.twistySpacer} />
        <span className={styles.nodeIcon}>
          {pendingCreate.type === 'folder' ? <FolderPlus size={14} /> : <FileIcon size={14} />}
        </span>

        <input
          ref={createInputRef}
          className={styles.inlineInput}
          value={createDraft}
          placeholder={pendingCreate.type === 'folder' ? 'folder name' : 'file-name.tsx'}
          aria-label={pendingCreate.type === 'folder' ? 'New folder name' : 'New file name'}
          onChange={(e) => setCreateDraft(e.target.value)}
          onBlur={handleCreateCommit}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
              e.preventDefault();
              handleCreateCommit();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              cancelCreate();
            }
          }}
        />
      </div>
    </li>
  );

  return (
    <>
      <div className={styles.sidebarHeader}>
        <h2 className={styles.sidebarTitle}>Explorer</h2>

        <IconButton label="New file" onClick={() => actions.newFile()}>
          <FilePlus size={14} />
        </IconButton>

        <IconButton label="New folder" onClick={() => actions.newFolder()}>
          <FolderPlus size={14} />
        </IconButton>
      </div>

      <div
        className={styles.sidebarBody}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleRootDrop}
      >
        <ul
          ref={treeRef}
          className={styles.tree}
          role="tree"
          aria-label={`${project.name} files`}
          tabIndex={0}
          onKeyDown={handleKeyDown}
        >
          {rows.length === 0 && !pendingCreate && (
            <li className={styles.emptyTree}>
              No files yet.
              <br />
              Use the buttons above to add one.
            </li>
          )}

          {pendingCreate?.parentId === null && createRow}

          {rows.map((row) => (
            <FileTreeNode
              key={row.node.id}
              node={row.node}
              depth={row.depth}
              expanded={row.expanded}
              selected={selectedNodeId === row.node.id}
              active={activeFileId === row.node.id}
              dirty={Boolean(dirty[row.node.id])}
              renaming={renamingNodeId === row.node.id}
              viewers={viewersByFile[row.node.id] ?? []}
              dragging={draggingId === row.node.id}
              dropTarget={dropTargetId === row.node.id}
              onSelect={handleSelect}
              onToggle={handleToggle}
              onRenameCommit={handleRenameCommit}
              onRenameCancel={cancelRename}
              onStartRename={startRename}
              onDelete={actions.deleteNode}
              onDragStart={setDraggingId}
              onDragEnd={() => {
                setDraggingId(null);
                setDropTargetId(null);
              }}
              onDragOverNode={setDropTargetId}
              onDropNode={handleDrop}
            />
          ))}

          {pendingCreate?.parentId !== null && pendingCreate && createRow}
        </ul>
      </div>
    </>
  );
}