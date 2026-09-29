import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { FileNode, Project } from '@/types';
import { cloneTree, countFiles, createFileNode, createFolderNode, findNode, findParent, insertNode, isDescendant, removeNode, renameNode as renameTreeNode, setFileContent, sortNodes, uniqueName, } from '@/utils/fileTree';
import { languageDisplayName, languageFromFilename } from '@/utils/language';
import { uid } from '@/utils/id';
import { createSeedProjects, createSampleFiles } from '@/services/seedData';
import { createDebouncedStorage, STORAGE_KEYS } from '@/services/storage';

interface ProjectState {
  projects: Project[];
  activeProjectId: string | null;
  hydrated: boolean;
}

interface ProjectActions {
  setActiveProject: (id: string | null) => void;
  createProject: (name: string, withSample?: boolean) => Project;
  renameProject: (id: string, name: string) => void;
  deleteProject: (id: string) => void;
  duplicateProject: (id: string) => Project | null;
  createFile: (projectId: string, parentId: string | null, name: string) => FileNode | null;
  createFolder: (projectId: string, parentId: string | null, name: string) => FileNode | null;
  createAtPath: (
    projectId: string,
    parentId: string | null,
    path: string,
    type: 'file' | 'folder',
  ) => FileNode | null;
  renameNode: (projectId: string, nodeId: string, name: string) => void;
  deleteNode: (projectId: string, nodeId: string) => void;
  moveNode: (projectId: string, nodeId: string, targetFolderId: string | null) => boolean;
  updateFileContent: (projectId: string, fileId: string, content: string) => void;
  touchProject: (projectId: string) => void;
  resetAll: () => void;
}

export type ProjectStore = ProjectState & ProjectActions;
function dominantLanguage(files: FileNode[]): string {
  const counts = new Map<string, number>();
  const walk = (nodes: FileNode[]) => {
    for (const node of nodes) {
      if (node.type === 'file') {
        const lang = node.language ?? languageFromFilename(node.name);
        if (lang !== 'plaintext' && lang !== 'markdown' && lang !== 'json') {
          counts.set(lang, (counts.get(lang) ?? 0) + 1);
        }
      } else if (node.children) {
        walk(node.children);
      }
    }
  };
  walk(files);

  let best = 'plaintext';
  let bestCount = 0;
  for (const [lang, count] of counts) {
    if (count > bestCount) {
      best = lang;
      bestCount = count;
    }
  }
  return languageDisplayName(best);
}

