import { useEffect } from 'react';
import type { WorkspaceActions } from './useWorkspaceActions';
import { useUiStore } from '@/stores/uiStore';

export interface ShortcutBinding {
  id: string;
  label: string;
  match: (event: KeyboardEvent) => boolean;
  run: (actions: WorkspaceActions) => void;
  /** Runs even when focus is inside a text input. */
  allowInInput?: boolean;
}

const mod = (event: KeyboardEvent) => event.ctrlKey || event.metaKey;
export const SHORTCUTS: ShortcutBinding[] = [
  {
    id: 'commandPalette',
    label: 'Ctrl + Shift + P',
    match: (e) => mod(e) && e.shiftKey && e.key.toLowerCase() === 'p',
    run: (a) => a.openCommandPalette(),
    allowInInput: true,
  },
  {
    id: 'quickOpen',
    label: 'Ctrl + P',
    match: (e) => mod(e) && !e.shiftKey && e.key.toLowerCase() === 'p',
    run: (a) => a.openQuickOpen(),
    allowInInput: true,
  },
  {
    id: 'save',
    label: 'Ctrl + S',
    match: (e) => mod(e) && !e.shiftKey && e.key.toLowerCase() === 's',
    run: (a) => a.saveActiveFile(),
    allowInInput: true,
  },
  {
    id: 'saveAll',
    label: 'Ctrl + Shift + S',
    match: (e) => mod(e) && e.shiftKey && e.key.toLowerCase() === 's',
    run: (a) => a.saveAllFiles(),
    allowInInput: true,
  },
  {
    id: 'toggleSidebar',
    label: 'Ctrl + B',
    match: (e) => mod(e) && !e.shiftKey && e.key.toLowerCase() === 'b',
    run: (a) => a.toggleSidebar(),
  },
  {
    id: 'togglePanel',
    label: 'Ctrl + `',
    match: (e) => mod(e) && e.key === '`',
    run: (a) => a.togglePanel(),
    allowInInput: true,
  },
  {
    id: 'closeTab',
    label: 'Ctrl + W',
    match: (e) => mod(e) && !e.shiftKey && e.key.toLowerCase() === 'w',
    run: (a) => a.closeActiveTab(),
    allowInInput: true,
  },
  {
    id: 'nextTab',
    label: 'Ctrl + Alt + →',
    match: (e) => mod(e) && e.altKey && e.key === 'ArrowRight',
    run: (a) => a.nextTab(),
    allowInInput: true,
  },
  {
    id: 'previousTab',
    label: 'Ctrl + Alt + ←',
    match: (e) => mod(e) && e.altKey && e.key === 'ArrowLeft',
    run: (a) => a.previousTab(),
    allowInInput: true,
  },
  {
    id: 'newFile',
    label: 'Ctrl + N',
    match: (e) => mod(e) && !e.shiftKey && e.key.toLowerCase() === 'n',
    run: (a) => a.newFile(),
  },
  {
    id: 'settings',
    label: 'Ctrl + ,',
    match: (e) => mod(e) && e.key === ',',
    run: (a) => a.openSettings(),
    allowInInput: true,
  },
  {
    id: 'toggleTheme',
    label: 'Ctrl + K',
    match: (e) => mod(e) && e.key.toLowerCase() === 'k',
    run: (a) => a.cycleTheme(),
  },
  {
    id: 'demoPanel',
    label: 'Ctrl + Shift + D',
    match: (e) => mod(e) && e.shiftKey && e.key.toLowerCase() === 'd',
    run: (a) => a.toggleDemoPanel(),
    allowInInput: true,
  },
];

export const SHORTCUT_LABELS: Record<string, string> = Object.fromEntries(
  SHORTCUTS.map((s) => [s.id, s.label]),
);

function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  );
}

export function useKeyboardShortcuts(actions: WorkspaceActions, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key === 'Escape') {
        const ui = useUiStore.getState();
        if (ui.modal) {
          event.preventDefault();
          ui.closeModal();
        }
        return;
      }

      if (!event.ctrlKey && !event.metaKey && !event.altKey) return;
      const inInput = isTextEntry(event.target);
      for (const shortcut of SHORTCUTS) {
        if (!shortcut.match(event)) continue;
        if (inInput && !shortcut.allowInInput) continue;

        event.preventDefault();
        event.stopPropagation();
        shortcut.run(actions);
        return;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [actions, enabled]);
}