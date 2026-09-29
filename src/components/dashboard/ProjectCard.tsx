import { memo, useEffect, useRef, useState } from 'react';
import { ArrowRight, Code2, Copy, Pencil, Trash2 } from 'lucide-react';
import type { Project } from '@/types';
import { IconButton } from '@/components/common/IconButton';
import { countFiles } from '@/utils/fileTree';
import { gradientFor } from '@/utils/colors';
import { relativeTime } from '@/utils/time';
import { defer } from '@/utils/defer';
import styles from './Dashboard.module.css';

interface ProjectCardProps {
  project: Project;
  renaming: boolean;
  onOpen: (id: string) => void;
  onStartRename: (id: string) => void;
  onCommitRename: (id: string, name: string) => void;
  onCancelRename: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

export const ProjectCard = memo(function ProjectCard({
  project,
  renaming,
  onOpen,
  onStartRename,
  onCommitRename,
  onCancelRename,
  onDuplicate,
  onDelete,
}: ProjectCardProps) {
  const [draft, setDraft] = useState(project.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renaming) {
      setDraft(project.name);
      defer(() => inputRef.current?.select());
    }
  }, [renaming, project.name]);

  const fileCount = countFiles(project.files);
  return (
    <li className={styles.card}>
      <div className={styles.cardTop}>
        <span
          className={styles.tile}
          style={{ background: gradientFor(project.colorIndex) }}
          aria-hidden="true"
        >
          <Code2 size={18} />
        </span>

        <div className={styles.cardHeadings}>
          {renaming ? (
            <input
              ref={inputRef}
              className={styles.renameInput}
              value={draft}
              aria-label={`Rename ${project.name}`}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => onCommitRename(project.id, draft)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onCommitRename(project.id, draft);
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  onCancelRename();
                }
              }}
            />
          ) : (
            <h3 className={styles.cardTitle} title={project.name}>
              {project.name}
            </h3>
          )}

          <p className={styles.cardMeta}>
            {project.language} · {fileCount} file{fileCount === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <p className={styles.cardEdited}>
        Edited <time dateTime={new Date(project.updatedAt).toISOString()}>
          {relativeTime(project.updatedAt)}
        </time>
      </p>

      <div className={styles.cardFooter}>
        <div className={styles.cardActions}>
          <IconButton label={`Rename ${project.name}`} onClick={() => onStartRename(project.id)}>
            <Pencil size={14} />
          </IconButton>

          <IconButton
            label={`Duplicate ${project.name}`}
            onClick={() => onDuplicate(project.id)}
          >
            <Copy size={14} />
          </IconButton>

          <IconButton label={`Delete ${project.name}`} onClick={() => onDelete(project.id)}>
            <Trash2 size={14} />
          </IconButton>
        </div>

        <button
          type="button"
          className={styles.openLink}
          onClick={() => onOpen(project.id)}
        >
          Open
          <ArrowRight size={14} aria-hidden="true" />
        </button>
      </div>
    </li>
  );
});