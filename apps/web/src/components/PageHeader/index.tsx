import type { ReactNode } from 'react';
import { Button } from '../Button';
import styles from './styles.module.css';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    icon?: ReactNode;
    onClick: () => void;
  };
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.text}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {action && (
        <Button
          onClick={action.onClick}
          iconLeft={action.icon}
        >
          {action.label}
        </Button>
      )}
    </header>
  );
}