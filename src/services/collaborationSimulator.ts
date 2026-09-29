import type { CollabUser, FileNode, PresenceStatus } from '@/types';
import { useCollabStore } from '@/stores/collabStore';
import { useProjectStore } from '@/stores/projectStore';
import { useEditorStore } from '@/stores/editorStore';
import { applyRemoteDelete, applyRemoteInsert, getModelBounds, } from '@/services/editorBridge';
import { collectFilePaths } from '@/utils/fileTree';
import { EXTRA_USER_NAMES } from '@/services/seedData';
import { uid } from '@/utils/id';


const CURSOR_INTERVAL = [500, 1400] as const;
const EDIT_INTERVAL = [11000, 24000] as const;
const PRESENCE_INTERVAL = [12000, 26000] as const;
const FOCUS_INTERVAL = [7000, 15000] as const;
const CONNECTION_INTERVAL = [55000, 110000] as const;
const CURSOR_THROTTLE_MS = 120;

const TYPING_SNIPPETS: Record<string, string[]> = {
  typescript: [
    'const [ready, setReady] = useState(false);',
    'export type Props = { id: string };',
    '// TODO: extract this into a hook',
    'if (!items.length) return null;',
    'const memo = useMemo(() => compute(input), [input]);',
  ],
  javascript: [
    'const total = items.reduce((a, b) => a + b, 0);',
    'console.log("checkpoint", value);',
    'export default function render() {}',
    'await Promise.all(tasks);',
  ],
  css: [
    '.card { border-radius: 10px; }',
    'display: grid;',
    'gap: 12px;',
    '@media (max-width: 640px) { .card { padding: 8px; } }',
  ],
  scss: ['$radius: 10px;', '&:hover { opacity: 0.9; }'],
  html: ['<section class="hero"></section>', '<button type="button">Save</button>'],
  json: ['"version": "1.0.0",', '"private": true,'],
  markdown: ['## Notes', '- [ ] review the API surface', '> Heads up: this is a draft.'],
  python: ['def summarise(rows):', '    return {"count": len(rows)}', '# refactor later'],
  plaintext: ['note: reviewed with the team', 'follow up tomorrow'],
};

function randomBetween([min, max]: readonly [number, number]): number {
  return min + Math.random() * (max - min);
}

function pick<T>(items: T[]): T | null {
  if (items.length === 0) return null;
  return items[Math.floor(Math.random() * items.length)];
}

function snippetFor(language: string): string {
  const bank = TYPING_SNIPPETS[language] ?? TYPING_SNIPPETS.plaintext;
  return pick(bank) ?? '// ...';
}

type TimerId = ReturnType<typeof setTimeout>;

class CollaborationSimulator {
  private timers = new Set<TimerId>();
  private running = false;
  private lastCursorWrite = new Map<string, number>();
  start(): void {
    if (this.running) return;
    this.running = true;
    useCollabStore.getState().setSimulationRunning(true);

    this.loop(CURSOR_INTERVAL, () => this.tickCursors());
    this.loop(EDIT_INTERVAL, () => this.tickEdit());
    this.loop(PRESENCE_INTERVAL, () => this.tickPresence());
    this.loop(FOCUS_INTERVAL, () => this.tickFocus());
    this.loop(CONNECTION_INTERVAL, () => this.tickConnection());
  }

  stop(): void {
    this.running = false;
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
    useCollabStore.getState().setSimulationRunning(false);
  }

  isRunning(): boolean {
    return this.running;
  }

  toggle(): boolean {
    if (this.running) this.stop();
    else this.start();
    return this.running;
  }

  private loop(range: readonly [number, number], fn: () => void): void {
    const schedule = () => {
      const timer = setTimeout(() => {
        this.timers.delete(timer);
        if (!this.running) return;
        try {
          fn();
        } catch {
        }
        schedule();
      }, randomBetween(range));
      this.timers.add(timer);
    };

    schedule();
  }

