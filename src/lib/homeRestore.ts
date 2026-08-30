/**
 * ホーム復帰時に、保存済み daily と「追加タスクが未完了か」から
 * どの復元経路へ進むかを決める。UI の setState は含めない。
 *
 * extra の未完了判定は extraInProgress のみ。
 * currentIsExtra は完了後も残ることがあるため、復元条件に使わない。
 *
 * 今日のメイン未完了（savedCompleted !== true）は extra / lastTaskId /
 * 完了キーより優先する。画面遷移だけでメインを消費扱いにしない。
 */
export type HomeRestoreKind =
  | 'incomplete-main'
  | 'incomplete-extra'
  | 'completed-extra'
  | 'completed-main'
  | 'empty';

export function decideHomeRestoreKind(input: {
  savedCompleted: boolean;
  savedHasTask: boolean;
  extraInProgress: boolean;
  extraSessionUsable?: boolean;
  extraSessionCompleted?: boolean;
  hasFinishedExtraKey?: boolean;
}): HomeRestoreKind {
  // DailyState.completed が source of truth。
  // stale extraInProgress / extraSession / lastFinishedExtraKey で
  // 未完了メインを追加・完了済みへ落としてはいけない。
  if (input.savedCompleted !== true && input.savedHasTask) {
    return 'incomplete-main';
  }

  const extraUsable = input.extraSessionUsable === true;
  const extraCompleted = extraUsable && input.extraSessionCompleted === true;
  const extraFinished = extraCompleted || input.hasFinishedExtraKey === true;

  if (
    (input.extraInProgress || (extraUsable && !extraCompleted)) &&
    !extraFinished
  ) {
    return 'incomplete-extra';
  }

  if (extraFinished && (extraUsable || input.hasFinishedExtraKey === true)) {
    return extraUsable ? 'completed-extra' : 'completed-main';
  }

  if (input.savedCompleted === true && input.savedHasTask) {
    return 'completed-main';
  }

  return 'empty';
}

/**
 * 完了済みメインとして永続化してよいか。
 * lastTaskId や extra 一時フラグだけでは true にしない。
 */
export function shouldPersistMainCompleted(input: {
  savedCompleted: boolean;
  memoryCompleted?: boolean;
}): boolean {
  return input.savedCompleted === true || input.memoryCompleted === true;
}

/** 未完了メインはレベル変更しても再抽選せず、保存済み daily.task を維持する */
export function shouldKeepIncompleteMainTask(input: {
  savedCompleted: boolean;
  savedHasTask: boolean;
}): boolean {
  return input.savedCompleted !== true && input.savedHasTask;
}

/** 完了済みメインはレベル変更しても再抽選せず、完了したタスクを維持する */
export function shouldKeepCompletedMainTask(input: {
  savedCompleted: boolean;
  savedHasTask: boolean;
  extraInProgress: boolean;
}): boolean {
  return input.savedCompleted === true && input.savedHasTask && !input.extraInProgress;
}

/**
 * 完了済み追加は未完了として復元しない。
 * extraInProgress が false で、完了キーと表示ラベルが残っているとき。
 */
export function shouldKeepCompletedExtraTask(input: {
  extraInProgress: boolean;
  hasFinishedExtraKey: boolean;
  extraLabel: string;
}): boolean {
  return (
    input.extraInProgress !== true &&
    input.hasFinishedExtraKey &&
    input.extraLabel.length > 0
  );
}

/** 完了キーがある追加は、stale extraInProgress でも未完了扱いにしない */
export function resolveExtraInProgressForRestore(input: {
  extraInProgress: boolean;
  hasFinishedExtraKey: boolean;
  extraSessionCompleted?: boolean;
}): boolean {
  if (input.hasFinishedExtraKey) return false;
  if (input.extraSessionCompleted === true) return false;
  return input.extraInProgress === true;
}

/**
 * ホーム復帰では抽選しない。
 * レベル不一致・完了直後の storage 遅延があっても pickTask しない。
 * 新規抽選は onTap / onExtraTap / 日付変更のみ。
 */
export function shouldPickTaskOnHomeRestore(_input: {
  extraInProgress: boolean;
  savedHasTask: boolean;
  savedCompleted: boolean;
  memoryHasTask: boolean;
  memoryCompleted: boolean;
  savedTaskLevel?: number;
  selectedLevel?: number;
}): boolean {
  return false;
}

/**
 * 完了直後は memory（画面）が先に completed になり、
 * storage は履歴保存待ちで未完了のまま読める。
 * その場合は memory の完了タスクを優先し、storage の別タスクで上書きしない。
 */
