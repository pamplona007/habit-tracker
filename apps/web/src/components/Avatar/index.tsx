import { useState } from 'react';
import { getGravatarUrl } from '../../utils/gravatar';
import type { User } from '../../types';
import styles from './styles.module.css';

interface AvatarProps {
  user: Pick<User, 'name' | 'email' | 'image' | 'accounts'>;
  size?: number;
  className?: string;
}

export function Avatar({ user, size = 40, className }: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const src = getAvatarUrl(user);
  const initial = user.name?.charAt(0).toUpperCase() || 'U';

  if (src && !imageError) {
    return (
      <img
        src={src}
        alt={user.name || 'Avatar'}
        width={size}
        height={size}
        className={`${styles.image} ${className || ''}`}
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <div
      className={`${styles.initial} ${className || ''}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  );
}

export function getAvatarUrl(user: Pick<User, 'name' | 'email' | 'image' | 'accounts'>): string | null {
  if (user.image) {
    return user.image;
  }

  if (user.accounts && user.accounts.length > 0) {
    const accountWithImage = user.accounts.find((a) => a.image);
    if (accountWithImage?.image) {
      return accountWithImage.image;
    }
  }

  if (user.email) {
    return getGravatarUrl(user.email);
  }

  return null;
}
