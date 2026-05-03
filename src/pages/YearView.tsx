import { useState } from "react";
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
  addYears,
  subYears,
  setMonth,
  setYear,
  getMonth,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { SAMPLE_EVENTS } from "@/data/sampleEvents";
import { useEventsStore } from "@/store/eventsStore";
import { useUIStore } from "@/store/uiStore";

const MONTHS = Array.from({ length: 12 }, (_, i) => i);
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function MiniMonth({
  year,
  month,
  onDayClick,
  onMonthClick,
  currentMonth,
}: {
  year: number;
  month: number;
  onDayClick: (day: Date) => void;
  onMonthClick: (year: number, month: number) => void;
  currentMonth: boolean;
}) {
  const base = setMonth(setYear(new Date(), year), month);
  const monthStart = startOfMonth(base);
  const monthEnd = endOfMonth(base);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const { events: storeEvents } = useEventsStore();

  // Count events for density dots (max 3)
  const eventCount = (day: Date) => {
    const sample = SAMPLE_EVENTS.filter((e) => isSameDay(new Date(e.date), day)).length;
    const store  = storeEvents.filter((e) => isSameDay(new Date(e.startTime), day)).length;
    return Math.min(sample + store, 3);
  };

  return (
    <div className="p-3">
      {/* Month name — clickable to go to month view */}
      <button
        className={cn(
          "w-full text-sm font-semibold mb-2 text-center transition-colors hover:text-primary",
          currentMonth ? "text-primary" : "text-foreground"
        )}
        onClick={() => onMonthClick(year, month)}
      >
        {format(base, "MMMM")}
      </button>

      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="text-center text-[9px] text-muted-foreground font-medium">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((day) => {
          const today = isToday(day);
          const sameMonth = isSameMonth(day, base);
          const count = sameMonth ? eventCount(day) : 0;

          return (
            <button
              key={day.toISOString()}
              disabled={!sameMonth}
              onClick={() => sameMonth && onDayClick(day)}
              className={cn(
                "flex flex-col items-center justify-center w-5 h-5 mx-auto rounded-full text-[9px] transition-all duration-100",
                today && "bg-primary text-primary-foreground font-bold",
                !today && sameMonth && "text-foreground/80 hover:bg-primary/15 hover:text-primary cursor-pointer",
                !sameMonth && "text-muted-foreground/20 cursor-default"
              )}
            >
              <span className="leading-none">{sameMonth ? format(day, "d") : ""}</span>
              {count > 0 && !today && (
                <div className="flex gap-px mt-px">
                  {Array.from({ length: count }).map((_, i) => (
                    <div key={i} className="w-[3px] h-[3px] rounded-full bg-primary opacity-70" />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function YearView() {
  const [year, setYearState] = useState(new Date().getFullYear());
  const [direction, setDirection] = useState(0);
  const [, navigate] = useLocation();
  const { setTargetDate } = useUIStore();

  const now = new Date();
  const currentMonth = getMonth(now);
  const currentYear = now.getFullYear();

  const go = (dir: number) => {
    setDirection(dir);
    setYearState((y) => y + dir);
  };

  const handleDayClick = (day: Date) => {
    setTargetDate(format(day, "yyyy-MM-dd"));
    navigate("/day");
  };

  const handleMonthClick = (y: number, month: number) => {
    // Navigate to month view — we'll just navigate to / (MonthView)
    // and pass the date so MonthView can jump to that month
    setTargetDate(format(setMonth(setYear(new Date(), y), month), "yyyy-MM-dd"));
    navigate("/month");
  };

  return (
    <div className="flex flex-col h-full page-transition" data-testid="year-view">
      {/* Toolbar */}
      <div className="flex items-center gap-4 px-6 py-4">
        <div className="flex items-center gap-1.5">
          <button onClick={() => go(-1)} className="icon-btn" data-testid="year-prev">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => go(1)} className="icon-btn" data-testid="year-next">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.h1
            key={year}
            initial={{ opacity: 0, y: direction > 0 ? 10 : -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: direction > 0 ? -10 : 10 }}
            transition={{ duration: 0.2 }}
            className="text-2xl font-bold tracking-tight text-foreground"
          >
            {year}
          </motion.h1>
        </AnimatePresence>
        <div className="ml-auto">
          <button
            onClick={() => setYearState(new Date().getFullYear())}
            className="text-sm font-medium px-3 py-1.5 rounded-xl hover:bg-muted transition-colors text-primary"
            data-testid="button-today"
          >
            This Year
          </button>
        </div>
      </div>

      {/* Month grid */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={year}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-3 gap-4"
          >
            {MONTHS.map((month, i) => {
              const isCurrentMonth = year === currentYear && month === currentMonth;
              return (
                <motion.div
                  key={month}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02, duration: 0.18 }}
                  className={cn(
                    "glass-card overflow-hidden transition-shadow hover:shadow-md",
                    isCurrentMonth && "ring-1 ring-primary/30"
                  )}
                  data-testid={`year-month-${month}`}
                >
                  <MiniMonth
                    year={year}
                    month={month}
                    onDayClick={handleDayClick}
                    onMonthClick={handleMonthClick}
                    currentMonth={isCurrentMonth}
                  />
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
