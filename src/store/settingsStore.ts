import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ProviderKey = "google" | "microsoft" | "icloud";

export interface MockConnection {
  provider: ProviderKey;
  email: string;
  connectedAt: string;
  syncEnabled: boolean;
}

export type SettingsTab = "accounts" | "general" | "about";

interface SettingsStore {
  isOpen: boolean;
  activeTab: SettingsTab;
  connections: MockConnection[];

  openSettings: (tab?: SettingsTab) => void;
  closeSettings: () => void;
  setTab: (tab: SettingsTab) => void;

  connectProvider: (provider: ProviderKey, email: string) => void;
  disconnectProvider: (provider: ProviderKey) => void;
  toggleSync: (provider: ProviderKey) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      isOpen: false,
      activeTab: "accounts",
      connections: [],

      openSettings: (tab = "accounts") => set({ isOpen: true, activeTab: tab }),
      closeSettings: () => set({ isOpen: false }),
      setTab: (tab) => set({ activeTab: tab }),

      connectProvider: (provider, email) =>
        set((s) => ({
          connections: [
            ...s.connections.filter((c) => c.provider !== provider),
            {
              provider,
              email,
              connectedAt: new Date().toISOString(),
              syncEnabled: true,
            },
          ],
        })),

      disconnectProvider: (provider) =>
        set((s) => ({
          connections: s.connections.filter((c) => c.provider !== provider),
        })),

      toggleSync: (provider) =>
        set((s) => ({
          connections: s.connections.map((c) =>
            c.provider === provider ? { ...c, syncEnabled: !c.syncEnabled } : c
          ),
        })),
    }),
    { name: "calendar-settings-v1" }
  )
);
