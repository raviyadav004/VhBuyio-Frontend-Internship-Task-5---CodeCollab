import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { EditorSettings, OpenTab } from '@/types';
import { createDebouncedStorage, STORAGE_KEYS } from '@/services/storage';

export const DEFAULT_SETTINGS: EditorSettings = {
  fontSize: 14,
  tabSize: 2,
  wordWrap: false,
  minimap: true,
  lineNumbers: true,
  autoSave: true,
  bracketPairColorization: true,
  fontFamily: '"JetBrains Mono", "Fira Code", Consolas, "Courier New", monospace',
};

interface EditorState {
  tabsByProject: Record<string, OpenTab[]>;
  activeFileByProject: Record<string, string | null>;
  dirty: Record<string, boolean>;
  recentFileIds: string[];
  settings: EditorSettings;
}

interface EditorActions {
  openFile: (projectId: string, tab: OpenTab, options?: { preview?: boolean }) => void;
  closeTab: (projectId: string, fileId: string) => void;
  closeOtherTabs: (projectId: string, fileId: string) => void;
  closeAllTabs: (projectId: string) => void;
  pinTab: (projectId: string, fileId: string) => void;
  setActiveFile: (projectId: string, fileId: string | null) => void;
  cycleTab: (projectId: string, direction: 1 | -1) => void;
  moveTab: (projectId: string, fileId: string, toIndex: number) => void;

  syncTabMeta: (projectId: string, fileId: string, patch: Partial<OpenTab>) => void;
  dropTabsFor: (projectId: string, fileIds: string[]) => void;

  markDirty: (fileId: string) => void;
  markClean: (fileId: string) => void;
  markAllClean: (fileIds: string[]) => void;

  updateSettings: (patch: Partial<EditorSettings>) => void;
  resetSettings: () => void;
}

