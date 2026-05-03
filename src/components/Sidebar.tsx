import { useRef, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "wouter";
import {
  CalendarDays,
  CalendarRange,
  Calendar,
  LayoutGrid,
  Search,
  Settings,
  Sun,
  Moon,
  Plus,
  Users,
  Star,
  RefreshCcw,
  Check,
  X,
  Mic,
  MicOff,
} from "lucide-react";
import { parseEventText, isSpeechSupported, type SpeechRecognitionInstance, type SpeechRecognitionEvent } from "@/lib/speechNlp";
import { useTheme } from "./ThemeProvider";
import { cn } from "@/lib/utils";
import { useUser } from "@clerk/react";
import { useEventsStore } from "@/store/eventsStore";
import { useCalendarStore, CALENDAR_ITEMS } from "@/store/calendarStore";
import { useUIStore } from "@/store/uiStore";
import { useSettingsStore } from "@/store/settingsStore";
import { usePeopleStore } from "@/store/peopleStore";

const navItems = [
  { icon: CalendarDays, label: "Day", href: "/day" },
  { icon: CalendarRange, label: "Week", href: "/week" },
  { icon: Calendar, label: "Month", href: "/" },
  { icon: LayoutGrid, label: "Year", href: "/year" },
];

const calendarGroups = [
  { title: "My Calendars", group: "my" as const },
  { title: "Other", group: "other" as const },
];

// Apple-style calendar checkbox
function CalendarCheckbox({
  label,
  color,
  checked,
  onToggle,
}: {
  label: string;
  color: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onToggle}
      className="w-full flex items-center gap-2.5 rounded-xl px-2 py-1.5 cursor-pointer hover:bg-muted/70 transition-colors text-left group"
      data-testid={`calendar-${label.toLowerCase()}`}
    >
      <div
        className="w-4 h-4 rounded-[5px] flex-shrink-0 flex items-center justify-center transition-all duration-200 border-2"
        style={{
          backgroundColor: checked ? color : "transparent",
          borderColor: color,
          boxShadow: checked ? `0 2px 6px ${color}44` : "none",
        }}
      >
        <AnimatePresence>
          {checked && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.14, type: "spring", stiffness: 500, damping: 25 }}
            >
              <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <span
        className={cn(
          "text-sm transition-colors duration-200 flex-1",
          checked ? "text-foreground/90 font-medium" : "text-muted-foreground line-through decoration-1"
        )}
      >
        {label}
      </span>
    </motion.button>
  );
}

