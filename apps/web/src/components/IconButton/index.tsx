import { forwardRef } from 'react';
import styles from './styles.module.scss';

interface IconButtonProps {
  icon: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'primary' | 'danger';
  visibility?: 'default' | 'hidden';
  shape?: 'default' | 'circle';
  className?: string;
  onClick?: () => void;
  title?: string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(({
  icon,
  size = 'md',
  variant = 'default',
  visibility = 'default',
  shape = 'default',
  className = '',
  onClick,
  title
}, ref) => {
  const classes = [
    styles.iconBtn,
    styles[size],
    variant !== 'default' && styles[variant],
    visibility !== 'default' && styles[visibility],
    shape !== 'default' && styles[shape],
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      ref={ref}
      type="button"
      className={classes}
      onClick={onClick}
      title={title}
      aria-label={title}
    >
      <span className="material-symbols-outlined">{icon}</span>
    </button>
  );
});

IconButton.displayName = 'IconButton';
