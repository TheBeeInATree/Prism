import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isToday,
  addWeeks,
  subWeeks,
  set,
} from "date-fns";
import { ChevronLeft, ChevronRight, Users, X } from "lucide-react";
import { EventDetailsModal } from "@/components/EventDetailsModal";
import { cn } from "@/lib/utils";
import { SAMPLE_EVENTS } from "@/data/sampleEvents";
import { useEventsStore } from "@/store/eventsStore";
import { useAvailabilityStore } from "@/store/availabilityStore";
import { useCalendarStore } from "@/store/calendarStore";
import { useUIStore } from "@/store/uiStore";
import { AvailabilityOverlay } from "@/components/AvailabilityOverlay";
import {
  layoutDayEvents,
  hourToMinutes,
  minutesToTimeStr,
  type GridEvent,
  type PositionedEvent,
} from "@/lib/eventLayout";

// ─── Constants ────────────────────────────────────────────────────────────────
const HOUR_HEIGHT = 64;
const TOTAL_HEIGHT = HOUR_HEIGHT * 24;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const GUTTER = 56;

const PROVIDER_COLORS: Record<string, string> = {
  google: "#3B82F6",
  microsoft: "#10B981",
  icloud: "#8B5CF6",
};

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  microsoft: "Outlook",
  icloud: "iCloud",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse a "YYYY-MM-DD" date string as **local** midnight.
 * Using `new Date("YYYY-MM-DD")` parses as UTC, which shifts the date
 * backward by the local UTC offset in negative-offset timezones (Americas).
 */
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function getDayEvents(
  day: Date,
  storeEvents: ReturnType<typeof useEventsStore.getState>["events"],
  isActive: (label: string) => boolean
): GridEvent[] {
  const sampleForDay = SAMPLE_EVENTS.filter(
    (e) => isSameDay(parseLocalDate(e.date), day) && isActive(e.calendar)
  );

  const dateStr = format(day, "yyyy-MM-dd");
  const fromSample: GridEvent[] = sampleForDay.map((e) => {
    const start = hourToMinutes(e.startHour ?? 9);
    const end = hourToMinutes((e.startHour ?? 9) + (e.durationHours ?? 1));
    const color = e.provider
      ? (PROVIDER_COLORS[e.provider] ?? e.color)
      : e.color;
    return {
      id: e.id,
      title: e.title,
      startMinutes: start,
      endMinutes: Math.max(end, start + 15),
      color,
      provider: e.provider,
      calendar: e.calendar,
      location: e.location,
      time: e.time,
      description: e.description,
      sourceDate: dateStr,
    };
  });

  const fromStore: GridEvent[] = storeEvents
    .filter(
      (e) =>
        isSameDay(new Date(e.startTime), day) &&
        isActive(e.calendar ?? "")
    )
    .map((e) => {
      const d = new Date(e.startTime);
      const dEnd = new Date(e.endTime);
      const start = d.getHours() * 60 + d.getMinutes();
      const end = dEnd.getHours() * 60 + dEnd.getMinutes();
      return {
        id: e.id,
        title: e.title,
        startMinutes: start,
        endMinutes: Math.max(end, start + 15),
        color: e.color ?? PROVIDER_COLORS[e.provider ?? ""] ?? "#6B7280",
        provider: e.provider,
        calendar: e.calendar,
        location: e.location,
        description: e.description,
        attendees: e.attendees,
        sourceDate: dateStr,
      };
    });

  const storeIds = new Set(fromStore.map((e) => e.id));
  return [...fromSample.filter((e) => !storeIds.has(e.id)), ...fromStore];
}

const SNAP_MINUTES = 15;

// ─── Event Block ──────────────────────────────────────────────────────────────

