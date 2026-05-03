import { create } from "zustand";
import type { Recurrence } from "@/lib/speechNlp";

export type { Recurrence };

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  timezone: string;
  calendar?: string;
  color?: string;
  location?: string;
  description?: string;
  provider?: string;
  attendees?: string[]; // email addresses
  recurrence?: Recurrence;
}

export interface CalendarConnection {
  id: number;
  provider: string;
  email?: string | null;
  connectedAt: string;
}

interface EventsState {
  events: CalendarEvent[];
  connections: CalendarConnection[];
  isLoadingEvents: boolean;
  isLoadingConnections: boolean;
  error: string | null;
  setEvents: (events: CalendarEvent[]) => void;
  addEvent: (event: CalendarEvent) => void;
  updateEvent: (id: string, patch: Partial<Omit<CalendarEvent, "id">>) => void;
  deleteEvent: (id: string) => void;
  setConnections: (connections: CalendarConnection[]) => void;
  setLoadingEvents: (loading: boolean) => void;
  setLoadingConnections: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchWeekEvents: (userId: string) => Promise<void>;
  fetchConnections: (userId: string) => Promise<void>;
}

const PROVIDER_COLORS: Record<string, string> = {
  google: "#3B82F6",
  microsoft: "#10B981",
  icloud: "#8B5CF6",
};

export const useEventsStore = create<EventsState>((set, get) => ({
  events: [],
  connections: [],
  isLoadingEvents: false,
  isLoadingConnections: false,
  error: null,

  setEvents: (events) => set({ events }),
  addEvent: (event) => set((s) => ({ events: [...s.events, event] })),
  updateEvent: (id, patch) =>
    set((s) => ({
      events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    })),
  deleteEvent: (id) =>
    set((s) => ({ events: s.events.filter((e) => e.id !== id) })),
  setConnections: (connections) => set({ connections }),
  setLoadingEvents: (loading) => set({ isLoadingEvents: loading }),
  setLoadingConnections: (loading) => set({ isLoadingConnections: loading }),
  setError: (error) => set({ error }),

  fetchWeekEvents: async (userId: string) => {
    set({ isLoadingEvents: true, error: null });
    try {
      const res = await fetch(`/api/events/week?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error(`Failed to fetch events: ${res.statusText}`);
      const data = await res.json() as { events: CalendarEvent[] };
      const colored = data.events.map((e) => ({
        ...e,
        color: e.color ?? PROVIDER_COLORS[e.provider ?? ""] ?? "#6B7280",
      }));
      set({ events: colored });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to load events" });
    } finally {
      set({ isLoadingEvents: false });
    }
  },

  fetchConnections: async (userId: string) => {
    set({ isLoadingConnections: true });
    try {
      const res = await fetch(`/api/calendar/connections?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error("Failed to fetch connections");
      const data = await res.json() as { connections: CalendarConnection[] };
      set({ connections: data.connections });
    } catch {
      set({ connections: [] });
    } finally {
      set({ isLoadingConnections: false });
    }
  },
}));
