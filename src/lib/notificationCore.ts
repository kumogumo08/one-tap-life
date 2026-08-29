import { getNotificationMessage } from '@/src/data/notificationMessages';
import type { CharacterId } from '@/src/types/character';
import type { NotificationSettings } from '@/src/types/notificationSettings';

/** One Tap Life の日次通知だけを指す固定ID。他通知はキャンセルしない */
export const DAILY_NOTIFICATION_IDENTIFIER = 'otl_daily_reminder';

export const DAILY_NOTIFICATION_TITLE = 'ワンタップライフ';

export const DAILY_NOTIFICATION_CHANNEL_ID = 'otl-daily';

export const DAILY_NOTIFICATION_CHANNEL_NAME = '毎日のリマインダー';

/** 設定画面の時刻プリセット。分は 00 固定 */
export const NOTIFICATION_HOUR_PRESETS = [18, 19, 20, 21, 22] as const;

export function formatNotificationTime(hour: number, minute: number): string {
  const h = String(hour).padStart(2, '0');
  const m = String(minute).padStart(2, '0');
  return `${h}:${m}`;
}

export function shouldShowNotificationPrompt(input: {
  notificationPromptShown: boolean;
  isFirstCompletion: boolean;
}): boolean {
  return input.isFirstCompletion === true && input.notificationPromptShown !== true;
}

export function isFirstTaskCompletion(progress: {
  completedCount: number;
  firstCompletedAt: number | null;
}): boolean {
  return progress.completedCount === 0 && progress.firstCompletedAt == null;
}

/** 権限結果から ON/OFF を決める。拒否時は絶対に ON にしない */
export function settingsPatchAfterPermission(granted: boolean): {
  notificationsEnabled: boolean;
  notificationPromptShown: true;
} {
  return {
    notificationsEnabled: granted === true,
    notificationPromptShown: true,
  };
}

export type DailyNotificationAction =
  | { type: 'cancel' }
  | {
      type: 'schedule';
      hour: number;
      minute: number;
      characterId: CharacterId;
    };

export function shouldScheduleDailyNotification(
  settings: NotificationSettings
): boolean {
  return settings.notificationsEnabled === true;
}

export function resolveDailyNotificationAction(
  settings: NotificationSettings,
  characterId: CharacterId
): DailyNotificationAction {
  if (!shouldScheduleDailyNotification(settings)) {
    return { type: 'cancel' };
  }

  return {
    type: 'schedule',
    hour: settings.notificationHour,
    minute: settings.notificationMinute,
    characterId,
  };
}

export function buildDailyNotificationContent(characterId: CharacterId): {
  title: string;
  body: string;
} {
  return {
    title: DAILY_NOTIFICATION_TITLE,
    body: getNotificationMessage(characterId),
  };
}

export function buildDailyNotificationRequest(input: {
  hour: number;
  minute: number;
  characterId: CharacterId;
}): {
  identifier: string;
  content: { title: string; body: string };
  trigger: {
    type: 'daily';
    hour: number;
    minute: number;
    channelId: string;
  };
} {
  return {
    identifier: DAILY_NOTIFICATION_IDENTIFIER,
    content: buildDailyNotificationContent(input.characterId),
    trigger: {
      type: 'daily',
      hour: input.hour,
      minute: input.minute,
      channelId: DAILY_NOTIFICATION_CHANNEL_ID,
    },
  };
}
