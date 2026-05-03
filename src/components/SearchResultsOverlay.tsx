import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, isWithinInterval, isSameDay } from "date-fns";
import { Search, MapPin, Clock, X, ArrowRight, Calendar } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { useEventsStore } from "@/store/eventsStore";
import { SAMPLE_EVENTS } from "@/data/sampleEvents";
import { parseSearchIntent } from "@/lib/searchNlp";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  title: string;
  date: Date;
  dateStr: string;
  timeStr: string;
  color: string;
  calendar?: string;
  location?: string;
}

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDateLabel(date: Date): string {
  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  const tomorrowStr = format(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
    "yyyy-MM-dd",
  );
  const yesterdayStr = format(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
    "yyyy-MM-dd",
  );
  const ds = format(date, "yyyy-MM-dd");
  if (ds === todayStr) return "Today";
  if (ds === tomorrowStr) return "Tomorrow";
  if (ds === yesterdayStr) return "Yesterday";
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.abs(diffMs) / (1000 * 60 * 60 * 24);
  if (diffDays < 7) return format(date, "EEEE, MMMM d");
  return format(date, "EEEE, MMMM d, yyyy");
}

function ResultCard({
  result,
  query,
  onClick,
}: {
  result: SearchResult;
  query: string;
  onClick: () => void;
}) {
  const highlight = (text: string) => {
    const lower = text.toLowerCase();
    const q = query.toLowerCase();
    const idx = lower.indexOf(q);
    if (idx === -1 || q.length < 2) return <>{text}</>;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-primary/20 text-primary rounded px-0.5 font-medium not-italic">
          {text.slice(idx, idx + q.length)}
        </mark>
        {text.slice(idx + q.length)}
      </>
    );
  };

  return (
    <motion.button
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted/60 transition-colors text-left group"
    >
      <div
        className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5"
        style={{ backgroundColor: result.color }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {highlight(result.title)}
        </p>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          {result.timeStr && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {result.timeStr}
            </span>
          )}
          {result.location && (
            <span className="text-xs text-muted-foreground flex items-center gap-1 truncate max-w-[180px]">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              {result.location}
            </span>
          )}
          {result.calendar && (
            <span className="text-xs text-muted-foreground">{result.calendar}</span>
          )}
        </div>
      </div>
      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
    </motion.button>
  );
}

