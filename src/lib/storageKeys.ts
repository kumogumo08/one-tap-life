/** AsyncStorage キー（既存キーの文字列自体は互換のため変更しない） */
export const STORAGE_KEYS = {
  settings: 'otl_settings_v1',
  daily: 'otl_daily_v1',
  history: 'otl_history_v1',
  /** Level解放用。UserSettings とは分離（設定保存で消えないようにする） */
  progress: 'otl_progress_v1',
  premium: 'otl_premium_v1',
  /** DEV専用。本番ビルドでは読み書きしない */
  devFamilyPackOverride: 'otl_dev_family_pack_override_v1',
  /** 当日の追加タスク表示セッション。daily.task（メイン）とは分離 */
  extraSession: 'otl_extra_session_v1',
  /** 通知ON/OFFと時刻。UserSettings とは分離（設定保存で消えないようにする） */
  notificationSettings: 'otl_notification_settings_v1',
  /** 直近の抽選タスクID。日またぎ保持。DailyState とは分離（日付変更で消さない） */
  recentTaskIds: 'otl_recent_task_ids_v1',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
