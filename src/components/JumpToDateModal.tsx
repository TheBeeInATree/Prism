import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays, addWeeks, addMonths, startOfWeek, setDay } from "date-fns";
import { Calendar, ArrowRight } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { useLocation } from "wouter";

// ── Date parser ────────────────────────────────────────────────────────────────

const MONTHS_LONG  = ["january","february","march","april","may","june","july","august","september","october","november","december"];
const MONTHS_SHORT = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
const DAYS_LONG    = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
const DAYS_SHORT   = ["sun","mon","tue","wed","thu","fri","sat"];

function nextWeekday(from: Date, targetDay: number): Date {
  const diff = (targetDay - from.getDay() + 7) % 7 || 7;
  return addDays(from, diff);
}

function prevWeekday(from: Date, targetDay: number): Date {
  const diff = (from.getDay() - targetDay + 7) % 7 || 7;
  return addDays(from, -diff);
}

export function parseDate(raw: string): Date | null {
  const s = raw.trim().toLowerCase().replace(/[.,]/g, "");
  if (!s) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (s === "today"     || s === "tod") return today;
  if (s === "tomorrow"  || s === "tom") return addDays(today, 1);
  if (s === "yesterday" || s === "yes") return addDays(today, -1);
  if (s === "next week")  return startOfWeek(addWeeks(today, 1));
  if (s === "last week")  return startOfWeek(addWeeks(today, -1));
  if (s === "next month") return addMonths(new Date(today.getFullYear(), today.getMonth(), 1), 1);
  if (s === "last month") return addMonths(new Date(today.getFullYear(), today.getMonth(), 1), -1);

  // next <day> / last <day> / <day>
  const nextM = s.match(/^next\s+(\w+)$/);
  const lastM = s.match(/^last\s+(\w+)$/);
  const bareM = s.match(/^(\w+)$/);

  for (const [match, fn] of [
    [nextM, (idx: number) => nextWeekday(today, idx)],
    [lastM, (idx: number) => prevWeekday(today, idx)],
    [bareM, (idx: number) => nextWeekday(addDays(today, -1), idx)],
  ] as [RegExpMatchArray | null, (i: number) => Date][]) {
    if (match) {
      const w = match[1];
      const idx = DAYS_LONG.indexOf(w) !== -1 ? DAYS_LONG.indexOf(w) : DAYS_SHORT.indexOf(w);
      if (idx !== -1) return fn(idx);
    }
  }

  // +N / -N
  const rel = s.match(/^([+-])(\d+)$/);
  if (rel) return addDays(today, parseInt(rel[1] + rel[2]));

  // in N days / N days from now
  const inN = s.match(/^in\s+(\d+)\s+days?$/) || s.match(/^(\d+)\s+days?\s+from\s+now$/);
  if (inN) return addDays(today, parseInt(inN[1]));

  // N days ago
  const ago = s.match(/^(\d+)\s+days?\s+ago$/);
  if (ago) return addDays(today, -parseInt(ago[1]));

  // YYYY-MM-DD
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const d = new Date(+iso[1], +iso[2] - 1, +iso[3]);
    if (!isNaN(d.getTime())) return d;
  }

  // MM/DD or MM/DD/YYYY or MM/DD/YY
  const slash = s.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (slash) {
    const y = slash[3]
      ? (slash[3].length === 2 ? 2000 + +slash[3] : +slash[3])
      : today.getFullYear();
    const d = new Date(y, +slash[1] - 1, +slash[2]);
    if (!isNaN(d.getTime())) return d;
  }

  // <Month> <day> [year]  e.g. "dec 25", "december 25 2025", "jan 1st"
  const mdy = s.match(/^(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+(\d{4}))?$/);
  if (mdy) {
    const mIdx = MONTHS_LONG.indexOf(mdy[1]) !== -1 ? MONTHS_LONG.indexOf(mdy[1]) : MONTHS_SHORT.indexOf(mdy[1]);
    if (mIdx !== -1) {
      const y = mdy[3] ? +mdy[3] : today.getFullYear();
      let d = new Date(y, mIdx, +mdy[2]);
      if (!isNaN(d.getTime())) {
        if (!mdy[3] && d < today) d = new Date(y + 1, mIdx, +mdy[2]);
        return d;
      }
    }
  }

  // Just a month name → first of that month
  if (bareM) {
    const mIdx = MONTHS_LONG.indexOf(bareM[1]) !== -1 ? MONTHS_LONG.indexOf(bareM[1]) : MONTHS_SHORT.indexOf(bareM[1]);
    if (mIdx !== -1) {
      let d = new Date(today.getFullYear(), mIdx, 1);
      if (d < today) d = new Date(today.getFullYear() + 1, mIdx, 1);
      return d;
    }
  }

  return null;
}

// ── Quick-action chips ─────────────────────────────────────────────────────────