export function resolveDisplayedTaskAfterHomeRestore(input: {
  extraInProgress: boolean;
  extraLabel: string;
  completedExtraLabel?: string;
  memoryCompleted: boolean;
  memoryTask: string;
  savedCompleted: boolean;
  savedTask: string;
}): string {
  if (input.extraInProgress && input.extraLabel) {
    return input.extraLabel;
  }
  if (
    shouldKeepCompletedExtraTask({
      extraInProgress: input.extraInProgress,
      hasFinishedExtraKey: !!input.completedExtraLabel,
      extraLabel: input.completedExtraLabel ?? '',
    })
  ) {
    return input.completedExtraLabel ?? '';
  }
  if (input.memoryCompleted && input.memoryTask) {
    return input.memoryTask;
  }
  if (input.savedTask) {
    return input.savedTask;
  }
  return input.memoryTask;
}

/**
 * アプリ完全再起動（cold start）。extra の memory / lastTaskId は使わない。
 * lastTaskId は追加抽選の直前 ID であり、完了済み追加のラベルではない。
 * 固定フォールバック（ふくらはぎ伸ばし等）や pickTask は使わない。
 *
 * 保存済みタスクの識別用。画面に出すかは resolveHomeRestoreView が決める。
 */
export function resolveColdStartHomeTask(input: {
  savedTask: string;
  savedCompleted: boolean;
  /** 追加の直前 ID。cold start の表示には使わない */
  lastTaskId?: string | null;
}): { task: string; kind: 'completed-main' | 'incomplete-main' | 'empty' } {
  void input.lastTaskId;
  const task = typeof input.savedTask === 'string' ? input.savedTask : '';
  if (!task) {
    return { task: '', kind: 'empty' };
  }
  if (input.savedCompleted === true) {
    return { task, kind: 'completed-main' };
  }
  return { task, kind: 'incomplete-main' };
}

/** Home 中央の表示状態。idle と completed は別物 */
export type HomeRestorePhase = 'idle' | 'showTask' | 'completed';

export type HomeRestoreView = {
  kind: HomeRestoreKind;
  task: string;
  canComplete: boolean;
  phase: HomeRestorePhase;
  extraInProgress: boolean;
  currentIsExtra: boolean;
};

/**
 * 通常起動 / 通知 cold start / foreground 復帰で共通の表示決定。
 * lastTaskId は表示に使わない。pickTask もしない。
 *
 * idle = 今日まだ未実施（ワンタップ待ち）
 * showTask = 未完了タスクを表示（完了ボタンあり）
 * completed = 今日のメインは達成済み（完了ボタンなし・タスクは未完了として出さない）
 */
export function resolveHomeRestoreView(input: {
  savedTask: string;
  savedCompleted: boolean;
  lastTaskId?: string | null;
  extraInProgress?: boolean;
  extraSessionUsable?: boolean;
  extraSessionCompleted?: boolean;
  extraLabel?: string;
  hasFinishedExtraKey?: boolean;
  savedHasTask?: boolean;
  /** 互換のため残す。完了済み表示はセッション有無で変えない */
  hasSessionMemory?: boolean;
}): HomeRestoreView {
  void input.lastTaskId;
  void input.hasSessionMemory;
  const savedTask = typeof input.savedTask === 'string' ? input.savedTask : '';
  const extraLabel = typeof input.extraLabel === 'string' ? input.extraLabel : '';
  const savedHasTask = input.savedHasTask ?? savedTask.length > 0;

  const kind = decideHomeRestoreKind({
    savedCompleted: input.savedCompleted === true,
    savedHasTask,
    extraInProgress: input.extraInProgress === true,
    extraSessionUsable: input.extraSessionUsable,
    extraSessionCompleted: input.extraSessionCompleted,
    hasFinishedExtraKey: input.hasFinishedExtraKey,
  });

  if (kind === 'incomplete-main' && savedTask) {
    return {
      kind,
      task: savedTask,
      canComplete: true,
      phase: 'showTask',
      extraInProgress: false,
      currentIsExtra: false,
    };
  }

  if (kind === 'incomplete-extra' && extraLabel) {
    return {
      kind,
      task: extraLabel,
      canComplete: true,
      phase: 'showTask',
      extraInProgress: true,
      currentIsExtra: true,
    };
  }

  if (kind === 'completed-extra' || kind === 'completed-main') {
    return {
      kind,
      task: '',
      canComplete: false,
      phase: 'completed',
      extraInProgress: false,
      currentIsExtra: false,
    };
  }

  return {
    kind: 'empty',
    task: '',
    canComplete: false,
    phase: 'idle',
    extraInProgress: false,
    currentIsExtra: false,
  };
}

export function extraCompletionKey(
  task: string,
  lastTaskId: string | null | undefined
): string {
  return `${lastTaskId ?? ''}:${task}`;
}

/** メインタスク完了を履歴に書いてよいか */
export function canRecordMainCompletion(dailyCompleted: boolean): boolean {
  return dailyCompleted !== true;
}

/** 追加タスク完了を履歴に書いてよいか（未完了セッションかつ同一キー未完了） */
export function canRecordExtraCompletion(input: {
  extraInProgress: boolean;
  lastFinishedKey: string | null;
  currentKey: string;
}): boolean {
  if (!input.extraInProgress) return false;
  if (input.lastFinishedKey !== null && input.lastFinishedKey === input.currentKey) {
    return false;
  }
  return true;
}
