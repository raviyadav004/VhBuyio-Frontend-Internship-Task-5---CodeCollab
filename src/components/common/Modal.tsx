import { useCallback, useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import clsx from 'clsx';
import { IconButton } from './IconButton';
import styles from './common.module.css';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  bare?: boolean;
  centered?: boolean;
  wide?: boolean;
  labelledBy?: string;
}

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  bare = false,
  centered = false,
  wide = false,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const node = dialogRef.current;
    const first = node?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? node)?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      restoreFocusRef.current?.focus?.();
    };
  }, [open]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;
      const node = dialogRef.current;
      if (!node) return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  if (!open) return null;
  return createPortal(
    <div
      className={clsx(styles.backdrop, centered && styles.backdropCentered)}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={clsx(styles.dialog, wide && styles.dialogWide)}
        onKeyDown={onKeyDown}
      >
        {bare ? (
          <>
            <h2 id={titleId} className="visually-hidden"> {title} </h2>
            {children}
          </>
        ) : (
          <>
            <header className={styles.dialogHeader}>
              <h2 id={titleId} className={styles.dialogTitle}> {title} </h2>
              <IconButton label="Close dialog" onClick={onClose}> <X size={16} /> </IconButton>
            </header>

            <div className={styles.dialogBody}>{children}</div>
            {footer && <footer className={styles.dialogFooter}>{footer}</footer>}
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}