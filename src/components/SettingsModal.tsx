import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  User,
  Info,
  SlidersHorizontal,
  CheckCircle2,
  RefreshCcw,
  Trash2,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettingsStore, ProviderKey, SettingsTab } from "@/store/settingsStore";

// ── Provider definitions ───────────────────────────────────────────────────
const PROVIDERS: {
  key: ProviderKey;
  label: string;
  description: string;
  fakeEmail: string;
  logo: React.FC<{ className?: string; style?: React.CSSProperties }>;
  accent: string;
  bg: string;
  border: string;
}[] = [
  {
    key: "google",
    label: "Google Calendar",
    description: "Sync events from your Google account",
    fakeEmail: "you@gmail.com",
    logo: GoogleLogo,
    accent: "#4285F4",
    bg: "rgba(66,133,244,0.09)",
    border: "rgba(66,133,244,0.22)",
  },
  {
    key: "microsoft",
    label: "Microsoft Outlook",
    description: "Sync Outlook and Exchange calendars",
    fakeEmail: "you@outlook.com",
    logo: OutlookLogo,
    accent: "#0078D4",
    bg: "rgba(0,120,212,0.09)",
    border: "rgba(0,120,212,0.22)",
  },
  {
    key: "icloud",
    label: "Apple iCloud",
    description: "Sync iCloud and Apple Calendar events",
    fakeEmail: "you@icloud.com",
    logo: AppleLogo,
    accent: "#555",
    bg: "rgba(120,120,128,0.09)",
    border: "rgba(120,120,128,0.22)",
  },
];

// ── Inline SVG brand logos ─────────────────────────────────────────────────
function GoogleLogo({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function OutlookLogo({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none">
      <rect x="1" y="4" width="14" height="16" rx="2" fill="#0078D4"/>
      <rect x="7" y="8" width="4" height="8" rx="1" fill="white" opacity="0.9"/>
      <rect x="13" y="7" width="10" height="10" rx="1.5" fill="#50D9FF"/>
      <path d="M13 7l5 5-5 5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

function AppleLogo({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  );
}

// ── Toggle switch ──────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={cn(
        "relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none",
        checked ? "bg-primary" : "bg-muted-foreground/30"
      )}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 700, damping: 35 }}
        className={cn(
          "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-md ring-0",
          checked ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
  );
}

// ── Sidebar tab definitions ────────────────────────────────────────────────
const TABS: { id: SettingsTab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: "accounts", label: "Accounts", icon: ({ className }) => <User className={className} /> },
  { id: "general",  label: "General",  icon: ({ className }) => <SlidersHorizontal className={className} /> },
  { id: "about",    label: "About",    icon: ({ className }) => <Info className={className} /> },
];

