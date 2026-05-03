import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CalendarItem {
  label: string;
  color: string;
  group: "my" | "other";
}

export const CALENDAR_ITEMS: CalendarItem[] = [
  { label: "Personal", color: "#3B82F6", group: "my" },
  { label: "Work", color: "#10B981", group: "my" },
  { label: "Family", color: "#F59E0B", group: "my" },
  { label: "Birthdays", color: "#EC4899", group: "my" },
  { label: "Holidays", color: "#8B5CF6", group: "other" },
  { label: "Reminders", color: "#EF4444", group: "other" },
];

interface CalendarState {
  activeCalendars: Record<string, boolean>;
  toggleCalendar: (label: string) => void;
  setCalendar: (label: string, active: boolean) => void;
  setAllInGroup: (group: "my" | "other", active: boolean) => void;
  isActive: (label: string) => boolean;
}

const defaultActive = Object.fromEntries(
  CALENDAR_ITEMS.map((c) => [c.label, true])
);

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set, get) => ({
      activeCalendars: defaultActive,

      toggleCalendar: (label) =>
        set((s) => ({
          activeCalendars: {
            ...s.activeCalendars,
            [label]: !s.activeCalendars[label],
          },
        })),

      setCalendar: (label, active) =>
        set((s) => ({
          activeCalendars: { ...s.activeCalendars, [label]: active },
        })),

      setAllInGroup: (group, active) => {
        const labels = CALENDAR_ITEMS.filter((c) => c.group === group).map(
          (c) => c.label
        );
        set((s) => ({
          activeCalendars: {
            ...s.activeCalendars,
            ...Object.fromEntries(labels.map((l) => [l, active])),
          },
        }));
      },

      // Unknown calendars default to visible
      isActive: (label) => get().activeCalendars[label] ?? true,
    }),
    { name: "calendar-visibility" }
  )
);
