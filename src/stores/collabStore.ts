import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { ActivityEvent, ActivityKind, CollabUser, ConnectionStatus, EditorPosition, PresenceStatus, RemoteCursor, } from '@/types';
import { createDemoUsers } from '@/services/seedData';
import { uid } from '@/utils/id';

const MAX_ACTIVITY = 60;

interface CollabState {
  users: CollabUser[];
  cursors: Record<string, RemoteCursor>;
  connection: ConnectionStatus;
  activity: ActivityEvent[];
  simulationRunning: boolean;
  queuedChanges: number;
}

interface CollabActions {
  addUser: (user: CollabUser) => void;
  removeUser: (userId: string) => void;
  setUserStatus: (userId: string, status: PresenceStatus) => void;
  setUserFile: (userId: string, fileId: string | null) => void;
  setUserTyping: (userId: string, isTyping: boolean) => void;

  setCursor: (cursor: RemoteCursor) => void;
  moveCursor: (userId: string, fileId: string, position: EditorPosition) => void;
  clearCursor: (userId: string) => void;
  clearCursorsForFile: (fileId: string) => void;

  setConnection: (status: ConnectionStatus) => void;
  queueChange: () => void;
  flushQueue: () => number;

  pushActivity: (kind: ActivityKind, message: string, userId?: string | null) => void;
  clearActivity: () => void;

  setSimulationRunning: (running: boolean) => void;
  reset: () => void;
}

export type CollabStore = CollabState & CollabActions;
function initialState(): CollabState {
  return {
    users: createDemoUsers(),
    cursors: {},
    connection: 'connected',
    activity: [],
    simulationRunning: true,
    queuedChanges: 0,
  };
}

export const useCollabStore = create<CollabStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState(),
    addUser: (user) =>
      set((state) =>
        state.users.some((u) => u.id === user.id)
          ? {}
          : { users: [...state.users, user] },
      ),

    removeUser: (userId) =>
      set((state) => {
        const cursors = { ...state.cursors };
        delete cursors[userId];
        return { users: state.users.filter((u) => u.id !== userId), cursors };
      }),

    setUserStatus: (userId, status) =>
      set((state) => {
        const user = state.users.find((u) => u.id === userId);
        if (!user || user.status === status) return {};

        const cursors = { ...state.cursors };
        if (status === 'offline') delete cursors[userId];
        return {
          users: state.users.map((u) =>
            u.id === userId
              ? {
                  ...u,
                  status,
                  lastActiveAt: Date.now(),
                  isTyping: status === 'online' ? u.isTyping : false,
                  activeFileId: status === 'offline' ? null : u.activeFileId,
                }
              : u,
          ),
          cursors,
        };
      }),

    setUserFile: (userId, fileId) =>
      set((state) => {
        const user = state.users.find((u) => u.id === userId);
        if (!user || user.activeFileId === fileId) return {};

        return {
          users: state.users.map((u) =>
            u.id === userId ? { ...u, activeFileId: fileId, lastActiveAt: Date.now() } : u,
          ),
        };
      }),

    setUserTyping: (userId, isTyping) =>
      set((state) => {
        const user = state.users.find((u) => u.id === userId);
        if (!user || user.isTyping === isTyping) return {};

        return {
          users: state.users.map((u) =>
            u.id === userId ? { ...u, isTyping, lastActiveAt: Date.now() } : u,
          ),
        };
      }),

    setCursor: (cursor) =>
      set((state) => ({ cursors: { ...state.cursors, [cursor.userId]: cursor } })),

    moveCursor: (userId, fileId, position) =>
      set((state) => ({
        cursors: {
          ...state.cursors,
          [userId]: { userId, fileId, position, updatedAt: Date.now() },
        },
      })),

    clearCursor: (userId) =>
      set((state) => {
        if (!state.cursors[userId]) return {};
        const cursors = { ...state.cursors };
        delete cursors[userId];
        return { cursors };
      }),

    clearCursorsForFile: (fileId) =>
      set((state) => {
        const entries = Object.entries(state.cursors).filter(
          ([, cursor]) => cursor.fileId !== fileId,
        );
        if (entries.length === Object.keys(state.cursors).length) return {};
        return { cursors: Object.fromEntries(entries) };
      }),

    setConnection: (status) =>
      set((state) => (state.connection === status ? {} : { connection: status })),

    queueChange: () =>
      set((state) =>
        state.connection === 'connected' ? {} : { queuedChanges: state.queuedChanges + 1 },
      ),

    flushQueue: () => {
      const count = get().queuedChanges;
      if (count > 0) set({ queuedChanges: 0 });
      return count;
    },

    pushActivity: (kind, message, userId = null) =>
      set((state) => ({
        activity: [
          { id: uid('act'), kind, userId, message, timestamp: Date.now() },
          ...state.activity,
        ].slice(0, MAX_ACTIVITY),
      })),

    clearActivity: () => set({ activity: [] }),
    setSimulationRunning: (running) => set({ simulationRunning: running }),
    reset: () => set(initialState()),
  })),
);

export const selectLocalUser = (state: CollabStore): CollabUser | undefined => state.users.find((u) => u.isLocal);
export const selectRemoteUsers = (state: CollabStore): CollabUser[] => state.users.filter((u) => !u.isLocal);
const STATUS_RANK: Record<PresenceStatus, number> = { online: 0, idle: 1, offline: 2 };

export function sortUsersForPresence(users: CollabUser[]): CollabUser[] {
  return [...users].sort((a, b) => {
    if (a.isLocal !== b.isLocal) return a.isLocal ? -1 : 1;
    if (a.status !== b.status) return STATUS_RANK[a.status] - STATUS_RANK[b.status];
    return a.name.localeCompare(b.name);
  });
}