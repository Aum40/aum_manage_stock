const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export type TrendGroupBy = 'day' | 'week' | 'month';

function shiftToBangkok(date: Date): Date {
  return new Date(date.getTime() + BANGKOK_OFFSET_MS);
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function isoDate(shifted: Date): string {
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(
    shifted.getUTCDate(),
  )}`;
}

export function periodKey(date: Date, groupBy: TrendGroupBy): string {
  const shifted = shiftToBangkok(date);

  if (groupBy === 'month') {
    return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}`;
  }

  if (groupBy === 'week') {
    const mondayOffset = (shifted.getUTCDay() + 6) % 7;
    const monday = new Date(shifted.getTime() - mondayOffset * DAY_MS);
    return isoDate(monday);
  }

  return isoDate(shifted);
}

export function listPeriods(
  from: Date,
  to: Date,
  groupBy: TrendGroupBy,
): string[] {
  const periods: string[] = [];
  const seen = new Set<string>();

  for (
    let cursor = from.getTime();
    cursor <= to.getTime() + DAY_MS;
    cursor += DAY_MS
  ) {
    const key = periodKey(new Date(Math.min(cursor, to.getTime())), groupBy);
    if (!seen.has(key)) {
      seen.add(key);
      periods.push(key);
    }
  }

  return periods;
}