export type EditorStore = EditorState & EditorActions;
const MAX_RECENT = 24;
export const useEditorStore = create<EditorStore>()(
  persist(
    (set, get) => ({
      tabsByProject: {},
      activeFileByProject: {},
      dirty: {},
      recentFileIds: [],
      settings: DEFAULT_SETTINGS,

      openFile: (projectId, tab, options) => {
        set((state) => {
          const tabs = state.tabsByProject[projectId] ?? [];
          const existing = tabs.find((t) => t.fileId === tab.fileId);
          let nextTabs: OpenTab[];
          if (existing) {
            nextTabs = options?.preview === false && !existing.pinned ? tabs.map((t) => (t.fileId === tab.fileId ? { ...t, pinned: true } : t)) : tabs;
          } else {
            const isPreview = options?.preview ?? true;
            const previewIndex = tabs.findIndex((t) => !t.pinned);

            if (isPreview && previewIndex !== -1) {
              nextTabs = [...tabs];
              nextTabs[previewIndex] = { ...tab, pinned: false };
            } else {
              nextTabs = [...tabs, { ...tab, pinned: !isPreview }];
            }
          }

          const recent = [
            tab.fileId,
            ...state.recentFileIds.filter((id) => id !== tab.fileId),
          ].slice(0, MAX_RECENT);

          return {
            tabsByProject: { ...state.tabsByProject, [projectId]: nextTabs },
            activeFileByProject: {
              ...state.activeFileByProject,
              [projectId]: tab.fileId,
            },
            recentFileIds: recent,
          };
        });
      },

      closeTab: (projectId, fileId) => {
        set((state) => {
          const tabs = state.tabsByProject[projectId] ?? [];
          const index = tabs.findIndex((t) => t.fileId === fileId);
          if (index === -1) return {};
          const nextTabs = tabs.filter((t) => t.fileId !== fileId);
          const wasActive = state.activeFileByProject[projectId] === fileId;
          const nextActive = wasActive ? (nextTabs[index]?.fileId ?? nextTabs[index - 1]?.fileId ?? null) : state.activeFileByProject[projectId];
          const dirty = { ...state.dirty };
          delete dirty[fileId];

          return {
            tabsByProject: { ...state.tabsByProject, [projectId]: nextTabs },
            activeFileByProject: {
              ...state.activeFileByProject,
              [projectId]: nextActive ?? null,
            },
            dirty,
          };
        });
      },

      closeOtherTabs: (projectId, fileId) => {
        set((state) => {
          const tabs = state.tabsByProject[projectId] ?? [];
          const keep = tabs.filter((t) => t.fileId === fileId);
          return {
            tabsByProject: { ...state.tabsByProject, [projectId]: keep },
            activeFileByProject: { ...state.activeFileByProject, [projectId]: fileId },
          };
        });
      },

      closeAllTabs: (projectId) =>
        set((state) => ({
          tabsByProject: { ...state.tabsByProject, [projectId]: [] },
          activeFileByProject: { ...state.activeFileByProject, [projectId]: null },
        })),

      pinTab: (projectId, fileId) =>
        set((state) => {
          const tabs = state.tabsByProject[projectId] ?? [];
          return {
            tabsByProject: {
              ...state.tabsByProject,
              [projectId]: tabs.map((t) =>
                t.fileId === fileId ? { ...t, pinned: true } : t,
              ),
            },
          };
        }),

      setActiveFile: (projectId, fileId) =>
        set((state) => ({
          activeFileByProject: { ...state.activeFileByProject, [projectId]: fileId },
          recentFileIds: fileId
            ? [fileId, ...state.recentFileIds.filter((id) => id !== fileId)].slice(
                0,
                MAX_RECENT,
              )
            : state.recentFileIds,
        })),

      cycleTab: (projectId, direction) => {
        const state = get();
        const tabs = state.tabsByProject[projectId] ?? [];
        if (tabs.length < 2) return;
        const activeId = state.activeFileByProject[projectId];
        const index = tabs.findIndex((t) => t.fileId === activeId);
        const next = (index + direction + tabs.length) % tabs.length;
        state.setActiveFile(projectId, tabs[next].fileId);
      },

      moveTab: (projectId, fileId, toIndex) =>
        set((state) => {
          const tabs = state.tabsByProject[projectId] ?? [];
          const from = tabs.findIndex((t) => t.fileId === fileId);
          if (from === -1) return {};
          const clamped = Math.max(0, Math.min(toIndex, tabs.length - 1));
          if (from === clamped) return {};
          const next = [...tabs];
          const [moved] = next.splice(from, 1);
          next.splice(clamped, 0, moved);
          return { tabsByProject: { ...state.tabsByProject, [projectId]: next } };
        }),

      syncTabMeta: (projectId, fileId, patch) =>
        set((state) => {
          const tabs = state.tabsByProject[projectId] ?? [];
          if (!tabs.some((t) => t.fileId === fileId)) return {};

          return {
            tabsByProject: {
              ...state.tabsByProject,
              [projectId]: tabs.map((t) =>
                t.fileId === fileId ? { ...t, ...patch } : t,
              ),
            },
          };
        }),

      dropTabsFor: (projectId, fileIds) => set((state) => {
          const tabs = state.tabsByProject[projectId] ?? [];
          const drop = new Set(fileIds);
          const nextTabs = tabs.filter((t) => !drop.has(t.fileId));
          if (nextTabs.length === tabs.length) return {};
          const activeId = state.activeFileByProject[projectId];
          const nextActive = activeId && drop.has(activeId) ? (nextTabs[nextTabs.length - 1]?.fileId ?? null) : activeId;
          const dirty = { ...state.dirty };
          for (const id of fileIds) delete dirty[id];

          return {
            tabsByProject: { ...state.tabsByProject, [projectId]: nextTabs },
            activeFileByProject: {
              ...state.activeFileByProject,
              [projectId]: nextActive ?? null,
            },
            dirty,
            recentFileIds: state.recentFileIds.filter((id) => !drop.has(id)),
          };
        }),

      markDirty: (fileId) =>
        set((state) =>
          state.dirty[fileId] ? {} : { dirty: { ...state.dirty, [fileId]: true } },
        ),

      markClean: (fileId) =>
        set((state) => {
          if (!state.dirty[fileId]) return {};
          const dirty = { ...state.dirty };
          delete dirty[fileId];
          return { dirty };
        }),

      markAllClean: (fileIds) =>
        set((state) => {
          const dirty = { ...state.dirty };
          let changed = false;
          for (const id of fileIds) {
            if (dirty[id]) {
              delete dirty[id];
              changed = true;
            }
          }
          return changed ? { dirty } : {};
        }),

      updateSettings: (patch) =>
        set((state) => ({ settings: { ...state.settings, ...patch } })),
      resetSettings: () => set({ settings: DEFAULT_SETTINGS }),
    }),
    {
      name: STORAGE_KEYS.editor,
      version: 1,
      storage: createJSONStorage(() => createDebouncedStorage(600)),
      partialize: (state) => ({
        tabsByProject: state.tabsByProject,
        activeFileByProject: state.activeFileByProject,
        recentFileIds: state.recentFileIds,
        settings: state.settings,
      }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<EditorState>;
        return {
          ...current,
          ...saved,
          // Settings gain fields between versions; fill any gaps.
          settings: { ...DEFAULT_SETTINGS, ...(saved.settings ?? {}) },
          dirty: {},
        };
      },
    },
  ),
);

const EMPTY_TABS: OpenTab[] = [];
export const selectTabs = (projectId: string | null) => (state: EditorStore): OpenTab[] => projectId ? (state.tabsByProject[projectId] ?? EMPTY_TABS) : EMPTY_TABS;
export const selectActiveFileId = (projectId: string | null) => (state: EditorStore): string | null => projectId ? (state.activeFileByProject[projectId] ?? null) : null;