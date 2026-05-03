import { create } from "zustand";

export interface AvailableBlock {
  id: string;
  start: string; // ISO UTC
  end: string;   // ISO UTC
}

interface AvailabilityState {
  isShareMode: boolean;
  availableBlocks: AvailableBlock[];
  title: string;
  sharedLink: string | null;
  isSubmitting: boolean;
  toggleShareMode: () => void;
  setShareMode: (active: boolean) => void;
  addBlock: (block: AvailableBlock) => void;
  removeBlock: (id: string) => void;
  clearBlocks: () => void;
  setTitle: (title: string) => void;
  setSharedLink: (link: string | null) => void;
  createSharedLink: (userId: string, title: string) => Promise<string | null>;
}

export const useAvailabilityStore = create<AvailabilityState>((set, get) => ({
  isShareMode: false,
  availableBlocks: [],
  title: "",
  sharedLink: null,
  isSubmitting: false,

  toggleShareMode: () =>
    set((s) => ({ isShareMode: !s.isShareMode, sharedLink: null })),

  setShareMode: (active) =>
    set({ isShareMode: active, sharedLink: null }),

  addBlock: (block) =>
    set((s) => ({ availableBlocks: [...s.availableBlocks, block] })),

  removeBlock: (id) =>
    set((s) => ({
      availableBlocks: s.availableBlocks.filter((b) => b.id !== id),
    })),

  clearBlocks: () => set({ availableBlocks: [], sharedLink: null }),

  setTitle: (title) => set({ title }),

  setSharedLink: (link) => set({ sharedLink: link }),

  createSharedLink: async (userId, title) => {
    const { availableBlocks } = get();
    if (availableBlocks.length === 0) return null;

    set({ isSubmitting: true });
    try {
      const res = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          title,
          blocks: availableBlocks.map((b) => ({ start: b.start, end: b.end })),
        }),
      });
      if (!res.ok) throw new Error("Failed to create link");
      const data = (await res.json()) as { url: string };
      set({ sharedLink: data.url });
      return data.url;
    } catch {
      return null;
    } finally {
      set({ isSubmitting: false });
    }
  },
}));
