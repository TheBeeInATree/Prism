import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  format,
  isSameDay,
  isToday,
  addDays,
  subDays,
  set,
} from "date-fns";
import { ChevronLeft, ChevronRight, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SAMPLE_EVENTS } from "@/data/sampleEvents";
import { useEventsStore } from "@/store/eventsStore";
import { useCalendarStore } from "@/store/calendarStore";
import { useAvailabilityStore } from "@/store/availabilityStore";
import { useUIStore } from "@/store/uiStore";
import { EventDetailsModal } from "@/components/EventDetailsModal";
import { AvailabilityOverlay } from "@/components/AvailabilityOverlay";
import {
  layoutDayEvents,
  hourToMinutes,
  minutesToTimeStr,
  type GridEvent,
  type PositionedEvent,
} from "@/lib/eventLayout";

const HOUR_HEIGHT = 60;          // px per hour (matches TOTAL_HEIGHT = 1440)
const TOTAL_HEIGHT = HOUR_HEIGHT * 24;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const SNAP_MINUTES = 15;

const PROVIDER_COLORS: Record<string, string> = {
  google:    "#3B82F6",
  microsoft: "#10B981",
  icloud:    "#8B5CF6",
};

/**
 * Parse a "YYYY-MM-DD" date string as **local** midnight.
 */
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// ─── Resize handle ────────────────────────────────────────────────────────────

function ResizeHandle({
  color,
  onMouseDown,
}: {
  color: string;
  onMouseDown: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 h-3 flex items-end justify-center pb-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-100 z-10"
      style={{ cursor: "row-resize" }}
      onMouseDown={onMouseDown}
    >
      <div
        className="w-8 h-[3px] rounded-full"
        style={{ backgroundColor: color + "90" }}
      />
    </div>
  );
}

// ─── Event block ──────────────────────────────────────────────────────────────

