import {
  canRecordExtraCompletion,
  canRecordMainCompletion,
  decideHomeRestoreKind,
  extraCompletionKey,
  resolveColdStartHomeTask,
  resolveDisplayedTaskAfterHomeRestore,
  resolveHomeRestoreView,
  resolveExtraInProgressForRestore,
  shouldKeepCompletedExtraTask,
  shouldKeepCompletedMainTask,
  shouldKeepIncompleteMainTask,
  shouldPersistMainCompleted,
  shouldPickTaskOnHomeRestore,
} from '@/src/lib/homeRestore';
import { isUsableExtraSession, normalizeExtraSession } from '@/src/lib/extraSession';
import {
  canCompleteHome,
  canShowExtraHome,
  displayedPraise,
  displayedTaskLabel,
  resolveHomeState,
  type HomeState,
} from '@/src/lib/homeState';
import type { DailyState } from '@/src/types/storage';

function emptyDaily(dateKey: string): DailyState {
  return {
    dateKey,
    task: '',
    completed: false,
    extraCount: 0,
    lastTaskId: null,
  };
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function run(): void {
  // 1. 未完了追加 → 設定 → 戻る → 完了ボタン維持
  assert(
    decideHomeRestoreKind({
      savedCompleted: true,
      savedHasTask: true,
      extraInProgress: true,
    }) === 'incomplete-extra',
    '未完了追加は incomplete-extra'
  );

  // 2. 未完了追加 → レベル変更 → 完了ボタン維持（判定は extraInProgress）
  assert(
    decideHomeRestoreKind({
      savedCompleted: true,
      savedHasTask: true,
      extraInProgress: true,
    }) === 'incomplete-extra',
    'レベル変更しても extraInProgress なら incomplete-extra'
  );

  // 3. 追加完了後 → 設定 → 戻る → 完了ボタン復活しない
  assert(
    decideHomeRestoreKind({
      savedCompleted: true,
      savedHasTask: true,
      extraInProgress: false,
    }) === 'completed-main',
    '追加完了後は completed-main'
  );

  // currentIsExtra が残っていても未完了扱いしない（回帰防止）
  assert(
    decideHomeRestoreKind({
      savedCompleted: true,
      savedHasTask: true,
      extraInProgress: false,
    }) === 'completed-main',
    'extraInProgress=false なら currentIsExtra 残留でも completed-main'
  );

  assert(
    decideHomeRestoreKind({
      savedCompleted: false,
      savedHasTask: true,
      extraInProgress: false,
    }) === 'incomplete-main',
    '未完了メインは incomplete-main'
  );

  // 1-3. 未完了メインはレベルが変わっても保存タスクを維持
  assert(
    shouldKeepIncompleteMainTask({ savedCompleted: false, savedHasTask: true }) === true,
    'メイン未完了は保存タスクを維持'
  );
  assert(
    shouldKeepIncompleteMainTask({ savedCompleted: true, savedHasTask: true }) === false,
    'メイン完了済みは keep しない'
  );
  assert(
    shouldKeepIncompleteMainTask({ savedCompleted: false, savedHasTask: false }) === false,
    '未抽選なら keep しない（次回新規は新レベル）'
  );

  assert(
    decideHomeRestoreKind({
      savedCompleted: false,
      savedHasTask: false,
      extraInProgress: false,
    }) === 'empty',
    'タスクなしは empty'
  );

  // 5. メインタスク完了 → 再完了できない
  assert(canRecordMainCompletion(false) === true, '未完了メインは記録可');
  assert(canRecordMainCompletion(true) === false, '完了済みメインは記録不可');

  // 4 / 6. 追加完了後の再完了・二重登録防止
  const key = extraCompletionKey('ストレッチ', 'task-1');
  assert(
    canRecordExtraCompletion({
      extraInProgress: true,
      lastFinishedKey: null,
      currentKey: key,
    }) === true,
    '未完了追加は記録可'
  );
  assert(
    canRecordExtraCompletion({
      extraInProgress: false,
      lastFinishedKey: key,
      currentKey: key,
    }) === false,
    '完了後 extraInProgress=false なら記録不可'
  );
  assert(
    canRecordExtraCompletion({
      extraInProgress: true,
      lastFinishedKey: key,
      currentKey: key,
    }) === false,
    '同一 extra key の再完了は記録不可'
  );
  assert(
    canRecordExtraCompletion({
      extraInProgress: true,
      lastFinishedKey: key,
      currentKey: extraCompletionKey('別タスク', 'task-2'),
    }) === true,
    '新しい追加セッションは記録可'
  );

  // --- メイン完了直後 + レベル変更（今回のバグ） ---
  const completedMainKeep = shouldKeepCompletedMainTask({
    savedCompleted: true,
    savedHasTask: true,
    extraInProgress: false,
  });
  assert(completedMainKeep === true, '完了済みメインは keep');
  assert(
    shouldKeepCompletedMainTask({
      savedCompleted: true,
      savedHasTask: true,
      extraInProgress: true,
    }) === false,
    '未完了追加中は completed-main keep しない'
  );

  assert(
    shouldPickTaskOnHomeRestore({
      extraInProgress: false,
      savedHasTask: true,
      savedCompleted: true,
      memoryHasTask: true,
      memoryCompleted: true,
      savedTaskLevel: 1,
      selectedLevel: 2,
    }) === false,
    '完了済み + レベル不一致でもホーム復帰では pick しない'
  );
  assert(
    shouldPickTaskOnHomeRestore({
      extraInProgress: false,
      savedHasTask: true,
      savedCompleted: false,
      memoryHasTask: true,
      memoryCompleted: true,
      savedTaskLevel: 1,
      selectedLevel: 2,
    }) === false,
    '完了直後 storage 未反映 + レベル不一致でも pick しない'
  );
  assert(
    shouldPickTaskOnHomeRestore({
      extraInProgress: false,
      savedHasTask: true,
      savedCompleted: true,
      memoryHasTask: true,
      memoryCompleted: true,
      savedTaskLevel: 2,
      selectedLevel: 3,
    }) === false,
    '2回目のレベル変更でも pick しない'
  );

  // 完了直後: memory は completed、storage はまだ未完了
  assert(
    decideHomeRestoreKind({
      savedCompleted: true,
      savedHasTask: true,
      extraInProgress: false,
    }) === 'completed-main',
    'memory 優先で completed 扱いなら completed-main'
  );
  assert(
    resolveDisplayedTaskAfterHomeRestore({
      extraInProgress: false,
      extraLabel: '',
      memoryCompleted: true,
      memoryTask: '水をコップ1杯飲む',
      savedCompleted: false,
      savedTask: '水をコップ1杯飲む',
    }) === '水をコップ1杯飲む',
    '完了直後の未反映 storage でも同じメインを維持'
  );
  assert(
    resolveDisplayedTaskAfterHomeRestore({
      extraInProgress: false,
      extraLabel: '',
      memoryCompleted: true,
      memoryTask: '水をコップ1杯飲む',
      savedCompleted: true,
      savedTask: 'スクワット10回',
    }) === '水をコップ1杯飲む',
    'storage が別タスクでも完了済み memory を優先（1回目だけ変わるのを防ぐ）'
  );
  assert(
    resolveDisplayedTaskAfterHomeRestore({
      extraInProgress: false,
      extraLabel: '',
      memoryCompleted: true,
      memoryTask: '水をコップ1杯飲む',
      savedCompleted: true,
      savedTask: '水をコップ1杯飲む',
    }) === '水をコップ1杯飲む',
    '2回目の復帰でも完了タスク維持'
  );
  assert(
    resolveDisplayedTaskAfterHomeRestore({
      extraInProgress: false,
      extraLabel: '',
      memoryCompleted: false,
      memoryTask: '',
      savedCompleted: true,
      savedTask: '水をコップ1杯飲む',
    }) === '水をコップ1杯飲む',
    'remount 後は storage の完了タスクを表示（再抽選しない）'
  );

  // 未完了メイン / 未完了追加は既存どおり固定
  assert(
    resolveDisplayedTaskAfterHomeRestore({
      extraInProgress: false,
      extraLabel: '',
      memoryCompleted: false,
      memoryTask: '肩回し10回',
      savedCompleted: false,
      savedTask: '肩回し10回',
    }) === '肩回し10回',
    '未完了メインは保存タスク維持'
  );
  assert(
    resolveDisplayedTaskAfterHomeRestore({
      extraInProgress: true,
      extraLabel: '追加のストレッチ',
      memoryCompleted: true,
      memoryTask: '水をコップ1杯飲む',
      savedCompleted: true,
      savedTask: '水をコップ1杯飲む',
    }) === '追加のストレッチ',
    '未完了追加は extra ラベル維持'
  );

  // --- 追加完了直後 + レベル変更 ---
  assert(
    shouldKeepCompletedExtraTask({
      extraInProgress: false,
      hasFinishedExtraKey: true,
      extraLabel: '追加のストレッチ',
    }) === true,
    '追加完了後は完了済み追加ラベルを維持'
  );
  assert(
    shouldKeepCompletedExtraTask({
      extraInProgress: true,
      hasFinishedExtraKey: false,
      extraLabel: '追加のストレッチ',
    }) === false,
    '未完了追加は completed-extra keep しない'
  );
  assert(
    shouldKeepCompletedExtraTask({
      extraInProgress: false,
      hasFinishedExtraKey: false,
      extraLabel: '追加のストレッチ',
    }) === false,
    '完了キーなしは completed-extra keep しない'
  );

  assert(
    decideHomeRestoreKind({
      savedCompleted: true,
      savedHasTask: true,
      extraInProgress: false,
    }) === 'completed-main',
    '追加完了後の復帰は completed-main（未完了追加として復元しない）'
  );
  assert(
    resolveDisplayedTaskAfterHomeRestore({
      extraInProgress: false,
      extraLabel: '追加のストレッチ',
      completedExtraLabel: '追加のストレッチ',
      memoryCompleted: true,
      memoryTask: '水をコップ1杯飲む',
      savedCompleted: true,
      savedTask: '水をコップ1杯飲む',
    }) === '追加のストレッチ',
    '追加完了 → レベル変更 → 表示は完了した追加のまま'
  );
  assert(
    resolveDisplayedTaskAfterHomeRestore({
      extraInProgress: false,
      extraLabel: '追加のストレッチ',
      completedExtraLabel: '追加のストレッチ',
      memoryCompleted: true,
      memoryTask: '水をコップ1杯飲む',
      savedCompleted: true,
      savedTask: '水をコップ1杯飲む',
    }) === '追加のストレッチ',
    '追加完了後のレベル変更を繰り返しても追加ラベル維持'
  );
  assert(
    shouldPickTaskOnHomeRestore({
      extraInProgress: false,
      savedHasTask: true,
      savedCompleted: true,
      memoryHasTask: true,
      memoryCompleted: true,
      savedTaskLevel: 1,
      selectedLevel: 2,
    }) === false,
    '追加完了後のホーム復帰でも pick しない'
  );
  assert(
    canRecordExtraCompletion({
      extraInProgress: false,
      lastFinishedKey: extraCompletionKey('追加のストレッチ', 'task-1'),
      currentKey: extraCompletionKey('追加のストレッチ', 'task-1'),
    }) === false,
    '追加完了後は完了ボタン復活・二重登録なし'
  );
  assert(
    resolveExtraInProgressForRestore({
      extraInProgress: true,
      hasFinishedExtraKey: true,
    }) === false,
    'stale extraInProgress でも完了キーがあれば未完了扱いにしない'
  );
  assert(
    resolveExtraInProgressForRestore({
      extraInProgress: true,
      hasFinishedExtraKey: false,
    }) === true,
    '未完了追加は extraInProgress を維持'
  );

  // --- cold start（アプリ完全再起動） ---
  const CALF = 'ふくらはぎ伸ばし 左右15秒';
  const MAIN = '水をコップ1杯飲む';

  const coldIncomplete = resolveColdStartHomeTask({
    savedTask: MAIN,
    savedCompleted: false,
    lastTaskId: 'lv2-calf-stretch-30s',
  });
  assert(coldIncomplete.kind === 'incomplete-main', '未完了メイン cold start は incomplete-main');
  assert(coldIncomplete.task === MAIN, '未完了メイン cold start は保存タスク');

  const coldCompleted = resolveColdStartHomeTask({
    savedTask: MAIN,
    savedCompleted: true,
    lastTaskId: 'lv2-calf-stretch-30s',
  });
  assert(coldCompleted.kind === 'completed-main', 'メイン完了 cold start は completed-main');
  assert(coldCompleted.task === MAIN, 'メイン完了 cold start は完了したメインタスク');
  assert(coldCompleted.task !== CALF, 'lastTaskId のふくらはぎ伸ばしは表示に使わない');

  const coldExtraDone = resolveColdStartHomeTask({
    savedTask: MAIN,
    savedCompleted: true,
    lastTaskId: 'lv2-calf-stretch-30s',
  });
  assert(
    coldExtraDone.task === MAIN,
    'extraSession が無い cold start は完了済みメインへ戻す'
  );

  const coldEmpty = resolveColdStartHomeTask({
    savedTask: '',
    savedCompleted: true,
    lastTaskId: 'lv2-calf-stretch-30s',
  });
  assert(coldEmpty.kind === 'empty', 'task が空なら empty');
  assert(coldEmpty.task === '', '空のときふくらはぎ伸ばしを fallback しない');
  assert(coldEmpty.task !== CALF, 'ふくらはぎ伸ばしは fallback ではない');

  assert(
    shouldPickTaskOnHomeRestore({
      extraInProgress: false,
      savedHasTask: true,
      savedCompleted: true,
      memoryHasTask: false,
      memoryCompleted: false,
      savedTaskLevel: 1,
      selectedLevel: 2,
    }) === false,
    'cold start でも pickTask しない'
  );
  assert(
    canRecordMainCompletion(true) === false,
    'メイン完了 → 再起動後も再完了・履歴二重登録不可'
  );

  // セッション中の追加未完了は既存どおり
  assert(
    resolveDisplayedTaskAfterHomeRestore({
      extraInProgress: true,
      extraLabel: CALF,
      memoryCompleted: true,
      memoryTask: MAIN,
      savedCompleted: true,
      savedTask: MAIN,
    }) === CALF,
    '追加未完了（プロセス生存中）は同じ追加を維持'
  );

  // --- extraSession 永続化 ---
  const extraIncomplete = normalizeExtraSession({
    dateKey: '2026-08-28',
    taskId: 'lv2-glute-bridge-25',
    taskLabel: 'ヒップリフト 25回',
    completed: false,
  });
  assert(extraIncomplete != null, 'extraSession を正規化できる');
  assert(
    isUsableExtraSession(extraIncomplete, '2026-08-28') === true,
    '当日の extraSession は利用可'
  );
  assert(
    isUsableExtraSession(extraIncomplete, '2026-08-29') === false,
    '前日の extraSession は翌日復元しない'
  );
  assert(
    decideHomeRestoreKind({
      savedCompleted: true,
      savedHasTask: true,
      extraInProgress: false,
      extraSessionUsable: true,
      extraSessionCompleted: false,
    }) === 'incomplete-extra',
    '追加未完了 extraSession → 再起動で incomplete-extra'
  );
  assert(
    decideHomeRestoreKind({
      savedCompleted: true,
      savedHasTask: true,
      extraInProgress: false,
      extraSessionUsable: true,
      extraSessionCompleted: true,
    }) === 'completed-extra',
    '追加完了 extraSession → 再起動で completed-extra'
  );
  assert(
    decideHomeRestoreKind({
      savedCompleted: false,
      savedHasTask: true,
      extraInProgress: false,
    }) === 'incomplete-main',
    'メイン未完了 → incomplete-main（完了ボタンあり）'
  );
  assert(
    decideHomeRestoreKind({
      savedCompleted: true,
      savedHasTask: true,
      extraInProgress: false,
    }) === 'completed-main',
    'メイン完了 → completed-main（完了ボタンなし）'
  );

  const extraKey = extraCompletionKey('ヒップリフト 25回', 'lv2-glute-bridge-25');
  assert(
    canRecordExtraCompletion({
      extraInProgress: true,
      lastFinishedKey: null,
      currentKey: extraKey,
    }) === true,
    '追加未完了復元後は完了できる'
  );
  assert(
    canRecordExtraCompletion({
      extraInProgress: false,
      lastFinishedKey: extraKey,
      currentKey: extraKey,
    }) === false,
    '追加完了 → 再起動後も再完了・履歴二重登録不可'
  );
  assert(
    resolveDisplayedTaskAfterHomeRestore({
      extraInProgress: false,
      extraLabel: '',
      completedExtraLabel: 'ヒップリフト 25回',
      memoryCompleted: true,
      memoryTask: MAIN,
      savedCompleted: true,
      savedTask: MAIN,
    }) === 'ヒップリフト 25回',
    'lastTaskId が別でも extraSession のラベルを表示'
  );
  assert(
    shouldPickTaskOnHomeRestore({
      extraInProgress: false,
      savedHasTask: true,
      savedCompleted: true,
      memoryHasTask: false,
      memoryCompleted: false,
    }) === false,
    'extraSession 復元でも pickTask しない'
  );
  assert(
    decideHomeRestoreKind({
      savedCompleted: true,
      savedHasTask: true,
      extraInProgress: true,
      extraSessionUsable: true,
      extraSessionCompleted: false,
    }) === 'incomplete-extra',
    '未完了追加 → レベル変更しても incomplete-extra'
  );
  assert(
    decideHomeRestoreKind({
      savedCompleted: true,
      savedHasTask: true,
      extraInProgress: false,
      extraSessionUsable: true,
      extraSessionCompleted: true,
    }) === 'completed-extra',
    '完了済み追加 → レベル変更しても completed-extra'
  );
  assert(
    resolveExtraInProgressForRestore({
      extraInProgress: true,
      hasFinishedExtraKey: false,
      extraSessionCompleted: true,
    }) === false,
    'extraSession.completed なら stale extraInProgress を落とす'
  );

  // --- 回帰: 未完了メインを画面遷移で消費しない ---
  const EXTRA = 'ヒップリフト 25回';

  // ケース1: 起動 → メイン未完了 → 設定 → ホーム → 同じ未完了メイン
  const case1Kind = decideHomeRestoreKind({
    savedCompleted: false,
    savedHasTask: true,
    extraInProgress: false,
    hasFinishedExtraKey: true,
    extraSessionUsable: true,
    extraSessionCompleted: false,
  });
  assert(case1Kind === 'incomplete-main', 'ケース1: 設定復帰でも incomplete-main');
  assert(
    shouldKeepIncompleteMainTask({ savedCompleted: false, savedHasTask: true }) === true,
    'ケース1: 未完了メインを維持'
  );
  assert(
    shouldPersistMainCompleted({ savedCompleted: false, memoryCompleted: false }) === false,
    'ケース1: 永続完了にはしない'
  );
  assert(
    resolveDisplayedTaskAfterHomeRestore({
      extraInProgress: false,
      extraLabel: '',
      memoryCompleted: false,
      memoryTask: MAIN,
      savedCompleted: false,
      savedTask: MAIN,
    }) === MAIN,
    'ケース1: 同じメインタスクを表示'
  );
  assert(
    shouldPickTaskOnHomeRestore({
      extraInProgress: false,
      savedHasTask: true,
      savedCompleted: false,
      memoryHasTask: true,
      memoryCompleted: false,
    }) === false,
    'ケース1: 設定復帰で再抽選しない'
  );

  // stale extra 完了キーがあっても未完了メインを completed-main にしない
  assert(
    decideHomeRestoreKind({
      savedCompleted: false,
      savedHasTask: true,
      extraInProgress: false,
      hasFinishedExtraKey: true,
    }) === 'incomplete-main',
    'stale lastFinishedExtraKey で未完了メインを消費しない'
  );
  assert(
    decideHomeRestoreKind({
      savedCompleted: false,
      savedHasTask: true,
      extraInProgress: true,
    }) === 'incomplete-main',
    'stale extraInProgress で未完了メインを追加扱いにしない'
  );

  // ケース2: 起動 → メイン完了 → 設定 → ホーム → 完了済み維持
  const case2Kind = decideHomeRestoreKind({
    savedCompleted: true,
    savedHasTask: true,
    extraInProgress: false,
  });
  assert(case2Kind === 'completed-main', 'ケース2: 完了済みが維持される');
  assert(
    shouldKeepCompletedMainTask({
      savedCompleted: true,
      savedHasTask: true,
      extraInProgress: false,
    }) === true,
    'ケース2: 完了済みメイン keep'
  );
  assert(
    shouldPersistMainCompleted({ savedCompleted: true, memoryCompleted: false }) === true,
    'ケース2: 永続完了を維持'
  );
  assert(canRecordMainCompletion(true) === false, 'ケース2: 再完了できない');
  assert(
    shouldKeepIncompleteMainTask({ savedCompleted: true, savedHasTask: true }) === false,
    'ケース2: 未完了として復活しない'
  );

  // ケース3: メイン完了 → 追加表示 → 設定 → ホーム → メインは未完了に戻らない
  const case3Kind = decideHomeRestoreKind({
    savedCompleted: true,
    savedHasTask: true,
    extraInProgress: true,
    extraSessionUsable: true,
    extraSessionCompleted: false,
  });
  assert(case3Kind === 'incomplete-extra', 'ケース3: 追加表示中は incomplete-extra');
  assert(
    shouldKeepIncompleteMainTask({ savedCompleted: true, savedHasTask: true }) === false,
    'ケース3: メインを未完了として復活しない'
  );
  assert(
    resolveDisplayedTaskAfterHomeRestore({
      extraInProgress: true,
      extraLabel: EXTRA,
      memoryCompleted: true,
      memoryTask: MAIN,
      savedCompleted: true,
      savedTask: MAIN,
    }) === EXTRA,
    'ケース3: 追加タスクのまま表示'
  );
  assert(
    shouldPersistMainCompleted({ savedCompleted: true, memoryCompleted: true }) === true,
    'ケース3: メイン完了は維持'
  );

  // ケース4: cold start → 今日未完了 → 保存済み未完了メインを復元
  const case4 = resolveColdStartHomeTask({
    savedTask: MAIN,
    savedCompleted: false,
    lastTaskId: 'lv2-calf-stretch-30s',
  });
  assert(case4.kind === 'incomplete-main', 'ケース4: cold start は incomplete-main');
  assert(case4.task === MAIN, 'ケース4: 保存済み未完了メインを復元');
  assert(case4.task !== CALF, 'ケース4: lastTaskId を表示に使わない');
  assert(
    shouldPersistMainCompleted({ savedCompleted: false }) === false,
    'ケース4: cold start でも未完了のまま'
  );
  assert(
    shouldPickTaskOnHomeRestore({
      extraInProgress: false,
      savedHasTask: true,
      savedCompleted: false,
      memoryHasTask: false,
      memoryCompleted: false,
    }) === false,
    'ケース4: cold start で再抽選しない'
  );

  // --- 通知 cold start / 通常起動 / foreground で同じ表示ルール ---
  const lastOnly = resolveHomeRestoreView({
    savedTask: '',
    savedCompleted: false,
    lastTaskId: 'lv2-calf-stretch-30s',
    hasSessionMemory: false,
  });
  assert(lastOnly.task === '', '通知起動だけでは新しいタスクを表示しない');
  assert(lastOnly.canComplete === false, '未完了なしなら完了不可');
  assert(lastOnly.phase === 'idle', '未実施はワンタップ待ち');
  assert(lastOnly.kind === 'empty', '未実施の kind は empty');
  assert(lastOnly.task !== CALF, '通知起動でも lastTaskId を表示に使用しない');

  const notifIncomplete = resolveHomeRestoreView({
    savedTask: MAIN,
    savedCompleted: false,
    lastTaskId: 'lv2-calf-stretch-30s',
    hasSessionMemory: false,
  });
  assert(notifIncomplete.task === MAIN, '通知起動でも保存済み未完了メインを復元');
  assert(notifIncomplete.canComplete === true, '復元された未完了メインでは完了可能');
  assert(notifIncomplete.phase === 'showTask', '未完了メインは表示する');
  assert(notifIncomplete.task !== CALF, '通知起動でも lastTaskId を表示に使用しない');

  const notifCompleted = resolveHomeRestoreView({
    savedTask: MAIN,
    savedCompleted: true,
    lastTaskId: 'lv2-calf-stretch-30s',
    hasSessionMemory: false,
  });
  assert(
    notifCompleted.kind === 'completed-main',
    '完了済み cold start は idle ではなく completed-main'
  );
  assert(notifCompleted.canComplete === false, '完了済みメインは再完了できない');
  assert(notifCompleted.task === '', '完了済みタスクを未完了として再表示しない');
  assert(notifCompleted.phase === 'completed', '完了済みは completed 専用 Home');
  assert(
    lastOnly.kind !== notifCompleted.kind,
    '未実施と完了済みを同じ Home 状態にしない'
  );
  assert(
    lastOnly.phase !== notifCompleted.phase,
    '未実施の idle と完了済みの completed を混ぜない'
  );

  const sessionCompleted = resolveHomeRestoreView({
    savedTask: MAIN,
    savedCompleted: true,
    lastTaskId: 'lv2-calf-stretch-30s',
    hasSessionMemory: true,
  });
  assert(sessionCompleted.kind === 'completed-main', 'セッション中も completed-main');
  assert(sessionCompleted.phase === 'completed', 'セッション中も完了済み専用 Home');
  assert(sessionCompleted.task === '', 'セッション中も未完了としては再表示しない');
  assert(sessionCompleted.canComplete === false, 'セッション中の完了済みは完了不可');

  const notifIncompleteExtra = resolveHomeRestoreView({
    savedTask: MAIN,
    savedCompleted: true,
    lastTaskId: 'lv2-calf-stretch-30s',
    extraInProgress: false,
    extraSessionUsable: true,
    extraSessionCompleted: false,
    extraLabel: EXTRA,
    hasSessionMemory: false,
  });
  assert(notifIncompleteExtra.task === EXTRA, '通知起動でも未完了追加は復元');
  assert(notifIncompleteExtra.canComplete === true, '未完了追加は完了可能');

  const notifCompletedExtra = resolveHomeRestoreView({
    savedTask: MAIN,
    savedCompleted: true,
    lastTaskId: 'lv2-calf-stretch-30s',
    extraSessionUsable: true,
    extraSessionCompleted: true,
    extraLabel: EXTRA,
    hasSessionMemory: false,
  });
  assert(notifCompletedExtra.kind === 'completed-extra', '完了済み追加の kind を維持');
  assert(notifCompletedExtra.phase === 'completed', '完了済み追加も completed Home');
  assert(notifCompletedExtra.task === '', '通知起動の完了済み追加は新規表示しない');
  assert(notifCompletedExtra.canComplete === false, '完了済み追加 cold start は完了不可');

  // --- resolveHomeState（Daily + Extra → HomeState） ---
  const TODAY = '2026-08-30';
  const YESTERDAY = '2026-08-29';
  const extraLimit = 3;

  const idle = resolveHomeState(emptyDaily(TODAY), null, TODAY, extraLimit);
  assert(idle.status === 'idle', '今日未実施 → idle');
  assert(canCompleteHome(idle) === false, 'idle は完了不可');
  assert(canShowExtraHome(idle) === false, 'idle は追加なし');
  assert(displayedTaskLabel(idle) === '', 'idle はタスクなし');

  const lastIdOnly = resolveHomeState(
    { ...emptyDaily(TODAY), lastTaskId: 'lv2-calf-stretch-30s' },
    null,
    TODAY,
    extraLimit
  );
  assert(lastIdOnly.status === 'idle', 'lastTaskId だけなら idle');
  assert(displayedTaskLabel(lastIdOnly) === '', 'lastTaskId は表示に使わない');

  const mainActive = resolveHomeState(
    {
      ...emptyDaily(TODAY),
      task: MAIN,
      completed: false,
      lastTaskId: 'drink-water',
      taskLevel: 1,
    },
    null,
    TODAY,
    extraLimit
  );
  assert(mainActive.status === 'main-active', 'メイン未完了 → main-active');
  assert(mainActive.status === 'main-active' && mainActive.taskLabel === MAIN, '保存ラベル');
  assert(
    mainActive.status === 'main-active' && mainActive.taskId === null,
    'lastTaskId を current taskId にしない'
  );
  assert(canCompleteHome(mainActive) === true, 'main-active → canComplete');
  assert(canShowExtraHome(mainActive) === false, 'main-active は追加なし');
  assert(displayedTaskLabel(mainActive) === MAIN, 'main-active の表示はメインタスク');

  const mainDone = resolveHomeState(
    {
      ...emptyDaily(TODAY),
      task: MAIN,
      completed: true,
      extraCount: 0,
      lastTaskId: 'lv2-calf-stretch-30s',
    },
    null,
    TODAY,
    extraLimit
  );
  assert(mainDone.status === 'main-completed', 'メイン完了 → main-completed');
  assert(
    mainDone.status === 'main-completed' && mainDone.taskId === null,
    '完了済みでも lastTaskId を current taskId にしない'
  );
  assert(canCompleteHome(mainDone) === false, 'main-completed → 完了不可');
  assert(canShowExtraHome(mainDone) === true, 'main-completed → もう1つやる');
  assert(displayedTaskLabel(mainDone) === MAIN, 'main-completed は taskLabel を保持');
  assert(
    mainDone.status === 'main-completed' && mainDone.taskLabel === MAIN,
    '再起動後も同じ taskLabel'
  );

  const extraActive = resolveHomeState(
    {
      ...emptyDaily(TODAY),
      task: MAIN,
      completed: true,
      extraCount: 1,
      lastTaskId: 'lv2-glute-bridge-25',
    },
    {
      dateKey: TODAY,
      taskId: 'lv2-glute-bridge-25',
      taskLabel: EXTRA,
      completed: false,
    },
    TODAY,
    extraLimit
  );
  assert(extraActive.status === 'extra-active', 'Extra未完了 → extra-active');
  assert(
    extraActive.status === 'extra-active' && extraActive.extraTaskId === 'lv2-glute-bridge-25',
    'Extra の taskId は ExtraSession から取る'
  );
  assert(
    extraActive.status === 'extra-active' && extraActive.mainTaskId === null,
    'extra-active の mainTaskId に lastTaskId を入れない'
  );
  assert(canCompleteHome(extraActive) === true, 'extra-active → canComplete');
  assert(canShowExtraHome(extraActive) === false, 'extra-active は追加ボタンなし');
  assert(displayedTaskLabel(extraActive) === EXTRA, 'extra-active の表示は Extra');

  const dayDone = resolveHomeState(
    {
      ...emptyDaily(TODAY),
      task: MAIN,
      completed: true,
      extraCount: 3,
    },
    {
      dateKey: TODAY,
      taskId: 'done-extra',
      taskLabel: EXTRA,
      completed: true,
    },
    TODAY,
    extraLimit
  );
  assert(dayDone.status === 'day-completed', '上限到達 → day-completed');
  assert(canCompleteHome(dayDone) === false, 'day-completed → 完了不可');
  assert(canShowExtraHome(dayDone) === false, 'day-completed はもう1つやるなし');
  assert(displayedTaskLabel(dayDone) === EXTRA, 'day-completed は最後に完了した Extra を表示');

  const notifSame = resolveHomeState(
    {
      ...emptyDaily(TODAY),
      task: MAIN,
      completed: true,
      extraCount: 0,
    },
    null,
    TODAY,
    extraLimit
  );
  const coldSame = resolveHomeState(
    {
      ...emptyDaily(TODAY),
      task: MAIN,
      completed: true,
      extraCount: 0,
    },
    null,
    TODAY,
    extraLimit
  );
  assert(notifSame.status === coldSame.status, '通知起動相当でも同じ HomeState');
  assert(notifSame.status === 'main-completed', '起動経路に依存しない');
  assert(displayedTaskLabel(notifSame) === MAIN, '通知起動でも main-completed の taskLabel を維持');
  assert(displayedTaskLabel(coldSame) === MAIN, 'cold start でも main-completed の taskLabel を維持');

  const rolled = resolveHomeState(
    {
      ...emptyDaily(YESTERDAY),
      task: MAIN,
      completed: true,
      lastTaskId: 'drink-water',
    },
    {
      dateKey: YESTERDAY,
      taskId: 'old-extra',
      taskLabel: EXTRA,
      completed: false,
    },
    TODAY,
    extraLimit
  );
  assert(rolled.status === 'idle', '日付違い → idle');
  assert(displayedTaskLabel(rolled) === '', '前日タスクは出さない');

  const incompleteBeatsExtra = resolveHomeState(
    {
      ...emptyDaily(TODAY),
      task: MAIN,
      completed: false,
    },
    {
      dateKey: TODAY,
      taskId: 'stale-extra',
      taskLabel: EXTRA,
      completed: false,
    },
    TODAY,
    extraLimit
  );
  assert(incompleteBeatsExtra.status === 'main-active', '未完了メインは Extra より優先');

  // --- 同じ保存データなら経路によらず同じ HomeState ---
  function sameHome(a: HomeState, b: HomeState): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  const PRAISE = 'やればできるじゃん！';

  // A. タップ前 → 再起動 / 通知 / foreground / 設定戻り
  const idleSaved = emptyDaily(TODAY);
  const idleCold = resolveHomeState(idleSaved, null, TODAY, extraLimit);
  const idleNotif = resolveHomeState(idleSaved, null, TODAY, extraLimit);
  const idleFg = resolveHomeState(idleSaved, null, TODAY, extraLimit);
  const idleSettings = resolveHomeState(idleSaved, null, TODAY, extraLimit);
  assert(idleCold.status === 'idle', 'A: タップ前は idle');
  assert(sameHome(idleCold, idleNotif), 'A: 通知起動でも同じ idle');
  assert(sameHome(idleCold, idleFg), 'A: foreground でも同じ idle');
  assert(sameHome(idleCold, idleSettings), 'A: 設定戻りでも同じ idle');
  assert(displayedTaskLabel(idleCold) === '', 'A: タップ前はタスクなし');
  assert(displayedPraise(idleCold) === '', 'A: タップ前は褒め言葉なし');

  // B / C. main-active → 再起動 / 設定 → Home
  const mainActiveSaved = {
    ...emptyDaily(TODAY),
    task: MAIN,
    completed: false,
    lastTaskId: 'drink-water',
    taskLevel: 1 as const,
  };
  const mainActiveCold = resolveHomeState(mainActiveSaved, null, TODAY, extraLimit);
  const mainActiveSettings = resolveHomeState(mainActiveSaved, null, TODAY, extraLimit);
  assert(mainActiveCold.status === 'main-active', 'B: 再起動後も main-active');
  assert(
    mainActiveCold.status === 'main-active' && mainActiveCold.taskLabel === MAIN,
    'B: 同じメインタスク'
  );
  assert(sameHome(mainActiveCold, mainActiveSettings), 'C: 設定戻りでも同じ main-active');
  assert(canCompleteHome(mainActiveCold) === true, 'B: 完了ボタン維持');
  assert(displayedPraise(mainActiveCold) === '', 'B: 未完了中は褒め言葉なし');

  // D / E. main-completed → 再起動 / 通知起動
  const mainCompletedSaved = {
    ...emptyDaily(TODAY),
    task: MAIN,
    completed: true,
    extraCount: 0,
    lastTaskId: 'drink-water',
    praise: PRAISE,
  };
  const mainCompletedCold = resolveHomeState(mainCompletedSaved, null, TODAY, extraLimit);
  const mainCompletedNotif = resolveHomeState(mainCompletedSaved, null, TODAY, extraLimit);
  const mainCompletedFg = resolveHomeState(mainCompletedSaved, null, TODAY, extraLimit);
  const mainCompletedSettings = resolveHomeState(mainCompletedSaved, null, TODAY, extraLimit);
  assert(mainCompletedCold.status === 'main-completed', 'D: 再起動後も main-completed');
  assert(displayedTaskLabel(mainCompletedCold) === MAIN, 'D: 完了したタスク文言を維持');
  assert(displayedPraise(mainCompletedCold) === PRAISE, 'D: 褒め言葉を維持');
  assert(canShowExtraHome(mainCompletedCold) === true, 'D: Extra ボタンを維持');
  assert(canCompleteHome(mainCompletedCold) === false, 'D: 完了ボタンは出さない');
  assert(sameHome(mainCompletedCold, mainCompletedNotif), 'E: 通知起動でも D と同じ');
  assert(sameHome(mainCompletedCold, mainCompletedFg), 'D: foreground でも同じ');
  assert(sameHome(mainCompletedCold, mainCompletedSettings), 'D: 設定戻りでも同じ');

  const oldCompletedNoPraise = resolveHomeState(
    {
      ...emptyDaily(TODAY),
      task: MAIN,
      completed: true,
      extraCount: 0,
    },
    null,
    TODAY,
    extraLimit
  );
  assert(
    oldCompletedNoPraise.status === 'main-completed' &&
      oldCompletedNoPraise.praise === '',
    '旧データに praise が無くても main-completed は維持（褒め言葉だけ空）'
  );

  // F. extra-active → 再起動
  const extraActiveSavedDaily = {
    ...emptyDaily(TODAY),
    task: MAIN,
    completed: true,
    extraCount: 0,
    praise: PRAISE,
  };
  const extraActiveSavedSession = {
    dateKey: TODAY,
    taskId: 'lv2-glute-bridge-25',
    taskLabel: EXTRA,
    completed: false,
  };
  const extraActiveCold = resolveHomeState(
    extraActiveSavedDaily,
    extraActiveSavedSession,
    TODAY,
    extraLimit
  );
  const extraActiveNotif = resolveHomeState(
    extraActiveSavedDaily,
    extraActiveSavedSession,
    TODAY,
    extraLimit
  );
  assert(extraActiveCold.status === 'extra-active', 'F: 再起動後も extra-active');
  assert(displayedTaskLabel(extraActiveCold) === EXTRA, 'F: 同じ Extra を維持');
  assert(canCompleteHome(extraActiveCold) === true, 'F: Extra 完了ボタン維持');
  assert(displayedPraise(extraActiveCold) === '', 'F: Extra 途中は褒め言葉を出さない');
  assert(sameHome(extraActiveCold, extraActiveNotif), 'F: 通知起動でも同じ Extra');

  const extraCompletedSaved = {
    dateKey: TODAY,
    taskId: 'lv2-glute-bridge-25',
    taskLabel: EXTRA,
    completed: true,
  };
  const extraCompletedHome = resolveHomeState(
    {
      ...emptyDaily(TODAY),
      task: MAIN,
      completed: true,
      extraCount: 1,
      praise: PRAISE,
    },
    extraCompletedSaved,
    TODAY,
    extraLimit
  );
  assert(extraCompletedHome.status === 'main-completed', 'Extra 完了後は completed Home');
  assert(displayedTaskLabel(extraCompletedHome) === EXTRA, 'Extra 完了後は Extra 文言を維持');
  assert(displayedPraise(extraCompletedHome) === PRAISE, 'Extra 完了後も褒め言葉を維持');
  assert(canShowExtraHome(extraCompletedHome) === true, 'Extra 完了後も Extra ボタン');

  // G. 日付が変わったときのみ idle
  const nextDay = resolveHomeState(mainCompletedSaved, extraActiveSavedSession, '2026-08-31', extraLimit);
  assert(nextDay.status === 'idle', 'G: 日付変更のみ idle');
  assert(displayedTaskLabel(nextDay) === '', 'G: 前日タスクは出さない');
  assert(displayedPraise(nextDay) === '', 'G: 前日褒め言葉は出さない');
  assert(
    resolveHomeState(mainCompletedSaved, null, TODAY, extraLimit).status === 'main-completed',
    'G: 同じ日なら completed のまま'
  );

  console.log('homeRestore tests passed');
}

run();
