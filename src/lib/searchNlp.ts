import * as chrono from "chrono-node";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addMonths,
  addDays,
} from "date-fns";

export interface SearchIntent {
  keywords: string[];
  dateRange?: { start: Date; end: Date };
  rawDateLabel?: string;
}

const FILLER = new Set([
  "show", "me", "find", "search", "get", "list", "look", "for",
  "all", "my", "the", "a", "an", "any", "some",
  "events", "event", "meetings", "meeting", "appointment", "appointments",
  "scheduled", "happening", "on", "in", "at", "from", "to", "with",
  "and", "or", "is", "are", "have", "has", "do", "does", "what",
  "calendar", "upcoming", "next", "this", "week", "month", "today",
  "tomorrow", "yesterday",
]);

export function parseSearchIntent(raw: string): SearchIntent {
  if (!raw.trim()) return { keywords: [] };

  const now = new Date();
  const lower = raw.toLowerCase().trim();
  let textWithoutDate = raw;
  let dateRange: { start: Date; end: Date } | undefined;
  let rawDateLabel: string | undefined;

  if (/\bnext\s+week\b/.test(lower)) {
    const ws = startOfWeek(addDays(now, 7), { weekStartsOn: 0 });
    dateRange = { start: ws, end: endOfWeek(ws, { weekStartsOn: 0 }) };
    rawDateLabel = "next week";
    textWithoutDate = raw.replace(/next\s+week/gi, "");
  } else if (/\bthis\s+week\b/.test(lower)) {
    dateRange = {
      start: startOfWeek(now, { weekStartsOn: 0 }),
      end: endOfWeek(now, { weekStartsOn: 0 }),
    };
    rawDateLabel = "this week";
    textWithoutDate = raw.replace(/this\s+week/gi, "");
  } else if (/\bnext\s+month\b/.test(lower)) {
    const nm = addMonths(now, 1);
    dateRange = { start: startOfMonth(nm), end: endOfMonth(nm) };
    rawDateLabel = "next month";
    textWithoutDate = raw.replace(/next\s+month/gi, "");
  } else if (/\bthis\s+month\b/.test(lower)) {
    dateRange = { start: startOfMonth(now), end: endOfMonth(now) };
    rawDateLabel = "this month";
    textWithoutDate = raw.replace(/this\s+month/gi, "");
  } else if (/\btoday\b/.test(lower)) {
    dateRange = { start: startOfDay(now), end: endOfDay(now) };
    rawDateLabel = "today";
    textWithoutDate = raw.replace(/\btoday\b/gi, "");
  } else if (/\btomorrow\b/.test(lower)) {
    const tom = addDays(now, 1);
    dateRange = { start: startOfDay(tom), end: endOfDay(tom) };
    rawDateLabel = "tomorrow";
    textWithoutDate = raw.replace(/\btomorrow\b/gi, "");
  } else if (/\byesterday\b/.test(lower)) {
    const yest = addDays(now, -1);
    dateRange = { start: startOfDay(yest), end: endOfDay(yest) };
    rawDateLabel = "yesterday";
    textWithoutDate = raw.replace(/\byesterday\b/gi, "");
  } else {
    const chronoResults = chrono.parse(raw, now, { forwardDate: false });
    if (chronoResults.length > 0) {
      const hit = chronoResults[0];
      const start = startOfDay(hit.start.date());
      const end = hit.end ? endOfDay(hit.end.date()) : endOfDay(hit.start.date());
      dateRange = { start, end };
      rawDateLabel = hit.text;
      textWithoutDate =
        raw.slice(0, hit.index) + raw.slice(hit.index + hit.text.length);
    }
  }

  const keywords = textWithoutDate
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !FILLER.has(w));

  return { keywords, dateRange, rawDateLabel };
}
