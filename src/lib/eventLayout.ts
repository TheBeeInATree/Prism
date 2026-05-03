/**
 * Standard calendar overlap layout engine.
 *
 * Algorithm (Google/Apple Calendar style):
 *   1. Sort events by start time (longer events first on ties).
 *   2. Greedy column assignment — place each event in the first column
 *      whose last event has already ended.
 *   3. For each event, scan every other event that overlaps with it to
 *      find the maximum column index used concurrently.
 *      totalCols = maxConcurrentCol + 1  →  width = 1/totalCols.
 *   4. Render: left = col/totalCols, width = 1/totalCols.
 *
 * This guarantees overlapping events divide the column width equally
 * and sit side-by-side with no visual overlap.
 */

export interface GridEvent {
  id: string;
  title: string;
  startMinutes: number; // minutes since midnight (local)
  endMinutes: number;
  color: string;
  provider?: string;
  calendar?: string;
  location?: string;
  time?: string;
  description?: string;
  attendees?: string[];
  /** ISO date string (yyyy-MM-dd) of the day this event belongs to */
  sourceDate?: string;
}

export interface PositionedEvent extends GridEvent {
  col: number;       // 0-indexed slot within the concurrent group
  totalCols: number; // total concurrent columns for this event's time window
}

export function layoutDayEvents(events: GridEvent[]): PositionedEvent[] {
  if (events.length === 0) return [];

  // ── Step 1: sort ──────────────────────────────────────────────────────────
  const sorted = [...events].sort((a, b) =>
    a.startMinutes !== b.startMinutes
      ? a.startMinutes - b.startMinutes   // earlier start first
      : b.endMinutes - a.endMinutes       // longer event first on tie
  );

  // ── Step 2: greedy column assignment ─────────────────────────────────────
  // colEndAt[i] = the minute at which the last event placed in column i ends.
  const colEndAt: number[] = [];
  const colOf = new Map<string, number>();

  for (const event of sorted) {
    // Find the leftmost column that is free (ended) by the time this event starts.
    const freeCol = colEndAt.findIndex((end) => end <= event.startMinutes);

    if (freeCol !== -1) {
      colEndAt[freeCol] = event.endMinutes;
      colOf.set(event.id, freeCol);
    } else {
      // All existing columns are busy — open a new one.
      colOf.set(event.id, colEndAt.length);
      colEndAt.push(event.endMinutes);
    }
  }

  // ── Step 3: compute totalCols per event ───────────────────────────────────
  // For event E, scan every other event that overlaps with E's time window.
  // The concurrent column count = max column index seen + 1.
  // Using Math.max over all overlapping columns (including E itself)
  // gives a consistent width within the same visual cluster.
  return sorted.map((event) => {
    let maxCol = colOf.get(event.id)!;

    for (const other of sorted) {
      // Two events overlap when neither ends before the other starts.
      if (
        other.startMinutes < event.endMinutes &&
        other.endMinutes   > event.startMinutes
      ) {
        const otherCol = colOf.get(other.id)!;
        if (otherCol > maxCol) maxCol = otherCol;
      }
    }

    return {
      ...event,
      col:       colOf.get(event.id)!,
      totalCols: maxCol + 1,
    };
  });
}

// ── Utility helpers ───────────────────────────────────────────────────────────

/** Convert a fractional hour (e.g. 9.5 = 9:30 AM) to minutes since midnight. */
export function hourToMinutes(hour: number): number {
  return Math.round(hour * 60);
}

/** Format minutes-since-midnight as "h:mm AM/PM". */
export function minutesToTimeStr(minutes: number): string {
  const totalMins = Math.max(0, Math.min(minutes, 24 * 60 - 1));
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  const ampm = h < 12 ? "AM" : "PM";
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:${String(m).padStart(2, "0")} ${ampm}`;
}
