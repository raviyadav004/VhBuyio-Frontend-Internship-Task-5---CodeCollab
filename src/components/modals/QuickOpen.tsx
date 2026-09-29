import { useEffect, useMemo, useRef, useState } from 'react';
import { FileCode, Search } from 'lucide-react';
import clsx from 'clsx';
import { useUiStore } from '@/stores/uiStore';
import { useProjectStore } from '@/stores/projectStore';
import { useEditorStore } from '@/stores/editorStore';
import { useWorkspaceActions } from '@/hooks/useWorkspaceActions';
import { Modal } from '@/components/common/Modal';
import { collectFilePaths } from '@/utils/fileTree';
import { fuzzyMatch, highlightSegments } from '@/utils/fuzzy';
import { defer } from '@/utils/defer';
import styles from './Modals.module.css';

export function QuickOpen() {
  const open = useUiStore((s) => s.modal === 'quickOpen');
  const closeModal = useUiStore((s) => s.closeModal);
  const actions = useWorkspaceActions();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const files = useMemo(() => {
    if (!open) return [];

    const { projects, activeProjectId } = useProjectStore.getState();
    const project = projects.find((p) => p.id === activeProjectId);
    if (!project) return [];
    const all = collectFilePaths(project.files);
    const recent = useEditorStore.getState().recentFileIds;
    const rank = new Map(recent.map((id, index) => [id, index]));
    return [...all].sort((a, b) => {
      const ra = rank.get(a.node.id) ?? Number.MAX_SAFE_INTEGER;
      const rb = rank.get(b.node.id) ?? Number.MAX_SAFE_INTEGER;
      if (ra !== rb) return ra - rb;
      return a.path.localeCompare(b.path);
    });
  }, [open]);

  const results = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return files.map((file) => ({ file, indices: [] as number[], score: 0 }));
    return files.map((file) => {
        const byName = fuzzyMatch(trimmed, file.node.name);
        if (byName) return { file, indices: byName.indices, score: byName.score + 20 };

        const byPath = fuzzyMatch(trimmed, file.path);
        return byPath ? { file, indices: [], score: byPath.score } : null;
      })
      .filter((r): r is { file: (typeof files)[number]; indices: number[]; score: number } =>
        Boolean(r),
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, 60);
  }, [files, query]);

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

  const openResult = (index: number) => {
    const hit = results[index];
    if (!hit) return;

    closeModal();
    defer(() => actions.openFile(hit.file.node.id, { preview: false }));
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % Math.max(1, results.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % Math.max(1, results.length));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      openResult(activeIndex);
    }
  };

  return (
    <Modal open={open} title="Go to file" onClose={closeModal} bare>
      <div className={styles.paletteInputRow}>
        <Search size={16} className={styles.paletteIcon} aria-hidden="true" />

        <input
          ref={inputRef}
          className={styles.paletteInput}
          value={query}
          placeholder="Search files by name…"
          aria-label="Search files"
          role="combobox"
          aria-expanded="true"
          aria-controls="quick-open-results"
          autoComplete="off"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
        />
      </div>

      <div
        ref={listRef}
        className={styles.paletteList}
        id="quick-open-results"
        role="listbox"
        aria-label="Files"
      >
        {results.length === 0 && <p className={styles.paletteEmpty}>No matching files</p>}

        {results.map(({ file, indices }, index) => (
          <button
            key={file.node.id}
            type="button"
            role="option"
            aria-selected={index === activeIndex}
            data-index={index}
            className={clsx(
              styles.paletteItem,
              index === activeIndex && styles.paletteItemActive,
            )}
            onMouseEnter={() => setActiveIndex(index)}
            onClick={() => openResult(index)}
          >
            <span className={styles.paletteItemIcon}>
              <FileCode size={15} />
            </span>

            <span className={styles.paletteItemBody}>
              <span className={styles.paletteItemTitle}>
                {highlightSegments(file.node.name, indices).map((segment, i) => (
                  <span key={i} className={segment.match ? styles.paletteMatch : undefined}>
                    {segment.text}
                  </span>
                ))}
              </span>
              <span className={styles.paletteItemPath}>{file.path}</span>
            </span>
          </button>
        ))}
      </div>

      <div className={styles.paletteFooter}>
        <span>{results.length} file{results.length === 1 ? '' : 's'}</span>
        <span>
          <kbd className={styles.hintKey}>Enter</kbd> to open
        </span>
        <span>
          <kbd className={styles.hintKey}>Esc</kbd> to close
        </span>
      </div>
    </Modal>
  );
}