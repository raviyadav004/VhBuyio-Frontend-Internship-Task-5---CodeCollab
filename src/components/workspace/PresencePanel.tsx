import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { UserPlus, Users } from 'lucide-react';
import type { CollabUser, PresenceStatus, Project } from '@/types';
import { useCollabStore, sortUsersForPresence } from '@/stores/collabStore';
import { useWorkspaceActions } from '@/hooks/useWorkspaceActions';
import { Avatar, PresenceDot, statusLabel } from '@/components/common/Avatar';
import { IconButton } from '@/components/common/IconButton';
import { collaborationSimulator } from '@/services/collaborationSimulator';
import { findNode } from '@/utils/fileTree';
import { relativeTime } from '@/utils/time';
import styles from './Workspace.module.css';

interface PresencePanelProps {
  project: Project;
}

const GROUPS: PresenceStatus[] = ['online', 'idle', 'offline'];
export function PresencePanel({ project }: PresencePanelProps) {
  const users = useCollabStore(useShallow((s) => s.users));
  const connection = useCollabStore((s) => s.connection);
  const actions = useWorkspaceActions();

  const grouped = useMemo(() => {
    const sorted = sortUsersForPresence(users);
    return GROUPS.map((status) => ({
      status,
      users: sorted.filter((u) => u.status === status),
    })).filter((group) => group.users.length > 0);
  }, [users]);

  const describeActivity = (user: CollabUser): string => {
    if (user.isLocal) return 'This is you';
    if (user.status === 'offline') return `Last seen ${relativeTime(user.lastActiveAt)}`;
    if (connection !== 'connected') return 'Not syncing';
    if (!user.activeFileId) return statusLabel(user.status);
    const node = findNode(project.files, user.activeFileId);
    if (!node) return statusLabel(user.status);

    return user.isTyping ? `Editing ${node.name}` : `Viewing ${node.name}`;
  };

  return (
    <>
      <div className={styles.sidebarHeader}>
        <h2 className={styles.sidebarTitle}>Collaboration</h2>

        <IconButton
          label="Invite a collaborator"
          onClick={() => {
            const user = collaborationSimulator.addRandomUser();
            if (!user) actions.openShare();
          }}
        >
          <UserPlus size={14} />
        </IconButton>
      </div>

      <div className={styles.sidebarBody}>
        {grouped.map((group) => (
          <section key={group.status} className={styles.presenceGroup}>
            <h3 className={styles.groupLabel}>
              <PresenceDot status={group.status} />
              {statusLabel(group.status)}
              <span className={styles.groupCount}>{group.users.length}</span>
            </h3>

            <ul>
              {group.users.map((user) => (
                <li key={user.id}>
                  <button
                    type="button"
                    className={styles.userRow}
                    onClick={() => {
                      if (user.activeFileId) actions.openFile(user.activeFileId);
                    }}
                    disabled={!user.activeFileId}
                    title={
                      user.activeFileId
                        ? `Jump to the file ${user.name} is on`
                        : `${user.name} is not in a file`
                    }
                  >
                    <Avatar user={user} />

                    <span className={styles.userInfo}>
                      <span className={styles.userName}>
                        {user.name}
                        {user.isLocal && <span className={styles.userTag}>You</span>}
                      </span>

                      <span className={styles.userStatus}>
                        {user.isTyping && connection === 'connected' && (
                          <span className={styles.typingDots} aria-hidden="true">
                            <span />
                            <span />
                            <span />
                          </span>
                        )}
                        {describeActivity(user)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {users.length === 0 && (
          <p className={styles.emptyPanel}>
            <Users size={20} aria-hidden="true" />
            Nobody is here right now.
          </p>
        )}
      </div>
    </>
  );
}