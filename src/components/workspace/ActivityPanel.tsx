import { memo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Activity, FilePlus, Pencil, Save, Trash2, Wifi, FileText, LogIn, LogOut, Eraser, } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ActivityKind } from '@/types';
import { useCollabStore } from '@/stores/collabStore';
import { IconButton } from '@/components/common/IconButton';
import { clockTime, relativeTime } from '@/utils/time';
import styles from './Workspace.module.css';

const ICONS: Record<ActivityKind, LucideIcon> = {
  join: LogIn,
  leave: LogOut,
  edit: Pencil,
  open: FileText,
  create: FilePlus,
  delete: Trash2,
  rename: Pencil,
  save: Save,
  connection: Wifi,
};

interface ActivityPanelProps {
  embedded?: boolean;
}

export const ActivityPanel = memo(function ActivityPanel({
  embedded = false,
}: ActivityPanelProps) {
  const activity = useCollabStore(useShallow((s) => s.activity));
  const clearActivity = useCollabStore((s) => s.clearActivity);

  const list = (
    <div className={styles.sidebarBody}>
      {activity.length === 0 ? (
        <p className={styles.emptyPanel}>
          <Activity size={20} aria-hidden="true" />
          No activity yet. Collaborator actions show up here.
        </p>
      ) : (
        <ul className={styles.activityList} aria-live="polite" aria-relevant="additions">
          {activity.map((event) => {
            const Icon = ICONS[event.kind] ?? Activity;

            return (
              <li key={event.id} className={styles.activityItem}>
                <span className={styles.activityIcon} aria-hidden="true">
                  <Icon size={12} />
                </span>

                <span className={styles.activityBody}>
                  <span className={styles.activityMessage}>{event.message}</span>
                  <br />
                  <time
                    className={styles.activityTime}
                    dateTime={new Date(event.timestamp).toISOString()}
                    title={relativeTime(event.timestamp)}
                  >
                    {clockTime(event.timestamp)}
                  </time>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  if (embedded) return list;
  return (
    <>
      <div className={styles.sidebarHeader}>
        <h2 className={styles.sidebarTitle}>Activity</h2>

        <IconButton
          label="Clear activity log"
          onClick={clearActivity}
          disabled={activity.length === 0}
        >
          <Eraser size={14} />
        </IconButton>
      </div>

      {list}
    </>
  );
});