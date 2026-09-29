import * as monaco from 'monaco-editor';
import { loader } from '@monaco-editor/react';
import editorWorker from 'monaco-editor/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/languages/features/json/json.worker?worker';
import cssWorker from 'monaco-editor/languages/features/css/css.worker?worker';
import htmlWorker from 'monaco-editor/languages/features/html/html.worker?worker';
import tsWorker from 'monaco-editor/languages/features/typescript/ts.worker?worker';

declare global {
  interface Window {
    MonacoEnvironment?: monaco.Environment;
  }
}

window.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    switch (label) {
      case 'json':
        return new jsonWorker();
      case 'css':
      case 'scss':
      case 'less':
        return new cssWorker();
      case 'html':
      case 'handlebars':
      case 'razor':
        return new htmlWorker();
      case 'typescript':
      case 'javascript':
        return new tsWorker();
      default:
        return new editorWorker();
    }
  },
};

export const MONACO_THEMES = {
  dark: 'codecollab-dark',
  light: 'codecollab-light',
  midnight: 'codecollab-midnight',
} as const;

let initialised = false;
export function setupMonaco(): typeof monaco {
  if (initialised) return monaco;
  initialised = true;

  monaco.editor.defineTheme(MONACO_THEMES.dark, {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'c084fc' },
      { token: 'string', foreground: '86efac' },
      { token: 'number', foreground: 'fbbf24' },
      { token: 'type', foreground: '7dd3fc' },
    ],
    colors: {
      'editor.background': '#16161e',
      'editor.foreground': '#d4d4e0',
      'editorLineNumber.foreground': '#4a4a5e',
      'editorLineNumber.activeForeground': '#9d9db5',
      'editor.lineHighlightBackground': '#1d1d28',
      'editor.selectionBackground': '#2f4a7a',
      'editorCursor.foreground': '#7aa2f7',
      'editorIndentGuide.background1': '#26262f',
      'editorIndentGuide.activeBackground1': '#3a3a4a',
      'editorWidget.background': '#1b1b24',
      'editorWidget.border': '#2c2c38',
      'editorSuggestWidget.background': '#1b1b24',
      'editorSuggestWidget.selectedBackground': '#2b3a5c',
      'editorGutter.background': '#16161e',
      'scrollbarSlider.background': '#2c2c3a80',
      'minimap.background': '#16161e',
    },
  });

  monaco.editor.defineTheme(MONACO_THEMES.midnight, {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '5c6785', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'a78bfa' },
      { token: 'string', foreground: '6ee7b7' },
      { token: 'number', foreground: 'f0abfc' },
    ],
    colors: {
      'editor.background': '#0b1021',
      'editor.foreground': '#c7d2fe',
      'editorLineNumber.foreground': '#334065',
      'editorLineNumber.activeForeground': '#8ea2d8',
      'editor.lineHighlightBackground': '#131a33',
      'editor.selectionBackground': '#26386b',
      'editorCursor.foreground': '#818cf8',
      'editorWidget.background': '#111735',
      'editorGutter.background': '#0b1021',
      'minimap.background': '#0b1021',
    },
  });

  monaco.editor.defineTheme(MONACO_THEMES.light, {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '8a8f98', fontStyle: 'italic' },
      { token: 'keyword', foreground: '7c3aed' },
      { token: 'string', foreground: '15803d' },
      { token: 'number', foreground: 'b45309' },
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#1f2328',
      'editorLineNumber.foreground': '#b0b6bf',
      'editorLineNumber.activeForeground': '#4b5563',
      'editor.lineHighlightBackground': '#f4f6f8',
      'editorCursor.foreground': '#2563eb',
      'editorGutter.background': '#ffffff',
      'minimap.background': '#ffffff',
    },
  });

  const ts = monaco.typescript;
  ts.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: false,
  });
  ts.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: false,
  });

  const compilerOptions: monaco.typescript.CompilerOptions = {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    jsx: ts.JsxEmit.ReactJSX,
    allowNonTsExtensions: true,
    allowJs: true,
    esModuleInterop: true,
  };
  ts.typescriptDefaults.setCompilerOptions(compilerOptions);
  ts.javascriptDefaults.setCompilerOptions(compilerOptions);
  loader.config({ monaco });
  return monaco;
}

export type Monaco = typeof monaco;