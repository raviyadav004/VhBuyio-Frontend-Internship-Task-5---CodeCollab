import { Keyboard, Pause, Play, Plug, PlugZap, UserMinus, UserPlus, X, Zap, } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';
import { useCollabStore } from '@/stores/collabStore';
import { useUiStore } from '@/stores/uiStore';
import { collaborationSimulator } from '@/services/collaborationSimulator';
import { IconButton } from '@/components/common/IconButton';
import styles from './Workspace.module.css';

export function DemoPanel() {
  const open = useUiStore((s) => s.demoPanelOpen);
  const toggleDemoPanel = useUiStore((s) => s.toggleDemoPanel);
  const isRunning = useCollabStore((s) => s.simulationRunning);
  const connection = useCollabStore((s) => s.connection);
  const remoteCount = useCollabStore((s) => s.users.filter((u) => !u.isLocal).length);
  if (!open) return null;

  const online = connection === 'connected';
  return (
    <aside className={styles.demoPanel} aria-label="Simulation controls">
      <div className={styles.demoHeader}>
        <Zap size={12} aria-hidden="true" />
        <span style={{ flex: 1 }}>Demo controls</span>
        <IconButton label="Close demo controls" onClick={toggleDemoPanel}>
          <X size={13} />
        </IconButton>
      </div>

      <div className={styles.demoBody}>
        <button
          type="button"
          className={clsx(
            styles.demoButton,
            styles.demoButtonWide,
            isRunning && styles.demoButtonActive,
          )}
          onClick={() => {
            const nowRunning = collaborationSimulator.toggle();
            toast(nowRunning ? 'Simulation resumed' : 'Simulation paused');
          }}
        >
          {isRunning ? <Pause size={13} /> : <Play size={13} />}
          {isRunning ? 'Pause collaboration' : 'Start collaboration'}
        </button>

        <div className={styles.demoRow}>
          <button
            type="button"
            className={styles.demoButton}
            onClick={() => {
              const user = collaborationSimulator.addRandomUser();
              toast(user ? `${user.name} joined` : 'No more demo users available');
            }}
          >
            <UserPlus size={13} />
            Add user
          </button>

          <button
            type="button"
            className={styles.demoButton}
            disabled={remoteCount === 0}
            onClick={() => {
              const user = collaborationSimulator.removeRandomUser();
              if (user) toast(`${user.name} left`);
            }}
          >
            <UserMinus size={13} />
            Remove
          </button>
        </div>

        <button
          type="button"
          className={clsx(styles.demoButton, styles.demoButtonWide)}
          disabled={!online}
          onClick={() => {
            const candidates = useCollabStore.getState().users.filter((u) => !u.isLocal && u.status === 'online');
            const user = candidates[Math.floor(Math.random() * candidates.length)];

            if (!user || !collaborationSimulator.simulateEditBy(user.id)) {
              toast('Open a file first, then try again');
              return;
            }
            toast(`${user.name} is typing…`);
          }}
        >
          <Keyboard size={13} />
          Simulate a remote edit
        </button>

        <div className={styles.demoRow}>
          <button
            type="button"
            className={styles.demoButton}
            disabled={!online}
            onClick={() => collaborationSimulator.simulateDisconnect()}
          >
            <Plug size={13} />
            Go offline
          </button>

          <button
            type="button"
            className={styles.demoButton}
            disabled={online}
            onClick={() => collaborationSimulator.simulateReconnect()}
          >
            <PlugZap size={13} />
            Reconnect
          </button>
        </div>

        <p className={styles.demoHint}> Everything here is local. There is no server — the “collaborators” are timers writing into the same Monaco model you are typing in. </p>
      </div>
    </aside>
  );
}
