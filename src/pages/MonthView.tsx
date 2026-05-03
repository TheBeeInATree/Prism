import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/GlassCard";
import { EventDetailsModal } from "@/components/EventDetailsModal";
import { SAMPLE_EVENTS } from "@/data/sampleEvents";
import { useCalendarStore } from "@/store/calendarStore";
import { useEventsStore } from "@/store/eventsStore";
import { useUIStore } from "@/store/uiStore";
import { hourToMinutes, type PositionedEvent } from "@/lib/eventLayout";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const PROVIDER_COLORS: Record<string, string> = {
  google: "#3B82F6",
  microsoft: "#10B981",
  icloud: "#8B5CF6",
};

export default function MonthView() {
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [direction, setDirection] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<PositionedEvent | null>(null);

  const { isActive } = useCalendarStore();
  const { events: storeEvents } = useEventsStore();
  const { searchQuery, openNewEventWithDefaults, targetDate, setTargetDate } = useUIStore();

  // Jump to month set by YearView month-name click
  useEffect(() => {
    if (targetDate) {
      const parsed = new Date(targetDate + "T00:00:00");
      if (!isNaN(parsed.getTime())) {
        setViewDate(parsed);
        setSelectedDate(parsed);
      }
      setTargetDate(null);
    }
  }, []);

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const go = (dir: number) => {
    setDirection(dir);
    setViewDate((d) => (dir > 0 ? addMonths(d, 1) : subMonths(d, 1)));
  };

  const parseLocalDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  // Build unified event list for a given day (sample + store)
  const getEventsForDay = (day: Date): PositionedEvent[] => {
    const dateStr = format(day, "yyyy-MM-dd");

    const fromSample = SAMPLE_EVENTS.filter(
      (e) => isSameDay(parseLocalDate(e.date), day) && isActive(e.calendar)
    ).map((e) => {
      const start = hourToMinutes(e.startHour ?? 9);
      const end = hourToMinutes((e.startHour ?? 9) + (e.durationHours ?? 1));
      return {
        id: e.id,
        title: e.title,
        startMinutes: start,
        endMinutes: Math.max(end, start + 15),
        color: e.provider ? (PROVIDER_COLORS[e.provider] ?? e.color) : e.color,
        provider: e.provider,
        calendar: e.calendar,
        location: e.location,
        time: e.time,
        description: e.description,
        sourceDate: dateStr,
        col: 0,
        totalCols: 1,
      } satisfies PositionedEvent;
    });

    const sampleIds = new Set(fromSample.map((e) => e.id));

    const fromStore = storeEvents
      .filter(
        (e) =>
          isSameDay(new Date(e.startTime), day) &&
          isActive(e.calendar ?? "") &&
          !sampleIds.has(e.id)
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
          col: 0,
          totalCols: 1,
        } satisfies PositionedEvent;
      });

    return [...fromSample, ...fromStore].sort(
      (a, b) => a.startMinutes - b.startMinutes
    );
  };

  const openCreate = (day: Date, e: React.MouseEvent) => {
    e.stopPropagation();
    const dateStr = format(day, "yyyy-MM-dd");
    openNewEventWithDefaults(dateStr, "09:00", "10:00");
  };

  const eventMatches = (title: string) =>
    !searchQuery || title.toLowerCase().includes(searchQuery.toLowerCase());

  return (
    <div className="flex flex-col h-full page-transition" data-testid="month-view">
      {/* Toolbar */}
      <div className="flex items-center gap-4 px-6 py-4">
        <div className="flex items-center gap-1.5">
          <button onClick={() => go(-1)} className="icon-btn" data-testid="month-prev">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => go(1)} className="icon-btn" data-testid="month-next">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.h1
            key={format(viewDate, "yyyy-MM")}
            initial={{ opacity: 0, y: direction > 0 ? 10 : -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: direction > 0 ? -10 : 10 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="text-2xl font-bold tracking-tight text-foreground"
            data-testid="month-title"
          >
            {format(viewDate, "MMMM")}
            <span className="ml-2 text-muted-foreground font-light">{format(viewDate, "yyyy")}</span>
          </motion.h1>
        </AnimatePresence>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setViewDate(new Date())}
            className="text-sm font-medium px-3 py-1.5 rounded-xl hover:bg-muted transition-colors text-primary"
            data-testid="button-today"
          >
            Today
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 px-6 pb-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center py-1">
            {d.slice(0, 3)}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 px-6 pb-6 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={format(viewDate, "yyyy-MM")}
            initial={{ opacity: 0, x: direction > 0 ? 40 : -40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? -40 : 40 }}
            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="grid grid-cols-7 h-full"
            style={{ gridTemplateRows: `repeat(${days.length / 7}, 1fr)` }}
          >
            {days.map((day) => {
              const today = isToday(day);
              const selected = selectedDate && isSameDay(day, selectedDate);
              const sameMonth = isSameMonth(day, viewDate);
              const events = getEventsForDay(day);
              const hasSearchMatch = searchQuery
                ? events.some((e) => eventMatches(e.title))
                : true;

              return (
                <motion.div
                  key={day.toISOString()}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "relative group border border-border/30 p-1.5 cursor-pointer transition-colors",
                    !sameMonth && "bg-muted/20",
                    selected && !today && "bg-primary/5",
                    "hover:bg-muted/40",
                    searchQuery && !hasSearchMatch && "opacity-40"
                  )}
                  data-testid={`cal-day-${format(day, "yyyy-MM-dd")}`}
                >
                  {/* Day number + add button */}
                  <div className="flex items-center justify-between mb-0.5">
                    <div
                      className={cn(
                        "w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium transition-all",
                        today && "bg-primary text-primary-foreground font-bold",
                        !today && sameMonth && "text-foreground",
                        !sameMonth && "text-muted-foreground/40"
                      )}
                    >
                      {format(day, "d")}
                    </div>
                    <button
                      onClick={(e) => openCreate(day, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-border rounded-lg"
                    >
                      <Plus className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </div>

                  {/* Events */}
                  <div className="space-y-0.5">
                    {events.slice(0, 3).map((event) => {
                      const matches = eventMatches(event.title);
                      return (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{
                            opacity: searchQuery ? (matches ? 1 : 0.12) : 1,
                            scale: 1,
                          }}
                          transition={{ duration: 0.15 }}
                          className="event-pill truncate"
                          style={{
                            backgroundColor: event.color + "22",
                            color: event.color,
                            filter: searchQuery && !matches ? "grayscale(0.6)" : "none",
                            boxShadow:
                              searchQuery && matches
                                ? `0 0 0 1.5px ${event.color}60`
                                : "none",
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(event);
                          }}
                          data-testid={`event-pill-${event.id}`}
                        >
                          {event.title}
                        </motion.div>
                      );
                    })}
                    {events.length > 3 && (
                      <div className="text-xs text-muted-foreground pl-1">
                        +{events.length - 3} more
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Selected day panel */}
      <AnimatePresence>
        {selectedDate && getEventsForDay(selectedDate).length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="px-6 pb-6"
          >
            <GlassCard className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">
                  {format(selectedDate, "EEEE, MMMM d")}
                </h3>
                <button
                  onClick={(e) => openCreate(selectedDate, e)}
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  <Plus className="w-3 h-3" />
                  Add event
                </button>
              </div>
              <div className="space-y-2">
                {getEventsForDay(selectedDate).map((event) => {
                  const matches = eventMatches(event.title);
                  return (
                    <motion.div
                      key={event.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className="flex items-center gap-3 rounded-xl p-2 hover:bg-muted/50 transition-colors cursor-pointer"
                      style={{
                        opacity: searchQuery ? (matches ? 1 : 0.2) : 1,
                        filter: searchQuery && !matches ? "grayscale(0.5)" : "none",
                      }}
                      onClick={() => setSelectedEvent(event)}
                      data-testid={`event-detail-${event.id}`}
                    >
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: event.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{event.title}</p>
                        {event.time && (
                          <p className="text-xs text-muted-foreground">{event.time}</p>
                        )}
                      </div>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                        style={{ backgroundColor: event.color + "20", color: event.color }}
                      >
                        {event.calendar}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      <EventDetailsModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
}