function EventBlock({
  event,
  isResizing,
  onResizeStart,
  onEventClick,
  searchMatch,
}: {
  event: PositionedEvent;
  isResizing: boolean;
  onResizeStart: (e: React.MouseEvent, origEnd: number) => void;
  onEventClick: (event: PositionedEvent) => void;
  /** undefined = no search active | true = matches | false = doesn't match */
  searchMatch?: boolean;
}) {
  const durationMinutes = event.endMinutes - event.startMinutes;
  const topPx    = (event.startMinutes / 60) * HOUR_HEIGHT;
  const heightPx = Math.max((durationMinutes / 60) * HOUR_HEIGHT, 18);

  const leftPct  = (event.col / event.totalCols) * 100;
  const widthPct = (1 / event.totalCols) * 100;

  const isNarrow = event.totalCols >= 3;
  const isShort  = heightPx < 36;
  const isTiny   = heightPx < 22;

  const targetOpacity = searchMatch === false ? 0.1 : 1;

  return (
    <motion.div
      key={event.id}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: targetOpacity, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="absolute group cursor-pointer"
      style={{
        top:      topPx + 1,
        height:   heightPx - 2,
        left:     `calc(${leftPct}% + 2px)`,
        width:    `calc(${widthPct}% - 4px)`,
        zIndex:   isResizing ? 50 : 10 + event.col,
        minWidth: 0,
        pointerEvents: searchMatch === false ? "none" : "auto",
        filter: searchMatch === false ? "grayscale(0.6)" : "none",
      }}
      data-testid={`week-event-${event.id}`}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
    >
      <div
        className="h-full w-full rounded-lg overflow-visible relative transition-shadow duration-150 group-hover:brightness-95 group-hover:shadow-md"
        style={{
          backgroundColor: event.color + (isNarrow ? "28" : "1e"),
          borderLeft: `3px solid ${event.color}`,
          boxShadow: isResizing
            ? `0 6px 20px ${event.color}44`
            : searchMatch === true
              ? `0 0 0 1.5px ${event.color}80, 0 2px 8px ${event.color}28`
              : `0 1px 2px ${event.color}14`,
        }}
      >
        {/* Content */}
        <div className="px-1.5 py-0.5 h-full flex flex-col justify-start overflow-hidden">
          <p
            className="font-semibold leading-tight truncate"
            style={{
              color:      event.color,
              fontSize:   isNarrow ? "10px" : "11px",
              lineHeight: 1.25,
            }}
          >
            {event.title}
          </p>

          {!isShort && !(isNarrow && isTiny) && (
            <p
              className="leading-tight opacity-80 truncate mt-px"
              style={{ color: event.color, fontSize: "9px" }}
            >
              {minutesToTimeStr(event.startMinutes)} – {minutesToTimeStr(event.endMinutes)}
            </p>
          )}

          {!isShort && !isNarrow && event.location && heightPx >= 56 && (
            <p
              className="leading-tight opacity-60 truncate"
              style={{ color: event.color, fontSize: "9px" }}
            >
              {event.location}
            </p>
          )}
        </div>

        {/* Provider badge */}
        {!isNarrow && heightPx >= 44 && event.provider && (
          <div
            className="absolute top-1 right-1.5 font-bold uppercase tracking-wider opacity-60"
            style={{ color: event.color, fontSize: "8px" }}
          >
            {PROVIDER_LABELS[event.provider] ?? event.provider}
          </div>
        )}

        {/* Resize handle — appears on hover */}
        <div
          className="absolute bottom-0 left-0 right-0 h-3 flex items-end justify-center pb-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-100 z-10"
          style={{ cursor: "row-resize" }}
          onMouseDown={(e) => onResizeStart(e, event.endMinutes)}
        >
          <div
            className="w-6 h-[3px] rounded-full"
            style={{ backgroundColor: event.color + "90" }}
          />
        </div>

        {/* Live end-time badge while dragging */}
        {isResizing && (
          <div
            className="absolute -bottom-5 left-0 px-1.5 py-0.5 rounded text-white font-bold z-50 whitespace-nowrap pointer-events-none"
            style={{ backgroundColor: event.color, fontSize: "9px" }}
          >
            {minutesToTimeStr(event.endMinutes)}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Current Time Line ────────────────────────────────────────────────────────

function useNow() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function NowLine() {
  const now = useNow();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const topPx = (minutes / 60) * HOUR_HEIGHT;
  return (
    <div
      className="absolute left-0 right-0 flex items-center pointer-events-none z-20"
      style={{ top: topPx }}
    >
      <div
        className="w-2.5 h-2.5 rounded-full shadow-md flex-shrink-0"
        style={{
          background: "hsl(var(--primary))",
          boxShadow: "0 0 0 2px hsl(var(--primary) / 0.25)",
        }}
      />
      <div
        className="flex-1 h-px"
        style={{ background: "hsl(var(--primary))" }}
      />
    </div>
  );
}

// ─── Day Column ───────────────────────────────────────────────────────────────

function DayColumn({
  day,
  storeEvents,
  dimmed,
  isActive,
  onEventClick,
  searchQuery,
  onSlotClick,
}: {
  day: Date;
  storeEvents: ReturnType<typeof useEventsStore.getState>["events"];
  dimmed: boolean;
  isActive: (label: string) => boolean;
  onEventClick: (event: PositionedEvent) => void;
  searchQuery?: string;
  onSlotClick?: (day: Date, startTime: string, endTime: string) => void;
}) {
  const today = isToday(day);
  const columnRef = useRef<HTMLDivElement>(null);
  // ── Resize state ────────────────────────────────────────────────────────────
  const [resizingId,  setResizingId]  = useState<string | null>(null);
  const [resizingEnd, setResizingEnd] = useState<number | null>(null);
  const [committed,   setCommitted]   = useState<Map<string, number>>(new Map());
  const resizeRef = useRef<{ id: string; end: number } | null>(null);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, eventId: string, origEnd: number) => {
      e.preventDefault();
      e.stopPropagation();
      document.body.style.userSelect = "none";
      document.body.style.cursor     = "row-resize";

      const startY = e.clientY;
      resizeRef.current = { id: eventId, end: origEnd };
      setResizingId(eventId);
      setResizingEnd(origEnd);

      const onMove = (mv: MouseEvent) => {
        const deltaY  = mv.clientY - startY;
        const rawMins = (deltaY / HOUR_HEIGHT) * 60;
        const snapped = Math.round(rawMins / SNAP_MINUTES) * SNAP_MINUTES;
        const newEnd  = Math.max(origEnd + SNAP_MINUTES, origEnd + snapped);
        resizeRef.current = { id: eventId, end: newEnd };
        setResizingEnd(newEnd);
      };

      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup",   onUp);
        document.body.style.userSelect = "";
        document.body.style.cursor     = "";
        if (resizeRef.current) {
          const { id, end } = resizeRef.current;
          setCommitted((prev) => new Map(prev).set(id, end));
          resizeRef.current = null;
        }
        setResizingId(null);
        setResizingEnd(null);
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup",   onUp);
    },
    []
  );

  const dragRef = useRef<{ start: number; current: number } | null>(null);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragCurrent, setDragCurrent] = useState<number | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (dimmed || !onSlotClick || !columnRef.current) return;
      e.preventDefault();

      const rect = columnRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const snapped = Math.round((y / HOUR_HEIGHT) * 60 / 15) * 15;
      const startMins = Math.max(0, Math.min(snapped, 23 * 60));

      dragRef.current = { start: startMins, current: startMins };
      setDragStart(startMins);
      setDragCurrent(startMins);
      document.body.style.userSelect = "none";
      document.body.style.cursor = "ns-resize";

      const onMove = (mv: MouseEvent) => {
        if (!columnRef.current || !dragRef.current) return;
        const r = columnRef.current.getBoundingClientRect();
        const cy = mv.clientY - r.top;
        const s = Math.round((cy / HOUR_HEIGHT) * 60 / 15) * 15;
        const cur = Math.max(0, Math.min(s, 24 * 60));
        dragRef.current.current = cur;
        setDragCurrent(cur);
      };

      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.userSelect = "";
        document.body.style.cursor = "";

        if (!dragRef.current) { setDragStart(null); setDragCurrent(null); return; }
        const { start, current } = dragRef.current;
        dragRef.current = null;
        setDragStart(null);
        setDragCurrent(null);

        const realStart = Math.min(start, current);
        const realEnd   = Math.max(start, current);
        const finalEnd  = realEnd <= realStart + 14 ? realStart + 60 : realEnd;
        const cappedEnd = Math.min(finalEnd, 24 * 60);
        const pad = (n: number) => String(n).padStart(2, "0");
        onSlotClick(
          day,
          `${pad(Math.floor(realStart / 60))}:${pad(realStart % 60)}`,
          `${pad(Math.floor(cappedEnd / 60))}:${pad(cappedEnd % 60)}`
        );
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [day, dimmed, onSlotClick]
  );

  // Apply live/committed resize overrides before layout
  const rawEvents = getDayEvents(day, storeEvents, isActive).map((e) => {
    const overrideEnd =
      resizingId === e.id && resizingEnd !== null
        ? resizingEnd
        : (committed.get(e.id) ?? null);
    return overrideEnd !== null ? { ...e, endMinutes: overrideEnd } : e;
  });

  const positioned = layoutDayEvents(rawEvents);

  return (
    <div
      ref={columnRef}
      className={cn(
        "relative border-l border-border/30 h-full transition-opacity duration-300",
        today && "bg-primary/[0.02]",
        dimmed && "opacity-40",
        !dimmed && "cursor-cell"
      )}
      style={{ height: TOTAL_HEIGHT }}
      data-testid={`week-day-${format(day, "yyyy-MM-dd")}`}
      onMouseDown={handleMouseDown}
    >
      {HOURS.map((h) => (
        <div
          key={h}
          className={cn(
            "absolute left-0 right-0 border-t",
            h === 0
              ? "border-border/0"
              : h % 6 === 0
                ? "border-border/50"
                : "border-border/20"
          )}
          style={{ top: h * HOUR_HEIGHT }}
        />
      ))}
      {HOURS.map((h) => (
        <div
          key={`h-${h}`}
          className="absolute left-0 right-0 border-t border-border/10 border-dashed"
          style={{ top: h * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
        />
      ))}
      {today && <NowLine />}

      {/* Drag selection ghost — stretches as you drag */}
      {dragStart !== null && dragCurrent !== null && (
        <div
          className="absolute left-0.5 right-0.5 rounded-md pointer-events-none flex flex-col justify-start px-1.5 py-1 overflow-hidden"
          style={{
            top: (Math.min(dragStart, dragCurrent) / 60) * HOUR_HEIGHT,
            height: Math.max(15, Math.abs(dragCurrent - dragStart)) / 60 * HOUR_HEIGHT,
            background: "hsl(var(--primary) / 0.18)",
            border: "1.5px solid hsl(var(--primary) / 0.55)",
            zIndex: 6,
          }}
        >
          <p className="font-bold leading-none" style={{ color: "hsl(var(--primary))", fontSize: "9px" }}>
            {minutesToTimeStr(Math.min(dragStart, dragCurrent))}
          </p>
          {Math.abs(dragCurrent - dragStart) >= 30 && (
            <p className="leading-none opacity-60 mt-0.5" style={{ color: "hsl(var(--primary))", fontSize: "9px" }}>
              {minutesToTimeStr(Math.min(Math.max(dragStart, dragCurrent), 24 * 60))}
            </p>
          )}
        </div>
      )}

      <AnimatePresence>
        {positioned.map((event) => {
          const searchMatch = searchQuery
            ? event.title.toLowerCase().includes(searchQuery.toLowerCase())
            : undefined;
          return (
            <EventBlock
              key={event.id}
              event={event}
              isResizing={resizingId === event.id}
              onResizeStart={(e, origEnd) => handleResizeStart(e, event.id, origEnd)}
              onEventClick={onEventClick}
              searchMatch={searchMatch}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// ─── Main WeekView ────────────────────────────────────────────────────────────

function isSameMonth(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
  );
}

export default function WeekView() {
  const [viewDate, setViewDate] = useState(new Date());
  const [direction, setDirection] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<PositionedEvent | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { events: storeEvents } = useEventsStore();
  const { isShareMode, toggleShareMode } = useAvailabilityStore();
  const { isActive } = useCalendarStore();
  const { searchQuery, openNewEventWithDefaults, targetDate, setTargetDate } = useUIStore();

  // Jump-to-date support
  useEffect(() => {
    if (targetDate) {
      const parsed = new Date(targetDate + "T00:00:00");
      if (!isNaN(parsed.getTime())) setViewDate(parsed);
      setTargetDate(null);
    }
  }, []);

  const weekStart = startOfWeek(viewDate);
  const weekEnd = endOfWeek(viewDate);
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = Math.max(0, 7 * HOUR_HEIGHT - 80);
    }
  }, []);

  const go = (dir: number) => {
    setDirection(dir);
    setViewDate((d) => (dir > 0 ? addWeeks(d, 1) : subWeeks(d, 1)));
  };

  return (
    <div
      className="flex flex-col h-full page-transition select-none"
      data-testid="week-view"
    >
      {/* ── Toolbar ── */}
      <div
        className={cn(
          "flex items-center gap-3 px-6 py-4 flex-shrink-0 transition-colors duration-300",
          isShareMode &&
            "bg-emerald-500/5 border-b border-emerald-500/10"
        )}
      >
        <div className="flex items-center gap-1">
          <button
            onClick={() => go(-1)}
            className="icon-btn"
            data-testid="week-prev"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => go(1)}
            className="icon-btn"
            data-testid="week-next"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.h1
            key={format(weekStart, "yyyy-ww")}
            initial={{ opacity: 0, y: direction > 0 ? 8 : -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: direction > 0 ? -8 : 8 }}
            transition={{ duration: 0.18 }}
            className="text-2xl font-bold tracking-tight text-foreground"
          >
            {format(weekStart, "MMM d")}
            <span className="text-muted-foreground font-light mx-1.5">–</span>
            {format(
              weekEnd,
              isSameMonth(weekStart, weekEnd) ? "d, yyyy" : "MMM d, yyyy"
            )}
          </motion.h1>
        </AnimatePresence>

        {/* Share mode indicator */}
        {isShareMode && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="ml-4 flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{
              background: "rgba(16,185,129,0.12)",
              border: "1px solid rgba(16,185,129,0.25)",
            }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-600">
              Share Availability — drag to select times
            </span>
          </motion.div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {/* Share mode toggle */}
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={toggleShareMode}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200",
              isShareMode
                ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200"
                : "text-muted-foreground bg-muted hover:bg-muted/80 border border-transparent"
            )}
          >
            {isShareMode ? (
              <X className="w-4 h-4" />
            ) : (
              <Users className="w-4 h-4" />
            )}
            {isShareMode ? "Exit Share Mode" : "Share Availability"}
          </motion.button>

          {!isShareMode && (
            <button
              onClick={() => setViewDate(new Date())}
              className="text-sm font-medium px-3 py-1.5 rounded-xl hover:bg-muted transition-colors text-primary"
              data-testid="button-today"
            >
              Today
            </button>
          )}
        </div>
      </div>

      {/* ── Day header ── */}
      <div
        className="flex-shrink-0 border-b border-border/40"
        style={{ paddingLeft: GUTTER }}
      >
        <div
          className="grid"
          style={{ gridTemplateColumns: `repeat(7, 1fr)` }}
        >
          {days.map((day) => {
            const today = isToday(day);
            return (
              <div
                key={day.toISOString()}
                className="text-center py-2.5 border-l border-border/30 first:border-l-0"
              >
                <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {format(day, "EEE")}
                </div>
                <div
                  className={cn(
                    "w-9 h-9 mx-auto mt-1 flex items-center justify-center rounded-full text-sm font-bold transition-all duration-150",
                    today
                      ? "text-primary-foreground shadow-md shadow-primary/30"
                      : "text-foreground hover:bg-muted cursor-pointer"
                  )}
                  style={
                    today ? { background: "hsl(var(--primary))" } : undefined
                  }
                >
                  {format(day, "d")}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Scrollable time grid ── */}
      <div ref={scrollRef} className="flex-1 overflow-auto">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={format(weekStart, "yyyy-ww")}
            initial={{ opacity: 0, x: direction > 0 ? 30 : -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? -30 : 30 }}
            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex relative"
            style={{ height: TOTAL_HEIGHT }}
          >
            {/* Hour labels */}
            <div
              className="flex-shrink-0 relative"
              style={{ width: GUTTER, height: TOTAL_HEIGHT }}
            >
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="absolute right-0 w-full flex justify-end pr-2"
                  style={{ top: h * HOUR_HEIGHT - 8 }}
                >
                  {h > 0 && (
                    <span className="text-[10px] font-medium text-muted-foreground/70 tabular-nums">
                      {format(
                        set(new Date(), { hours: h, minutes: 0, seconds: 0 }),
                        "h a"
                      )}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Day columns */}
            <div
              className="flex-1 grid relative"
              style={{
                gridTemplateColumns: "repeat(7, 1fr)",
                height: TOTAL_HEIGHT,
              }}
            >
              {days.map((day) => (
                <DayColumn
                  key={day.toISOString()}
                  day={day}
                  storeEvents={storeEvents}
                  dimmed={isShareMode}
                  isActive={isActive}
                  onEventClick={setSelectedEvent}
                  searchQuery={searchQuery}
                  onSlotClick={(d, startTime, endTime) =>
                    openNewEventWithDefaults(format(d, "yyyy-MM-dd"), startTime, endTime)
                  }
                />
              ))}

              {/* Availability drag overlay */}
              <AnimatePresence>
                {isShareMode && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="absolute inset-0"
                    style={{ height: TOTAL_HEIGHT }}
                  >
                    <AvailabilityOverlay days={days} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <EventDetailsModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
}
