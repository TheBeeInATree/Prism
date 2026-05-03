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
  addMonths,
  subMonths,
  isToday,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface MiniCalendarProps {
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  className?: string;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function MiniCalendar({ selectedDate, onDateSelect, className }: MiniCalendarProps) {
  const [viewDate, setViewDate] = useState(selectedDate ?? new Date());
  const [direction, setDirection] = useState(0);

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const go = (dir: number) => {
    setDirection(dir);
    setViewDate((d) => (dir > 0 ? addMonths(d, 1) : subMonths(d, 1)));
  };

  return (
    <div className={cn("select-none", className)} data-testid="mini-calendar">
      {/* Month header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => go(-1)}
          className="icon-btn w-6 h-6 p-0.5"
          data-testid="mini-cal-prev"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <motion.span
          key={format(viewDate, "yyyy-MM")}
          initial={{ opacity: 0, y: direction > 0 ? 6 : -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs font-semibold text-foreground"
        >
          {format(viewDate, "MMMM yyyy")}
        </motion.span>
        <button
          onClick={() => go(1)}
          className="icon-btn w-6 h-6 p-0.5"
          data-testid="mini-cal-next"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-0.5">
            {d}
          </div>
        ))}
      </div>

      {/* Days */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={format(viewDate, "yyyy-MM")}
          initial={{ opacity: 0, x: direction > 0 ? 20 : -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction > 0 ? -20 : 20 }}
          transition={{ duration: 0.18, ease: "easeInOut" }}
          className="grid grid-cols-7 gap-y-0.5"
        >
          {days.map((day) => {
            const today = isToday(day);
            const selected = selectedDate && isSameDay(day, selectedDate);
            const sameMonth = isSameMonth(day, viewDate);

            return (
              <button
                key={day.toISOString()}
                onClick={() => onDateSelect?.(day)}
                className={cn(
                  "w-7 h-7 mx-auto flex items-center justify-center text-[11px] rounded-full transition-all duration-100",
                  !sameMonth && "opacity-25",
                  today && "bg-primary text-primary-foreground font-semibold",
                  selected && !today && "bg-primary/15 text-primary font-semibold",
                  !today && !selected && "hover:bg-muted text-foreground/80"
                )}
                data-testid={`mini-day-${format(day, "yyyy-MM-dd")}`}
              >
                {format(day, "d")}
              </button>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
