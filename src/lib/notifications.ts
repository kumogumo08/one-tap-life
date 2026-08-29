import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { DEFAULT_CHARACTER_ID, isCharacterId } from '@/src/data/characters';
import { ensureOwnedCharacterId } from '@/src/lib/characterAccess';
import {
  DAILY_NOTIFICATION_CHANNEL_ID,
  DAILY_NOTIFICATION_CHANNEL_NAME,
  DAILY_NOTIFICATION_IDENTIFIER,
  buildDailyNotificationRequest,
  resolveDailyNotificationAction,
  settingsPatchAfterPermission,
} from '@/src/lib/notificationCore';
import {
  loadNotificationSettings,
  saveNotificationSettings,
} from '@/src/lib/notificationSettings';
import { readJson } from '@/src/lib/storage';
import { STORAGE_KEYS } from '@/src/lib/storageKeys';
import type { CharacterId } from '@/src/types/character';
import {
  normalizeNotificationSettings,
  type NotificationSettings,
} from '@/src/types/notificationSettings';
import { normalizeUserSettings } from '@/src/types/storage';

export {
  DAILY_NOTIFICATION_IDENTIFIER,
  NOTIFICATION_HOUR_PRESETS,
  buildDailyNotificationContent,
  buildDailyNotificationRequest,
  formatNotificationTime,
  isFirstTaskCompletion,
  resolveDailyNotificationAction,
  settingsPatchAfterPermission,
  shouldScheduleDailyNotification,
  shouldShowNotificationPrompt,
} from '@/src/lib/notificationCore';
export {
  loadNotificationSettings,
  saveNotificationSettings,
} from '@/src/lib/notificationSettings';
export type { NotificationSettings };

function isNativeNotificationsSupported(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

function configureNotificationHandler(): void {
  if (!isNativeNotificationsSupported()) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {
    // Expo Go / 未リンク環境でも落とさない
  }
}

configureNotificationHandler();

function isPermissionGranted(
  permissions: Notifications.NotificationPermissionsStatus
): boolean {
  if (permissions.granted) return true;
  const iosStatus = permissions.ios?.status;
  return (
    iosStatus === Notifications.IosAuthorizationStatus.AUTHORIZED ||
    iosStatus === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(DAILY_NOTIFICATION_CHANNEL_ID, {
    name: DAILY_NOTIFICATION_CHANNEL_NAME,
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

async function getCurrentCharacterId(): Promise<CharacterId> {
  try {
    const settings = normalizeUserSettings(
      await readJson<unknown>(STORAGE_KEYS.settings, null)
    );
    const id = ensureOwnedCharacterId(settings.selectedCharacterId);
    return isCharacterId(id) ? id : DEFAULT_CHARACTER_ID;
  } catch {
    return DEFAULT_CHARACTER_ID;
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (!isNativeNotificationsSupported()) return false;

    await ensureAndroidChannel();

    const existing = await Notifications.getPermissionsAsync();
    if (isPermissionGranted(existing)) return true;

    const requested = await Notifications.requestPermissionsAsync();
    return isPermissionGranted(requested);
  } catch (error) {
    console.error('requestNotificationPermission failed', error);
    return false;
  }
}

export async function cancelDailyNotification(): Promise<boolean> {
  try {
    if (!isNativeNotificationsSupported()) return true;
    await Notifications.cancelScheduledNotificationAsync(DAILY_NOTIFICATION_IDENTIFIER);
    return true;
  } catch (error) {
    console.error('cancelDailyNotification failed', error);
    return false;
  }
}

export async function scheduleDailyNotification(input?: {
  hour?: number;
  minute?: number;
  characterId?: CharacterId;
}): Promise<boolean> {
  try {
    if (!isNativeNotificationsSupported()) return false;

    const settings = await loadNotificationSettings();
    const hour = input?.hour ?? settings.notificationHour;
    const minute = input?.minute ?? settings.notificationMinute;
    const characterId = input?.characterId ?? (await getCurrentCharacterId());
    const request = buildDailyNotificationRequest({
      hour,
      minute,
      characterId,
    });

    await ensureAndroidChannel();

    const permission = await Notifications.getPermissionsAsync();
    if (!isPermissionGranted(permission)) return false;

    // 同じ identifier を使い、先に解除してから1件だけ登録する
    await Notifications.cancelScheduledNotificationAsync(DAILY_NOTIFICATION_IDENTIFIER);
    await Notifications.scheduleNotificationAsync({
      identifier: request.identifier,
      content: request.content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: request.trigger.hour,
        minute: request.trigger.minute,
        channelId: request.trigger.channelId,
      },
    });
    return true;
  } catch (error) {
    console.error('scheduleDailyNotification failed', error);
    return false;
  }
}

export async function rescheduleDailyNotification(): Promise<boolean> {
  try {
    const settings = await loadNotificationSettings();
    const characterId = await getCurrentCharacterId();
    const action = resolveDailyNotificationAction(settings, characterId);

    if (action.type === 'cancel') {
      return cancelDailyNotification();
    }

    return scheduleDailyNotification({
      hour: action.hour,
      minute: action.minute,
      characterId: action.characterId,
    });
  } catch (error) {
    console.error('rescheduleDailyNotification failed', error);
    return false;
  }
}

let syncInFlight: Promise<boolean> | null = null;

/** 保存済み設定に合わせて予約を1件に揃える。権限は要求しない */
export async function syncDailyNotification(): Promise<boolean> {
  if (syncInFlight) return syncInFlight;
  syncInFlight = rescheduleDailyNotification().finally(() => {
    syncInFlight = null;
  });
  return syncInFlight;
}

/** 設定を保存したうえで予約を同期する。第3段階のUIから使う */
export async function applyNotificationSettings(
  patch: Partial<NotificationSettings>
): Promise<NotificationSettings> {
  const current = await loadNotificationSettings();
  const next = normalizeNotificationSettings({ ...current, ...patch });
  await saveNotificationSettings(next);
  await rescheduleDailyNotification();
  return next;
}

/**
 * ユーザー操作で通知をONにする。権限がなければ ON にしない。
 * 案内済みフラグは許可・拒否どちらでも立てる。
 */
export async function enableDailyNotifications(
  patch: Partial<Omit<NotificationSettings, 'notificationsEnabled'>> = {}
): Promise<{ granted: boolean; settings: NotificationSettings }> {
  const granted = await requestNotificationPermission();
  const permissionPatch = settingsPatchAfterPermission(granted);
  const settings = await applyNotificationSettings({
    ...patch,
    ...permissionPatch,
  });
  return { granted, settings };
}
