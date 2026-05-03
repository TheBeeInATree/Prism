import { useState, useEffect, useRef, useCallback } from "react";
import { format, addHours, startOfHour } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, CalendarDays, Clock, Tag, Check, Users, UserPlus, UserCheck,
  Sparkles, MapPin, LocateFixed, Loader2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseEventText, recurrenceLabel, type Recurrence } from "@/lib/speechNlp";
import { CALENDAR_ITEMS } from "@/store/calendarStore";
import { useEventsStore } from "@/store/eventsStore";
import { useUIStore } from "@/store/uiStore";
import { usePeopleStore, CONTACTS, type Contact } from "@/store/peopleStore";
import { cn } from "@/lib/utils";

// ─── Helpers ────────────────────────────────────────────────────────────────

function defaultTimes() {
  const now = new Date();
  const start = addHours(startOfHour(now), 1);
  const end = addHours(start, 1);
  return {
    date: format(now, "yyyy-MM-dd"),
    startTime: format(start, "HH:mm"),
    endTime: format(end, "HH:mm"),
  };
}

function toISO(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

function genId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

// ─── Location field ───────────────────────────────────────────────────────────

const QUICK_LOCATIONS = [
  { icon: "🖥", label: "Online / Video Call" },
  { icon: "🏢", label: "Office" },
  { icon: "☕", label: "Coffee Shop" },
  { icon: "🏠", label: "Home" },
  { icon: "🍽", label: "Restaurant" },
];

interface NominatimResult {
  place_id: string;
  display_name: string;
}

interface PlaceSuggestion {
  id: string;
  name: string;
  address: string;
}

function formatNominatim(r: NominatimResult): PlaceSuggestion {
  const parts = r.display_name.split(", ");
  return {
    id:      r.place_id,
    name:    parts.slice(0, 2).join(", "),
    address: parts.slice(2, 4).join(", "),
  };
}

function LocationField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [query,      setQuery]      = useState(value);
  const [open,       setOpen]       = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [results,    setResults]    = useState<PlaceSuggestion[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // sync external resets
  useEffect(() => { setQuery(value); }, [value]);

  // close on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const runSearch = useCallback((q: string) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (q.trim().length < 3) { setResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res  = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`,
          { headers: { "Accept-Language": "en" } }
        );
        const data: NominatimResult[] = await res.json();
        setResults(data.map(formatNominatim));
      } catch { setResults([]); }
      finally  { setLoading(false); }
    }, 450);
  }, []);

  const handleChange = (v: string) => {
    setQuery(v); onChange(v); runSearch(v); setOpen(true);
  };

  const handleSelect = (label: string) => {
    setQuery(label); onChange(label); setResults([]); setOpen(false);
  };

  const useMyLocation = async () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 })
      );
      const { latitude: lat, longitude: lon } = pos.coords;
      const r    = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await r.json();
      const name = (data.display_name as string)?.split(", ").slice(0, 3).join(", ") ?? "Current Location";
      setQuery(name); onChange(name); setOpen(false);
    } catch { /* user denied or timed out — silently ignore */ }
    finally { setGeoLoading(false); }
  };

  const showQuick   = open && !query.trim();
  const showResults = open && results.length > 0;
  const showSpinner = open && loading && !showQuick;
  const showDropdown = showQuick || showResults || showSpinner;

  return (
    <div ref={containerRef} className="relative">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none z-10" />
      <input
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="Add location"
        className={cn(inputCls, "pl-8 pr-9")}
      />
      {/* Current-location button */}
      <button
        type="button"
        onClick={useMyLocation}
        title="Use my current location"
        disabled={geoLoading}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center transition-colors bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-blue-100 hover:text-blue-500 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 disabled:opacity-50"
      >
        {geoLoading
          ? <Loader2 className="w-3 h-3 animate-spin" />
          : <LocateFixed className="w-3 h-3" />}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.13 }}
            className="absolute left-0 right-0 top-full mt-1.5 z-30 rounded-2xl overflow-hidden shadow-xl border border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-zinc-900"
          >
            {showQuick && (
              <>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-3 pt-2.5 pb-1">
                  Quick suggestions
                </p>
                {QUICK_LOCATIONS.map((q) => (
                  <button
                    key={q.label}
                    type="button"
                    onClick={() => handleSelect(q.label)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <span className="text-base w-5 text-center leading-none flex-shrink-0">{q.icon}</span>
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{q.label}</span>
                  </button>
                ))}
              </>
            )}
            {showSpinner && (
              <div className="flex items-center gap-2 px-3 py-3 text-xs text-slate-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                Searching places…
              </div>
            )}
            {showResults && results.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSelect(s.name)}
                className="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{s.name}</p>
                  {s.address && (
                    <p className="text-[11px] text-slate-400 truncate">{s.address}</p>
                  )}
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 pl-1">
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── Input class ──────────────────────────────────────────────────────────────

const inputCls =
  "w-full px-4 py-2.5 rounded-2xl text-sm font-medium " +
  "text-slate-900 dark:text-slate-100 " +
  "placeholder:text-slate-400 dark:placeholder:text-slate-500 " +
  "outline-none transition-all " +
  "bg-slate-100 dark:bg-slate-800 " +
  "border border-transparent " +
  "focus:border-blue-400/60 focus:bg-white dark:focus:bg-slate-700/80";

// ─── Guest chip ────────────────────────────────────────────────────────────────

function GuestChip({ contact, onRemove }: { contact: Contact; onRemove: () => void }) {
  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.85, opacity: 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 28 }}
      className="flex items-center gap-1 pl-0.5 pr-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: contact.color + "18", color: contact.color, border: `1px solid ${contact.color}28` }}
    >
      <div
        className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
        style={{ background: contact.color, fontSize: 9 }}
      >
        {initials(contact.name)}
      </div>
      {contact.name.split(" ")[0]}
      <button type="button" onClick={onRemove} className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity">
        <X className="w-2.5 h-2.5" />
      </button>
    </motion.div>
  );
}

