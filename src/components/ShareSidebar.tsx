import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  X,
  Copy,
  Check,
  Hash,
  Trash2,
  CalendarCheck,
  ClipboardList,
  Link2,
  Users,
} from "lucide-react";
import { useAvailabilityStore, type AvailableBlock } from "@/store/availabilityStore";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function localTime(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  const ampm = h < 12 ? "AM" : "PM";
  const dh = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${dh}:${String(m).padStart(2, "0")} ${ampm}`;
}

function durationLabel(startMs: number, endMs: number): string {
  const mins = Math.round((endMs - startMs) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function generateHash(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(
    { length: 12 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

export function formatBlocksAsText(blocks: AvailableBlock[]): string {
  const sorted = [...blocks].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );
  return sorted
    .map((block) => {
      const s = new Date(block.start);
      const e = new Date(block.end);
      return `${format(s, "EEEE, MMM d")}: ${localTime(s)} – ${localTime(e)}`;
    })
    .join("\n");
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ShareSidebar() {
  const {
    isShareMode,
    toggleShareMode,
    availableBlocks,
    removeBlock,
    clearBlocks,
    title,
    setTitle,
  } = useAvailabilityStore();

  const [bookingLink, setBookingLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  const snippet = formatBlocksAsText(availableBlocks);

  const blocksByDay = availableBlocks.reduce(
    (acc, block) => {
      const key = format(new Date(block.start), "yyyy-MM-dd");
      if (!acc[key]) acc[key] = [];
      acc[key].push(block);
      return acc;
    },
    {} as Record<string, typeof availableBlocks>
  );

  const handleGenerateLink = () => {
    const hash = generateHash();
    const origin = window.location.origin;
    const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
    const url = `${origin}${base}/book/${hash}`;
    setBookingLink(url);

    // Persist blocks so BookingPage can read them from the same browser
    const payload = {
      title: title.trim() || "Meeting",
      blocks: availableBlocks.map((b) => ({ start: b.start, end: b.end })),
    };
    try {
      localStorage.setItem(`avail-${hash}`, JSON.stringify(payload));
    } catch {
      // storage full or blocked — booking page falls back to demo
    }
  };

  const handleCopyLink = () => {
    if (!bookingLink) return;
    navigator.clipboard.writeText(bookingLink).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(snippet).then(() => {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    });
  };

  const handleClose = () => {
    setBookingLink(null);
    toggleShareMode();
  };

  return (
    <AnimatePresence>
      {isShareMode && (
        <motion.div
          key="share-sidebar"
          initial={{ width: 0 }}
          animate={{ width: 288 }}
          exit={{ width: 0 }}
          transition={{ type: "spring", stiffness: 340, damping: 36 }}
          className="flex-shrink-0 border-l border-border/50 overflow-hidden bg-card dark:bg-card relative z-10"
          style={{ minWidth: 0 }}
        >
          {/* Inner wrapper — fixed-width so content doesn't compress during animation */}
          <div className="w-72 h-full flex flex-col">

            {/* ── Header ── */}
            <div
              className="flex items-center justify-between px-4 pt-4 pb-3 flex-shrink-0 border-b border-border/40"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                    boxShadow: "0 4px 10px rgba(16,185,129,0.35)",
                  }}
                >
                  <Users className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground leading-tight">
                    Share Availability
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-px">
                    {availableBlocks.length === 0
                      ? "Drag on the calendar to add times"
                      : `${availableBlocks.length} block${availableBlocks.length !== 1 ? "s" : ""} selected`}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-colors bg-muted hover:bg-muted/80 flex-shrink-0"
                title="Exit Share Mode (S)"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>

            {/* ── Scrollable body ── */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 min-h-0">

              {/* Meeting title */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-0.5">
                  Meeting Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Coffee Chat"
                  className="w-full px-3 py-2 rounded-xl text-sm font-medium text-foreground placeholder:text-muted-foreground/60 outline-none transition-all bg-muted/60 border border-transparent focus:border-emerald-400/60 focus:bg-background"
                />
              </div>

              {/* ── Selected time blocks ── */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Available Times
                  </label>
                  {availableBlocks.length > 0 && (
                    <button
                      onClick={clearBlocks}
                      className="text-[10px] font-semibold text-red-400 hover:text-red-500 transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {availableBlocks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 rounded-2xl border border-dashed border-border/50 text-center gap-2">
                    <CalendarCheck className="w-7 h-7 text-muted-foreground/30" />
                    <p className="text-xs text-muted-foreground/60 leading-snug px-3">
                      Drag on the calendar to select your available times
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <AnimatePresence initial={false}>
                      {Object.entries(blocksByDay)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([dayKey, blocks]) => (
                          <motion.div
                            key={dayKey}
                            layout
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, height: 0, overflow: "hidden" }}
                          >
                            <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider mb-1.5">
                              {format(new Date(dayKey + "T12:00:00"), "EEE, MMM d")}
                            </p>
                            <div className="space-y-1.5">
                              {blocks.map((block) => {
                                const s = new Date(block.start);
                                const e = new Date(block.end);
                                return (
                                  <motion.div
                                    key={block.id}
                                    layout
                                    initial={{ opacity: 0, x: 8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 8, height: 0 }}
                                    transition={{ duration: 0.14 }}
                                    className="flex items-center justify-between px-3 py-2 rounded-xl group"
                                    style={{
                                      background:
                                        "linear-gradient(135deg, rgba(16,185,129,0.09) 0%, rgba(5,150,105,0.05) 100%)",
                                      border: "1px solid rgba(16,185,129,0.20)",
                                    }}
                                  >
                                    <div className="min-w-0">
                                      <p className="text-xs font-semibold text-foreground leading-tight">
                                        {localTime(s)}
                                        <span className="mx-1 text-muted-foreground">–</span>
                                        {localTime(e)}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground mt-px">
                                        {durationLabel(s.getTime(), e.getTime())}
                                      </p>
                                    </div>
                                    <button
                                      onClick={() => removeBlock(block.id)}
                                      className="w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all ml-1.5 flex-shrink-0 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40"
                                    >
                                      <Trash2 className="w-2.5 h-2.5 text-red-400" />
                                    </button>
                                  </motion.div>
                                );
                              })}
                            </div>
                          </motion.div>
                        ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* ── Plain-text snippet ── */}
              {availableBlocks.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                      <ClipboardList className="w-3 h-3" />
                      Text Snippet
                    </label>
                    <button
                      onClick={handleCopyText}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all"
                      style={{
                        background: copiedText
                          ? "rgba(16,185,129,0.12)"
                          : "rgba(0,0,0,0.06)",
                        color: copiedText ? "#059669" : "#6b7280",
                      }}
                    >
                      {copiedText ? (
                        <><Check className="w-2.5 h-2.5" />Copied!</>
                      ) : (
                        <><Copy className="w-2.5 h-2.5" />Copy</>
                      )}
                    </button>
                  </div>
                  <div
                    className="rounded-xl px-3 py-2.5 font-mono text-[11px] leading-relaxed text-foreground/70 select-all"
                    style={{
                      background: "rgba(0,0,0,0.04)",
                      border: "1px solid rgba(0,0,0,0.07)",
                      whiteSpace: "pre",
                      overflowX: "auto",
                    }}
                  >
                    {snippet}
                  </div>
                </div>
              )}

              {/* ── Booking link ── */}
              {availableBlocks.length > 0 && bookingLink && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-1.5"
                >
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                    <Link2 className="w-3 h-3" />
                    Booking Link
                  </label>
                  <div
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                    style={{
                      background: "rgba(0,0,0,0.04)",
                      border: "1px solid rgba(0,0,0,0.08)",
                    }}
                  >
                    <Hash className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                    <p className="text-[11px] text-foreground/70 flex-1 truncate font-mono">
                      {bookingLink}
                    </p>
                    <button
                      onClick={handleCopyLink}
                      className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-colors"
                      style={{
                        background: copiedLink
                          ? "rgba(16,185,129,0.15)"
                          : "rgba(0,0,0,0.07)",
                      }}
                    >
                      {copiedLink ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center">
                    Anyone with this link can book a slot
                  </p>
                </motion.div>
              )}
            </div>

            {/* ── Footer ── */}
            <div className="px-4 pb-4 pt-3 flex-shrink-0 border-t border-border/40 space-y-2">
              {!bookingLink ? (
                <button
                  onClick={handleGenerateLink}
                  disabled={availableBlocks.length === 0}
                  className="w-full py-2.5 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{
                    background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                    boxShadow:
                      availableBlocks.length > 0
                        ? "0 4px 16px rgba(16,185,129,0.35)"
                        : "none",
                  }}
                >
                  <Hash className="w-4 h-4" />
                  Create Link
                </button>
              ) : (
                <button
                  onClick={handleCopyLink}
                  className="w-full py-2.5 rounded-2xl text-sm font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  style={{
                    background: copiedLink
                      ? "rgba(16,185,129,0.12)"
                      : "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                    color: copiedLink ? "#059669" : "white",
                    boxShadow: copiedLink ? "none" : "0 4px 16px rgba(16,185,129,0.35)",
                  }}
                >
                  {copiedLink ? (
                    <><Check className="w-4 h-4" />Copied!</>
                  ) : (
                    <><Copy className="w-4 h-4" />Copy Link</>
                  )}
                </button>
              )}
              <button
                onClick={handleCopyText}
                disabled={availableBlocks.length === 0}
                className="w-full py-2 rounded-2xl text-sm font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted"
              >
                {copiedText ? (
                  <><Check className="w-3.5 h-3.5 text-emerald-500" />Snippet Copied!</>
                ) : (
                  <><Copy className="w-3.5 h-3.5" />Copy Text Snippet</>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
