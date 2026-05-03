import * as chrono from "chrono-node";
import { format, addHours } from "date-fns";

// ─── Web Speech API type shim ────────────────────────────────────────────────

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

export interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
}

export interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

export interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

export interface SpeechRecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}

// ─── Recurrence ───────────────────────────────────────────────────────────────

export interface Recurrence {
  freq: "daily" | "weekly" | "monthly" | "yearly";
  days?: number[]; // 0=Sun … 6=Sat (weekly only)
  interval?: number; // defaults to 1
}

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DAY_MAP: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseRecurrence(raw: string): { recurrence: Recurrence; stripped: string } | null {
  const lower = raw.toLowerCase();

  // "every weekday"
  if (/every\s+weekday/.test(lower)) {
    return {
      recurrence: { freq: "weekly", days: [1, 2, 3, 4, 5] },
      stripped: raw.replace(/every\s+weekday/gi, "").replace(/\s+/g, " ").trim(),
    };
  }

  // "every weekend"
  if (/every\s+weekend/.test(lower)) {
    return {
      recurrence: { freq: "weekly", days: [0, 6] },
      stripped: raw.replace(/every\s+weekend/gi, "").replace(/\s+/g, " ").trim(),
    };
  }

  // "every N days/weeks/months/years"
  const intervalMatch = lower.match(/every\s+(\d+)\s+(day|week|month|year)s?/);
  if (intervalMatch) {
    const interval = parseInt(intervalMatch[1]);
    const freqMap: Record<string, Recurrence["freq"]> = {
      day: "daily", week: "weekly", month: "monthly", year: "yearly",
    };
    const freq = freqMap[intervalMatch[2]];
    return {
      recurrence: { freq, ...(interval > 1 && { interval }) },
      stripped: raw
        .replace(new RegExp(`every\\s+${intervalMatch[1]}\\s+${intervalMatch[2]}s?`, "gi"), "")
        .replace(/\s+/g, " ").trim(),
    };
  }

  // "every <day>[, <day>, ...]" — longest names first to avoid partial matches
  const dayKeys = Object.keys(DAY_MAP).sort((a, b) => b.length - a.length);
  const dayPattern = dayKeys.join("|");
  const everyDayRe = new RegExp(
    `every\\s+((?:(?:${dayPattern})(?:\\s*(?:and|,)\\s*)?)+)`,
    "i"
  );
  const everyDayMatch = lower.match(everyDayRe);
  if (everyDayMatch) {
    const dayStr = everyDayMatch[1];
    const days: number[] = [];
    const singleRe = new RegExp(dayPattern, "gi");
    let m: RegExpExecArray | null;
    while ((m = singleRe.exec(dayStr)) !== null) {
      const d = DAY_MAP[m[0].toLowerCase()];
      if (d !== undefined && !days.includes(d)) days.push(d);
    }
    if (days.length > 0) {
      return {
        recurrence: { freq: "weekly", days: days.sort((a, b) => a - b) },
        stripped: raw
          .replace(new RegExp(`every\\s+${escapeRegex(everyDayMatch[1])}`, "i"), "")
          .replace(/\s+/g, " ").trim(),
      };
    }
  }

  // "every day" / "daily"
  if (/every\s+day\b|daily/i.test(lower)) {
    return {
      recurrence: { freq: "daily" },
      stripped: raw.replace(/every\s+day\b|daily/gi, "").replace(/\s+/g, " ").trim(),
    };
  }

  // "every week" / "weekly"
  if (/every\s+week\b|weekly/i.test(lower)) {
    return {
      recurrence: { freq: "weekly" },
      stripped: raw.replace(/every\s+week\b|weekly/gi, "").replace(/\s+/g, " ").trim(),
    };
  }

  // "every month" / "monthly"
  if (/every\s+month\b|monthly/i.test(lower)) {
    return {
      recurrence: { freq: "monthly" },
      stripped: raw.replace(/every\s+month\b|monthly/gi, "").replace(/\s+/g, " ").trim(),
    };
  }

  // "every year" / "yearly" / "annually"
  if (/every\s+year\b|yearly|annually/i.test(lower)) {
    return {
      recurrence: { freq: "yearly" },
      stripped: raw.replace(/every\s+year\b|yearly|annually/gi, "").replace(/\s+/g, " ").trim(),
    };
  }

  return null;
}

export function recurrenceLabel(r: Recurrence): string {
  const base =
    r.freq === "daily"   ? (r.interval ? `Every ${r.interval} days`   : "Daily")   :
    r.freq === "weekly"  ? (r.interval ? `Every ${r.interval} weeks`  : "Weekly")  :
    r.freq === "monthly" ? (r.interval ? `Every ${r.interval} months` : "Monthly") :
    r.freq === "yearly"  ? "Yearly" : "";

  if (r.freq === "weekly" && r.days && r.days.length > 0) {
    return `${base} on ${r.days.map((d) => DAY_SHORT[d]).join(", ")}`;
  }
  return base;
}

// ─── NLP result ──────────────────────────────────────────────────────────────

export interface NlpResult {
  date: string;
  startTime: string;
  endTime: string;
  cleanTitle: string;
  summary: string;
  recurrence?: Recurrence;
}

export function parseEventText(raw: string): NlpResult | null {
  // 1. Strip recurrence patterns first
  const recParsed = parseRecurrence(raw);
  const textForChrono = recParsed ? recParsed.stripped : raw;

  // 2. Run chrono on remaining text
  const results = chrono.parse(textForChrono, new Date(), { forwardDate: true });

  if (!results.length && !recParsed) return null;

  let date: string;
  let startTime: string;
  let endTime: string;
  let cleanTitle: string;
  const summaryParts: string[] = [];

  if (results.length) {
    const hit   = results[0];
    const start = hit.start.date();
    const end   = hit.end ? hit.end.date() : addHours(start, 1);

    const before = textForChrono.slice(0, hit.index).replace(/\s*(at|on|from|,|-)?\s*$/, "");
    const after  = textForChrono.slice(hit.index + hit.text.length).replace(/^\s*(,|-|\s)?\s*/, "");
    cleanTitle = [before, after].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();

    date      = format(start, "yyyy-MM-dd");
    startTime = format(start, "HH:mm");
    endTime   = format(end,   "HH:mm");

    if (recParsed) summaryParts.push(recurrenceLabel(recParsed.recurrence));
    summaryParts.push(`${format(start, "MMM d")} · ${format(start, "h:mm a")} – ${format(end, "h:mm a")}`);
  } else {
    // Recurrence detected but no date/time — use smart defaults
    const now   = new Date();
    const start = addHours(now, 1);
    const end   = addHours(start, 1);

    cleanTitle = textForChrono.trim();
    date      = format(now,   "yyyy-MM-dd");
    startTime = format(start, "HH:mm");
    endTime   = format(end,   "HH:mm");

    summaryParts.push(recurrenceLabel(recParsed!.recurrence));
  }

  return {
    date,
    startTime,
    endTime,
    cleanTitle,
    summary: summaryParts.join(" · "),
    ...(recParsed && { recurrence: recParsed.recurrence }),
  };
}

export function isSpeechSupported(): boolean {
  return !!(
    typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition)
  );
}
