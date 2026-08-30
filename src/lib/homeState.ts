import { isUsableExtraSession, type ExtraSession } from '@/src/lib/extraSession';
import type { DailyState, TaskLevel } from '@/src/types/storage';

/** 無料公開版の1日あたり追加上限。Home の getExtraLimit と揃える */
export const DEFAULT_HOME_EXTRA_LIMIT = 3;

export type HomeState =
  | {
      status: 'idle';
      dateKey: string;
    }
  | {
      status: 'main-active';
      dateKey: string;
      taskId: string | null;
      taskLabel: string;
      taskLevel: TaskLevel;
    }
  | {
      status: 'main-completed';
      dateKey: string;
      taskId: string | null;
      taskLabel: string;
      extraCount: number;
      praise: string;
    }
  | {
      status: 'extra-active';
      dateKey: string;
      mainTaskId: string | null;
      extraTaskId: string | null;
      extraLabel: string;
      extraCount: number;
    }
  | {
      status: 'day-completed';
      dateKey: string;
      extraCount: number;
      /** 最後に表示していた完了タスク */
      taskLabel: string;
      praise: string;
    };

export type HomeStateStatus = HomeState['status'];

function asTaskId(value: string | null | undefined): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function asTaskLevel(value: unknown): TaskLevel {
  return value === 1 || value === 2 || value === 3 ? value : 1;
}

/**
 * DailyState + ExtraSession から今日の Home ドメイン状態を決める。
 * lastTaskId は抽選除外用メタデータであり、status 判定にも current taskId にも使わない。
 * DailyState には現在タスクIDの確実な欄がないため、main の taskId は null（旧データ互換）。
 * Extra の extraTaskId だけ ExtraSession.taskId から取る。
 * 起動経路（通知 / 通常 / foreground）は見ない。
 */
export function resolveHomeState(
  daily: DailyState | null | undefined,
  extra: ExtraSession | null | undefined,
  todayKey: string,
  extraLimit: number = DEFAULT_HOME_EXTRA_LIMIT
): HomeState {
  if (!daily || daily.dateKey !== todayKey) {
    return { status: 'idle', dateKey: todayKey };
  }

  const taskLabel = typeof daily.task === 'string' ? daily.task : '';
  const extraCount =
    typeof daily.extraCount === 'number' && Number.isFinite(daily.extraCount)
      ? Math.max(0, Math.floor(daily.extraCount))
      : 0;
  const todayExtra = isUsableExtraSession(extra ?? null, todayKey)
    ? extra
    : null;
  const savedPraise =
    typeof daily.praise === 'string' && daily.praise.length > 0 ? daily.praise : '';
  const lastCompletedLabel =
    todayExtra?.completed === true && todayExtra.taskLabel
      ? todayExtra.taskLabel
      : taskLabel;

  // 未完了メインが Extra より優先。lastTaskId だけでは main-active にしない。
  if (daily.completed !== true && taskLabel.length > 0) {
    return {
      status: 'main-active',
      dateKey: todayKey,
      taskId: null,
      taskLabel,
      taskLevel: asTaskLevel(daily.taskLevel),
    };
  }

  if (todayExtra && todayExtra.completed !== true) {
    return {
      status: 'extra-active',
      dateKey: todayKey,
      mainTaskId: null,
      extraTaskId: asTaskId(todayExtra.taskId),
      extraLabel: todayExtra.taskLabel,
      extraCount,
    };
  }

  if (daily.completed === true) {
    if (Number.isFinite(extraLimit) && extraCount >= extraLimit) {
      return {
        status: 'day-completed',
        dateKey: todayKey,
        extraCount,
        taskLabel: lastCompletedLabel,
        praise: savedPraise,
      };
    }
    return {
      status: 'main-completed',
      dateKey: todayKey,
      taskId: null,
      taskLabel: lastCompletedLabel,
      extraCount,
      praise: savedPraise,
    };
  }

  return { status: 'idle', dateKey: todayKey };
}

export function canCompleteHome(state: HomeState): boolean {
  return state.status === 'main-active' || state.status === 'extra-active';
}

export function canShowExtraHome(state: HomeState): boolean {
  return state.status === 'main-completed';
}

export function displayedTaskLabel(state: HomeState): string {
  if (state.status === 'main-active' || state.status === 'main-completed') {
    return state.taskLabel;
  }
  if (state.status === 'extra-active') return state.extraLabel;
  if (state.status === 'day-completed') return state.taskLabel;
  return '';
}

export function isCompletedHome(state: HomeState): boolean {
  return state.status === 'main-completed' || state.status === 'day-completed';
}

/** 完了後に残す褒め言葉。未完了中は出さない */
export function displayedPraise(state: HomeState): string {
  if (state.status === 'main-completed' || state.status === 'day-completed') {
    return state.praise;
  }
  return '';
}