// ── Accounts tab ───────────────────────────────────────────────────────────
function AccountsTab() {
  const { connections, connectProvider, disconnectProvider, toggleSync } = useSettingsStore();
  const [connecting, setConnecting] = useState<ProviderKey | null>(null);
  const [disconnecting, setDisconnecting] = useState<ProviderKey | null>(null);

  const getConn = (key: ProviderKey) => connections.find((c) => c.provider === key);

  const handleConnect = async (provider: ProviderKey, fakeEmail: string) => {
    setConnecting(provider);
    console.log(`[Settings] Initiating mock OAuth for ${provider}…`);
    await new Promise((r) => setTimeout(r, 1600));
    connectProvider(provider, fakeEmail);
    console.log(`[Settings] ${provider} connected (mock)`);
    setConnecting(null);
  };

  const handleDisconnect = async (provider: ProviderKey) => {
    setDisconnecting(provider);
    await new Promise((r) => setTimeout(r, 600));
    disconnectProvider(provider);
    setDisconnecting(null);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Connect external calendar providers to import and sync your events. You can toggle sync on or off per account without disconnecting.
      </p>

      <div className="space-y-2 pt-1">
        {PROVIDERS.map((p, i) => {
          const conn = getConn(p.key);
          const isConnected = !!conn;
          const isConnecting = connecting === p.key;
          const isDisconnecting = disconnecting === p.key;

          return (
            <motion.div
              key={p.key}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl border bg-card/60 backdrop-blur-sm overflow-hidden"
              style={{ borderColor: isConnected ? p.border : "hsl(var(--border) / 0.6)" }}
            >
              <div className="flex items-center gap-4 px-4 py-3.5">
                {/* Logo */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: p.bg, border: `1px solid ${p.border}` }}
                >
                  <p.logo className="w-5 h-5" style={{ color: p.accent } as React.CSSProperties} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{p.label}</span>
                    {isConnected && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-full"
                      >
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        Connected
                      </motion.span>
                    )}
                  </div>
                  {isConnected ? (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {conn!.email} · since {new Date(conn!.connectedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                  )}
                </div>

                {/* Action */}
                {isConnected ? (
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground font-medium">Sync</span>
                      <Toggle
                        checked={conn!.syncEnabled}
                        onChange={() => toggleSync(p.key)}
                      />
                    </div>
                    <button
                      onClick={() => handleDisconnect(p.key)}
                      disabled={isDisconnecting}
                      className="p-1.5 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                      title="Disconnect"
                    >
                      {isDisconnecting
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => handleConnect(p.key, p.fakeEmail)}
                    disabled={isConnecting}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-70 flex-shrink-0"
                    style={{
                      background: isConnecting ? "hsl(var(--muted))" : `hsl(var(--primary))`,
                      color: isConnecting ? "hsl(var(--muted-foreground))" : "hsl(var(--primary-foreground))",
                    }}
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Connecting…
                      </>
                    ) : (
                      <>Connect</>
                    )}
                  </motion.button>
                )}
              </div>

              {/* Sync status bar — shown when connected */}
              <AnimatePresence>
                {isConnected && conn!.syncEnabled && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div
                      className="px-4 py-2 flex items-center gap-2 border-t"
                      style={{ background: p.bg, borderColor: p.border }}
                    >
                      <RefreshCcw className="w-3 h-3 flex-shrink-0" style={{ color: p.accent }} />
                      <span className="text-[11px] font-medium" style={{ color: p.accent }}>
                        Syncing automatically · Last synced just now
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ── General tab ────────────────────────────────────────────────────────────
function GeneralTab() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/60 bg-card/60 divide-y divide-border/40">
        {[
          { label: "Default view", value: "Month" },
          { label: "Week starts on", value: "Sunday" },
          { label: "Time format", value: "12-hour" },
          { label: "Time zone", value: Intl.DateTimeFormat().resolvedOptions().timeZone },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-foreground">{label}</span>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              {value}
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground px-1">These preferences are saved locally on your device.</p>
    </div>
  );
}

// ── About tab ──────────────────────────────────────────────────────────────
function AboutTab() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center py-6 gap-3">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
          style={{ background: "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)" }}
        >
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 002 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5z"/>
          </svg>
        </div>
        <div className="text-center">
          <p className="font-semibold text-foreground">Calendar</p>
          <p className="text-xs text-muted-foreground mt-0.5">Version 1.0.0</p>
        </div>
      </div>
      <div className="rounded-2xl border border-border/60 bg-card/60 divide-y divide-border/40">
        {[
          { label: "Built with", value: "React + Vite" },
          { label: "UI", value: "shadcn/ui + Tailwind" },
          { label: "Animations", value: "Framer Motion" },
          { label: "Calendar sync", value: "Nylas API" },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-foreground">{label}</span>
            <span className="text-sm text-muted-foreground">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main modal ─────────────────────────────────────────────────────────────
export function SettingsModal() {
  const { isOpen, activeTab, setTab, closeSettings } = useSettingsStore();

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSettings();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, closeSettings]);

  const tabContent: Record<SettingsTab, React.ReactNode> = {
    accounts: <AccountsTab />,
    general: <GeneralTab />,
    about: <AboutTab />,
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="settings-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={closeSettings}
          />

          {/* Modal */}
          <motion.div
            key="settings-modal"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none"
          >
            <div
              className="relative w-full max-w-2xl h-[580px] rounded-3xl shadow-2xl flex overflow-hidden pointer-events-auto"
              style={{
                background: "hsl(var(--background) / 0.96)",
                backdropFilter: "blur(24px)",
                border: "1px solid hsl(var(--border) / 0.6)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Left sidebar */}
              <div
                className="w-52 flex-shrink-0 flex flex-col py-6 border-r border-border/40"
                style={{ background: "hsl(var(--muted) / 0.4)" }}
              >
                <div className="px-5 mb-6">
                  <p className="text-base font-bold text-foreground tracking-tight">Settings</p>
                </div>

                <nav className="flex-1 px-3 space-y-0.5">
                  {TABS.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setTab(id)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 text-left",
                        activeTab === id
                          ? "bg-primary/10 text-primary"
                          : "text-foreground/70 hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {label}
                      {activeTab === id && (
                        <motion.div
                          layoutId="settings-tab-indicator"
                          className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                        />
                      )}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Main content */}
              <div className="flex-1 flex flex-col min-w-0">
                {/* Content header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border/40">
                  <h2 className="text-sm font-semibold text-foreground">
                    {TABS.find((t) => t.id === activeTab)?.label}
                  </h2>
                  <button
                    onClick={closeSettings}
                    className="w-7 h-7 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                    aria-label="Close settings"
                  >
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>

                {/* Tab body */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.16 }}
                    >
                      {tabContent[activeTab]}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
