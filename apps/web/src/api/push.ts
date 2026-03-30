import { apiClient } from './client';

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  deviceName?: string;
}

export interface PushSubscription {
  id: string;
  endpoint: string;
  keys: string;
  isActive: boolean;
  deviceName: string | null;
  createdAt: string;
}

export interface NotificationSettings {
  morningReminderEnabled: boolean;
  morningReminderTime: string;
  taskCreatedEnabled: boolean;
  taskCompletedEnabled: boolean;
}

export const pushApi = {
  subscribe: async (subscription: PushSubscriptionData): Promise<{ subscription: PushSubscription }> => {
    const { data } = await apiClient.post<{ subscription: PushSubscription }>('/push/subscribe', subscription);
    return data;
  },

  unsubscribe: async (subscriptionId: string): Promise<{ success: boolean }> => {
    const { data } = await apiClient.delete<{ success: boolean }>(`/push/subscribe/${subscriptionId}`);
    return data;
  },

  getSettings: async (): Promise<{ settings: NotificationSettings }> => {
    const { data } = await apiClient.get<{ settings: NotificationSettings }>('/push/settings');
    return data;
  },

  updateSettings: async (settings: Partial<NotificationSettings>): Promise<{ settings: NotificationSettings }> => {
    const { data } = await apiClient.patch<{ settings: NotificationSettings }>('/push/settings', settings);
    return data;
  },
};