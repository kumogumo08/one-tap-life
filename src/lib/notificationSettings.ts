import { readJson, writeJson } from '@/src/lib/storage';
import { STORAGE_KEYS } from '@/src/lib/storageKeys';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  normalizeNotificationSettings,
  type NotificationSettings,
} from '@/src/types/notificationSettings';

export async function loadNotificationSettings(): Promise<NotificationSettings> {
  const raw = await readJson<unknown>(STORAGE_KEYS.notificationSettings, null);
  return normalizeNotificationSettings(raw);
}

export async function saveNotificationSettings(
  settings: NotificationSettings
): Promise<boolean> {
  return writeJson(
    STORAGE_KEYS.notificationSettings,
    normalizeNotificationSettings(settings)
  );
}

export { DEFAULT_NOTIFICATION_SETTINGS, normalizeNotificationSettings };
export type { NotificationSettings };
