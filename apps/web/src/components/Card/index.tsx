import { forwardRef } from 'react';
import styles from './styles.module.scss';

interface CardProps {
  variant?: 'default' | 'interactive' | 'elevated' | 'flat' | 'bordered';
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card = forwardRef<HTMLDivElement, CardProps & React.HTMLAttributes<HTMLDivElement>>(({
  variant = 'default',
  children,
  className = '',
  onClick,
  ...rest
}, ref) => {
  const classes = [
    styles.card,
    variant !== 'default' && styles[variant],
    className
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={ref}
      className={classes}
      onClick={onClick}
      {...rest}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';
