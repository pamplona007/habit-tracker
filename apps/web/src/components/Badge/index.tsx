import styles from './styles.module.scss';

interface BadgeProps {
  variant?: 'low' | 'normal' | 'high' | 'urgent' | 'outline';
  children: React.ReactNode;
  className?: string;
}

export function Badge({
  variant = 'normal',
  children,
  className = ''
}: BadgeProps) {
  const classes = [
    styles.badge,
    styles[variant],
    className
  ].filter(Boolean).join(' ');

  return (
    <span className={classes}>
      {children}
    </span>
  );
}
