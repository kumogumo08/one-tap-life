/**
 * 直近3件除外と pickTask フォールバックの検証。
 * 実行: npx tsx scripts/verify-recent-task-ids.ts
 */
import { TASKS } from '@/src/data/tasks';
import {
  shouldPickTaskOnHomeRestore,
  resolveColdStartHomeTask,
} from '@/src/lib/homeRestore';
import { pickTask, resolvePickTaskCandidates } from '@/src/lib/pickTask';
import {
  RECENT_TASK_IDS_MAX,
  appendRecentTaskId,
  normalizeRecentTaskIds,
} from '@/src/lib/recentTaskIds';
import { STORAGE_KEYS } from '@/src/lib/storageKeys';
import type { Task } from '@/src/types/task';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function withMockedRandom<T>(values: number[], fn: () => T): T {
  const original = Math.random;
  let i = 0;
  Math.random = () => {
    const v = values[Math.min(i, values.length - 1)] ?? 0;
    i += 1;
    return v;
  };
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}

function fake(id: string): Task {
  return { id, label: id, level: 1, kind: 'rest' };
}

function run(): void {
  // 1. 最大3件
  assert(RECENT_TASK_IDS_MAX === 3, 'max is 3');
  const three = appendRecentTaskId(
    appendRecentTaskId(appendRecentTaskId([], 'task-a'), 'task-b'),
    'task-c'
  );
  assert(three.length === 3, '3件まで保持');
  assert(three.join(',') === 'task-a,task-b,task-c', '古い → 新しい');

  // 2. 4件目で最古が落ちる
  const four = appendRecentTaskId(three, 'task-d');
  assert(four.length === 3, '4件目でも3件');
  assert(four.join(',') === 'task-b,task-c,task-d', '最古 task-a が落ちる');

  // 3. 重複IDが入らない（末尾へ移動）
  const dup = appendRecentTaskId(four, 'task-b');
  assert(dup.length === 3, '重複しても3件');
  assert(dup.join(',') === 'task-c,task-d,task-b', '既存IDは末尾へ');
  assert(new Set(dup).size === dup.length, '重複なし');

  // 4. 不正保存値の正規化
  assert(normalizeRecentTaskIds(null).join(',') === '', 'null → []');
  assert(normalizeRecentTaskIds(undefined).join(',') === '', 'undefined → []');
  assert(normalizeRecentTaskIds('task-a').join(',') === '', '非配列 → []');
  assert(normalizeRecentTaskIds({ ids: ['a'] }).join(',') === '', 'オブジェクト → []');
  assert(
    normalizeRecentTaskIds(['ok', 1, null, '', 'ok', 'two', 'three', 'four']).join(',') ===
      'two,three,four',
    '非文字列・空・重複を捨て、新しい3件を残す'
  );
  assert(
    normalizeRecentTaskIds(['a', 'b', 'c', 'd']).join(',') === 'b,c,d',
    '4件以上は末尾3件'
  );

  // 5. 直近3件が通常抽選候補から除外される
  const lv1Rest = TASKS.filter((t) => t.level === 1 && t.kind === 'rest');
  const excluded = [lv1Rest[0].id, lv1Rest[1].id, lv1Rest[2].id];
  const restPicked = withMockedRandom([0.95, 0], () => pickTask(1, null, excluded));
  assert(!excluded.includes(restPicked.id), '直近3件は rest バケットから除外');
  assert(restPicked.id === lv1Rest[3].id, '除外後の先頭が選ばれる');

  // 6. lastTaskId も引き続き除外される
  const lastId = lv1Rest[3].id;
  const lastPicked = withMockedRandom([0.95, 0], () => pickTask(1, lastId, excluded));
  assert(lastPicked.id !== lastId, 'lastTaskId も除外');
  assert(!excluded.includes(lastPicked.id), 'recent も除外');
  assert(lastPicked.id === lv1Rest[4].id, 'recent+last の次が選ばれる');

  // 7. 候補0件時に条件を緩める
  const stage2 = resolvePickTaskCandidates(
    [fake('a'), fake('b')],
    [fake('a'), fake('b'), fake('c')],
    'a',
    ['a', 'b']
  );
  assert(stage2.map((t) => t.id).join(',') === 'b', '第2段階: lastId のみ除外');

  const stage3 = resolvePickTaskCandidates(
    [fake('a')],
    [fake('a'), fake('b')],
    'a',
    ['a']
  );
  assert(stage3.map((t) => t.id).join(',') === 'a', '第3段階: バケット全件');

  const stage4 = resolvePickTaskCandidates([], [fake('a'), fake('b')], 'a', []);
  assert(stage4.map((t) => t.id).join(',') === 'b', '第4段階: 全TASKSから lastId 除外');

  const stage5 = resolvePickTaskCandidates([], [fake('a')], 'a', []);
  assert(stage5.map((t) => t.id).join(',') === 'a', '第5段階: 全件');

  // 8. homeRestore では再抽選しない
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
    'homeRestore は pickTask しない'
  );

  // 9. cold start では recentTaskIds を表示復元に使わない
  const MAIN = '水をコップ1杯飲む';
  const cold = resolveColdStartHomeTask({
    savedTask: MAIN,
    savedCompleted: false,
    lastTaskId: 'drink-water',
  });
  assert(cold.task === MAIN, 'cold start は saved.task のみ');
  assert(cold.kind === 'incomplete-main', 'cold start は incomplete-main');

  // 10. 日付変更でも recentTaskIds は別キーで保持される
  assert(
    STORAGE_KEYS.recentTaskIds === 'otl_recent_task_ids_v1',
    'recentTaskIds は専用キー'
  );
  assert(
    STORAGE_KEYS.daily === 'otl_daily_v1',
    'daily は別キーのまま'
  );
  assert(
    STORAGE_KEYS.extraSession === 'otl_extra_session_v1',
    'extraSession は別キーのまま'
  );
  const kept = appendRecentTaskId(appendRecentTaskId(['task-a'], 'task-b'), 'task-c');
  assert(kept.join(',') === 'task-a,task-b,task-c', 'daily リセット後も recent は独立して残る');

  // 11. Level 変更で存在しないIDがあっても問題ない
  const otherLevelIds = ['drink-water', 'neck-stretch', 'emotion-label'];
  const lv2MoveStretch = TASKS.filter(
    (t) => t.level === 2 && (t.kind === 'move' || t.kind === 'stretch')
  );
  const lv2All = TASKS.filter((t) => t.level === 2);
  const lv2Candidates = resolvePickTaskCandidates(
    lv2MoveStretch,
    lv2All,
    null,
    otherLevelIds
  );
  assert(
    lv2Candidates.length === lv2MoveStretch.length,
    '別LevelのIDは候補数を減らさない'
  );
  const lv2Picked = withMockedRandom([0, 0], () => pickTask(2, null, otherLevelIds));
  assert(lv2Picked.id.length > 0, '別Levelの除外IDでも抽選できる');
  assert(
    TASKS.some((t) => t.level === 2 && t.id === lv2Picked.id),
    'Lv2 のタスクが返る'
  );

  console.log('recentTaskIds tests passed');
}

run();
