import { useMemo } from 'react';
import { toast } from 'sonner';
import type { FileNode, OpenTab } from '@/types';
import { useProjectStore } from '@/stores/projectStore';
import { useEditorStore } from '@/stores/editorStore';
import { useCollabStore } from '@/stores/collabStore';
import { useUiStore } from '@/stores/uiStore';
import { ancestorIds, collectFiles, findNode, pathOf } from '@/utils/fileTree';
import { languageFromFilename } from '@/utils/language';
import { runEditorAction, triggerEditorCommand } from '@/services/editorBridge';

export interface WorkspaceActions {
  openFile: (fileId: string, options?: { preview?: boolean }) => void;
  closeActiveTab: () => void;
  nextTab: () => void;
  previousTab: () => void;

  saveActiveFile: () => void;
  saveAllFiles: () => void;

  newFile: (parentId?: string | null) => void;
  newFolder: (parentId?: string | null) => void;
  renameNode: (nodeId: string) => void;
  commitRename: (nodeId: string, name: string) => void;
  deleteNode: (nodeId: string) => void;

  undo: () => void;
  redo: () => void;
  find: () => void;
  replace: () => void;
  formatDocument: () => void;
  goToLine: () => void;

  toggleSidebar: () => void;
  togglePanel: () => void;
  cycleTheme: () => void;
  openSettings: () => void;
  openShare: () => void;
  openCommandPalette: () => void;
  openQuickOpen: () => void;
  toggleDemoPanel: () => void;
  backToDashboard: () => void;
}