export function Sidebar() {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user } = useUser();
  const { connections, isLoadingEvents, fetchWeekEvents } = useEventsStore();
  const { activeCalendars, toggleCalendar, setAllInGroup } = useCalendarStore();
  const { openNewEvent, openNewEventWithVoice, searchQuery, setSearchQuery, clearSearch, searchFocusKey } = useUIStore();

  // ── Sidebar voice mic ──────────────────────────────────────────────────────
  const [micListening, setMicListening] = useState(false);
  const [micInterim,   setMicInterim]   = useState("");
  const [micSupported, setMicSupported] = useState(false);
  const micRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => { setMicSupported(isSpeechSupported()); }, []);

  const startMic = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous     = false;
    r.interimResults = true;
    r.lang           = "en-US";
    micRef.current   = r;

    r.onstart  = () => setMicListening(true);
    r.onend    = () => { setMicListening(false); setMicInterim(""); };
    r.onerror  = () => { setMicListening(false); setMicInterim(""); };

    r.onresult = (e: SpeechRecognitionEvent) => {
      let interim = "";
      let final   = "";
      for (let i = 0; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      if (final) {
        const parsed = parseEventText(final.trim());
        if (parsed) {
          openNewEventWithVoice({
            title:     parsed.cleanTitle || final.trim(),
            date:      parsed.date,
            startTime: parsed.startTime,
            endTime:   parsed.endTime,
            nlpBanner: parsed.summary,
            ...(parsed.recurrence && { recurrence: parsed.recurrence }),
          });
        } else {
          openNewEventWithVoice({
            title:     final.trim(),
            date:      "",
            startTime: "",
            endTime:   "",
            nlpBanner: "",
          });
        }
        setMicInterim("");
      } else {
        setMicInterim(interim);
      }
    };

    r.start();
  }, [openNewEventWithVoice]);

  const stopMic = useCallback(() => {
    micRef.current?.stop();
    setMicListening(false);
    setMicInterim("");
  }, []);

  const toggleMic = useCallback(() => {
    if (micListening) stopMic();
    else startMic();
  }, [micListening, startMic, stopMic]);

  useEffect(() => () => micRef.current?.abort(), []);
  const { openSettings } = useSettingsStore();
  const { openPeople } = usePeopleStore();
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus search when / shortcut is pressed from CalendarApp
  useEffect(() => {
    if (searchFocusKey > 0) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [searchFocusKey]);

  const handleRefresh = () => {
    if (user) fetchWeekEvents(user.id);
  };

  const isGroupAllActive = (group: "my" | "other") =>
    CALENDAR_ITEMS.filter((c) => c.group === group).every(
      (c) => activeCalendars[c.label] !== false
    );

  const hasQuery = searchQuery.length > 0;

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="sidebar-glass w-64 flex-shrink-0 flex flex-col h-screen sticky top-0 overflow-hidden z-10"
      data-testid="sidebar"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)" }}
          >
            <Calendar className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-foreground">Calendar</span>
        </div>
        <div className="flex items-center gap-1">
          {user && (
            <button
              onClick={handleRefresh}
              className="icon-btn"
              data-testid="button-refresh"
              aria-label="Refresh events"
            >
              <RefreshCcw className={cn("w-4 h-4", isLoadingEvents && "animate-spin")} />
            </button>
          )}
          <button
            onClick={toggleTheme}
            className="icon-btn"
            data-testid="button-toggle-theme"
            aria-label="Toggle theme"
          >
            {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* New Event button + Voice mic */}
      <div className="px-4 mb-4 flex items-center gap-2">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={openNewEvent}
          className="flex-1 flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all duration-150 active:scale-95 min-w-0"
          style={{
            background: "hsl(var(--primary))",
            color: "hsl(var(--primary-foreground))",
            boxShadow: "0 4px 14px hsl(var(--primary) / 0.35)",
          }}
          data-testid="button-new-event"
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">New Event</span>
          <kbd
            className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.22)" }}
          >
            C
          </kbd>
        </motion.button>

        {/* Mic button — standalone voice capture */}
        {micSupported && (
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={toggleMic}
            title={micListening ? (micInterim ? `"${micInterim}"` : "Listening… tap to stop") : "Speak to create event"}
            aria-label={micListening ? "Stop voice input" : "Start voice input"}
            className={cn(
              "relative flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-200",
              micListening
                ? "bg-red-500 text-white shadow-lg shadow-red-500/40"
                : "text-primary hover:opacity-80"
            )}
            style={micListening ? {} : {
              background: "hsl(var(--primary) / 0.15)",
            }}
          >
            {micListening && (
              <span className="absolute inset-0 rounded-2xl bg-red-500 animate-ping opacity-25 pointer-events-none" />
            )}
            {micListening
              ? <MicOff className="w-4 h-4 relative z-10" />
              : <Mic    className="w-4 h-4" />
            }
          </motion.button>
        )}
      </div>

      {/* Listening indicator strip */}
      <AnimatePresence>
        {micListening && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="px-4 -mt-2 mb-3"
          >
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200/60 dark:border-red-800/40">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
              <span className="text-[11px] font-semibold text-red-600 dark:text-red-400 truncate">
                {micInterim ? `"${micInterim}"` : "Listening…"}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <div className="px-4 mb-4">
        <div
          className={cn(
            "flex items-center gap-2 rounded-2xl px-3 py-2 text-sm transition-all duration-200 border",
            hasQuery
              ? "bg-background border-primary/30 shadow-sm shadow-primary/10"
              : "bg-muted/60 border-transparent hover:bg-muted/80"
          )}
          onClick={() => inputRef.current?.focus()}
        >
          <Search
            className={cn(
              "w-4 h-4 flex-shrink-0 transition-colors duration-200",
              hasQuery ? "text-primary" : "text-muted-foreground"
            )}
          />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                clearSearch();
                inputRef.current?.blur();
              }
            }}
            placeholder='Search or type "meetings next week"'
            className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground min-w-0"
          />
          <AnimatePresence>
            {hasQuery && (
              <motion.button
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.12 }}
                onClick={(e) => {
                  e.stopPropagation();
                  clearSearch();
                  inputRef.current?.focus();
                }}
                className="w-4 h-4 rounded-full bg-muted-foreground/30 hover:bg-muted-foreground/50 flex items-center justify-center flex-shrink-0 transition-colors"
              >
                <X className="w-2.5 h-2.5 text-foreground" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Active search hint */}
        <AnimatePresence>
          {hasQuery && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="text-[10px] text-primary font-medium mt-1.5 pl-1"
            >
              Showing matches for "{searchQuery}"
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Nav views */}
      <nav className="px-3 mb-4" data-testid="sidebar-nav">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href === "/" && location === "");
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileTap={{ scale: 0.97 }}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 mb-0.5 text-sm cursor-pointer transition-all duration-150",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground/70 hover:bg-muted hover:text-foreground"
                )}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-indicator"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="mx-4 mb-4 h-px bg-border/50" />

      {/* Connected calendars */}
      {connections.length > 0 && (
        <div className="px-4 mb-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            Connected
          </div>
          {connections.map((conn) => (
            <div key={conn.id} className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
              <div className="w-2 h-2 rounded-full flex-shrink-0 bg-emerald-500" />
              <span className="text-sm text-foreground/80 truncate">
                {conn.email ?? conn.provider}
              </span>
            </div>
          ))}
          <div className="mx-0 my-2 h-px bg-border/50" />
        </div>
      )}

      {/* Calendar groups */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-5" data-testid="sidebar-calendars">
        {calendarGroups.map(({ title, group }) => {
          const items = CALENDAR_ITEMS.filter((c) => c.group === group);
          const allActive = isGroupAllActive(group);

          return (
            <div key={title}>
              <div className="flex items-center justify-between mb-1.5">
                <button
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setAllInGroup(group, !allActive)}
                  title={allActive ? "Hide all" : "Show all"}
                >
                  {title}
                </button>
                <Plus className="w-3.5 h-3.5 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
              </div>
              <div className="space-y-0.5">
                {items.map((cal) => (
                  <CalendarCheckbox
                    key={cal.label}
                    label={cal.label}
                    color={cal.color}
                    checked={activeCalendars[cal.label] !== false}
                    onToggle={() => toggleCalendar(cal.label)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom actions */}
      <div className="px-4 py-4 border-t border-border/40 flex items-center gap-2">
        <button
          className="icon-btn flex-1 gap-2 text-xs"
          data-testid="button-people"
          onClick={openPeople}
        >
          <Users className="w-4 h-4" />
          {user ? (
            <span className="truncate max-w-[60px]">
              {user.firstName ?? user.primaryEmailAddress?.emailAddress.split("@")[0] ?? "Me"}
            </span>
          ) : (
            "People"
          )}
        </button>
        <button className="icon-btn flex-1 gap-2 text-xs" data-testid="button-starred">
          <Star className="w-4 h-4" />
          Starred
        </button>
        <button
          className="icon-btn"
          data-testid="button-settings"
          onClick={() => openSettings("accounts")}
          aria-label="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </motion.aside>
  );
}
