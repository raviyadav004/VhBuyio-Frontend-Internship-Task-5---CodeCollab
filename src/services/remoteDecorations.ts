import type * as MonacoNS from 'monaco-editor';
import type { CollabUser, RemoteCursor } from '@/types';
import { useCollabStore } from '@/stores/collabStore';
import { colorFor } from '@/utils/colors';

const STYLE_ELEMENT_ID = 'codecollab-remote-cursor-styles';
function cssEscapeContent(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function classSuffix(userId: string): string {
  return userId.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export class RemoteDecorationManager {
  private editor: MonacoNS.editor.IStandaloneCodeEditor;
  private monaco: typeof MonacoNS;
  private collection: MonacoNS.editor.IEditorDecorationsCollection;
  private styleEl: HTMLStyleElement | null = null;
  private unsubscribers: Array<() => void> = [];
  private activeFileId: string | null = null;
  private lastStyleKey = '';
  private frame: number | null = null;

  constructor(
    editor: MonacoNS.editor.IStandaloneCodeEditor,
    monaco: typeof MonacoNS,
  ) {
    this.editor = editor;
    this.monaco = monaco;
    this.collection = editor.createDecorationsCollection([]);

    this.ensureStyleElement();
    this.syncStyles(useCollabStore.getState().users);
    this.unsubscribers.push(
      useCollabStore.subscribe(
        (state) => state.users,
        (users) => {
          this.syncStyles(users);
          this.scheduleRender();
        },
      ),
      useCollabStore.subscribe(
        (state) => state.cursors,
        () => this.scheduleRender(),
      ),
      useCollabStore.subscribe(
        (state) => state.connection,
        () => this.scheduleRender(),
      ),
    );
  }

  setActiveFile(fileId: string | null): void {
    if (this.activeFileId === fileId) return;
    this.activeFileId = fileId;
    this.scheduleRender();
  }

  dispose(): void {
    for (const off of this.unsubscribers) off();
    this.unsubscribers = [];
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.collection.clear();
    this.styleEl?.remove();
    this.styleEl = null;
  }

  private ensureStyleElement(): void {
    let el = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement('style');
      el.id = STYLE_ELEMENT_ID;
      document.head.appendChild(el);
    }
    this.styleEl = el;
  }

  private syncStyles(users: CollabUser[]): void {
    const remotes = users.filter((u) => !u.isLocal);
    const key = remotes.map((u) => `${u.id}:${u.name}:${u.colorIndex}`).join('|');
    if (key === this.lastStyleKey) return;
    this.lastStyleKey = key;

    const rules = remotes.map((user) => {
      const suffix = classSuffix(user.id);
      const color = colorFor(user.colorIndex);
      return ` .cc-remote-selection-${suffix} { background-color: ${color.soft}; border-radius: 2px; }
.cc-remote-caret-${suffix} {
  background-color: ${color.soft};
}
.cc-remote-caret-head-${suffix} {
  position: relative;
  border-left: 2px solid ${color.hex};
  margin-left: -1px;
  box-sizing: border-box;
  z-index: 6;
}
.cc-remote-caret-head-${suffix}::after {
  content: "${cssEscapeContent(user.name)}";
  position: absolute;
  top: -1.15em;
  left: -2px;
  padding: 0 4px;
  font-size: 10px;
  line-height: 1.15em;
  font-family: var(--font-ui, system-ui), sans-serif;
  font-weight: 600;
  white-space: nowrap;
  color: #fff;
  background-color: ${color.hex};
  border-radius: 3px 3px 3px 0;
  pointer-events: none;
  opacity: 0.92;
  z-index: 7;
}`;
    });
    if (this.styleEl) this.styleEl.textContent = rules.join('\n');
  }

  private scheduleRender(): void {
    if (this.frame !== null) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = null;
      this.render();
    });
  }

  private render(): void {
    const model = this.editor.getModel();
    if (!model || model.isDisposed() || !this.activeFileId) {
      this.collection.clear();
      return;
    }

    const state = useCollabStore.getState();
    if (state.connection !== 'connected') {
      this.collection.clear();
      return;
    }

    const byId = new Map(state.users.map((u) => [u.id, u]));
    const decorations: MonacoNS.editor.IModelDeltaDecoration[] = [];
    for (const cursor of Object.values(state.cursors) as RemoteCursor[]) {
      if (cursor.fileId !== this.activeFileId) continue;

      const user = byId.get(cursor.userId);
      if (!user || user.isLocal || user.status !== 'online') continue;
      const suffix = classSuffix(user.id);
      const head = this.clampPosition(model, cursor.position);
      if (!head) continue;
      if (cursor.selection) {
        const range = this.clampRange(model, cursor.selection);
        if (range && !range.isEmpty()) {
          decorations.push({
            range,
            options: {
              className: `cc-remote-selection cc-remote-selection-${suffix}`,
              stickiness: this.monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
              hoverMessage: { value: `**${user.name}**` },
            },
          });
        }
      }

      decorations.push({
        range: new this.monaco.Range(
          head.lineNumber,
          head.column,
          head.lineNumber,
          head.column,
        ),
        options: {
          className: `cc-remote-caret cc-remote-caret-${suffix}`,
          afterContentClassName: `cc-remote-caret-head cc-remote-caret-head-${suffix}`,
          stickiness: this.monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          hoverMessage: { value: `**${user.name}** is here` },
        },
      });
    }
    this.collection.set(decorations);
  }

  private clampPosition(
    model: MonacoNS.editor.ITextModel,
    position: { lineNumber: number; column: number },
  ): MonacoNS.IPosition | null {
    const lineCount = model.getLineCount();
    if (lineCount === 0) return null;
    const lineNumber = Math.min(Math.max(1, position.lineNumber), lineCount);
    const maxColumn = model.getLineMaxColumn(lineNumber);
    const column = Math.min(Math.max(1, position.column), maxColumn);
    return { lineNumber, column };
  }

  private clampRange(
    model: MonacoNS.editor.ITextModel,
    selection: {
      startLineNumber: number;
      startColumn: number;
      endLineNumber: number;
      endColumn: number;
    },
  ): MonacoNS.Range | null {
    const start = this.clampPosition(model, {
      lineNumber: selection.startLineNumber,
      column: selection.startColumn,
    });
    const end = this.clampPosition(model, {
      lineNumber: selection.endLineNumber,
      column: selection.endColumn,
    });
    if (!start || !end) return null;

    return new this.monaco.Range(
      start.lineNumber,
      start.column,
      end.lineNumber,
      end.column,
    );
  }
}