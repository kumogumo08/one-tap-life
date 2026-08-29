export type NotificationSettings = {
  notificationsEnabled: boolean;
  notificationHour: number;
  notificationMinute: number;
  /** 初回完了後の通知案内を一度でも出したか。催促しないためのフラグ */
  notificationPromptShown: boolean;
};

export const DEFAULT_NOTIFICATION_HOUR = 20;
export const DEFAULT_NOTIFICATION_MINUTE = 0;

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  notificationsEnabled: false,
  notificationHour: DEFAULT_NOTIFICATION_HOUR,
  notificationMinute: DEFAULT_NOTIFICATION_MINUTE,
  notificationPromptShown: false,
};

export function normalizeNotificationHour(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const hour = Math.floor(value);
    if (hour >= 0 && hour <= 23) return hour;
  }
  return DEFAULT_NOTIFICATION_HOUR;
}

export function normalizeNotificationMinute(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const minute = Math.floor(value);
    if (minute >= 0 && minute <= 59) return minute;
  }
  return DEFAULT_NOTIFICATION_MINUTE;
}

export function normalizeNotificationSettings(value: unknown): NotificationSettings {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_NOTIFICATION_SETTINGS };
  }

  const raw = value as Record<string, unknown>;

  return {
    // true 以外はすべて OFF。破損データで勝手に通知をONにしない
    notificationsEnabled: raw.notificationsEnabled === true,
    notificationHour: normalizeNotificationHour(raw.notificationHour),
    notificationMinute: normalizeNotificationMinute(raw.notificationMinute),
    notificationPromptShown: raw.notificationPromptShown === true,
  };
}
