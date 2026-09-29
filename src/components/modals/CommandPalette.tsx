import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeftRight, ChevronsRight, FilePlus, FolderPlus, type LucideIcon, Palette, PanelBottom, PanelLeft, Redo2, Replace, Save, SaveAll, Search, Settings, Share2, Sparkles, Undo2, UserPlus, WifiOff, X, Zap, } from 'lucide-react';
import clsx from 'clsx';
import { useUiStore } from '@/stores/uiStore';
import { useWorkspaceActions } from '@/hooks/useWorkspaceActions';
import { SHORTCUT_LABELS } from '@/hooks/useKeyboardShortcuts';
import { Modal } from '@/components/common/Modal';
import { collaborationSimulator } from '@/services/collaborationSimulator';
import { useCollabStore } from '@/stores/collabStore';
import { fuzzyMatch, highlightSegments } from '@/utils/fuzzy';
import { defer } from '@/utils/defer';
import styles from './Modals.module.css';

interface PaletteCommand {
  id: string;
  title: string;
  section: string;
  icon: LucideIcon;
  shortcut?: string;
  run: () => void;
}

export function CommandPalette() {
  const open = useUiStore((s) => s.modal === 'commandPalette');
  const closeModal = useUiStore((s) => s.closeModal);
  const actions = useWorkspaceActions();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const commands = useMemo<PaletteCommand[]>(() => {
    const close = <T,>(fn: () => T) => () => {
      closeModal();
      defer(() => fn());
    };

    return [
      {
        id: 'file.new',
        title: 'New File',
        section: 'File',
        icon: FilePlus,
        shortcut: SHORTCUT_LABELS.newFile,
        run: close(() => actions.newFile()),
      },
      {
        id: 'file.newFolder',
        title: 'New Folder',
        section: 'File',
        icon: FolderPlus,
        run: close(() => actions.newFolder()),
      },
      {
        id: 'file.save',
        title: 'Save File',
        section: 'File',
        icon: Save,
        shortcut: SHORTCUT_LABELS.save,
        run: close(actions.saveActiveFile),
      },
      {
        id: 'file.saveAll',
        title: 'Save All Files',
        section: 'File',
        icon: SaveAll,
        shortcut: SHORTCUT_LABELS.saveAll,
        run: close(actions.saveAllFiles),
      },
      {
        id: 'file.quickOpen',
        title: 'Go to File…',
        section: 'File',
        icon: ChevronsRight,
        shortcut: SHORTCUT_LABELS.quickOpen,
        run: close(() => useUiStore.getState().openModal('quickOpen')),
      },
      {
        id: 'file.closeTab',
        title: 'Close Active Tab',
        section: 'File',
        icon: X,
        shortcut: SHORTCUT_LABELS.closeTab,
        run: close(actions.closeActiveTab),
      },

      {
        id: 'edit.undo',
        title: 'Undo',
        section: 'Edit',
        icon: Undo2,
        shortcut: 'Ctrl + Z',
        run: close(actions.undo),
      },
      {
        id: 'edit.redo',
        title: 'Redo',
        section: 'Edit',
        icon: Redo2,
        shortcut: 'Ctrl + Y',
        run: close(actions.redo),
      },
      {
        id: 'edit.find',
        title: 'Find in File',
        section: 'Edit',
        icon: Search,
        shortcut: 'Ctrl + F',
        run: close(actions.find),
      },
      {
        id: 'edit.replace',
        title: 'Replace in File',
        section: 'Edit',
        icon: Replace,
        shortcut: 'Ctrl + H',
        run: close(actions.replace),
      },
      {
        id: 'edit.format',
        title: 'Format Document',
        section: 'Edit',
        icon: Sparkles,
        shortcut: 'Shift + Alt + F',
        run: close(actions.formatDocument),
      },
      {
        id: 'edit.gotoLine',
        title: 'Go to Line…',
        section: 'Edit',
        icon: ArrowLeftRight,
        shortcut: 'Ctrl + G',
        run: close(actions.goToLine),
      },

      {
        id: 'view.sidebar',
        title: 'Toggle Sidebar',
        section: 'View',
        icon: PanelLeft,
        shortcut: SHORTCUT_LABELS.toggleSidebar,
        run: close(actions.toggleSidebar),
      },
      {
        id: 'view.panel',
        title: 'Toggle Bottom Panel',
        section: 'View',
        icon: PanelBottom,
        shortcut: SHORTCUT_LABELS.togglePanel,
        run: close(actions.togglePanel),
      },
      {
        id: 'view.theme',
        title: 'Switch Colour Theme',
        section: 'View',
        icon: Palette,
        shortcut: SHORTCUT_LABELS.toggleTheme,
        run: close(actions.cycleTheme),
      },
      {
        id: 'view.settings',
        title: 'Open Settings',
        section: 'View',
        icon: Settings,
        shortcut: SHORTCUT_LABELS.settings,
        run: close(actions.openSettings),
      },

      {
        id: 'collab.share',
        title: 'Share Project',
        section: 'Collaboration',
        icon: Share2,
        run: close(actions.openShare),
      },
      {
        id: 'collab.addUser',
        title: 'Add a Simulated Collaborator',
        section: 'Collaboration',
        icon: UserPlus,
        run: close(() => collaborationSimulator.addRandomUser()),
      },
      {
        id: 'collab.simulateEdit',
        title: 'Simulate a Remote Edit',
        section: 'Collaboration',
        icon: Zap,
        run: close(() => {
          const candidates = useCollabStore
            .getState()
            .users.filter((u) => !u.isLocal && u.status === 'online');
          const user = candidates[Math.floor(Math.random() * candidates.length)];
          if (user) collaborationSimulator.simulateEditBy(user.id);
        }),
      },
      {
        id: 'collab.offline',
        title: 'Toggle Offline Mode',
        section: 'Collaboration',
        icon: WifiOff,
        run: close(() => {
          const { connection } = useCollabStore.getState();
          if (connection === 'connected') collaborationSimulator.simulateDisconnect();
          else collaborationSimulator.simulateReconnect();
        }),
      },
      {
        id: 'collab.demoPanel',
        title: 'Toggle Demo Controls',
        section: 'Collaboration',
        icon: Zap,
        shortcut: SHORTCUT_LABELS.demoPanel,
        run: close(actions.toggleDemoPanel),
      },
    ];
  }, [actions, closeModal]);

  const results = useMemo(() => {
    if (!query.trim()) return commands.map((command) => ({ command, indices: [] as number[] }));

    return commands
      .map((command) => {
        const match = fuzzyMatch(query.trim(), command.title);
        return match ? { command, indices: match.indices, score: match.score } : null;
      })
      .filter((r): r is { command: PaletteCommand; indices: number[]; score: number } =>
        Boolean(r),
      )
      .sort((a, b) => b.score - a.score);
  }, [commands, query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      defer(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % Math.max(1, results.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % Math.max(1, results.length));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      results[activeIndex]?.command.run();
    }
  };

  let lastSection = '';

  return (
    <Modal open={open} title="Command palette" onClose={closeModal} bare>
      <div className={styles.paletteInputRow}>
        <ChevronsRight size={16} className={styles.paletteIcon} aria-hidden="true" />

        <input
          ref={inputRef}
          className={styles.paletteInput}
          value={query}
          placeholder="Type a command…"
          aria-label="Search commands"
          aria-controls="command-palette-results"
          role="combobox"
          aria-expanded="true"
          autoComplete="off"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
        />
      </div>

      <div
        ref={listRef}
        className={styles.paletteList}
        id="command-palette-results"
        role="listbox"
        aria-label="Commands"
      >
        {results.length === 0 && (
          <p className={styles.paletteEmpty}>No matching commands</p>
        )}

        {results.map(({ command, indices }, index) => {
          const showSection = command.section !== lastSection && !query.trim();
          lastSection = command.section;
          const Icon = command.icon;

          return (
            <div key={command.id}>
              {showSection && <div className={styles.paletteGroup}>{command.section}</div>}

              <button
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                data-index={index}
                className={clsx(
                  styles.paletteItem,
                  index === activeIndex && styles.paletteItemActive,
                )}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={command.run}
              >
                <span className={styles.paletteItemIcon}>
                  <Icon size={15} />
                </span>

                <span className={styles.paletteItemBody}>
                  <span className={styles.paletteItemTitle}>
                    {highlightSegments(command.title, indices).map((segment, i) => (
                      <span key={i} className={segment.match ? styles.paletteMatch : undefined}>
                        {segment.text}
                      </span>
                    ))}
                  </span>
                </span>

                {command.shortcut && (
                  <span className={styles.paletteShortcut}>{command.shortcut}</span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div className={styles.paletteFooter}>
        <span>
          <kbd className={styles.hintKey}>↑</kbd> <kbd className={styles.hintKey}>↓</kbd> to
          navigate
        </span>
        <span>
          <kbd className={styles.hintKey}>Enter</kbd> to run
        </span>
        <span>
          <kbd className={styles.hintKey}>Esc</kbd> to close
        </span>
      </div>
    </Modal>
  );
}