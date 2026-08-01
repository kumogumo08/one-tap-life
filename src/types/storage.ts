import type { TaskLevel } from '@/src/types/task';

export type { TaskLevel };

export type PraiseStyle = 'gal' | 'serious';

export type UserSettings = {
  praiseStyle: PraiseStyle;
  level: TaskLevel;
};

export type DailyState = {
  dateKey: string; // "YYYY-MM-DD"
  task: string; // 今日の確定タスク（表示ラベル）
  completed: boolean;
  completedTs?: number;
  extraCount?: number;
  lastTaskId?: string | null;
};

export type HistoryItem = {
  id: string;
  task: string;
  ts: number;
  isExtra?: boolean;
  /** 新規保存分のみ。古い履歴には存在しない */
  taskId?: string;
};

/** 公開版でタスク抽選に使えるレベル。将来ここに 2, 3 を足す */
export const AVAILABLE_TASK_LEVELS: TaskLevel[] = [1];

export const DEFAULT_USER_SETTINGS: UserSettings = {
  praiseStyle: 'gal',
  level: 1,
};

export const DEFAULT_DAILY_STATE = (dateKey: string): DailyState => ({
  dateKey,
  task: '',
  completed: false,
  extraCount: 0,
  lastTaskId: null,
});

export function isPraiseStyle(value: unknown): value is PraiseStyle {
  return value === 'gal' || value === 'serious';
}

export function normalizeTaskLevel(value: unknown): TaskLevel {
  return value === 1 || value === 2 || value === 3 ? value : 1;
}

export function normalizeAvailableLevel(level: unknown): TaskLevel {
  const lv = normalizeTaskLevel(level);
  return AVAILABLE_TASK_LEVELS.includes(lv) ? lv : 1;
}

export function normalizeUserSettings(value: unknown): UserSettings {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_USER_SETTINGS };
  }

  const raw = value as Record<string, unknown>;

  return {
    praiseStyle: isPraiseStyle(raw.praiseStyle) ? raw.praiseStyle : DEFAULT_USER_SETTINGS.praiseStyle,
    // 保存上の level は 1|2|3 を許容（将来解放時に好みを残す）。抽選は normalizeAvailableLevel を使う
    level: normalizeTaskLevel(raw.level),
  };
}

export function normalizeDailyState(value: unknown, todayKey: string): DailyState {
  if (!value || typeof value !== 'object') {
    return DEFAULT_DAILY_STATE(todayKey);
  }

  const raw = value as Record<string, unknown>;
  const dateKey = typeof raw.dateKey === 'string' && raw.dateKey.length > 0 ? raw.dateKey : todayKey;
  const task = typeof raw.task === 'string' ? raw.task : '';
  const completed = raw.completed === true;
  const completedTs = typeof raw.completedTs === 'number' ? raw.completedTs : undefined;
  const extraCount = typeof raw.extraCount === 'number' && Number.isFinite(raw.extraCount)
    ? Math.max(0, Math.floor(raw.extraCount))
    : 0;
  const lastTaskId =
    typeof raw.lastTaskId === 'string'
      ? raw.lastTaskId
      : raw.lastTaskId === null
        ? null
        : null;

  return {
    dateKey,
    task,
    completed,
    completedTs,
    extraCount,
    lastTaskId,
  };
}

export function normalizeHistoryItem(value: unknown): HistoryItem | null {
  if (!value || typeof value !== 'object') return null;

  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== 'string' || typeof raw.task !== 'string' || typeof raw.ts !== 'number') {
    return null;
  }

  const item: HistoryItem = {
    id: raw.id,
    task: raw.task,
    ts: raw.ts,
  };

  if (raw.isExtra === true) item.isExtra = true;
  if (typeof raw.taskId === 'string' && raw.taskId.length > 0) item.taskId = raw.taskId;

  return item;
}

export function normalizeHistoryList(value: unknown): HistoryItem[] {
  if (!Array.isArray(value)) return [];
  const list: HistoryItem[] = [];
  for (const entry of value) {
    const item = normalizeHistoryItem(entry);
    if (item) list.push(item);
  }
  return list;
}
