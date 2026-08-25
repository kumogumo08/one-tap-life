import { DEFAULT_CHARACTER_ID, isCharacterId } from '@/src/data/characters';
import { ensureOwnedCharacterId } from '@/src/lib/characterAccess';
import type { CharacterId } from '@/src/types/character';
import type { TaskLevel } from '@/src/types/task';

export type { TaskLevel };

/** 旧設定互換用。主データは selectedCharacterId */
export type PraiseStyle = 'gal' | 'serious';

export type UserSettings = {
  selectedCharacterId: CharacterId;
  /** @deprecated 旧データ互換。新規保存時は selectedCharacterId と同期 */
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
  /** 今日のメインタスクのレベル。旧データには無い */
  taskLevel?: TaskLevel;
};

export type HistoryItem = {
  id: string;
  task: string;
  ts: number;
  isExtra?: boolean;
  /** 新規保存分のみ。古い履歴には存在しない */
  taskId?: string;
};

export type { UserProgress } from '@/src/types/progress';
export { DEFAULT_USER_PROGRESS, normalizeUserProgress } from '@/src/types/progress';

/** 全タスクレベル。実際の利用可否は getAvailableTaskLevels(progress) */
export const ALL_TASK_LEVELS: TaskLevel[] = [1, 2, 3];

export const DEFAULT_USER_SETTINGS: UserSettings = {
  selectedCharacterId: DEFAULT_CHARACTER_ID,
  praiseStyle: 'gal',
  level: 1,
};

function praiseStyleFromCharacterId(id: CharacterId): PraiseStyle {
  // 互換同期用：無料2キャラはそのまま、有料はデフォルト系に寄せる
  return id === 'serious' ? 'serious' : 'gal';
}

function characterIdFromLegacyPraiseStyle(value: unknown): CharacterId {
  if (value === 'serious') return 'serious';
  if (value === 'gal') return 'gal';
  return DEFAULT_CHARACTER_ID;
}

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

export function normalizeAvailableLevel(
  level: unknown,
  availableLevels: readonly TaskLevel[]
): TaskLevel {
  const lv = normalizeTaskLevel(level);
  return availableLevels.includes(lv) ? lv : 1;
}

export function normalizeUserSettings(value: unknown): UserSettings {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_USER_SETTINGS };
  }

  const raw = value as Record<string, unknown>;

  let candidateId: CharacterId;
  if (isCharacterId(raw.selectedCharacterId)) {
    candidateId = raw.selectedCharacterId;
  } else {
    candidateId = characterIdFromLegacyPraiseStyle(raw.praiseStyle);
  }

  // 未購入の有料キャラが保存されていても無料デフォルトへ
  const selectedCharacterId = ensureOwnedCharacterId(candidateId);
  const praiseStyle = isPraiseStyle(raw.praiseStyle)
    ? raw.praiseStyle
    : praiseStyleFromCharacterId(selectedCharacterId);

  return {
    selectedCharacterId,
    praiseStyle,
    // 保存上の level は 1|2|3 を許容。抽選・表示は getAvailableTaskLevels 後に normalizeAvailableLevel
    level: normalizeTaskLevel(raw.level),
  };
}

/** 新規保存用。selectedCharacterId を主にし、praiseStyle も同期 */
export function toSavableUserSettings(
  settings: Pick<UserSettings, 'selectedCharacterId' | 'level'> & {
    praiseStyle?: PraiseStyle;
  }
): UserSettings {
  const selectedCharacterId = ensureOwnedCharacterId(settings.selectedCharacterId);
  return {
    selectedCharacterId,
    praiseStyle: settings.praiseStyle ?? praiseStyleFromCharacterId(selectedCharacterId),
    level: normalizeTaskLevel(settings.level),
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
  const taskLevel =
    raw.taskLevel === 1 || raw.taskLevel === 2 || raw.taskLevel === 3
      ? raw.taskLevel
      : undefined;

  return {
    dateKey,
    task,
    completed,
    completedTs,
    extraCount,
    lastTaskId,
    taskLevel,
  };
}

export function normalizeHistoryItem(value: unknown): HistoryItem | null {
  if (!value || typeof value !== 'object') return null;

  const raw = value as Record<string, unknown>;
  if (
    typeof raw.id !== 'string' ||
    typeof raw.task !== 'string' ||
    typeof raw.ts !== 'number' ||
    !Number.isFinite(raw.ts)
  ) {
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
