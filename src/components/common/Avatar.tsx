import { memo } from 'react';
import clsx from 'clsx';

import type { CollabUser, PresenceStatus } from '@/types';
import { colorFor } from '@/utils/colors';
import styles from './common.module.css';

interface AvatarProps {
  user: CollabUser;
  size?: 'sm' | 'md' | 'lg';
  showTyping?: boolean;
}

export const Avatar = memo(function Avatar({
  user,
  size = 'md',
  showTyping = true,
}: AvatarProps) {
  const color = colorFor(user.colorIndex);

  return (
    <span
      className={clsx(
        styles.avatar,
        size === 'lg' && styles.avatarLarge,
        size === 'sm' && styles.avatarSmall,
        user.status === 'idle' && styles.avatarIdle,
        user.status === 'offline' && styles.avatarOffline,
        showTyping && user.isTyping && styles.avatarTyping,
      )}
      style={{ background: color.hex, color: color.hex }}
      title={`${user.name} - ${statusLabel(user.status)}`}
    >
      <span style={{ color: '#fff' }}>{user.initials}</span>
    </span>
  );
});

export function statusLabel(status: PresenceStatus): string {
  switch (status) {
    case 'online':
      return 'Online';
    case 'idle':
      return 'Idle';
    default:
      return 'Offline';
  }
}

interface PresenceDotProps {
  status: PresenceStatus;
  ring?: boolean;
}

export const PresenceDot = memo(function PresenceDot({
  status,
  ring = false,
}: PresenceDotProps) {
  return (
    <span
      className={clsx(
        styles.dot,
        status === 'online' && styles.dotOnline,
        status === 'idle' && styles.dotIdle,
        status === 'offline' && styles.dotOffline,
        ring && styles.dotRing,
      )}
      aria-hidden="true"
    />
  );
});

interface AvatarStackProps {
  users: CollabUser[];
  max?: number;
}

export function AvatarStack({ users, max = 4 }: AvatarStackProps) {
  const shown = users.slice(0, max);
  const overflow = users.length - shown.length;
  return (
    <div className={styles.avatarStack}>
      {shown.map((user) => (
        <Avatar key={user.id} user={user} size="sm" />
      ))}

      {overflow > 0 && (
        <span
          className={clsx(styles.avatar, styles.avatarSmall)}
          style={{ background: 'var(--bg-active)' }}
          title={`${overflow} more collaborator${overflow === 1 ? '' : 's'}`}
        >
          <span style={{ color: 'var(--text-secondary)' }}>+{overflow}</span>
        </span>
      )}
    </div>
  );
}