function withProject(
  state: ProjectState,
  projectId: string,
  mutate: (project: Project) => Project | null,
): Partial<ProjectState> {
  let changed = false;

  const projects = state.projects.map((project) => {
    if (project.id !== projectId) return project;
    const next = mutate(project);
    if (!next || next === project) return project;
    changed = true;
    return { ...next, updatedAt: Date.now() };
  });
  return changed ? { projects } : {};
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      projects: [],
      activeProjectId: null,
      hydrated: false,
      setActiveProject: (id) => set({ activeProjectId: id }),
      createProject: (name, withSample = true) => {
        const now = Date.now();
        const files = withSample ? createSampleFiles() : [];
        const project: Project = {
          id: uid('proj'),
          name: name.trim() || 'Untitled Project',
          language: withSample ? 'TypeScript' : 'Plain Text',
          colorIndex: Math.floor(Math.random() * 6),
          files,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ projects: [project, ...state.projects] }));
        return project;
      },

      renameProject: (id, name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set((state) => withProject(state, id, (p) => ({ ...p, name: trimmed })));
      },

      deleteProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
        })),

      duplicateProject: (id) => {
        const source = get().projects.find((p) => p.id === id);
        if (!source) return null;
        const now = Date.now();
        const existingNames = get().projects.map((p) => ({
          id: p.id,
          name: p.name,
          type: 'file' as const,
        }));

        const copy: Project = {
          ...source,
          id: uid('proj'),
          name: uniqueName(existingNames, source.name),
          files: cloneTree(source.files),
          createdAt: now,
          updatedAt: now,
        };

        set((state) => {
          const index = state.projects.findIndex((p) => p.id === id);
          const projects = [...state.projects];
          projects.splice(index + 1, 0, copy);
          return { projects };
        });
        return copy;
      },

      createFile: (projectId, parentId, name) => {
        const project = get().projects.find((p) => p.id === projectId);
        if (!project) return null;
        const siblings = parentId === null ? project.files : (findNode(project.files, parentId)?.children ?? []);
        const node = createFileNode(uniqueName(siblings, name.trim() || 'untitled.txt'));
        set((state) =>
          withProject(state, projectId, (p) => {
            const files = insertNode(p.files, parentId, node);
            return { ...p, files, language: dominantLanguage(files) };
          }),
        );
        return node;
      },

      createFolder: (projectId, parentId, name) => {
        const project = get().projects.find((p) => p.id === projectId);
        if (!project) return null;
        const siblings = parentId === null ? project.files : (findNode(project.files, parentId)?.children ?? []);
        const node = createFolderNode(uniqueName(siblings, name.trim() || 'new-folder'));
        set((state) =>
          withProject(state, projectId, (p) => ({
            ...p,
            files: insertNode(p.files, parentId, node),
          })),
        );
        return node;
      },

      createAtPath: (projectId, parentId, path, type) => {
        const segments = path.split('/').map((segment) => segment.trim()).filter(Boolean);
        if (segments.length === 0) return null;

        const leaf = segments.pop() as string;
        let currentParent = parentId;
        for (const segment of segments) {
          const project = get().projects.find((p) => p.id === projectId);
          if (!project) return null;

          const siblings = currentParent === null ? project.files : (findNode(project.files, currentParent)?.children ?? []);
          const existing = siblings.find( (node) => node.type === 'folder' && node.name.toLowerCase() === segment.toLowerCase(), );
          if (existing) {
            currentParent = existing.id;
          } else {
            const created = get().createFolder(projectId, currentParent, segment);
            if (!created) return null;
            currentParent = created.id;
          }
        }
        return type === 'folder' ? get().createFolder(projectId, currentParent, leaf) : get().createFile(projectId, currentParent, leaf);
      },

      renameNode: (projectId, nodeId, name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set((state) => withProject(state, projectId, (p) => {
            const parent = findParent(p.files, nodeId);
            const siblings = (parent ? (parent.children ?? []) : p.files).filter( (s) => s.id !== nodeId, );
            const files = renameTreeNode(p.files, nodeId, uniqueName(siblings, trimmed));
            return { ...p, files, language: dominantLanguage(files) };
          }),
        );
      },

      deleteNode: (projectId, nodeId) => {
        set((state) =>
          withProject(state, projectId, (p) => {
            const files = removeNode(p.files, nodeId);
            return { ...p, files, language: dominantLanguage(files) };
          }),
        );
      },

      moveNode: (projectId, nodeId, targetFolderId) => {
        const project = get().projects.find((p) => p.id === projectId);
        if (!project) return false;
        if (nodeId === targetFolderId) return false;
        if (targetFolderId && isDescendant(project.files, nodeId, targetFolderId)) {
          return false;
        }

        const node = findNode(project.files, nodeId);
        if (!node) return false;
        const currentParent = findParent(project.files, nodeId);
        const currentParentId = currentParent?.id ?? null;
        if (currentParentId === targetFolderId) return false;

        if (targetFolderId) {
          const target = findNode(project.files, targetFolderId);
          if (!target || target.type !== 'folder') return false;
        }

        set((state) =>
          withProject(state, projectId, (p) => {
            const without = removeNode(p.files, nodeId);
            const siblings = targetFolderId === null ? without : (findNode(without, targetFolderId)?.children ?? []);
            const moved = { ...node, name: uniqueName(siblings, node.name) };
            return { ...p, files: insertNode(without, targetFolderId, moved) };
          }),
        );
        return true;
      },

      updateFileContent: (projectId, fileId, content) => {
        set((state) => withProject(state, projectId, (p) => {
            const files = setFileContent(p.files, fileId, content);
            return files === p.files ? null : { ...p, files };
          }),
        );
      },

      touchProject: (projectId) => set((state) => withProject(state, projectId, (p) => ({ ...p }))),
      resetAll: () => set({ projects: createSeedProjects(), activeProjectId: null, hydrated: true }),
    }),
    {
      name: STORAGE_KEYS.projects,
      version: 1,
      storage: createJSONStorage(() => createDebouncedStorage(600)),
      partialize: (state) => ({
        projects: state.projects,
        activeProjectId: state.activeProjectId,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error || !state) {
          useProjectStore.setState({
            projects: createSeedProjects(),
            hydrated: true,
          });
          return;
        }

        if (!Array.isArray(state.projects) || state.projects.length === 0) {
          state.projects = createSeedProjects();
        }
        state.hydrated = true;
      },
    },
  ),
);

export const selectActiveProject = (state: ProjectStore): Project | null =>
  state.projects.find((p) => p.id === state.activeProjectId) ?? null;
export function getProjectFileCount(project: Project): number {
  return countFiles(project.files);
}
export { sortNodes };