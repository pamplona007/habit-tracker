import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../Avatar';
import styles from './styles.module.scss';

export function UserMenu() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={styles.container} ref={menuRef}>
      <button
        className={styles.avatarBtn}
        onClick={() => setOpen(!open)}
        aria-label="User menu"
        aria-expanded={open}
      >
        {user && <Avatar user={user} size={40} className={styles.avatar} />}
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.userInfo}>
            {user && <Avatar user={user} size={48} className={styles.avatar} />}
            <div className={styles.userDetails}>
              <span className={styles.userName}>{user?.name}</span>
              <span className={styles.userEmail}>{user?.email}</span>
            </div>
          </div>

          <div className={styles.divider} />

          <NavLink
            to="/settings"
            className={styles.item}
            onClick={() => setOpen(false)}
          >
            <span className="material-symbols-outlined">tune</span>
            <span>{t('nav.settings')}</span>
          </NavLink>

          <button className={styles.item} onClick={logout}>
            <span className="material-symbols-outlined">logout</span>
            <span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  );
}