  private later(delayMs: number, fn: () => void): void {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      if (this.running) fn();
    }, delayMs);
    this.timers.add(timer);
  }

  private isOnline(): boolean {
    return useCollabStore.getState().connection === 'connected';
  }

  private activeUsers(): CollabUser[] {
    return useCollabStore.getState().users.filter((u) => !u.isLocal && u.status === 'online');
  }

  private projectFiles(): Array<{ node: FileNode; path: string }> {
    const { projects, activeProjectId } = useProjectStore.getState();
    const project = projects.find((p) => p.id === activeProjectId);
    return project ? collectFilePaths(project.files) : [];
  }

  private localActiveFileId(): string | null {
    const { activeProjectId } = useProjectStore.getState();
    if (!activeProjectId) return null;
    return useEditorStore.getState().activeFileByProject[activeProjectId] ?? null;
  }

  private randomPosition(fileId: string, content: string | undefined) {
    const bounds = getModelBounds(fileId);
    if (bounds) {
      const line = 1 + Math.floor(Math.random() * bounds.lineCount);
      const maxCol = bounds.maxColumnAt(line);
      return { lineNumber: line, column: 1 + Math.floor(Math.random() * maxCol) };
    }

    const lines = (content ?? '').split('\n');
    const line = 1 + Math.floor(Math.random() * Math.max(1, lines.length));
    const maxCol = (lines[line - 1]?.length ?? 0) + 1;
    return { lineNumber: line, column: 1 + Math.floor(Math.random() * maxCol) };
  }

  private tickCursors(): void {
    if (!this.isOnline()) return;
    const users = this.activeUsers();
    const files = this.projectFiles();
    if (users.length === 0 || files.length === 0) return;
    const localFileId = this.localActiveFileId();
    for (const user of users) {
      if (Math.random() > 0.65) continue;

      const now = Date.now();
      const last = this.lastCursorWrite.get(user.id) ?? 0;
      if (now - last < CURSOR_THROTTLE_MS) continue;
      let fileId = user.activeFileId;
      if (!fileId || !files.some((f) => f.node.id === fileId)) {
        fileId = localFileId ?? (pick(files)?.node.id ?? null);
        if (fileId) useCollabStore.getState().setUserFile(user.id, fileId);
      }
      if (!fileId) continue;

      const file = files.find((f) => f.node.id === fileId);
      const position = this.randomPosition(fileId, file?.node.content);
      const cursor = {
        userId: user.id,
        fileId,
        position,
        updatedAt: now,
        selection:
          Math.random() < 0.25
            ? {
                startLineNumber: position.lineNumber,
                startColumn: Math.max(1, position.column - 6),
                endLineNumber: position.lineNumber,
                endColumn: position.column + 4,
              }
            : undefined,
      };

      useCollabStore.getState().setCursor(cursor);
      this.lastCursorWrite.set(user.id, now);
    }
  }

  private tickEdit(): void {
    if (!this.isOnline()) return;

    const user = pick(this.activeUsers());
    if (!user) return;
    if (Math.random() < 0.2) this.simulateDeleteBy(user.id);
    else this.simulateEditBy(user.id);
  }

  private tickFocus(): void {
    if (!this.isOnline()) return;
    const user = pick(this.activeUsers());
    const files = this.projectFiles();
    if (!user || files.length === 0) return;
    const localFileId = this.localActiveFileId();
    const preferLocal = Math.random() < 0.55 && localFileId;
    const target = preferLocal ? files.find((f) => f.node.id === localFileId) : pick(files);
    if (!target || target.node.id === user.activeFileId) return;

    const collab = useCollabStore.getState();
    collab.setUserFile(user.id, target.node.id);
    collab.clearCursor(user.id);
    collab.pushActivity('open', `${user.name} opened ${target.node.name}`, user.id);
  }

  private tickPresence(): void {
    const collab = useCollabStore.getState();
    const remotes = collab.users.filter((u) => !u.isLocal);
    const user = pick(remotes);
    if (!user) return;

    const transitions: Record<PresenceStatus, PresenceStatus[]> = {
      online: ['idle', 'idle', 'offline'],
      idle: ['online', 'online', 'offline'],
      offline: ['online'],
    };

    const next = pick(transitions[user.status]);
    if (!next || next === user.status) return;
    collab.setUserStatus(user.id, next);
    const verb = next === 'online' ? 'came online' : next === 'idle' ? 'went idle' : 'went offline';
    collab.pushActivity(next === 'offline' ? 'leave' : 'join', `${user.name} ${verb}`, user.id);
  }

  private tickConnection(): void {
    if (Math.random() > 0.35) return;
    if (!this.isOnline()) return;
    this.simulateDisconnect(false);
    this.later(3200 + Math.random() * 2500, () => this.simulateReconnect());
  }

  simulateEditBy(userId: string, fileIdOverride?: string): boolean {
    const collab = useCollabStore.getState();
    const user = collab.users.find((u) => u.id === userId);
    if (!user || user.isLocal) return false;
    const files = this.projectFiles();
    if (files.length === 0) return false;
    const fileId =
      fileIdOverride ??
      user.activeFileId ??
      this.localActiveFileId() ??
      pick(files)?.node.id;
    if (!fileId) return false;

    const entry = files.find((f) => f.node.id === fileId);
    if (!entry) return false;
    const { activeProjectId } = useProjectStore.getState();
    if (!activeProjectId) return false;
    collab.setUserFile(userId, fileId);
    collab.setUserTyping(userId, true);

    const text = `${snippetFor(entry.node.language ?? 'plaintext')}\n`;
    const position = this.randomPosition(fileId, entry.node.content);
    let cursor = { lineNumber: position.lineNumber, column: 1 };
    let offset = 0;

    const typeChunk = () => {
      if (offset >= text.length) {
        collab.setUserTyping(userId, false);
        collab.pushActivity('edit', `${user.name} edited ${entry.node.name}`, userId);
        return;
      }

      const size = 1 + Math.floor(Math.random() * 3);
      const chunk = text.slice(offset, offset + size);
      offset += chunk.length;
      const result = applyRemoteInsert(fileId, cursor, chunk);
      if (result.applied) {
        const newlines = chunk.split('\n').length - 1;
        cursor = newlines ? { lineNumber: cursor.lineNumber + newlines, column: 1 } : { lineNumber: cursor.lineNumber, column: cursor.column + chunk.length };
        useCollabStore.getState().moveCursor(userId, fileId, cursor);
        if (result.content !== undefined) {
          useProjectStore.getState().updateFileContent(activeProjectId, fileId, result.content);
        }
      } else {
        const project = useProjectStore.getState().projects.find((p) => p.id === activeProjectId);
        const current = project && collectFilePaths(project.files).find((f) => f.node.id === fileId);
        if (current) {
          useProjectStore.getState().updateFileContent(
              activeProjectId,
              fileId,
              `${current.node.content ?? ''}${chunk}`,
            );
        }
      }
      this.later(55 + Math.random() * 70, typeChunk);
    };
    typeChunk();
    return true;
  }

  simulateDeleteBy(userId: string, fileIdOverride?: string): boolean {
    const collab = useCollabStore.getState();
    const user = collab.users.find((u) => u.id === userId);
    if (!user || user.isLocal) return false;
    const fileId = fileIdOverride ?? user.activeFileId ?? this.localActiveFileId();
    if (!fileId) return false;
    const bounds = getModelBounds(fileId);
    if (!bounds) return false;
    const { activeProjectId } = useProjectStore.getState();
    if (!activeProjectId) return false;
    const line = 1 + Math.floor(Math.random() * bounds.lineCount);
    const maxColumn = bounds.maxColumnAt(line);
    if (maxColumn <= 12) return false;

    const length = 4 + Math.floor(Math.random() * 16);
    const column = Math.max(1, maxColumn - length);
    if (maxColumn - column <= 0) return false;
    const result = applyRemoteDelete(fileId, { lineNumber: line, column }, length);
    if (!result.applied) return false;

    collab.setUserFile(userId, fileId);
    collab.moveCursor(userId, fileId, { lineNumber: line, column });
    if (result.content !== undefined) {
      useProjectStore.getState().updateFileContent(activeProjectId, fileId, result.content);
    }

    const files = this.projectFiles();
    const name = files.find((f) => f.node.id === fileId)?.node.name ?? 'a file';
    collab.pushActivity('edit', `${user.name} edited ${name}`, userId);
    return true;
  }

  addRandomUser(): CollabUser | null {
    const collab = useCollabStore.getState();
    const taken = new Set(collab.users.map((u) => u.name));
    const available = EXTRA_USER_NAMES.filter((n) => !taken.has(n));
    const name = pick(available);
    if (!name) return null;
    const user: CollabUser = {
      id: uid('user'),
      name,
      initials: name.slice(0, 2).toUpperCase(),
      colorIndex: collab.users.length % 6,
      status: 'online',
      isLocal: false,
      activeFileId: this.localActiveFileId(),
      isTyping: false,
      lastActiveAt: Date.now(),
    };

    collab.addUser(user);
    collab.pushActivity('join', `${name} joined the session`, user.id);
    return user;
  }

  removeRandomUser(): CollabUser | null {
    const collab = useCollabStore.getState();
    const remotes = collab.users.filter((u) => !u.isLocal);
    if (remotes.length === 0) return null;
    const user = remotes[remotes.length - 1];
    collab.removeUser(user.id);
    collab.pushActivity('leave', `${user.name} left the session`, user.id);
    return user;
  }

  simulateDisconnect(immediate = true): void {
    const collab = useCollabStore.getState();
    if (collab.connection === 'offline') return;

    if (immediate) {
      collab.setConnection('offline');
      collab.pushActivity('connection', 'Connection lost - working offline');
    } else {
      collab.setConnection('reconnecting');
      collab.pushActivity('connection', 'Connection unstable - reconnecting');
      this.later(1600, () => {
        const state = useCollabStore.getState();
        if (state.connection === 'reconnecting') {
          state.setConnection('offline');
          state.pushActivity('connection', 'Connection lost - working offline');
        }
      });
    }

    for (const user of collab.users) {
      if (!user.isLocal) collab.clearCursor(user.id);
    }
  }

  simulateReconnect(): void {
    const collab = useCollabStore.getState();
    if (collab.connection === 'connected') return;
    collab.setConnection('reconnecting');
    collab.pushActivity('connection', 'Reconnecting to the session');
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      const state = useCollabStore.getState();
      state.setConnection('connected');
      const queued = state.flushQueue();
      state.pushActivity(
        'connection',
        queued > 0
          ? `All changes synchronized (${queued} local edit${queued === 1 ? '' : 's'})`
          : 'All changes synchronized',
      );
    }, 1800);

    this.timers.add(timer);
  }
}

export const collaborationSimulator = new CollaborationSimulator();