function EmptyState({ query, onSuggestion }: { query: string; onSuggestion: (s: string) => void }) {
  const suggestions = [
    "team standup next week",
    "dentist this month",
    "standup today",
    "events on Friday",
  ];
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
        <Search className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground mb-1">
          No events found for "{query}"
        </p>
        <p className="text-xs text-muted-foreground">
          Try natural language like "meetings next week" or "dentist tomorrow"
        </p>
      </div>
      <div className="flex flex-wrap gap-2 justify-center mt-1">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => onSuggestion(s)}
            className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SearchResultsOverlay() {
  const { searchQuery, clearSearch, setSearchQuery, setTargetDate } = useUIStore();
  const { events: storeEvents } = useEventsStore();
  const [, setLocation] = useLocation();

  const { intent, results } = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return { intent: null, results: [] as SearchResult[] };

    const intent = parseSearchIntent(q);
    const allResults: SearchResult[] = [];

    // ── Sample events ──────────────────────────────────────────────────────
    for (const e of SAMPLE_EVENTS) {
      const date = parseLocalDate(e.date);

      if (intent.dateRange) {
        try {
          if (!isWithinInterval(date, intent.dateRange)) continue;
        } catch {
          continue;
        }
      }

      if (intent.keywords.length > 0) {
        const hay = [e.title, e.location, e.description]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!intent.keywords.every((kw) => hay.includes(kw))) continue;
      } else if (!intent.dateRange) {
        if (!e.title.toLowerCase().includes(q.toLowerCase())) continue;
      }

      allResults.push({
        id: e.id,
        title: e.title,
        date,
        dateStr: e.date,
        timeStr: e.time ?? "",
        color: e.color,
        calendar: e.calendar,
        location: e.location,
      });
    }

    // ── Store events ───────────────────────────────────────────────────────
    for (const e of storeEvents) {
      const date = new Date(e.startTime);
      const dateStr = format(date, "yyyy-MM-dd");

      if (intent.dateRange) {
        try {
          if (!isWithinInterval(date, intent.dateRange)) continue;
        } catch {
          continue;
        }
      }

      if (intent.keywords.length > 0) {
        const hay = [e.title, e.location, e.description, ...(e.attendees ?? [])]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!intent.keywords.every((kw) => hay.includes(kw))) continue;
      } else if (!intent.dateRange) {
        if (!e.title.toLowerCase().includes(q.toLowerCase())) continue;
      }

      allResults.push({
        id: e.id,
        title: e.title,
        date,
        dateStr,
        timeStr: format(date, "h:mm a"),
        color: e.color ?? "#6B7280",
        calendar: e.calendar,
        location: e.location,
      });
    }

    allResults.sort((a, b) => a.date.getTime() - b.date.getTime());
    return { intent, results: allResults };
  }, [searchQuery, storeEvents]);

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, SearchResult[]>();
    for (const r of results) {
      if (!map.has(r.dateStr)) map.set(r.dateStr, []);
      map.get(r.dateStr)!.push(r);
    }
    return [...map.entries()].map(([dateStr, events]) => ({
      dateStr,
      label: formatDateLabel(parseLocalDate(dateStr)),
      events,
    }));
  }, [results]);

  const handleEventClick = (r: SearchResult) => {
    setTargetDate(r.dateStr);
    setLocation("/day");
    clearSearch();
  };

  const show = searchQuery.trim().length > 0;
  const activeKeywords = (intent?.keywords ?? []).filter((k) => k.length > 1);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="search-overlay"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="absolute inset-0 z-40 flex flex-col"
          style={{
            background: "hsl(var(--background) / 0.95)",
            backdropFilter: "blur(8px)",
          }}
        >
          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="flex items-center gap-3 px-6 pt-5 pb-3.5 border-b border-border/40">
            <Search className="w-4 h-4 text-primary flex-shrink-0" />

            <div className="flex flex-1 flex-wrap items-center gap-2 min-w-0">
              {intent?.rawDateLabel && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                  <Calendar className="w-3 h-3" />
                  {intent.rawDateLabel}
                </span>
              )}
              {activeKeywords.map((kw) => (
                <span
                  key={kw}
                  className="text-xs px-2.5 py-1 rounded-full bg-muted text-foreground/70 font-medium"
                >
                  {kw}
                </span>
              ))}
              <span
                className={cn(
                  "text-sm",
                  results.length === 0
                    ? "text-muted-foreground"
                    : "text-foreground/60",
                )}
              >
                {results.length === 0
                  ? "No results"
                  : `${results.length} event${results.length === 1 ? "" : "s"}`}
              </span>
            </div>

            <button
              onClick={clearSearch}
              className="icon-btn ml-auto flex-shrink-0"
              aria-label="Close search"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── Results ─────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {results.length === 0 ? (
              <EmptyState query={searchQuery} onSuggestion={setSearchQuery} />
            ) : (
              <div className="space-y-6 max-w-2xl">
                {grouped.map(({ dateStr, label, events }) => (
                  <div key={dateStr}>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                      {label}
                    </h3>
                    <div className="space-y-1">
                      {events.map((r) => (
                        <ResultCard
                          key={r.id}
                          result={r}
                          query={searchQuery}
                          onClick={() => handleEventClick(r)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Footer hint ─────────────────────────────────────────────── */}
          <div className="px-6 py-2.5 border-t border-border/30 flex items-center gap-5">
            <span className="text-[11px] text-muted-foreground">
              <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[10px] font-mono mr-1">
                ↵
              </kbd>
              open in day view
            </span>
            <span className="text-[11px] text-muted-foreground">
              <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[10px] font-mono mr-1">
                Esc
              </kbd>
              close
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
