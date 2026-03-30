import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pushApi, type NotificationSettings } from '../api/push';

export const PUSH_KEYS = {
  settings: ['push', 'settings'] as const,
};

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  return new Uint8Array([...rawData].map((char) => char.charCodeAt(0)));
}

export function usePushSubscription() {
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setIsSupported(false);
      return;
    }
    setIsSupported(true);
    setPermissionState(Notification.permission);

    navigator.serviceWorker.ready.then((registration) => {
      registration.pushManager.getSubscription().then((sub) => {
        setSubscription(sub as PushSubscription | null);
      });
    });
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported) throw new Error('Push notifications not supported');

    const registration = await navigator.serviceWorker.ready;
    const vapidPublicKey = import.meta.env.VITE_PUSH_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) throw new Error('VAPID public key not configured');

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
    });

    const deviceName = navigator.userAgent;
    await pushApi.subscribe({
      endpoint: subscription.endpoint,
      keys: {
        p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))),
        auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!))),
      },
      deviceName,
    });

    setSubscription(subscription as unknown as PushSubscription);
    setPermissionState('granted');
    return subscription;
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    const existingSubscription = await navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription());
    if (existingSubscription) {
      await existingSubscription.unsubscribe();
    }
    setSubscription(null);
  }, []);

  return {
    subscription,
    isSupported,
    permissionState,
    subscribe,
    unsubscribe,
  };
}

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export function useNotificationSettings() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: PUSH_KEYS.settings,
    queryFn: () => pushApi.getSettings(),
  });

  const updateMutation = useMutation({
    mutationFn: (settings: Partial<NotificationSettings>) => pushApi.updateSettings(settings),
    onSuccess: (response) => {
      queryClient.setQueryData(PUSH_KEYS.settings, response);
    },
  });

  return {
    settings: query.data?.settings,
    isLoading: query.isLoading,
    error: query.error,
    updateSettings: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}