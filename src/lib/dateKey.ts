const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** 端末ローカルの暦日キー "YYYY-MM-DD" */
export function dateKeyLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseDateKeyLocal(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  return new Date(year, month - 1, day);
}

/**
 * ローカル日付キー同士の暦日差。
 * 両端をローカル 0:00 にしてから日数化し、DST の 23h/25h を Math.round で吸収する。
 */
export function localCalendarDaysBetween(fromKey: string, toKey: string): number {
  const from = parseDateKeyLocal(fromKey);
  const to = parseDateKeyLocal(toKey);
  if (from == null || to == null) return 0;
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

/** firstCompletedAt から now までのローカル暦日差 */
export function elapsedLocalCalendarDays(fromTs: number, nowTs: number): number {
  if (!Number.isFinite(fromTs) || !Number.isFinite(nowTs) || fromTs <= 0) return 0;
  return localCalendarDaysBetween(
    dateKeyLocal(new Date(fromTs)),
    dateKeyLocal(new Date(nowTs))
  );
}
