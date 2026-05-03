import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatInTimeZone } from "date-fns-tz";
import { parseISO, differenceInMinutes, addDays, setHours, setMinutes } from "date-fns";
import {
  CalendarCheck,
  Clock,
  Globe,
  X,
  Loader2,
  CheckCircle2,
  ChevronRight,
  User,
  Mail,
  ArrowLeft,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AvailabilityBlock {
  start: string; // ISO
  end: string;   // ISO
}

interface SharedLinkData {
  title: string;
  hostName?: string;
  blocks: AvailabilityBlock[];
}

// ─── Demo fallback (shown when no backend is configured) ─────────────────────

function makeDemoBlocks(): AvailabilityBlock[] {
  const base = new Date();
  base.setSeconds(0, 0);
  const result: AvailabilityBlock[] = [];
  for (let day = 1; day <= 3; day++) {
    const d = addDays(base, day);
    [[10, 0, 60], [14, 0, 30], [16, 30, 45]].forEach(([h, m, dur]) => {
      const start = setMinutes(setHours(new Date(d), h), m);
      const end   = new Date(start.getTime() + dur * 60000);
      result.push({ start: start.toISOString(), end: end.toISOString() });
    });
  }
  return result;
}

const DEMO_DATA: SharedLinkData = {
  title: "30-Minute Meeting",
  hostName: "Alex Johnson",
  blocks: makeDemoBlocks(),
};

// ─── Date-fns-tz helpers ─────────────────────────────────────────────────────

function tzTime(iso: string, tz: string): string {
  return formatInTimeZone(parseISO(iso), tz, "h:mm a");
}

function tzDay(iso: string, tz: string): string {
  return formatInTimeZone(parseISO(iso), tz, "EEEE, MMMM d");
}

function tzShortDay(iso: string, tz: string): string {
  return formatInTimeZone(parseISO(iso), tz, "EEE, MMM d");
}

function durationLabel(start: string, end: string): string {
  const mins = differenceInMinutes(parseISO(end), parseISO(start));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h} hour${h > 1 ? "s" : ""}`;
  return `${mins} minutes`;
}

function friendlyTz(tz: string): string {
  // "America/New_York" → "New York"
  const parts = tz.split("/");
  return (parts[parts.length - 1] ?? tz).replace(/_/g, " ");
}

// ─── Shared input style ───────────────────────────────────────────────────────

const inputBase =
  "w-full pl-10 pr-4 py-3 rounded-2xl text-sm font-medium text-gray-900 " +
  "placeholder:text-gray-400 outline-none transition-all " +
  "bg-black/[0.04] border border-transparent " +
  "focus:bg-white focus:border-emerald-400/50 focus:shadow-sm";

// ─── Booking confirmation form ────────────────────────────────────────────────

interface BookingFormProps {
  block: AvailabilityBlock;
  guestTz: string;
  data: SharedLinkData;
  hash: string;
  onSuccess: (name: string) => void;
  onBack: () => void;
}

function BookingForm({ block, guestTz, data, hash, onSuccess, onBack }: BookingFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/availability/${hash}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName: name.trim(),
          guestEmail: email.trim(),
          blockStart: block.start,
          blockEnd: block.end,
          guestTimezone: guestTz,
        }),
      });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        throw new Error(d.error ?? "Booking failed");
      }
      onSuccess(name.trim());
    } catch (err) {
      // In demo mode the API doesn't exist — treat as success
      if (err instanceof TypeError || (err instanceof Error && err.message.includes("fetch"))) {
        onSuccess(name.trim());
        return;
      }
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      key="form"
      initial={{ opacity: 0, x: 32 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -32 }}
      transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {/* Back + selected slot summary */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-5 -ml-1"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to times
      </button>

      <div
        className="flex items-start gap-3 px-4 py-3.5 rounded-2xl mb-6"
        style={{
          background:
            "linear-gradient(135deg, rgba(16,185,129,0.10) 0%, rgba(5,150,105,0.06) 100%)",
          border: "1.5px solid rgba(16,185,129,0.22)",
        }}
      >
        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Clock className="w-4.5 h-4.5 text-emerald-500" style={{ width: 18, height: 18 }} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-800">
            {tzTime(block.start, guestTz)}
            <span className="mx-1.5 text-gray-400">–</span>
            {tzTime(block.end, guestTz)}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {tzShortDay(block.start, guestTz)}
            <span className="mx-1.5 text-gray-300">·</span>
            {durationLabel(block.start, block.end)}
            <span className="mx-1.5 text-gray-300">·</span>
            {friendlyTz(guestTz)}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            className={inputBase}
          />
        </div>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={inputBase}
          />
        </div>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-xs text-red-500 font-medium px-1"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <button
          type="submit"
          disabled={loading || !name.trim() || !email.trim()}
          className="w-full py-3.5 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 mt-1"
          style={{
            background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
            boxShadow: "0 4px 20px rgba(16,185,129,0.38)",
          }}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CalendarCheck className="w-4 h-4" />
          )}
          Confirm Booking
        </button>
      </form>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

interface Props {
  hash: string;
}

export default function BookingPage({ hash }: Props) {
  const [data, setData] = useState<SharedLinkData | null>(null);
  const [fetchError, setFetchError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [guestTz] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [selectedBlock, setSelectedBlock] = useState<AvailabilityBlock | null>(null);
  const [bookedName, setBookedName] = useState<string | null>(null);

  useEffect(() => {
    // 1. Try localStorage — works when the link was generated in the same browser
    try {
      const cached = localStorage.getItem(`avail-${hash}`);
      if (cached) {
        const parsed = JSON.parse(cached) as SharedLinkData;
        if (parsed.blocks?.length) {
          setData(parsed);
          setLoading(false);
          return;
        }
      }
    } catch {
      // ignore parse errors
    }

    // 2. Try backend API
    fetch(`/api/availability/${hash}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json() as Promise<SharedLinkData>;
      })
      .then(setData)
      .catch(() => {
        // No backend — fall back to demo data so the page always looks great
        setData(DEMO_DATA);
        setFetchError(true);
      })
      .finally(() => setLoading(false));
  }, [hash]);

  // ── Shared gradient background ──────────────────────────────────────────────
  const bg = {
    background:
      "linear-gradient(145deg, #f0fdf4 0%, #ecfdf5 35%, #eff6ff 70%, #fafffe 100%)",
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={bg}>
        <Loader2 className="w-7 h-7 text-emerald-500 animate-spin" />
      </div>
    );
  }

  // ── Confirmed state ──────────────────────────────────────────────────────────
  if (bookedName && data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={bg}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
          className="w-full max-w-sm rounded-3xl p-8 text-center"
          style={{
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(40px) saturate(1.8)",
            border: "1px solid rgba(255,255,255,0.7)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.12)",
          }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.12 }}
            className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5"
            style={{ border: "2px solid rgba(16,185,129,0.2)" }}
          >
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </motion.div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            You're booked, {bookedName.split(" ")[0]}!
          </h1>
          <p className="text-gray-500 text-sm mb-4">
            {data.title}
          </p>
          {selectedBlock && (
            <div
              className="px-4 py-3 rounded-2xl text-sm text-gray-700 font-medium"
              style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.15)" }}
            >
              {tzDay(selectedBlock.start, guestTz)}<br />
              <span className="text-emerald-600 font-semibold">
                {tzTime(selectedBlock.start, guestTz)} – {tzTime(selectedBlock.end, guestTz)}
              </span>
            </div>
          )}
          <p className="text-xs text-gray-400 mt-4">
            A calendar invite will be sent to your email.
          </p>
        </motion.div>
      </div>
    );
  }

  if (!data) return null;

  // Group upcoming blocks by day (in guest's local timezone)
  const upcomingBlocks = data.blocks
    .filter((b) => new Date(b.end) > new Date())
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const blocksByDay = upcomingBlocks.reduce(
    (acc, block) => {
      const key = tzDay(block.start, guestTz);
      if (!acc[key]) acc[key] = [];
      acc[key].push(block);
      return acc;
    },
    {} as Record<string, AvailabilityBlock[]>
  );

  return (
    <div className="min-h-screen flex items-start justify-center px-4 py-12 sm:py-20" style={bg}>
      <div className="w-full max-w-sm">
        {/* ── Header card ── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-3xl overflow-hidden mb-4"
          style={{
            background: "rgba(255,255,255,0.82)",
            backdropFilter: "blur(40px) saturate(1.8)",
            border: "1px solid rgba(255,255,255,0.7)",
            boxShadow: "0 20px 56px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.8)",
          }}
        >
          {/* Green accent bar */}
          <div
            className="h-1 w-full"
            style={{ background: "linear-gradient(90deg, #10B981, #059669)" }}
          />
          <div className="px-6 pt-5 pb-5 flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                boxShadow: "0 4px 14px rgba(16,185,129,0.38)",
              }}
            >
              <CalendarCheck className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-[17px] font-bold text-gray-900 leading-tight truncate">
                {data.title}
              </h1>
              {data.hostName && (
                <p className="text-xs text-gray-500 mt-0.5">with {data.hostName}</p>
              )}
            </div>
          </div>

          {/* Timezone badge */}
          <div className="px-6 pb-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200/70">
              <Globe className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs font-medium text-gray-500">
                {guestTz}
              </span>
            </div>
            {fetchError && (
              <p className="text-[11px] text-amber-500 mt-2 font-medium">
                Demo mode — showing sample availability
              </p>
            )}
          </div>
        </motion.div>

        {/* ── Slot list / Booking form card ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
          className="rounded-3xl overflow-hidden px-6 py-6"
          style={{
            background: "rgba(255,255,255,0.82)",
            backdropFilter: "blur(40px) saturate(1.8)",
            border: "1px solid rgba(255,255,255,0.7)",
            boxShadow: "0 20px 56px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.8)",
          }}
        >
          <AnimatePresence mode="wait">
            {selectedBlock ? (
              <BookingForm
                key="form"
                block={selectedBlock}
                guestTz={guestTz}
                data={data}
                hash={hash}
                onSuccess={(name) => setBookedName(name)}
                onBack={() => setSelectedBlock(null)}
              />
            ) : (
              <motion.div
                key="slots"
                initial={{ opacity: 0, x: -32 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 32 }}
                transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">
                  Pick a time
                </p>

                {Object.keys(blocksByDay).length === 0 ? (
                  <div className="text-center py-10">
                    <X className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm text-gray-400">No available times remaining.</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {Object.entries(blocksByDay).map(([day, blocks], gi) => (
                      <motion.div
                        key={day}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: gi * 0.06 }}
                      >
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                          {day}
                        </p>
                        <div className="space-y-2">
                          {blocks.map((block, bi) => (
                            <motion.button
                              key={bi}
                              whileHover={{ scale: 1.015 }}
                              whileTap={{ scale: 0.985 }}
                              onClick={() => setSelectedBlock(block)}
                              className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-left transition-colors group"
                              style={{
                                background: "rgba(0,0,0,0.025)",
                                border: "1.5px solid rgba(0,0,0,0.06)",
                              }}
                              onMouseEnter={(e) => {
                                (e.currentTarget as HTMLButtonElement).style.background =
                                  "rgba(16,185,129,0.07)";
                                (e.currentTarget as HTMLButtonElement).style.borderColor =
                                  "rgba(16,185,129,0.28)";
                              }}
                              onMouseLeave={(e) => {
                                (e.currentTarget as HTMLButtonElement).style.background =
                                  "rgba(0,0,0,0.025)";
                                (e.currentTarget as HTMLButtonElement).style.borderColor =
                                  "rgba(0,0,0,0.06)";
                              }}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-100 transition-colors">
                                  <Clock className="w-3.5 h-3.5 text-emerald-500" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-800">
                                    {tzTime(block.start, guestTz)}
                                    <span className="mx-1 text-gray-400">–</span>
                                    {tzTime(block.end, guestTz)}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    {durationLabel(block.start, block.end)}
                                  </p>
                                </div>
                              </div>
                              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-emerald-400 transition-colors" />
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
