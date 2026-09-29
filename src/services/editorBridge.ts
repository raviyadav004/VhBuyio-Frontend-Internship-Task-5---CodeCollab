import type * as MonacoNS from 'monaco-editor';

interface Registration {
  editor: MonacoNS.editor.IStandaloneCodeEditor;
  monaco: typeof MonacoNS;
  getModel: (fileId: string) => MonacoNS.editor.ITextModel | null;
}

let current: Registration | null = null;
let applyingRemoteEdit = false;
export function isApplyingRemoteEdit(): boolean {
  return applyingRemoteEdit;
}

export function registerEditor(registration: Registration): () => void {
  current = registration;
  return () => {
    if (current === registration) current = null;
  };
}

function withRemoteFlag<T>(fn: () => T): T {
  applyingRemoteEdit = true;
  try {
    return fn();
  } finally {
    applyingRemoteEdit = false;
  }
}

export interface RemoteEditResult {
  applied: boolean;
  content?: string;
}

export function applyRemoteInsert(
  fileId: string,
  position: MonacoNS.IPosition,
  text: string,
): RemoteEditResult {
  const reg = current;
  if (!reg) return { applied: false };
  const model = reg.getModel(fileId);
  if (!model || model.isDisposed()) return { applied: false };
  const range = new reg.monaco.Range(
    position.lineNumber,
    position.column,
    position.lineNumber,
    position.column,
  );

  withRemoteFlag(() => model.pushEditOperations([], [{ range, text, forceMoveMarkers: true }], () => null), );
  return { applied: true, content: model.getValue() };
}

export function applyRemoteDelete(
  fileId: string,
  position: MonacoNS.IPosition,
  length: number,
): RemoteEditResult {
  const reg = current;
  if (!reg) return { applied: false };
  const model = reg.getModel(fileId);
  if (!model || model.isDisposed()) return { applied: false };
  const start = model.getOffsetAt(position);
  const endOffset = Math.min(start + length, model.getValueLength());
  if (endOffset <= start) return { applied: false };

  const end = model.getPositionAt(endOffset);
  const range = new reg.monaco.Range(
    position.lineNumber,
    position.column,
    end.lineNumber,
    end.column,
  );

  withRemoteFlag(() =>
    model.pushEditOperations([], [{ range, text: '', forceMoveMarkers: true }], () => null),
  );

  return { applied: true, content: model.getValue() };
}

export function getModelBounds(
  fileId: string,
): { lineCount: number; maxColumnAt: (line: number) => number } | null {
  const reg = current;
  if (!reg) return null;

  const model = reg.getModel(fileId);
  if (!model || model.isDisposed()) return null;
  return {
    lineCount: model.getLineCount(),
    maxColumnAt: (line: number) => model.getLineMaxColumn(line),
  };
}

export function runEditorAction(actionId: string): boolean {
  const editor = current?.editor;
  if (!editor) return false;
  const action = editor.getAction(actionId);
  if (!action) return false;
  editor.focus();
  void action.run();
  return true;
}

export function triggerEditorCommand(command: 'undo' | 'redo'): boolean {
  const editor = current?.editor;
  if (!editor) return false;
  editor.focus();
  editor.trigger('codecollab', command, null);
  return true;
}