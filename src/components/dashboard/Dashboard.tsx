import { useCallback, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { FolderPlus, Moon, Settings, Sparkles, Sun } from 'lucide-react';
import { toast } from 'sonner';
import { useProjectStore } from '@/stores/projectStore';
import { useEditorStore } from '@/stores/editorStore';
import { useUiStore } from '@/stores/uiStore';
import { IconButton } from '@/components/common/IconButton';
import { ProjectCard } from './ProjectCard';
import styles from './Dashboard.module.css';

export function Dashboard() {
  const projects = useProjectStore(useShallow((s) => s.projects));
  const setActiveProject = useProjectStore((s) => s.setActiveProject);
  const createProject = useProjectStore((s) => s.createProject);
  const renameProject = useProjectStore((s) => s.renameProject);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const duplicateProject = useProjectStore((s) => s.duplicateProject);
  const theme = useUiStore((s) => s.theme);
  const cycleTheme = useUiStore((s) => s.cycleTheme);
  const openModal = useUiStore((s) => s.openModal);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const handleOpen = useCallback(
    (id: string) => setActiveProject(id),
    [setActiveProject],
  );

  const handleCreate = useCallback(() => {
    const project = createProject('Untitled Project');
    setActiveProject(project.id);
    toast.success('Project created', { description: project.name });
  }, [createProject, setActiveProject]);

  const handleCommitRename = useCallback(
    (id: string, name: string) => {
      const trimmed = name.trim();
      if (trimmed) renameProject(id, trimmed);
      setRenamingId(null);
    },
    [renameProject],
  );

  const handleDuplicate = useCallback(
    (id: string) => {
      const copy = duplicateProject(id);
      if (copy) toast.success('Project duplicated', { description: copy.name });
    },
    [duplicateProject],
  );

  const handleDelete = useCallback(
    (id: string) => {
      const project = projects.find((p) => p.id === id);
      if (!project) return;
      const ok = window.confirm( `Delete "${project.name}"? This removes it from browser storage and cannot be undone.`, );
      if (!ok) return;
      deleteProject(id);
      useEditorStore.getState().closeAllTabs(id);
      toast.success('Project deleted', { description: project.name });
    },
    [deleteProject, projects],
  );

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <span className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            <Sparkles size={15} />
          </span>
          CodeCollab
        </span>

        <div className={styles.spacer} />
        <IconButton
          label={`Switch theme (current: ${theme})`}
          onClick={cycleTheme}
          size="lg"
        >
          {theme === 'light' ? <Sun size={16} /> : <Moon size={16} />}
        </IconButton>

        <IconButton
          label="Editor settings"
          onClick={() => openModal('settings')}
          size="lg"
        >
          <Settings size={16} />
        </IconButton>
      </header>

      <main className={styles.content}>
        <div className={styles.heading}>
          <div>
            <h1 className={styles.title}>Your Projects</h1>
            <p className={styles.subtitle}>
              {projects.length} project{projects.length === 1 ? '' : 's'} stored in this
              browser
            </p>
          </div>
        </div>

        <ul className={styles.grid}>
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              renaming={renamingId === project.id}
              onOpen={handleOpen}
              onStartRename={setRenamingId}
              onCommitRename={handleCommitRename}
              onCancelRename={() => setRenamingId(null)}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
          ))}

          <li>
            <button type="button" className={styles.newCard} onClick={handleCreate}>
              <FolderPlus size={22} aria-hidden="true" />
              New Project
            </button>
          </li>
        </ul>

        <p className={styles.footerNote}>
          <span>Everything runs in your browser — no server, no account.</span>
          <span>
            Inside a project, press <kbd className={styles.kbd}>Ctrl</kbd>
            {' + '}
            <kbd className={styles.kbd}>Shift</kbd>
            {' + '}
            <kbd className={styles.kbd}>P</kbd> for the command palette.
          </span>
        </p>
      </main>
    </div>
  );
}