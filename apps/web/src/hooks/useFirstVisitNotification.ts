import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const NOTIFICATION_PROMPTED_KEY = 'notification_prompted';

export function useFirstVisitNotification() {
  const { t } = useTranslation();
  const requested = useRef(false);

  useEffect(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'default') return;
    if (localStorage.getItem(NOTIFICATION_PROMPTED_KEY)) return;
    if (requested.current) return;

    requested.current = true;

    const request = async () => {
      const permission = await Notification.requestPermission();
      localStorage.setItem(NOTIFICATION_PROMPTED_KEY, '1');

      if (permission === 'granted') {
        new Notification(t('notifications.enabled'), {
          body: t('notifications.enabledDesc'),
          icon: '/icons-192.png',
        });
      }
    };

    const timer = setTimeout(request, 2000);
    return () => clearTimeout(timer);
  }, [t]);
}