function getQuickActions() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextMon = nextWeekday(today, 1);
  return [
    { label: "Today",      date: today },
    { label: "Tomorrow",   date: addDays(today, 1) },
    { label: `Next ${format(nextMon, "EEE")}`, date: nextMon },
    { label: "Next Week",  date: startOfWeek(addWeeks(today, 1)) },
    { label: "Next Month", date: addMonths(new Date(today.getFullYear(), today.getMonth(), 1), 1) },
  ];
}

// ── Component ──────────────────────────────────────────────────────────────────

export function JumpToDateModal() {
  const { isJumpOpen, closeJump, setTargetDate } = useUIStore();
  const [, navigate] = useLocation();
  const [input, setInput] = useState("");
  const [focusedChip, setFocusedChip] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const quickActions = getQuickActions();

  const parsed = input.trim() ? parseDate(input) : null;

  const handleNavigate = useCallback(
    (date: Date) => {
      const formatted = format(date, "yyyy-MM-dd");
      setTargetDate(formatted);
      closeJump();
      setInput("");
      // Determine target view: stay on current view unless it's /year or /settings
      const path = window.location.pathname.replace(/^\/[^/]+/, "") || "/";
      if (path === "/year" || path === "/settings" || path === "/") {
        navigate("/week");
      }
    },
    [setTargetDate, closeJump, navigate]
  );

  // Focus input on open
  useEffect(() => {
    if (isJumpOpen) {
      setInput("");
      setFocusedChip(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isJumpOpen]);

  // Keyboard: Enter to confirm, ArrowLeft/Right to navigate chips
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { closeJump(); return; }

    if (e.key === "ArrowRight") {
      e.preventDefault();
      if (!input.trim()) setFocusedChip((c) => Math.min((c ?? -1) + 1, quickActions.length - 1));
      return;
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (!input.trim()) setFocusedChip((c) => (c === null || c === 0) ? null : c - 1);
      return;
    }
    if (e.key === "Enter") {
      if (focusedChip !== null && !input.trim()) {
        handleNavigate(quickActions[focusedChip].date);
      } else if (parsed) {
        handleNavigate(parsed);
      }
    }
  };

  if (!isJumpOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="jump-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[90] flex items-start justify-center pt-[22vh]"
        style={{ background: "hsl(var(--foreground) / 0.25)", backdropFilter: "blur(2px)" }}
        onMouseDown={(e) => { if (e.target === e.currentTarget) { closeJump(); setInput(""); } }}
      >
        <motion.div
          key="jump-card"
          initial={{ opacity: 0, scale: 0.96, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -8 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[480px] mx-4 rounded-2xl shadow-2xl overflow-hidden"
          style={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
        >
          {/* Input row */}
          <div className="flex items-center gap-3 px-5 pt-5 pb-3">
            <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); setFocusedChip(null); }}
              onKeyDown={handleKeyDown}
              placeholder={'Jump to date\u2026 (e.g. "next Friday", "Dec 25", "12/31")'}
              className="flex-1 bg-transparent outline-none text-sm font-medium placeholder:text-muted-foreground/50"
            />
          </div>

          {/* Quick-action chips */}
          {!input.trim() && (
            <div className="flex flex-wrap gap-2 px-5 pb-4">
              {quickActions.map((qa, i) => (
                <button
                  key={qa.label}
                  onMouseEnter={() => setFocusedChip(i)}
                  onMouseLeave={() => setFocusedChip(null)}
                  onClick={() => handleNavigate(qa.date)}
                  className="px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-100"
                  style={
                    focusedChip === i
                      ? { background: "hsl(var(--primary))", color: "#fff" }
                      : { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }
                  }
                >
                  {qa.label}
                </button>
              ))}
            </div>
          )}

          {/* Parsed result preview */}
          {input.trim() && (
            <div className="px-5 pb-4">
              {parsed ? (
                <button
                  onClick={() => handleNavigate(parsed)}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-colors group"
                  style={{ background: "hsl(var(--primary) / 0.08)", color: "hsl(var(--primary))" }}
                >
                  <span className="flex items-center gap-2">
                    <ArrowRight className="w-3.5 h-3.5" />
                    {format(parsed, "EEEE, MMMM d, yyyy")}
                  </span>
                  <kbd className="opacity-50 text-xs font-mono group-hover:opacity-100 transition-opacity">↵</kbd>
                </button>
              ) : (
                <p className="text-xs text-muted-foreground/60 px-1">
                  Can't parse that date — try "Dec 25", "next Monday", or "12/31/2026"
                </p>
              )}
            </div>
          )}

          {/* Footer hint */}
          <div
            className="flex items-center gap-4 px-5 py-2.5 border-t text-xs text-muted-foreground/50"
            style={{ borderColor: "hsl(var(--border))" }}
          >
            <span><kbd className="font-mono">↵</kbd> jump</span>
            <span><kbd className="font-mono">←→</kbd> chips</span>
            <span><kbd className="font-mono">esc</kbd> dismiss</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
