import { useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Check, Copy, Info, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import clsx from 'clsx';
import { useProjectStore, selectActiveProject } from '@/stores/projectStore';
import { useCollabStore } from '@/stores/collabStore';
import { useUiStore } from '@/stores/uiStore';
import { Modal } from '@/components/common/Modal';
import { Avatar, statusLabel } from '@/components/common/Avatar';
import { Button } from '@/components/common/IconButton';
import { collaborationSimulator } from '@/services/collaborationSimulator';
import styles from './Modals.module.css';

type Permission = 'view' | 'comment' | 'edit';
const PERMISSIONS: Array<{ id: Permission; label: string }> = [
  { id: 'view', label: 'Can view' },
  { id: 'comment', label: 'Can comment' },
  { id: 'edit', label: 'Can edit' },
];

export function ShareModal() {
  const open = useUiStore((s) => s.modal === 'share');
  const closeModal = useUiStore((s) => s.closeModal);
  const project = useProjectStore(selectActiveProject);
  const users = useCollabStore(useShallow((s) => s.users));
  const [permission, setPermission] = useState<Permission>('edit');
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const shareLink = useMemo(() => {
    if (!project) return '';
    const token = project.id.replace(/[^a-z0-9]/gi, '').slice(-10) || 'demo000000';
    return `${window.location.origin}/#/join/${token}?role=${permission}`;
  }, [permission, project]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      toast.success('Share link copied');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      inputRef.current?.select();
      toast('Press Ctrl + C to copy the link');
    }
  };

  if (!project) return null;
  return (
    <Modal
      open={open}
      title={`Share "${project.name}"`}
      onClose={closeModal}
      centered
      wide
      footer={
        <Button variant="primary" onClick={closeModal}>
          Done
        </Button>
      }
    >
      <div className={styles.shareLinkRow}>
        <input
          ref={inputRef}
          className={styles.shareLink}
          value={shareLink}
          readOnly
          aria-label="Share link"
          onFocus={(e) => e.target.select()}
        />

        <Button variant="primary" onClick={handleCopy}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>

      <div className={styles.permissionRow} role="group" aria-label="Link permission">
        {PERMISSIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={permission === option.id}
            className={clsx(
              styles.permissionChip,
              permission === option.id && styles.permissionChipActive,
            )}
            onClick={() => setPermission(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <p className={styles.shareNote}>
        <Info size={14} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          This is a demo link. CodeCollab is frontend-only, so nothing is uploaded and
          the link will not open a real session — use{' '}
          <strong>Invite a demo collaborator</strong> below to add a simulated user
          instead.
        </span>
      </p>

      <div className={styles.shareUsers}>
        <h3 className={styles.sectionTitle}>People with access</h3>

        {users.map((user) => (
          <div key={user.id} className={styles.shareUserRow}>
            <Avatar user={user} showTyping={false} />

            <span className={styles.shareUserName}>
              {user.name}
              {user.isLocal ? ' (you)' : ''}
            </span>

            <span className={styles.shareRole}>
              {user.isLocal ? 'Owner' : `Editor · ${statusLabel(user.status)}`}
            </span>
          </div>
        ))}

        <Button
          variant="secondary"
          onClick={() => {
            const user = collaborationSimulator.addRandomUser();
            toast(user ? `${user.name} joined the session` : 'No more demo users left');
          }}
        >
          <UserPlus size={14} />
          Invite a demo collaborator
        </Button>
      </div>
    </Modal>
  );
}