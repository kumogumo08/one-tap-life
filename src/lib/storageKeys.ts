/** AsyncStorage キー（文字列自体は既存互換のため変更しない） */
export const STORAGE_KEYS = {
  settings: 'otl_settings_v1',
  daily: 'otl_daily_v1',
  history: 'otl_history_v1',
  premium: 'otl_premium_v1',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
