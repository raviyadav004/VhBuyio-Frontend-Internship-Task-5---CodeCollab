import { useEffect } from 'react';
import type { Project } from '@/types';
import { useEditorStore } from '@/stores/editorStore';
import { useCollabStore } from '@/stores/collabStore';
import { useWorkspaceActions } from '@/hooks/useWorkspaceActions';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { collaborationSimulator } from '@/services/collaborationSimulator';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Header } from './Header';
import { ActivityBar, Sidebar, SidebarBackdrop } from './Sidebar';
import { EditorPane } from './EditorPane';
import { BottomPanel } from './BottomPanel';
import { StatusBar } from './StatusBar';
import { DemoPanel } from './DemoPanel';
import { collectFilePaths } from '@/utils/fileTree';
import styles from './Workspace.module.css';

interface WorkspaceProps {
  project: Project;
}

export function Workspace({ project }: WorkspaceProps) {
  const actions = useWorkspaceActions();
  useKeyboardShortcuts(actions);
  useEffect(() => {
    const onSave = () => actions.saveActiveFile();
    window.addEventListener('codecollab:save', onSave);
    return () => window.removeEventListener('codecollab:save', onSave);
  }, [actions]);

  useEffect(() => {
    collaborationSimulator.start();
    useCollabStore.getState().pushActivity('join', `You opened ${project.name}`, 'user_you');
    return () => collaborationSimulator.stop();
  }, [project.id, project.name]);

  useEffect(() => {
    const editor = useEditorStore.getState();
    const tabs = editor.tabsByProject[project.id] ?? [];
    if (tabs.length > 0) return;

    const files = collectFilePaths(project.files);
    if (files.length === 0) return;
    const preferred =
      files.find((f) => /^(src\/)?App\.(tsx|jsx|ts|js)$/i.test(f.path)) ??
      files.find((f) => f.node.name.toLowerCase().startsWith('readme')) ??
      files[0];

    actions.openFile(preferred.node.id, { preview: false });
  }, [project.id]);

  return (
    <div className={styles.shell}>
      <a href="#editor-region" className="skip-link">
        Skip to editor
      </a>

      <ErrorBoundary area="Header">
        <Header project={project} />
      </ErrorBoundary>

      <div className={styles.middle}>
        <ActivityBar />
        <SidebarBackdrop />
        <Sidebar project={project} />

        <div className={styles.mainArea} id="editor-region">
          <EditorPane project={project} />
          <BottomPanel project={project} />
        </div>
      </div>

      <ErrorBoundary area="Status bar">
        <StatusBar project={project} />
      </ErrorBoundary>

      <DemoPanel />
    </div>
  );
}