import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

import styles from './common.module.css';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
  active?: boolean;
  size?: 'md' | 'lg';
  showLabel?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { label, children, active, size = 'md', showLabel = false, className, ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={showLabel ? undefined : label}
        title={label}
        aria-pressed={active === undefined ? undefined : active}
        className={clsx(
          styles.iconButton,
          active && styles.iconButtonActive,
          size === 'lg' && styles.iconButtonLarge,
          showLabel && styles.iconButtonWide,
          className,
        )}
        {...rest}
      >
        {children}
        {showLabel && <span>{label}</span>}
      </button>
    );
  },
);

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: styles.buttonPrimary,
  secondary: styles.buttonSecondary,
  ghost: styles.buttonGhost,
  danger: styles.buttonDanger,
};

export function Button({
  variant = 'secondary',
  children,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={clsx(styles.button, VARIANT_CLASS[variant], className)}
      {...rest}
    >
      {children}
    </button>
  );
}