export function useWorkspaceActions(): WorkspaceActions {
  return useMemo<WorkspaceActions>(() => {
    const activeProjectId = () => useProjectStore.getState().activeProjectId;
    const currentProject = () => {
      const { projects, activeProjectId: id } = useProjectStore.getState();
      return projects.find((p) => p.id === id) ?? null;
    };

    const activeFileId = () => {
      const id = activeProjectId();
      if (!id) return null;
      return useEditorStore.getState().activeFileByProject[id] ?? null;
    };

    const openFile: WorkspaceActions['openFile'] = (fileId, options) => {
      const project = currentProject();
      if (!project) return;

      const node = findNode(project.files, fileId);
      if (!node || node.type !== 'file') return;

      const tab: OpenTab = {
        fileId: node.id,
        name: node.name,
        path: pathOf(project.files, node.id),
        language: node.language ?? languageFromFilename(node.name),
        pinned: false,
      };

      useEditorStore.getState().openFile(project.id, tab, options);
      useUiStore.getState().expandFolders(ancestorIds(project.files, node.id));
      useUiStore.getState().setSelectedNode(node.id);
    };

    return {
      openFile,

      closeActiveTab: () => {
        const projectId = activeProjectId();
        const fileId = activeFileId();
        if (projectId && fileId) useEditorStore.getState().closeTab(projectId, fileId);
      },

      nextTab: () => {
        const projectId = activeProjectId();
        if (projectId) useEditorStore.getState().cycleTab(projectId, 1);
      },

      previousTab: () => {
        const projectId = activeProjectId();
        if (projectId) useEditorStore.getState().cycleTab(projectId, -1);
      },

      saveActiveFile: () => {
        const project = currentProject();
        const fileId = activeFileId();
        if (!project || !fileId) return;

        const node = findNode(project.files, fileId);
        useEditorStore.getState().markClean(fileId);
        useProjectStore.getState().touchProject(project.id);

        const collab = useCollabStore.getState();
        if (collab.connection !== 'connected') {
          collab.queueChange();
          toast.success(`Saved ${node?.name ?? 'file'} locally`, {
            description: 'Will sync when the connection returns.',
          });
        } else {
          toast.success(`Saved ${node?.name ?? 'file'}`);
        }

        collab.pushActivity('save', `You saved ${node?.name ?? 'a file'}`, 'user_you');
      },

      saveAllFiles: () => {
        const project = currentProject();
        if (!project) return;

        const dirtyIds = Object.keys(useEditorStore.getState().dirty);
        if (dirtyIds.length === 0) {
          toast('Nothing to save');
          return;
        }
        useEditorStore.getState().markAllClean(dirtyIds);
        useProjectStore.getState().touchProject(project.id);
        toast.success(`Saved ${dirtyIds.length} file${dirtyIds.length === 1 ? '' : 's'}`);
        useCollabStore.getState().pushActivity('save', `You saved ${dirtyIds.length} files`, 'user_you');
      },

      newFile: (parentId) => {
        const project = currentProject();
        if (!project) return;
        useUiStore.getState().startCreate(resolveParent(project.files, parentId), 'file');
      },

      newFolder: (parentId) => {
        const project = currentProject();
        if (!project) return;
        useUiStore.getState().startCreate(resolveParent(project.files, parentId), 'folder');
      },

      renameNode: (nodeId) => useUiStore.getState().startRename(nodeId),
      commitRename: (nodeId, name) => {
        const project = currentProject();
        const trimmed = name.trim();
        if (!project || !trimmed) return;

        const before = findNode(project.files, nodeId);
        if (!before || before.name === trimmed) return;
        useProjectStore.getState().renameNode(project.id, nodeId, trimmed);
        const updated = useProjectStore.getState().projects.find((p) => p.id === project.id);
        if (!updated) return;

        const editor = useEditorStore.getState();
        for (const tab of editor.tabsByProject[project.id] ?? []) {
          const node = findNode(updated.files, tab.fileId);
          if (!node) continue;

          const path = pathOf(updated.files, tab.fileId);
          const language = node.language ?? languageFromFilename(node.name);
          if (tab.name !== node.name || tab.path !== path || tab.language !== language) {
            editor.syncTabMeta(project.id, tab.fileId, { name: node.name, path, language });
          }
        }

        const after = findNode(updated.files, nodeId);
        useCollabStore.getState().pushActivity(
            'rename',
            `You renamed ${before.name} to ${after?.name ?? trimmed}`,
            'user_you',
          );
      },

      deleteNode: (nodeId) => {
        const project = currentProject();
        if (!project) return;
        const node = findNode(project.files, nodeId);
        if (!node) return;
        const removedFileIds = node.type === 'folder' ? collectFiles(node.children ?? []).map((f) => f.id) : [node.id];
        useProjectStore.getState().deleteNode(project.id, nodeId);
        useEditorStore.getState().dropTabsFor(project.id, removedFileIds);
        for (const id of removedFileIds) {
          useCollabStore.getState().clearCursorsForFile(id);
        }
        toast.success(`Deleted ${node.name}`);
        useCollabStore.getState().pushActivity('delete', `You deleted ${node.name}`, 'user_you');
      },

      undo: () => {
        if (!triggerEditorCommand('undo')) toast('Nothing to undo');
      },

      redo: () => {
        if (!triggerEditorCommand('redo')) toast('Nothing to redo');
      },

      find: () => {
        if (!runEditorAction('actions.find')) toast('Open a file first');
      },

      replace: () => {
        if (!runEditorAction('editor.action.startFindReplaceAction')) {
          toast('Open a file first');
        }
      },

      formatDocument: () => {
        if (!runEditorAction('editor.action.formatDocument')) {
          toast('Open a file first');
        }
      },

      goToLine: () => {
        if (!runEditorAction('editor.action.gotoLine')) toast('Open a file first');
      },

      toggleSidebar: () => useUiStore.getState().toggleSidebar(),
      togglePanel: () => useUiStore.getState().togglePanel(),
      cycleTheme: () => useUiStore.getState().cycleTheme(),
      openSettings: () => useUiStore.getState().openModal('settings'),
      openShare: () => useUiStore.getState().openModal('share'),
      openCommandPalette: () => useUiStore.getState().toggleModal('commandPalette'),
      openQuickOpen: () => useUiStore.getState().toggleModal('quickOpen'),
      toggleDemoPanel: () => useUiStore.getState().toggleDemoPanel(),

      backToDashboard: () => {
        useUiStore.getState().closeModal();
        useProjectStore.getState().setActiveProject(null);
      },
    };
  }, []);
}

function resolveParent(files: FileNode[], explicit?: string | null): string | null {
  if (explicit !== undefined) {
    if (explicit === null) return null;
    const node = findNode(files, explicit);
    return node?.type === 'folder' ? node.id : null;
  }

  const selectedId = useUiStore.getState().selectedNodeId;
  if (!selectedId) return null;

  const selected = findNode(files, selectedId);
  if (!selected) return null;
  if (selected.type === 'folder') return selected.id;
  const parents = ancestorIds(files, selected.id);
  return parents.length > 0 ? parents[parents.length - 1] : null;
}