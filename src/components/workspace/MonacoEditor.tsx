import { useCallback, useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import type * as MonacoNS from 'monaco-editor';
import { useEditorStore } from '@/stores/editorStore';
import { useProjectStore } from '@/stores/projectStore';
import { useCollabStore } from '@/stores/collabStore';
import { useUiStore } from '@/stores/uiStore';
import { useCursorStore } from '@/stores/cursorStore';
import { MONACO_THEMES } from '@/services/monacoSetup';
import { isApplyingRemoteEdit, registerEditor } from '@/services/editorBridge';
import { RemoteDecorationManager } from '@/services/remoteDecorations';
import { findNode, pathOf } from '@/utils/fileTree';
import { languageFromFilename, monacoUriPath } from '@/utils/language';
import styles from './Workspace.module.css';

const CONTENT_SYNC_MS = 350;
interface MonacoEditorProps {
  projectId: string;
  activeFileId: string | null;
}

export function MonacoEditor({ projectId, activeFileId }: MonacoEditorProps) {
  const editorRef = useRef<MonacoNS.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof MonacoNS | null>(null);
  const modelsRef = useRef(new Map<string, MonacoNS.editor.ITextModel>());
  const viewStatesRef = useRef(new Map<string, MonacoNS.editor.ICodeEditorViewState | null>());
  const [editorReady, setEditorReady] = useState(false);
  const decorationsRef = useRef<RemoteDecorationManager | null>(null);
  const contentListenerRef = useRef<MonacoNS.IDisposable | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentFileRef = useRef<string | null>(null);
  const fontSize = useEditorStore((s) => s.settings.fontSize);
  const tabSize = useEditorStore((s) => s.settings.tabSize);
  const wordWrap = useEditorStore((s) => s.settings.wordWrap);
  const minimap = useEditorStore((s) => s.settings.minimap);
  const lineNumbers = useEditorStore((s) => s.settings.lineNumbers);
  const fontFamily = useEditorStore((s) => s.settings.fontFamily);
  const bracketPairColorization = useEditorStore( (s) => s.settings.bracketPairColorization, );
  const theme = useUiStore((s) => s.theme);

  const flushContent = useCallback(() => {
    if (syncTimerRef.current !== null) {
      clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
    }

    const fileId = currentFileRef.current;
    if (!fileId) return;
    const model = modelsRef.current.get(fileId);
    if (!model || model.isDisposed()) return;
    useProjectStore.getState().updateFileContent(projectId, fileId, model.getValue());
  }, [projectId]);

  const scheduleSync = useCallback(() => {
    if (syncTimerRef.current !== null) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(flushContent, CONTENT_SYNC_MS);
  }, [flushContent]);

  const getOrCreateModel = useCallback(
    (fileId: string): MonacoNS.editor.ITextModel | null => {
      const monaco = monacoRef.current;
      if (!monaco) return null;
      const cached = modelsRef.current.get(fileId);
      if (cached && !cached.isDisposed()) return cached;
      const project = useProjectStore.getState().projects.find((p) => p.id === projectId);
      if (!project) return null;

      const node = findNode(project.files, fileId);
      if (!node || node.type !== 'file') return null;
      const path = pathOf(project.files, fileId);
      const language = node.language ?? languageFromFilename(node.name);
      const uri = monaco.Uri.parse(`inmemory://codecollab${monacoUriPath(fileId, path)}`);

      const existing = monaco.editor.getModel(uri);
      const model = existing && !existing.isDisposed() ? existing : monaco.editor.createModel(node.content ?? '', language, uri);
      modelsRef.current.set(fileId, model);
      return model;
    },
    [projectId],
  );

  const attachModel = useCallback(
    (fileId: string | null) => {
      const editor = editorRef.current;
      if (!editor) return;
      const previous = currentFileRef.current;
      if (previous && previous !== fileId) {
        flushContent();
        viewStatesRef.current.set(previous, editor.saveViewState());
      }

      contentListenerRef.current?.dispose();
      contentListenerRef.current = null;
      if (!fileId) {
        currentFileRef.current = null;
        decorationsRef.current?.setActiveFile(null);
        useCursorStore.getState().reset();
        return;
      }

      const model = getOrCreateModel(fileId);
      if (!model) {
        currentFileRef.current = null;
        decorationsRef.current?.setActiveFile(null);
        return;
      }

      currentFileRef.current = fileId;

      if (editor.getModel() !== model) editor.setModel(model);

      const saved = viewStatesRef.current.get(fileId);
      if (saved) editor.restoreViewState(saved);

      contentListenerRef.current = model.onDidChangeContent(() => {
        if (!isApplyingRemoteEdit()) {
          useEditorStore.getState().markDirty(fileId);
          const collab = useCollabStore.getState();
          if (collab.connection !== 'connected') collab.queueChange();
        }
        scheduleSync();
      });

      decorationsRef.current?.setActiveFile(fileId);
      const position = editor.getPosition();
      if (position) {
        useCursorStore.getState().setPosition(position.lineNumber, position.column, 0);
      }
    },
    [flushContent, getOrCreateModel, scheduleSync],
  );

  const handleMount = useCallback(
    (editor: MonacoNS.editor.IStandaloneCodeEditor, monaco: typeof MonacoNS) => {
      editorRef.current = editor;
      monacoRef.current = monaco;
      decorationsRef.current = new RemoteDecorationManager(editor, monaco);
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        window.dispatchEvent(new CustomEvent('codecollab:save'));
      });
      editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyP,
        () => useUiStore.getState().toggleModal('commandPalette'),
      );
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyP, () =>
        useUiStore.getState().toggleModal('quickOpen'),
      );
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB, () =>
        useUiStore.getState().toggleSidebar(),
      );

      editor.onDidChangeCursorPosition((event) => {
        const selection = editor.getSelection();
        const model = editor.getModel();
        const selected = selection && model && !selection.isEmpty() ? model.getValueLengthInRange(selection) : 0;
        useCursorStore.getState().setPosition(event.position.lineNumber, event.position.column, selected);
      });

      registerEditor({
        editor,
        monaco,
        getModel: (fileId) => {
          const model = modelsRef.current.get(fileId);
          return model && !model.isDisposed() ? model : null;
        },
      });
      setEditorReady(true);
    },
    [],
  );

  useEffect(() => {
    if (!editorReady || !editorRef.current) return;
    if (currentFileRef.current === activeFileId) return;
    attachModel(activeFileId);
  }, [activeFileId, attachModel, editorReady]);

  useEffect(() => {
    const unsubscribe = useProjectStore.subscribe((state) => {
      const monaco = monacoRef.current;
      if (!monaco) return;
      const project = state.projects.find((p) => p.id === projectId);
      if (!project) return;
      for (const [fileId, model] of modelsRef.current) {
        if (model.isDisposed()) {
          modelsRef.current.delete(fileId);
          continue;
        }

        const node = findNode(project.files, fileId);
        if (!node) {
          model.dispose();
          modelsRef.current.delete(fileId);
          viewStatesRef.current.delete(fileId);
          continue;
        }

        const language = node.language ?? languageFromFilename(node.name);
        if (model.getLanguageId() !== language) {
          monaco.editor.setModelLanguage(model, language);
        }
      }
    });
    return unsubscribe;
  }, [projectId]);

  useEffect(() => {
    editorRef.current?.updateOptions({
      fontSize,
      fontFamily,
      tabSize,
      wordWrap: wordWrap ? 'on' : 'off',
      minimap: { enabled: minimap },
      lineNumbers: lineNumbers ? 'on' : 'off',
      bracketPairColorization: { enabled: bracketPairColorization },
    });
  }, [fontSize, fontFamily, tabSize, wordWrap, minimap, lineNumbers, bracketPairColorization]);

  useEffect(() => {
    for (const model of modelsRef.current.values()) {
      if (!model.isDisposed()) model.updateOptions({ tabSize });
    }
  }, [tabSize]);

  useEffect(() => {
    monacoRef.current?.editor.setTheme(MONACO_THEMES[theme]);
  }, [theme]);

  useEffect(() => {
    return () => {
      flushContent();
      contentListenerRef.current?.dispose();
      decorationsRef.current?.dispose();

      for (const model of modelsRef.current.values()) {
        if (!model.isDisposed()) model.dispose();
      }
      modelsRef.current.clear();
      viewStatesRef.current.clear();
    };
  }, [flushContent]);

  useEffect(() => {
    const onSave = () => flushContent();
    window.addEventListener('codecollab:save', onSave);
    return () => window.removeEventListener('codecollab:save', onSave);
  }, [flushContent]);

  const options: MonacoNS.editor.IStandaloneEditorConstructionOptions = {
    fontSize,
    fontFamily,
    tabSize,
    wordWrap: wordWrap ? 'on' : 'off',
    minimap: { enabled: minimap },
    lineNumbers: lineNumbers ? 'on' : 'off',
    bracketPairColorization: { enabled: bracketPairColorization },
    automaticLayout: true,
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    cursorBlinking: 'smooth',
    renderLineHighlight: 'line',
    fontLigatures: true,
    padding: { top: 10, bottom: 24 },
    folding: true,
    showFoldingControls: 'mouseover',
    matchBrackets: 'always',
    autoIndent: 'full',
    formatOnPaste: true,
    suggestOnTriggerCharacters: true,
    quickSuggestions: { other: true, comments: false, strings: false },
    scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
    stickyScroll: { enabled: false },
  };

  return (
    <Editor
      defaultValue=""
      theme={MONACO_THEMES[theme]}
      options={options}
      onMount={handleMount}
      loading={<div className={styles.editorLoading}>Loading editor…</div>}
    />
  );
}