import { create } from "zustand";
import type { Recurrence } from "@/lib/speechNlp";

interface NewEventDefaults {
  date: string;
  startTime: string;
  endTime: string;
}

export interface VoiceFilledEvent {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  nlpBanner: string;
  recurrence?: Recurrence;
}

interface UIState {
  isNewEventOpen: boolean;
  newEventDefaults: NewEventDefaults | null;
  voiceFilledEvent: VoiceFilledEvent | null;
  openNewEvent: () => void;
  openNewEventWithDefaults: (date: string, startTime: string, endTime: string) => void;
  openNewEventWithVoice: (data: VoiceFilledEvent) => void;
  closeNewEvent: () => void;

  searchQuery: string;
  setSearchQuery: (q: string) => void;
  clearSearch: () => void;

  /** Incrementing this tells Sidebar to focus its search input */
  searchFocusKey: number;
  focusSearch: () => void;

  /** yyyy-MM-dd date to jump to when DayView or WeekView mounts */
  targetDate: string | null;
  setTargetDate: (date: string | null) => void;

  /** Jump-to-date palette */
  isJumpOpen: boolean;
  openJump: () => void;
  closeJump: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isNewEventOpen: false,
  newEventDefaults: null,
  voiceFilledEvent: null,
  openNewEvent: () => set({ isNewEventOpen: true, newEventDefaults: null, voiceFilledEvent: null }),
  openNewEventWithDefaults: (date, startTime, endTime) =>
    set({ isNewEventOpen: true, newEventDefaults: { date, startTime, endTime }, voiceFilledEvent: null }),
  openNewEventWithVoice: (data) =>
    set({ isNewEventOpen: true, voiceFilledEvent: data, newEventDefaults: null }),
  closeNewEvent: () => set({ isNewEventOpen: false, newEventDefaults: null, voiceFilledEvent: null }),

  searchQuery: "",
  setSearchQuery: (q) => set({ searchQuery: q }),
  clearSearch: () => set({ searchQuery: "" }),

  searchFocusKey: 0,
  focusSearch: () => set((s) => ({ searchFocusKey: s.searchFocusKey + 1 })),

  targetDate: null,
  setTargetDate: (date) => set({ targetDate: date }),

  isJumpOpen: false,
  openJump: () => set({ isJumpOpen: true }),
  closeJump: () => set({ isJumpOpen: false }),
}));
