import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { SidebarView, ThemeName } from '@/types';
import { createDebouncedStorage, STORAGE_KEYS } from '@/services/storage';
export type ModalName = 'settings' | 'share' | 'commandPalette' | 'quickOpen' | null;

interface UiState {
  theme: ThemeName;
  sidebarOpen: boolean;
  sidebarWidth: number;
  sidebarView: SidebarView;
  panelOpen: boolean;
  panelHeight: number;
  demoPanelOpen: boolean;
  modal: ModalName;
  expandedFolders: Record<string, boolean>;
  selectedNodeId: string | null;
  pendingCreate: { parentId: string | null; type: 'file' | 'folder' } | null;
  renamingNodeId: string | null;
}

interface UiActions {
  setTheme: (theme: ThemeName) => void;
  cycleTheme: () => void;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setSidebarView: (view: SidebarView) => void;

  togglePanel: () => void;
  setPanelOpen: (open: boolean) => void;
  setPanelHeight: (height: number) => void;

  toggleDemoPanel: () => void;

  openModal: (modal: Exclude<ModalName, null>) => void;
  closeModal: () => void;
  toggleModal: (modal: Exclude<ModalName, null>) => void;

  toggleFolder: (nodeId: string) => void;
  setFolderExpanded: (nodeId: string, expanded: boolean) => void;
  expandFolders: (nodeIds: string[]) => void;
  setSelectedNode: (nodeId: string | null) => void;

  startCreate: (parentId: string | null, type: 'file' | 'folder') => void;
  cancelCreate: () => void;
  startRename: (nodeId: string) => void;
  cancelRename: () => void;
}

export type UiStore = UiState & UiActions;
export const SIDEBAR_MIN = 180;
export const SIDEBAR_MAX = 480;
export const PANEL_MIN = 120;
export const PANEL_MAX = 480;

const THEME_ORDER: ThemeName[] = ['dark', 'light', 'midnight'];
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export const useUiStore = create<UiStore>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      sidebarOpen: true,
      sidebarWidth: 250,
      sidebarView: 'explorer',
      panelOpen: false,
      panelHeight: 200,
      demoPanelOpen: false,
      modal: null,
      expandedFolders: {},
      selectedNodeId: null,
      pendingCreate: null,
      renamingNodeId: null,

      setTheme: (theme) => set({ theme }),
      cycleTheme: () => {
        const index = THEME_ORDER.indexOf(get().theme);
        set({ theme: THEME_ORDER[(index + 1) % THEME_ORDER.length] });
      },

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setSidebarWidth: (width) => set({ sidebarWidth: clamp(Math.round(width), SIDEBAR_MIN, SIDEBAR_MAX) }),
      setSidebarView: (view) => set({ sidebarView: view, sidebarOpen: true }),

      togglePanel: () => set((state) => ({ panelOpen: !state.panelOpen })),
      setPanelOpen: (open) => set({ panelOpen: open }),
      setPanelHeight: (height) => set({ panelHeight: clamp(Math.round(height), PANEL_MIN, PANEL_MAX) }),
      toggleDemoPanel: () => set((state) => ({ demoPanelOpen: !state.demoPanelOpen })),

      openModal: (modal) => set({ modal }),
      closeModal: () => set({ modal: null }),
      toggleModal: (modal) => set((state) => ({ modal: state.modal === modal ? null : modal })),

      toggleFolder: (nodeId) => set((state) => ({
          expandedFolders: {
            ...state.expandedFolders,
            [nodeId]: !state.expandedFolders[nodeId],
          },
        })),

      setFolderExpanded: (nodeId, expanded) =>
        set((state) =>
          state.expandedFolders[nodeId] === expanded ? {} : { expandedFolders: { ...state.expandedFolders, [nodeId]: expanded } },
        ),

      expandFolders: (nodeIds) =>
        set((state) => {
          const next = { ...state.expandedFolders };
          let changed = false;
          for (const id of nodeIds) {
            if (!next[id]) {
              next[id] = true;
              changed = true;
            }
          }
          return changed ? { expandedFolders: next } : {};
        }),

      setSelectedNode: (nodeId) => set({ selectedNodeId: nodeId }),
      startCreate: (parentId, type) =>
        set((state) => ({
          pendingCreate: { parentId, type },
          renamingNodeId: null,
          sidebarOpen: true,
          sidebarView: 'explorer',
          expandedFolders: parentId ? { ...state.expandedFolders, [parentId]: true } : state.expandedFolders,
        })),

      cancelCreate: () => set({ pendingCreate: null }),
      startRename: (nodeId) => set({ renamingNodeId: nodeId, pendingCreate: null }),
      cancelRename: () => set({ renamingNodeId: null }),
    }),
    {
      name: STORAGE_KEYS.ui,
      version: 1,
      storage: createJSONStorage(() => createDebouncedStorage(400)),
      partialize: (state) => ({
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
        sidebarWidth: state.sidebarWidth,
        sidebarView: state.sidebarView,
        panelOpen: state.panelOpen,
        panelHeight: state.panelHeight,
        expandedFolders: state.expandedFolders,
      }),
      merge: (persisted, current) => ({
        ...current,
        ...((persisted ?? {}) as Partial<UiState>),
        modal: null,
      }),
    },
  ),
);