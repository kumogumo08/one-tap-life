import {
  elapsedLocalCalendarDays,
  localCalendarDaysBetween,
} from '@/src/lib/dateKey';
import {
  deriveProgressFromHistory,
  getAvailableTaskLevels,
  getLevelUnlockProgress,
  getUnlockedTaskLevel,
  isLevelUnlocked,
  mergeUserProgress,
} from '@/src/lib/progressCore';
import { normalizeUserProgress } from '@/src/types/progress';
import type { HistoryItem } from '@/src/types/storage';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function item(ts: number): HistoryItem {
  return { id: `id-${ts}`, task: '水をコップ1杯飲む', ts };
}

function run(): void {
  assert(normalizeUserProgress(null).firstCompletedAt === null, 'null -> first null');
  assert(normalizeUserProgress(null).completedCount === 0, 'null -> count 0');
  assert(normalizeUserProgress({ firstCompletedAt: 'x', completedCount: -3 }).completedCount === 0, 'neg count');
  assert(normalizeUserProgress({ firstCompletedAt: 123.9, completedCount: 4.7 }).firstCompletedAt === 123, 'floor first');
  assert(normalizeUserProgress({ firstCompletedAt: 123.9, completedCount: 4.7 }).completedCount === 4, 'floor count');
  assert(normalizeUserProgress({ firstCompletedAt: 0, completedCount: 1 }).firstCompletedAt === null, '0 ts invalid');

  const derivedEmpty = deriveProgressFromHistory([]);
  assert(derivedEmpty.firstCompletedAt === null && derivedEmpty.completedCount === 0, 'empty history');

  const derived = deriveProgressFromHistory([item(3000), item(1000), item(2000)]);
  assert(derived.firstCompletedAt === 1000, 'oldest ts');
  assert(derived.completedCount === 3, 'history length');

  const mergedKeep = mergeUserProgress(
    { firstCompletedAt: 5000, completedCount: 80 },
    { firstCompletedAt: 9000, completedCount: 30 }
  );
  assert(mergedKeep.completedCount === 80, 'keep larger count');
  assert(mergedKeep.firstCompletedAt === 5000, 'keep older first');

  const mergedFill = mergeUserProgress(
    { firstCompletedAt: null, completedCount: 0 },
    { firstCompletedAt: 40 * MS_PER_DAY, completedCount: 45 }
  );
  assert(mergedFill.firstCompletedAt === 40 * MS_PER_DAY, 'backfill first');
  assert(mergedFill.completedCount === 45, 'backfill count');

  const mergedNullHistory = mergeUserProgress(
    { firstCompletedAt: 111, completedCount: 80 },
    { firstCompletedAt: null, completedCount: 0 }
  );
  assert(mergedNullHistory.firstCompletedAt === 111, 'keep saved first when history empty');
  assert(mergedNullHistory.completedCount === 80, 'keep saved count when history empty');

  assert(localCalendarDaysBetween('2026-08-01', '2026-08-08') === 7, 'Aug1 to Aug8 = 7');
  assert(localCalendarDaysBetween('2026-08-01', '2026-08-01') === 0, 'same day');

  const first = new Date(2026, 7, 1, 23, 0, 0).getTime();
  const day8 = new Date(2026, 7, 8, 0, 1, 0).getTime();
  assert(elapsedLocalCalendarDays(first, day8) === 7, 'late night to next week morning = 7');

  const d8 = new Date(2026, 7, 9, 12, 0, 0).getTime();
  const firstAug1 = new Date(2026, 7, 1, 12, 0, 0).getTime();
  const d5 = new Date(2026, 7, 6, 12, 0, 0).getTime();

  assert(
    isLevelUnlocked(2, { firstCompletedAt: firstAug1, completedCount: 6 }, d8) === false,
    'L2: 8 days but count 6'
  );
  assert(
    isLevelUnlocked(2, { firstCompletedAt: firstAug1, completedCount: 10 }, d5) === false,
    'L2: count 10 but 5 days'
  );
  assert(
    isLevelUnlocked(2, { firstCompletedAt: firstAug1, completedCount: 7 }, d8) === true,
    'L2: 8 days and count 7'
  );
  assert(
    isLevelUnlocked(2, { firstCompletedAt: null, completedCount: 99 }, d8) === false,
    'L2: no firstCompletedAt'
  );
  assert(isLevelUnlocked(1, { firstCompletedAt: null, completedCount: 0 }) === true, 'L1 always');

  const d22 = new Date(2026, 7, 23, 12, 0, 0).getTime();
  const d15 = new Date(2026, 7, 16, 12, 0, 0).getTime();

  assert(
    isLevelUnlocked(3, { firstCompletedAt: firstAug1, completedCount: 29 }, d22) === false,
    'L3: 22 days but count 29'
  );
  assert(
    isLevelUnlocked(3, { firstCompletedAt: firstAug1, completedCount: 40 }, d15) === false,
    'L3: count 40 but 15 days'
  );
  assert(
    isLevelUnlocked(3, { firstCompletedAt: firstAug1, completedCount: 30 }, d22) === true,
    'L3: 22 days and count 30'
  );

  assert(getUnlockedTaskLevel({ firstCompletedAt: firstAug1, completedCount: 7 }, d8) === 2, 'unlocked 2');
  assert(getUnlockedTaskLevel({ firstCompletedAt: firstAug1, completedCount: 30 }, d22) === 3, 'unlocked 3');
  assert(getUnlockedTaskLevel({ firstCompletedAt: null, completedCount: 0 }) === 1, 'unlocked 1');

  const d10 = new Date(2026, 7, 11, 12, 0, 0).getTime();
  const d30 = new Date(2026, 7, 31, 12, 0, 0).getTime();

  const zero = { firstCompletedAt: null, completedCount: 0 };
  assert(JSON.stringify(getAvailableTaskLevels(zero)) === JSON.stringify([1]), 'new user only L1');
  assert(isLevelUnlocked(2, { firstCompletedAt: firstAug1, completedCount: 10 }, d5) === false, 'L2 days short');
  assert(isLevelUnlocked(2, { firstCompletedAt: firstAug1, completedCount: 6 }, d10) === false, 'L2 count short');
  assert(isLevelUnlocked(2, { firstCompletedAt: firstAug1, completedCount: 7 }, d10) === true, 'L2 both met');
  assert(
    JSON.stringify(getAvailableTaskLevels({ firstCompletedAt: firstAug1, completedCount: 7 }, d10)) ===
      JSON.stringify([1, 2]),
    'available [1,2]'
  );
  assert(isLevelUnlocked(3, { firstCompletedAt: firstAug1, completedCount: 40 }, d15) === false, 'L3 days short');
  assert(isLevelUnlocked(3, { firstCompletedAt: firstAug1, completedCount: 29 }, d30) === false, 'L3 count short');
  assert(isLevelUnlocked(3, { firstCompletedAt: firstAug1, completedCount: 30 }, d30) === true, 'L3 both met');
  assert(
    JSON.stringify(getAvailableTaskLevels({ firstCompletedAt: firstAug1, completedCount: 30 }, d30)) ===
      JSON.stringify([1, 2, 3]),
    'available [1,2,3]'
  );

  const p2 = getLevelUnlockProgress(2, { firstCompletedAt: firstAug1, completedCount: 4 }, d5);
  assert(p2.unlocked === false, 'progress locked');
  assert(p2.requiredDays === 7 && p2.requiredCompletions === 7, 'L2 thresholds from constants');
  assert(p2.elapsedDays === 5 && p2.remainingDays === 2, 'L2 remaining days');
  assert(p2.completedCount === 4 && p2.remainingCompletions === 3, 'L2 remaining count');

  console.log('progressCore tests passed');
}

run();
