import { useState, useEffect } from "react";
import { format, addHours } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Clock,
  MapPin,
  CalendarDays,
  Tag,
  Pencil,
  Trash2,
  X,
  Check,
  AlertTriangle,
  Users,
} from "lucide-react";
import { minutesToTimeStr, type PositionedEvent } from "@/lib/eventLayout";
import { CALENDAR_ITEMS } from "@/store/calendarStore";
import { useEventsStore } from "@/store/eventsStore";
import { CONTACTS } from "@/store/peopleStore";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google Calendar",
  microsoft: "Outlook Calendar",
  icloud: "iCloud Calendar",
};

function durationLabel(startMinutes: number, endMinutes: number): string {
  const d = endMinutes - startMinutes;
  const h = Math.floor(d / 60);
  const m = d % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function minutesToHHMM(minutes: number): string {
  const h = Math.floor(Math.max(0, minutes) / 60) % 24;
  const m = Math.max(0, minutes) % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function toISO(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

// ─── Shared input / field styles ─────────────────────────────────────────────

const inputCls =
  "w-full px-3 py-2 rounded-xl text-sm font-medium " +
  "text-slate-900 dark:text-slate-100 " +
  "placeholder:text-slate-400 dark:placeholder:text-slate-500 " +
  "outline-none transition-all " +
  "bg-slate-100 dark:bg-slate-800 " +
  "border border-transparent " +
  "focus:border-blue-400/60 focus:bg-white dark:focus:bg-slate-700/80";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 pl-0.5">
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  event: PositionedEvent | null;
  onClose: () => void;
}

type Mode = "view" | "edit" | "confirm-delete";

// ─── Component ────────────────────────────────────────────────────────────────

export function EventDetailsModal({ event, onClose }: Props) {
  const { updateEvent, deleteEvent } = useEventsStore();

  const [mode, setMode] = useState<Mode>("view");

  // Edit form state
  const [editTitle, setEditTitle]       = useState("");
  const [editDate, setEditDate]         = useState("");
  const [editStart, setEditStart]       = useState("");
  const [editEnd, setEditEnd]           = useState("");
  const [editCalendar, setEditCalendar] = useState("");
  const [editError, setEditError]       = useState<string | null>(null);

  // Reset to view mode whenever a new event is opened
  useEffect(() => {
    if (event) setMode("view");
  }, [event?.id]);

  // Pre-populate edit form from the event
  function openEdit() {
    if (!event) return;
    const date = event.sourceDate ?? format(new Date(), "yyyy-MM-dd");
    setEditTitle(event.title);
    setEditDate(date);
    setEditStart(minutesToHHMM(event.startMinutes));
    setEditEnd(minutesToHHMM(event.endMinutes));
    setEditCalendar(
      event.calendar ?? CALENDAR_ITEMS.find((c) => c.group === "my")?.label ?? ""
    );
    setEditError(null);
    setMode("edit");
  }

  function handleSave() {
    if (!event) return;
    if (!editTitle.trim()) { setEditError("Title is required."); return; }
    const startISO = toISO(editDate, editStart);
    const endISO   = toISO(editDate, editEnd);
    if (new Date(endISO) <= new Date(startISO)) {
      setEditError("End time must be after start time.");
      return;
    }
    const cal = CALENDAR_ITEMS.find((c) => c.label === editCalendar);
    updateEvent(event.id, {
      title:     editTitle.trim(),
      startTime: startISO,
      endTime:   endISO,
      calendar:  editCalendar,
      color:     cal?.color ?? event.color,
    });
    onClose();
  }

  function handleDelete() {
    if (!event) return;
    deleteEvent(event.id);
    onClose();
  }

  const selectedCal =
    CALENDAR_ITEMS.find((c) => c.label === editCalendar) ??
    CALENDAR_ITEMS.find((c) => c.label === event?.calendar) ??
    CALENDAR_ITEMS[0];

  return (
    <Dialog
      open={!!event}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-sm p-0 overflow-hidden gap-0 rounded-2xl border-0 shadow-2xl">
        {event && (
          <>
            {/* Color accent bar — reacts to calendar choice in edit mode */}
            <div
              className="h-1.5 w-full flex-shrink-0 transition-colors duration-200"
              style={{ backgroundColor: mode === "edit" ? selectedCal.color : event.color }}
            />

            <AnimatePresence mode="wait" initial={false}>
              {/* ── VIEW mode ─────────────────────────────────────────────── */}
              {mode === "view" && (
                <motion.div
                  key="view"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.18 }}
                >
                  <div className="px-5 pt-4 pb-5">
                    {/* Title row + action buttons */}
                    <DialogHeader className="mb-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div
                            className="w-3 h-3 rounded-full mt-[5px] flex-shrink-0"
                            style={{ backgroundColor: event.color }}
                          />
                          <DialogTitle className="text-[17px] font-bold leading-snug">
                            {event.title}
                          </DialogTitle>
                        </div>

                        {/* Edit + Delete buttons */}
                        <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                          <button
                            onClick={openEdit}
                            title="Edit event"
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors bg-slate-100 hover:bg-blue-50 hover:text-blue-600 dark:bg-slate-800 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 text-slate-500"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setMode("confirm-delete")}
                            title="Delete event"
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors bg-slate-100 hover:bg-red-50 hover:text-red-500 dark:bg-slate-800 dark:hover:bg-red-900/30 dark:hover:text-red-400 text-slate-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </DialogHeader>

                    {/* Detail rows */}
                    <ul className="space-y-2.5 pl-[22px]">
                      <li className="flex items-start gap-3">
                        <Clock className="w-4 h-4 text-muted-foreground mt-px flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-none">
                            {minutesToTimeStr(event.startMinutes)}
                            <span className="mx-1 text-muted-foreground">–</span>
                            {minutesToTimeStr(event.endMinutes)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {durationLabel(event.startMinutes, event.endMinutes)}
                          </p>
                        </div>
                      </li>

                      {event.location && (
                        <li className="flex items-center gap-3">
                          <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <p className="text-sm truncate">{event.location}</p>
                        </li>
                      )}

                      {event.calendar && (
                        <li className="flex items-center gap-3">
                          <CalendarDays className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <p className="text-sm">{event.calendar}</p>
                        </li>
                      )}

                      {event.attendees && event.attendees.length > 0 && (
                        <li className="flex items-start gap-3">
                          <Users className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="min-w-0 space-y-1.5">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              {event.attendees.length} guest{event.attendees.length !== 1 ? "s" : ""}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {event.attendees.map((email) => {
                                const contact = CONTACTS.find((c) => c.email === email);
                                const label = contact?.name ?? email;
                                const initials = contact
                                  ? contact.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
                                  : email[0].toUpperCase();
                                const bg = contact?.color ?? "#6B7280";
                                return (
                                  <div
                                    key={email}
                                    className="flex items-center gap-1.5 pl-0.5 pr-2.5 py-0.5 rounded-full text-xs font-semibold"
                                    style={{ background: bg + "18", color: bg, border: `1px solid ${bg}28` }}
                                    title={email}
                                  >
                                    <div
                                      className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                                      style={{ background: bg, fontSize: 9 }}
                                    >
                                      {initials}
                                    </div>
                                    {contact ? contact.name.split(" ")[0] : email.split("@")[0]}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </li>
                      )}

                      {event.provider && (
                        <li className="flex items-center gap-3">
                          <Tag className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <p className="text-sm text-muted-foreground">
                            {PROVIDER_LABELS[event.provider] ?? event.provider}
                          </p>
                        </li>
                      )}
                    </ul>

                    {event.description && (
                      <p className="mt-3 pt-3 text-sm text-muted-foreground border-t border-border/40 pl-[22px]">
                        {event.description}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ── EDIT mode ─────────────────────────────────────────────── */}
              {mode === "edit" && (
                <motion.div
                  key="edit"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.18 }}
                >
                  {/* Edit header */}
                  <div className="flex items-center justify-between px-5 pt-4 pb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: selectedCal.color + "22" }}
                      >
                        <Pencil className="w-3.5 h-3.5" style={{ color: selectedCal.color }} />
                      </div>
                      <span className="text-[15px] font-bold text-slate-900 dark:text-slate-100">
                        Edit Event
                      </span>
                    </div>
                    <button
                      onClick={() => setMode("view")}
                      className="w-7 h-7 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                    >
                      <X className="w-3.5 h-3.5 text-slate-500" />
                    </button>
                  </div>

                  <div className="h-px mx-5 bg-slate-200 dark:bg-slate-700" />

                  {/* Edit form */}
                  <div className="px-5 py-4 space-y-3">
                    <Field label="Title">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => { setEditTitle(e.target.value); setEditError(null); }}
                        onKeyDown={(e) => e.key === "Enter" && handleSave()}
                        autoFocus
                        className={inputCls + " text-base font-semibold"}
                      />
                    </Field>

                    <Field label="Date">
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className={inputCls}
                      />
                    </Field>

                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Start">
                        <div className="relative">
                          <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                          <input
                            type="time"
                            value={editStart}
                            onChange={(e) => {
                              setEditStart(e.target.value);
                              setEditError(null);
                              const [sh, sm] = e.target.value.split(":").map(Number);
                              const [eh, em] = editEnd.split(":").map(Number);
                              if (eh * 60 + em <= sh * 60 + sm) {
                                const newEnd = addHours(new Date(0, 0, 0, sh, sm), 1);
                                setEditEnd(format(newEnd, "HH:mm"));
                              }
                            }}
                            className={inputCls + " pl-7"}
                          />
                        </div>
                      </Field>
                      <Field label="End">
                        <div className="relative">
                          <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                          <input
                            type="time"
                            value={editEnd}
                            onChange={(e) => { setEditEnd(e.target.value); setEditError(null); }}
                            className={inputCls + " pl-7"}
                          />
                        </div>
                      </Field>
                    </div>

                    <Field label="Calendar">
                      <Select value={editCalendar} onValueChange={setEditCalendar}>
                        <SelectTrigger className="w-full rounded-xl text-sm font-medium border-transparent bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-0 focus:ring-offset-0 focus:border-blue-400/60 h-9">
                          <span className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: selectedCal.color }}
                            />
                            <SelectValue />
                          </span>
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-0 shadow-xl">
                          <div className="px-2 pt-2 pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-2 mb-1">
                              My Calendars
                            </p>
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
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-2 mb-1 mt-1">
                              Other
                            </p>
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

                    <AnimatePresence>
                      {editError && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="text-xs font-medium text-red-500"
                        >
                          {editError}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Edit footer */}
                  <div className="px-5 pb-5 pt-1 flex gap-2">
                    <button
                      onClick={() => setMode("view")}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                      style={{
                        background: `linear-gradient(135deg, ${selectedCal.color} 0%, ${selectedCal.color}cc 100%)`,
                        boxShadow: `0 4px 14px ${selectedCal.color}44`,
                      }}
                    >
                      <Check className="w-3.5 h-3.5" />
                      Save Changes
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── CONFIRM DELETE mode ───────────────────────────────────── */}
              {mode === "confirm-delete" && (
                <motion.div
                  key="delete"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="px-5 pt-5 pb-5">
                    {/* Warning icon */}
                    <div className="flex flex-col items-center text-center gap-3 pb-5">
                      <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/25 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-red-500" />
                      </div>
                      <div>
                        <p className="text-[15px] font-bold text-slate-900 dark:text-slate-100">
                          Delete Event?
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            "{event.title}"
                          </span>{" "}
                          will be permanently removed.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setMode("view")}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                      >
                        Keep It
                      </button>
                      <button
                        onClick={handleDelete}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                        style={{
                          background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                          boxShadow: "0 4px 14px rgba(239,68,68,0.4)",
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