function EventBlock({
  event,
  isResizing,
  onResizeStart,
  onEventClick,
  dimmed,
  searchMatch,
}: {
  event: PositionedEvent;
  isResizing: boolean;
  onResizeStart: (e: React.MouseEvent, origEnd: number) => void;
  onEventClick: (event: PositionedEvent) => void;
  /** true = share-mode dim (all events) */
  dimmed?: boolean;
  /** undefined = no search | true = matches | false = doesn't match */
  searchMatch?: boolean;
}) {
  const durationMinutes = event.endMinutes - event.startMinutes;
  const topPx    = (event.startMinutes / 60) * HOUR_HEIGHT;
  const heightPx = Math.max((durationMinutes / 60) * HOUR_HEIGHT, 20);

  const leftPct  = (event.col / event.totalCols) * 100;
  const widthPct = (1 / event.totalCols) * 100;

  const isShort  = heightPx < 36;
  const isNarrow = event.totalCols >= 3;

  const targetOpacity = dimmed ? 0.3 : searchMatch === false ? 0.1 : 1;
  const nonInteractive = dimmed || searchMatch === false;

  return (
    <motion.div
      key={event.id}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: targetOpacity, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="absolute cursor-pointer group"
      style={{
        top:      topPx + 1,
        height:   heightPx - 2,
        left:     `calc(${leftPct}% + 2px)`,
        width:    `calc(${widthPct}% - 4px)`,
        zIndex:   isResizing ? 50 : 10 + event.col,
        minWidth: 0,
        pointerEvents: nonInteractive ? "none" : "auto",
        filter: searchMatch === false ? "grayscale(0.6)" : "none",
      }}
      data-testid={`day-event-${event.id}`}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
    >
      <div
        className="h-full w-full rounded-xl overflow-visible relative transition-shadow duration-150 group-hover:brightness-95"
        style={{
          backgroundColor: event.color + "22",
          borderLeft: `4px solid ${event.color}`,
          boxShadow: isResizing
            ? `0 6px 20px ${event.color}44`
            : `0 1px 3px ${event.color}18`,
        }}
      >
        {/* Text content */}
        <div className="px-2.5 py-1.5 h-full flex flex-col overflow-hidden">
          <p
            className="font-semibold leading-snug truncate"
            style={{ color: event.color, fontSize: isNarrow ? "11px" : "13px" }}
          >
            {event.title}
          </p>

          {!isShort && (
            <p
              className="leading-tight opacity-75 truncate mt-0.5"
              style={{ color: event.color, fontSize: "11px" }}
            >
              {event.time ??
                `${minutesToTimeStr(event.startMinutes)} – ${minutesToTimeStr(event.endMinutes)}`}
            </p>
          )}

          {!isShort && !isNarrow && event.location && heightPx >= 56 && (
            <p className="text-xs mt-0.5 text-muted-foreground truncate">
              {event.location}
            </p>
          )}
        </div>

        {/* Resize handle — visible on hover */}
        {!dimmed && (
          <ResizeHandle
            color={event.color}
            onMouseDown={(e) => onResizeStart(e, event.endMinutes)}
          />
        )}

        {/* Live end-time badge while dragging */}
        {isResizing && (
          <div
            className="absolute -bottom-5 left-0 px-1.5 py-0.5 rounded text-white font-bold z-50 whitespace-nowrap pointer-events-none"
            style={{ backgroundColor: event.color, fontSize: "10px" }}
          >
            {minutesToTimeStr(event.endMinutes)}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Current time line ────────────────────────────────────────────────────────

function NowLine() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const topPx = (now.getHours() * 60 + now.getMinutes()) * (HOUR_HEIGHT / 60);
  return (
    <div
      className="absolute left-0 right-0 flex items-center pointer-events-none z-20"
      style={{ top: topPx }}
    >
      <div
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{
          background: "hsl(var(--primary))",
          boxShadow: "0 0 0 2px hsl(var(--primary) / 0.25)",
        }}
      />
      <div className="flex-1 h-px" style={{ background: "hsl(var(--primary))" }} />
    </div>
  );
}

// ─── Main DayView ─────────────────────────────────────────────────────────────

export default function DayView() {
  const [viewDate, setViewDate]   = useState(new Date());
  const [direction, setDirection] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const dragRef = useRef<{ start: number; current: number } | null>(null);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragCurrent, setDragCurrent] = useState<number | null>(null);

  const { events: storeEvents } = useEventsStore();
  const { isActive }            = useCalendarStore();
  const { isShareMode, toggleShareMode } = useAvailabilityStore();
  const { searchQuery, openNewEventWithDefaults, targetDate, setTargetDate } = useUIStore();
  const today = isToday(viewDate);

  // Jump to date set by YearView click
  useEffect(() => {
    if (targetDate) {
      const parsed = new Date(targetDate + "T00:00:00");
      if (!isNaN(parsed.getTime())) setViewDate(parsed);
      setTargetDate(null);
    }
  }, []);

  // ── Selected event (detail modal) ───────────────────────────────────────────
  const [selectedEvent, setSelectedEvent] = useState<PositionedEvent | null>(null);

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
        const deltaY   = mv.clientY - startY;
        const rawMins  = (deltaY / HOUR_HEIGHT) * 60;
        const snapped  = Math.round(rawMins / SNAP_MINUTES) * SNAP_MINUTES;
        const newEnd   = Math.max(origEnd + SNAP_MINUTES, origEnd + snapped);
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

  // Scroll to 7 AM on first render
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = Math.max(0, 7 * HOUR_HEIGHT - 80);
    }
  }, []);

  const go = (dir: number) => {
    setDirection(dir);
    setViewDate((d) => (dir > 0 ? addDays(d, 1) : subDays(d, 1)));
  };

  // Build GridEvent list, applying any resize override
  const rawEvents: GridEvent[] = [
    ...SAMPLE_EVENTS.filter(
      (e) => isSameDay(parseLocalDate(e.date), viewDate) && isActive(e.calendar)
    ).map((e) => {
      const start   = hourToMinutes(e.startHour ?? 9);
      const baseEnd = hourToMinutes((e.startHour ?? 9) + (e.durationHours ?? 1));
      const color   = e.provider ? (PROVIDER_COLORS[e.provider] ?? e.color) : e.color;
      const overrideEnd =
        resizingId === e.id && resizingEnd !== null
          ? resizingEnd
          : (committed.get(e.id) ?? null);
      return {
        id:           e.id,
        title:        e.title,
        startMinutes: start,
        endMinutes:   overrideEnd ?? Math.max(baseEnd, start + 15),
        color,
        provider:     e.provider,
        calendar:     e.calendar,
        location:     e.location,
        time:         overrideEnd ? undefined : e.time,
        description:  e.description,
        sourceDate:   format(viewDate, "yyyy-MM-dd"),
      };
    }),
    ...storeEvents
      .filter(
        (e) =>
          isSameDay(new Date(e.startTime), viewDate) &&
          isActive(e.calendar ?? "")
      )
      .map((e) => {
        const d    = new Date(e.startTime);
        const dEnd = new Date(e.endTime);
        const start = d.getHours() * 60 + d.getMinutes();
        const baseEnd = dEnd.getHours() * 60 + dEnd.getMinutes();
        const overrideEnd =
          resizingId === e.id && resizingEnd !== null
            ? resizingEnd
            : (committed.get(e.id) ?? null);
        return {
          id:           e.id,
          title:        e.title,
          startMinutes: start,
          endMinutes:   overrideEnd ?? Math.max(baseEnd, start + 15),
          color:        e.color ?? PROVIDER_COLORS[e.provider ?? ""] ?? "#6B7280",
          provider:     e.provider,
          calendar:     e.calendar,
          location:     e.location,
          description:  e.description,
          attendees:    e.attendees,
          sourceDate:   format(viewDate, "yyyy-MM-dd"),
        };
      }),
  ];

  const positioned = layoutDayEvents(rawEvents);

  return (
    <div className="flex flex-col h-full page-transition select-none" data-testid="day-view">
      {/* ── Toolbar ── */}
      <div
        className={cn(
          "flex items-center gap-4 px-6 py-4 flex-shrink-0 border-b border-border/40 transition-colors duration-300",
          isShareMode && "bg-emerald-500/5 border-emerald-500/10"
        )}
      >
        <div className="flex items-center gap-1.5">
          <button onClick={() => go(-1)} className="icon-btn" data-testid="day-prev">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => go(1)} className="icon-btn" data-testid="day-next">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={format(viewDate, "yyyy-MM-dd")}
            initial={{ opacity: 0, y: direction > 0 ? 10 : -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: direction > 0 ? -10 : 10 }}
            transition={{ duration: 0.2 }}
          >
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {format(viewDate, "EEEE")}
              <span className="text-muted-foreground font-light mx-1.5">
                {format(viewDate, "MMMM d, yyyy")}
              </span>
            </h1>
            {today && (
              <span className="text-xs font-medium text-primary">Today</span>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Share mode indicator pill */}
        {isShareMode && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="ml-2 flex items-center gap-2 px-3 py-1.5 rounded-full"
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

      {/* ── Scrollable grid ── */}
      <div ref={scrollRef} className="flex-1 overflow-auto">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={format(viewDate, "yyyy-MM-dd")}
            initial={{ opacity: 0, x: direction > 0 ? 30 : -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? -30 : 30 }}
            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex"
            style={{ height: TOTAL_HEIGHT }}
          >
            {/* Hour labels */}
            <div className="flex-shrink-0 relative" style={{ width: 56, height: TOTAL_HEIGHT }}>
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="absolute right-0 w-full flex justify-end pr-2"
                  style={{ top: h * HOUR_HEIGHT - 8 }}
                >
                  {h > 0 && (
                    <span className="text-[10px] font-medium text-muted-foreground/70 tabular-nums">
                      {format(set(new Date(), { hours: h, minutes: 0, seconds: 0 }), "h a")}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Events column — position:relative is the containing block */}
            <div
              className={cn(
                "flex-1 relative border-l border-border/30",
                !isShareMode && "cursor-cell"
              )}
              style={{ height: TOTAL_HEIGHT }}
              onMouseDown={(e) => {
                if (isShareMode) return;
                e.preventDefault();
                const rect = e.currentTarget.getBoundingClientRect();
                const y = e.clientY - rect.top;
                const snapped = Math.round((y / HOUR_HEIGHT) * 60 / 15) * 15;
                const startMins = Math.max(0, Math.min(snapped, 23 * 60));
                dragRef.current = { start: startMins, current: startMins };
                setDragStart(startMins);
                setDragCurrent(startMins);
                document.body.style.userSelect = "none";
                document.body.style.cursor = "ns-resize";
                const col = e.currentTarget;
                const onMove = (mv: MouseEvent) => {
                  if (!dragRef.current) return;
                  const r = col.getBoundingClientRect();
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
                  openNewEventWithDefaults(
                    format(viewDate, "yyyy-MM-dd"),
                    `${pad(Math.floor(realStart / 60))}:${pad(realStart % 60)}`,
                    `${pad(Math.floor(cappedEnd / 60))}:${pad(cappedEnd % 60)}`
                  );
                };
                document.addEventListener("mousemove", onMove);
                document.addEventListener("mouseup", onUp);
              }}
            >
              {/* Hour lines */}
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
                  className="absolute left-1 right-1 rounded-xl pointer-events-none flex flex-col justify-start px-2.5 py-1.5 overflow-hidden"
                  style={{
                    top: (Math.min(dragStart, dragCurrent) / 60) * HOUR_HEIGHT,
                    height: Math.max(15, Math.abs(dragCurrent - dragStart)) / 60 * HOUR_HEIGHT,
                    background: "hsl(var(--primary) / 0.18)",
                    border: "1.5px solid hsl(var(--primary) / 0.55)",
                    zIndex: 6,
                  }}
                >
                  <p className="font-bold leading-none" style={{ color: "hsl(var(--primary))", fontSize: "11px" }}>
                    {minutesToTimeStr(Math.min(dragStart, dragCurrent))}
                  </p>
                  {Math.abs(dragCurrent - dragStart) >= 30 && (
                    <p className="leading-none opacity-60 mt-1" style={{ color: "hsl(var(--primary))", fontSize: "11px" }}>
                      {minutesToTimeStr(Math.min(Math.max(dragStart, dragCurrent), 24 * 60))}
                    </p>
                  )}
                </div>
              )}

              {/* Positioned events */}
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
                      onResizeStart={(e, origEnd) =>
                        handleResizeStart(e, event.id, origEnd)
                      }
                      onEventClick={setSelectedEvent}
                      dimmed={isShareMode}
                      searchMatch={searchMatch}
                    />
                  );
                })}
              </AnimatePresence>

              {positioned.length === 0 && !isShareMode && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-muted-foreground text-sm">No events</p>
                </div>
              )}

              {/* Availability drag overlay — single column, 60px/hr */}
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
                    <AvailabilityOverlay
                      days={[viewDate]}
                      columns={1}
                      hourHeight={HOUR_HEIGHT}
                    />
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