// ─── Guests field ─────────────────────────────────────────────────────────────

function GuestsField() {
  const { invitedIds, invite, uninvite, openPeople } = usePeopleStore();
  const [query, setQuery] = useState("");
  const [open, setOpen]   = useState(false);
  const ref      = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const invitedContacts = CONTACTS.filter((c) => invitedIds.includes(c.id));
  const suggestions = CONTACTS.filter(
    (c) =>
      !invitedIds.includes(c.id) &&
      (c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.role.toLowerCase().includes(query.toLowerCase()) ||
        c.email.toLowerCase().includes(query.toLowerCase()))
  ).slice(0, 5);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="space-y-2">
      <AnimatePresence initial={false}>
        {invitedContacts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-1.5"
          >
            {invitedContacts.map((c) => (
              <GuestChip key={c.id} contact={c} onRemove={() => uninvite(c.id)} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={invitedContacts.length === 0 ? "Add guests…" : "Add more guests…"}
          className={cn(inputCls, "pl-8 py-2")}
        />
        <AnimatePresence>
          {open && (query.length > 0 || invitedIds.length === 0) && suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.12 }}
              className="absolute left-0 right-0 top-full mt-1.5 z-20 rounded-2xl overflow-hidden shadow-xl border border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-zinc-900"
            >
              {suggestions.map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => { invite(contact.id); setQuery(""); inputRef.current?.focus(); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0"
                    style={{ background: contact.color }}
                  >
                    {initials(contact.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{contact.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{contact.role}</p>
                  </div>
                  {invitedIds.includes(contact.id) && <UserCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button
        type="button"
        onClick={() => { setOpen(false); openPeople(); }}
        className="text-[11px] font-semibold text-primary/80 hover:text-primary transition-colors pl-1"
      >
        Browse all contacts →
      </button>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function NewEventModal() {
  const { isNewEventOpen, closeNewEvent, newEventDefaults, voiceFilledEvent } = useUIStore();
  const { addEvent }                    = useEventsStore();
  const { invitedIds, clearInvites }    = usePeopleStore();

  const defaults = defaultTimes();
  const [title,     setTitle]     = useState("");
  const [date,      setDate]      = useState(defaults.date);
  const [startTime, setStartTime] = useState(defaults.startTime);
  const [endTime,   setEndTime]   = useState(defaults.endTime);
  const [location,  setLocation]  = useState("");
  const [calendar,  setCalendar]  = useState(CALENDAR_ITEMS[0].label);
  const [saved,     setSaved]     = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  // ── NLP + Recurrence state ────────────────────────────────────────────────
  const [nlpBanner,  setNlpBanner]  = useState<string | null>(null);
  const [recurrence, setRecurrence] = useState<Recurrence | null>(null);
  const nlpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedCal = CALENDAR_ITEMS.find((c) => c.label === calendar) ?? CALENDAR_ITEMS[0];

  // Reset on open — also handles voice pre-fill
  useEffect(() => {
    if (isNewEventOpen) {
      if (voiceFilledEvent) {
        setTitle(voiceFilledEvent.title);
        setNlpBanner(voiceFilledEvent.nlpBanner || null);
        setRecurrence(voiceFilledEvent.recurrence ?? null);
        if (voiceFilledEvent.date)      setDate(voiceFilledEvent.date);
        if (voiceFilledEvent.startTime) setStartTime(voiceFilledEvent.startTime);
        if (voiceFilledEvent.endTime)   setEndTime(voiceFilledEvent.endTime);
      } else if (newEventDefaults) {
        setDate(newEventDefaults.date);
        setStartTime(newEventDefaults.startTime);
        setEndTime(newEventDefaults.endTime);
        setTitle("");
        setNlpBanner(null);
        setRecurrence(null);
      } else {
        const d = defaultTimes();
        setDate(d.date);
        setStartTime(d.startTime);
        setEndTime(d.endTime);
        setTitle("");
        setNlpBanner(null);
        setRecurrence(null);
      }
      setLocation("");
      setCalendar(CALENDAR_ITEMS[0].label);
      setSaved(false);
      setError(null);
    }
  }, [isNewEventOpen]);

  // ── NLP: debounced parse on title change ──────────────────────────────────
  useEffect(() => {
    if (nlpTimer.current) clearTimeout(nlpTimer.current);

    if (!title.trim() || title.trim().length < 6) {
      setNlpBanner(null);
      return;
    }

    nlpTimer.current = setTimeout(() => {
      const result = parseEventText(title);
      if (result) {
        setDate(result.date);
        setStartTime(result.startTime);
        setEndTime(result.endTime);
        setTitle(result.cleanTitle || title);
        setNlpBanner(result.summary);
        if (result.recurrence) setRecurrence(result.recurrence);
      } else {
        setNlpBanner(null);
      }
    }, 700);

    return () => { if (nlpTimer.current) clearTimeout(nlpTimer.current); };
  }, [title]);

  // ─────────────────────────────────────────────────────────────────────────
  const reset = () => {
    const d = defaultTimes();
    setTitle(""); setDate(d.date); setStartTime(d.startTime); setEndTime(d.endTime);
    setLocation("");
    setCalendar(CALENDAR_ITEMS[0].label); setSaved(false); setError(null);
    setNlpBanner(null); setRecurrence(null);
  };

  const handleClose = () => {
    clearInvites();
    closeNewEvent();
    setTimeout(reset, 300);
  };

  const handleSubmit = () => {
    if (!title.trim()) { setError("Event title is required."); return; }
    const startISO = toISO(date, startTime);
    const endISO   = toISO(date, endTime);
    if (new Date(endISO) <= new Date(startISO)) {
      setError("End time must be after start time.");
      return;
    }
    setError(null);

    const guestEmails = CONTACTS
      .filter((c) => invitedIds.includes(c.id))
      .map((c) => c.email);

    addEvent({
      id:        genId(),
      title:     title.trim(),
      startTime: startISO,
      endTime:   endISO,
      timezone:  Intl.DateTimeFormat().resolvedOptions().timeZone,
      calendar,
      color:     selectedCal.color,
      ...(location.trim()        && { location: location.trim() }),
      ...(guestEmails.length > 0 && { attendees: guestEmails }),
      ...(recurrence             && { recurrence }),
    });

    setSaved(true);
    setTimeout(() => { handleClose(); }, 900);
  };

  return (
    <AnimatePresence>
      {isNewEventOpen && (
        <motion.div
          key="new-event-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(10px)" }}
          onClick={handleClose}
        >
          <motion.div
            key="new-event-card"
            initial={{ opacity: 0, scale: 0.93, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 20 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="w-full max-w-sm rounded-3xl overflow-hidden flex flex-col bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08]"
            style={{
              backdropFilter: "blur(48px) saturate(1.8)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.12)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Accent bar ── */}
            <div className="h-1 w-full flex-shrink-0" style={{ backgroundColor: selectedCal.color }} />

            {/* ── Header ── */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: selectedCal.color + "22" }}
                >
                  <CalendarDays className="w-4 h-4" style={{ color: selectedCal.color }} />
                </div>
                <h2 className="text-[17px] font-bold text-slate-900 dark:text-slate-100 leading-tight">
                  New Event
                </h2>
              </div>
              <button
                onClick={handleClose}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-colors bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                <X className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            <div className="h-px mx-5 bg-slate-200 dark:bg-slate-700" />

            {/* ── Form ── */}
            <div className="px-5 py-4 space-y-4">

              {/* ── Title ── */}
              <Field label="Event Title">
                <div className="relative">
                  <input
                    type="text"
                    placeholder='Add title…'
                    value={title}
                    onChange={(e) => { setTitle(e.target.value); setError(null); setNlpBanner(null); }}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    autoFocus
                    className={cn(inputCls, "text-base font-semibold")}
                  />
                </div>

                {/* NLP result banner */}
                <AnimatePresence>
                  {nlpBanner && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -4, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center justify-between pt-1.5"
                    >
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold"
                        style={{
                          background: selectedCal.color + "14",
                          color: selectedCal.color,
                          border: `1px solid ${selectedCal.color}28`,
                        }}
                      >
                        <Sparkles className="w-3 h-3 flex-shrink-0" />
                        <span>Smart fill: {nlpBanner}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNlpBanner(null)}
                        className="ml-2 opacity-40 hover:opacity-70 transition-opacity"
                      >
                        <X className="w-3 h-3 text-slate-500" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Field>

              {/* Date */}
              <Field label="Date">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={inputCls}
                />
              </Field>

              {/* Location */}
              <Field label="Location">
                <LocationField value={location} onChange={setLocation} />
              </Field>

              {/* Start / End Time */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start Time">
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => {
                        setStartTime(e.target.value);
                        setError(null);
                        const [sh, sm] = e.target.value.split(":").map(Number);
                        const [eh, em] = endTime.split(":").map(Number);
                        if (eh * 60 + em <= sh * 60 + sm) {
                          setEndTime(format(addHours(new Date(0, 0, 0, sh, sm), 1), "HH:mm"));
                        }
                      }}
                      className={inputCls + " pl-8"}
                    />
                  </div>
                </Field>
                <Field label="End Time">
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => { setEndTime(e.target.value); setError(null); }}
                      className={inputCls + " pl-8"}
                    />
                  </div>
                </Field>
              </div>

              {/* ── Repeat ── */}
              <Field label="Repeat">
                <div className="flex gap-1.5 flex-wrap">
                  {(["none", "daily", "weekly", "monthly", "yearly"] as const).map((opt) => {
                    const active = opt === "none" ? recurrence === null : recurrence?.freq === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          if (opt === "none") { setRecurrence(null); return; }
                          setRecurrence(
                            recurrence?.freq === opt
                              ? recurrence
                              : { freq: opt }
                          );
                        }}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all capitalize",
                          active
                            ? "text-white shadow-sm"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                        )}
                        style={active && opt !== "none" ? { background: selectedCal.color } : active ? { background: selectedCal.color } : {}}
                      >
                        {opt === "none" ? "Never" : opt.charAt(0).toUpperCase() + opt.slice(1)}
                      </button>
                    );
                  })}
                </div>

                {/* Day-of-week chips (weekly only) */}
                <AnimatePresence>
                  {recurrence?.freq === "weekly" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.15 }}
                      className="flex gap-1.5 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60"
                    >
                      {["Su","Mo","Tu","We","Th","Fr","Sa"].map((label, i) => {
                        const sel = recurrence.days?.includes(i) ?? false;
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              const days = recurrence.days ?? [];
                              const next = sel
                                ? days.filter((d) => d !== i)
                                : [...days, i].sort((a, b) => a - b);
                              setRecurrence({ ...recurrence, days: next.length ? next : undefined });
                            }}
                            className={cn(
                              "w-8 h-8 rounded-full text-[11px] font-bold transition-all flex-shrink-0 flex items-center justify-center",
                              sel
                                ? "text-white shadow-sm"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                            )}
                            style={sel ? { background: selectedCal.color } : {}}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Active recurrence badge */}
                <AnimatePresence>
                  {recurrence && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold w-fit"
                      style={{
                        background: selectedCal.color + "14",
                        color: selectedCal.color,
                        border: `1px solid ${selectedCal.color}28`,
                      }}
                    >
                      <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                        <path d="M21 3v5h-5"/>
                        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                        <path d="M8 16H3v5"/>
                      </svg>
                      {recurrenceLabel(recurrence)}
                    </motion.div>
                  )}
                </AnimatePresence>
              </Field>

              {/* Calendar */}
              <Field label="Calendar">
                <Select value={calendar} onValueChange={setCalendar}>
                  <SelectTrigger className="w-full rounded-2xl text-sm font-medium border-transparent bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-0 focus:ring-offset-0 focus:border-blue-400/60 h-10">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: selectedCal.color }} />
                      <SelectValue />
                    </span>
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-0 shadow-xl">
                    <div className="px-2 pt-2 pb-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-2 mb-1">My Calendars</p>
                      {CALENDAR_ITEMS.filter((c) => c.group === "my").map((cal) => (
                        <SelectItem key={cal.label} value={cal.label} className="rounded-xl cursor-pointer">
                          <span className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cal.color }} />
                            {cal.label}
                          </span>
                        </SelectItem>
                      ))}
                    </div>
                    <div className="px-2 pt-1 pb-2 border-t border-slate-100 dark:border-slate-700 mt-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-2 mb-1 mt-1">Other</p>
                      {CALENDAR_ITEMS.filter((c) => c.group === "other").map((cal) => (
                        <SelectItem key={cal.label} value={cal.label} className="rounded-xl cursor-pointer">
                          <span className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cal.color }} />
                            {cal.label}
                          </span>
                        </SelectItem>
                      ))}
                    </div>
                  </SelectContent>
                </Select>
              </Field>

              {/* Guests */}
              <Field label="Guests">
                <GuestsField />
              </Field>

              {/* Invited count badge */}
              <AnimatePresence>
                {invitedIds.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                    style={{ background: "rgba(59,130,246,0.08)", color: "#3B82F6", border: "1px solid rgba(59,130,246,0.15)" }}
                  >
                    <Users className="w-3.5 h-3.5" />
                    {invitedIds.length} guest{invitedIds.length !== 1 ? "s" : ""} will be invited
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-xs font-medium text-red-500 pl-1"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* ── Footer ── */}
            <div className="px-5 pb-5 pt-1 flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 py-2.5 rounded-2xl text-sm font-semibold text-slate-600 dark:text-slate-300 transition-colors bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saved}
                className="flex-1 py-2.5 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-80"
                style={{
                  background: saved ? "rgba(16,185,129,0.9)" : `linear-gradient(135deg, ${selectedCal.color} 0%, ${selectedCal.color}cc 100%)`,
                  boxShadow: `0 4px 16px ${selectedCal.color}44`,
                }}
              >
                {saved ? (
                  <><Check className="w-4 h-4" />Saved!</>
                ) : (
                  <><Tag className="w-4 h-4" />Add Event</>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
