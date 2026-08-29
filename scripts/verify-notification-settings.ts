import { getNotificationMessage } from '@/src/data/notificationMessages';
import {
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
import type { CharacterId } from '@/src/types/character';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  normalizeNotificationHour,
  normalizeNotificationMinute,
  normalizeNotificationSettings,
} from '@/src/types/notificationSettings';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function run(): void {
  assert(DEFAULT_NOTIFICATION_SETTINGS.notificationsEnabled === false, 'default OFF');
  assert(DEFAULT_NOTIFICATION_SETTINGS.notificationHour === 20, 'default hour 20');
  assert(DEFAULT_NOTIFICATION_SETTINGS.notificationMinute === 0, 'default minute 0');
  assert(
    DEFAULT_NOTIFICATION_SETTINGS.notificationPromptShown === false,
    'default prompt not shown'
  );

  const fromNull = normalizeNotificationSettings(null);
  assert(fromNull.notificationsEnabled === false, 'null -> OFF');
  assert(fromNull.notificationHour === 20, 'null -> hour 20');
  assert(fromNull.notificationMinute === 0, 'null -> minute 0');
  assert(fromNull.notificationPromptShown === false, 'null -> prompt not shown');

  const fromCorrupt = normalizeNotificationSettings({
    notificationsEnabled: 'yes',
    notificationHour: 99,
    notificationMinute: -1,
    notificationPromptShown: 1,
  });
  assert(fromCorrupt.notificationsEnabled === false, 'corrupt enabled stays OFF');
  assert(fromCorrupt.notificationHour === 20, 'invalid hour -> 20');
  assert(fromCorrupt.notificationMinute === 0, 'invalid minute -> 0');
  assert(fromCorrupt.notificationPromptShown === false, 'corrupt prompt stays false');

  assert(normalizeNotificationHour(8) === 8, 'hour 8');
  assert(normalizeNotificationHour(0) === 0, 'hour 0');
  assert(normalizeNotificationHour(23) === 23, 'hour 23');
  assert(normalizeNotificationHour(23.9) === 23, 'hour floor 23.9');
  assert(normalizeNotificationHour(24) === 20, 'hour 24 invalid');
  assert(normalizeNotificationHour('8') === 20, 'hour string invalid');
  assert(normalizeNotificationMinute(59) === 59, 'minute 59');
  assert(normalizeNotificationMinute(0) === 0, 'minute 0');
  assert(normalizeNotificationMinute(60) === 0, 'minute 60 invalid');
  assert(normalizeNotificationMinute(7.2) === 7, 'minute floor');

  const enabled = normalizeNotificationSettings({
    notificationsEnabled: true,
    notificationHour: 21,
    notificationMinute: 30,
    notificationPromptShown: true,
  });
  assert(enabled.notificationsEnabled === true, 'true stays true');
  assert(enabled.notificationHour === 21, 'hour 21 kept');
  assert(enabled.notificationMinute === 30, 'minute 30 kept');
  assert(enabled.notificationPromptShown === true, 'prompt shown kept');

  assert(
    shouldScheduleDailyNotification(DEFAULT_NOTIFICATION_SETTINGS) === false,
    'default should not schedule'
  );
  assert(shouldScheduleDailyNotification(enabled) === true, 'enabled should schedule');

  const cancelAction = resolveDailyNotificationAction(
    DEFAULT_NOTIFICATION_SETTINGS,
    'gal'
  );
  assert(cancelAction.type === 'cancel', 'OFF resolves to cancel');

  const scheduleAction = resolveDailyNotificationAction(enabled, 'mom');
  assert(scheduleAction.type === 'schedule', 'ON resolves to schedule');
  if (scheduleAction.type === 'schedule') {
    assert(scheduleAction.hour === 21, 'action hour');
    assert(scheduleAction.minute === 30, 'action minute');
    assert(scheduleAction.characterId === 'mom', 'action character');
  }

  assert(
    isFirstTaskCompletion({ completedCount: 0, firstCompletedAt: null }) === true,
    'first completion'
  );
  assert(
    isFirstTaskCompletion({ completedCount: 1, firstCompletedAt: 1 }) === false,
    'later completion'
  );
  assert(
    shouldShowNotificationPrompt({
      isFirstCompletion: true,
      notificationPromptShown: false,
    }) === true,
    'show on first completion'
  );
  assert(
    shouldShowNotificationPrompt({
      isFirstCompletion: true,
      notificationPromptShown: true,
    }) === false,
    'do not show again after prompt'
  );
  assert(
    shouldShowNotificationPrompt({
      isFirstCompletion: false,
      notificationPromptShown: false,
    }) === false,
    'do not show on later completions'
  );

  const skipped = normalizeNotificationSettings({
    ...DEFAULT_NOTIFICATION_SETTINGS,
    notificationPromptShown: true,
  });
  assert(skipped.notificationsEnabled === false, 'skip does not enable');
  assert(skipped.notificationPromptShown === true, 'skip marks prompt shown');

  const deniedPatch = settingsPatchAfterPermission(false);
  const denied = normalizeNotificationSettings({
    ...DEFAULT_NOTIFICATION_SETTINGS,
    ...deniedPatch,
  });
  assert(denied.notificationsEnabled === false, 'denied does not enable');
  assert(denied.notificationPromptShown === true, 'denied marks prompt shown');
  assert(resolveDailyNotificationAction(denied, 'gal').type === 'cancel', 'denied cancels');

  const grantedPatch = settingsPatchAfterPermission(true);
  const granted = normalizeNotificationSettings({
    ...DEFAULT_NOTIFICATION_SETTINGS,
    notificationHour: 20,
    notificationMinute: 0,
    ...grantedPatch,
  });
  assert(granted.notificationsEnabled === true, 'granted enables');
  assert(granted.notificationHour === 20, 'granted uses 20:00');
  assert(granted.notificationMinute === 0, 'granted minute 0');
  const grantedAction = resolveDailyNotificationAction(granted, 'gal');
  assert(grantedAction.type === 'schedule', 'granted schedules');
  if (grantedAction.type === 'schedule') {
    assert(grantedAction.hour === 20 && grantedAction.minute === 0, 'granted 20:00');
  }

  const turnedOff = normalizeNotificationSettings({
    ...granted,
    notificationsEnabled: false,
  });
  assert(turnedOff.notificationsEnabled === false, 'settings OFF');
  assert(
    resolveDailyNotificationAction(turnedOff, 'gal').type === 'cancel',
    'settings OFF cancels reservation'
  );

  const turnedOnAgain = normalizeNotificationSettings({
    ...turnedOff,
    notificationsEnabled: true,
  });
  const onAgainA = buildDailyNotificationRequest({
    hour: turnedOnAgain.notificationHour,
    minute: turnedOnAgain.notificationMinute,
    characterId: 'gal',
  });
  const onAgainB = buildDailyNotificationRequest({
    hour: turnedOnAgain.notificationHour,
    minute: turnedOnAgain.notificationMinute,
    characterId: 'serious',
  });
  assert(
    onAgainA.identifier === DAILY_NOTIFICATION_IDENTIFIER &&
      onAgainA.identifier === onAgainB.identifier,
    're-enable uses the same identifier'
  );

  const timeChangedOn = normalizeNotificationSettings({
    ...granted,
    notificationHour: 18,
    notificationMinute: 0,
  });
  const timeAction = resolveDailyNotificationAction(timeChangedOn, 'gal');
  assert(timeAction.type === 'schedule', 'ON time change reschedules');
  if (timeAction.type === 'schedule') {
    assert(timeAction.hour === 18 && timeAction.minute === 0, 'reschedule 18:00');
  }

  const timeChangedOff = normalizeNotificationSettings({
    ...DEFAULT_NOTIFICATION_SETTINGS,
    notificationHour: 18,
    notificationMinute: 0,
    notificationsEnabled: false,
  });
  assert(
    resolveDailyNotificationAction(timeChangedOff, 'gal').type === 'cancel',
    'OFF time change does not schedule'
  );

  assert(NOTIFICATION_HOUR_PRESETS.includes(20), 'preset includes 20');
  assert(formatNotificationTime(8, 5) === '08:05', 'format time');

  const originalRandom = Math.random;
  Math.random = () => 0;
  try {
    const content = buildDailyNotificationContent('gal');
    assert(
      content.body === getNotificationMessage('gal'),
      'content body uses getNotificationMessage'
    );
    assert(
      content.body === '今日まだじゃん！1個だけやっとこ〜',
      'gal body is a dedicated message'
    );

    const unregistered = buildDailyNotificationContent('maid' as CharacterId);
    assert(
      unregistered.body === getNotificationMessage('maid' as CharacterId),
      'unregistered uses getNotificationMessage'
    );
    assert(
      unregistered.body === '今日も1つだけ、やっておきませんか。',
      'unregistered fallback body'
    );
  } finally {
    Math.random = originalRandom;
  }

  const requestA = buildDailyNotificationRequest({
    hour: 20,
    minute: 0,
    characterId: 'gal',
  });
  const requestB = buildDailyNotificationRequest({
    hour: 21,
    minute: 15,
    characterId: 'serious',
  });
  assert(
    requestA.identifier === DAILY_NOTIFICATION_IDENTIFIER,
    'request uses fixed identifier'
  );
  assert(
    requestA.identifier === requestB.identifier,
    'reschedule keeps the same identifier'
  );
  assert(requestA.trigger.type === 'daily', 'daily trigger');
  assert(requestB.trigger.hour === 21 && requestB.trigger.minute === 15, 'trigger time');

  console.log('notificationSettings tests passed');
}

run();
