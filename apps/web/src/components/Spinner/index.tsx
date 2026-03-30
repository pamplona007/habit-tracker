import styles from './styles.module.scss';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'white' | 'current' | 'surface';
  className?: string;
}

export function Spinner({
  size = 'md',
  variant = 'surface',
  className = ''
}: SpinnerProps) {
  const classes = [
    styles.spinner,
    styles[size],
    styles[variant],
    className
  ].filter(Boolean).join(' ');

  return <div className={classes} role="status" aria-label="Loading" />;
}
