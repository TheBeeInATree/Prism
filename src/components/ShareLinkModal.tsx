import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  X,
  Copy,
  Check,
  Link2,
  Trash2,
  CalendarCheck,
  Hash,
  ClipboardList,
} from "lucide-react";
import { useAvailabilityStore, type AvailableBlock } from "@/store/availabilityStore";

// ─── Helpers ────────────────────────────────────────────────────────────────

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

// ─── Component ──────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
}

export function ShareLinkModal({ onClose }: Props) {
  const { availableBlocks, removeBlock, clearBlocks } = useAvailabilityStore();

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
    setBookingLink(`${origin}/book/${hash}`);
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(10px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 24 }}
        transition={{ type: "spring", stiffness: 400, damping: 32 }}
        className="w-full max-w-md rounded-3xl overflow-hidden flex flex-col"
        style={{
          background:
            "linear-gradient(160deg, rgba(255,255,255,0.88) 0%, rgba(242,248,255,0.82) 100%)",
          backdropFilter: "blur(48px) saturate(1.9)",
          border: "1px solid rgba(255,255,255,0.6)",
          boxShadow:
            "0 28px 72px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.7)",
          maxHeight: "88vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                boxShadow: "0 4px 14px rgba(16,185,129,0.38)",
              }}
            >
              <CalendarCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-[17px] font-bold text-gray-900 leading-tight">
                Share Availability
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {availableBlocks.length} block
                {availableBlocks.length !== 1 ? "s" : ""} selected
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/[0.07] hover:bg-black/[0.12] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <div className="h-px mx-6 bg-black/[0.06]" />

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 min-h-0">

          {/* Available Times */}
          <section>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
              Available Times
            </p>
            {availableBlocks.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">
                No times selected yet. Close and drag on the calendar.
              </p>
            ) : (
              <div className="space-y-2.5">
                {Object.entries(blocksByDay)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([dayKey, blocks]) => (
                    <div key={dayKey}>
                      <p className="text-[11px] font-semibold text-emerald-600/80 mb-1.5">
                        {format(new Date(dayKey + "T12:00:00"), "EEEE, MMMM d")}
                      </p>
                      <div className="space-y-1.5">
                        {blocks.map((block) => {
                          const s = new Date(block.start);
                          const e = new Date(block.end);
                          return (
                            <motion.div
                              key={block.id}
                              layout
                              initial={{ opacity: 0, x: -6 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -6, height: 0 }}
                              className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl group"
                              style={{
                                background:
                                  "linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(5,150,105,0.06) 100%)",
                                border: "1px solid rgba(16,185,129,0.22)",
                              }}
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-800 leading-none">
                                  {localTime(s)}
                                  <span className="mx-1.5 text-gray-400">–</span>
                                  {localTime(e)}
                                </p>
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                  {durationLabel(s.getTime(), e.getTime())}
                                </p>
                              </div>
                              <button
                                onClick={() => removeBlock(block.id)}
                                className="w-6 h-6 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all ml-2 flex-shrink-0"
                              >
                                <Trash2 className="w-3 h-3 text-red-400" />
                              </button>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </section>

          {/* Plain-text Snippet */}
          {availableBlocks.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                  <ClipboardList className="w-3 h-3" />
                  Plain-text Snippet
                </p>
                <button
                  onClick={handleCopyText}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all"
                  style={{
                    background: copiedText
                      ? "rgba(16,185,129,0.12)"
                      : "rgba(0,0,0,0.06)",
                    color: copiedText ? "#059669" : "#6b7280",
                  }}
                >
                  {copiedText ? (
                    <>
                      <Check className="w-3 h-3" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy Text
                    </>
                  )}
                </button>
              </div>
              <div
                className="rounded-2xl px-4 py-3 font-mono text-xs leading-relaxed text-gray-700 select-all"
                style={{
                  background: "rgba(0,0,0,0.04)",
                  border: "1px solid rgba(0,0,0,0.08)",
                  whiteSpace: "pre",
                  overflowX: "auto",
                }}
              >
                {snippet}
              </div>
            </section>
          )}

          {/* Booking Link */}
          {availableBlocks.length > 0 && (
            <section>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1.5">
                <Link2 className="w-3 h-3" />
                Booking Link
              </p>

              <AnimatePresence mode="wait">
                {bookingLink ? (
                  <motion.div
                    key="link-box"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2"
                  >
                    <div
                      className="flex items-center gap-2 px-3.5 py-3 rounded-2xl"
                      style={{
                        background: "rgba(0,0,0,0.04)",
                        border: "1px solid rgba(0,0,0,0.08)",
                      }}
                    >
                      <Hash className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      <p className="text-xs text-gray-700 flex-1 truncate font-mono">
                        {bookingLink}
                      </p>
                      <button
                        onClick={handleCopyLink}
                        className="flex-shrink-0 w-7 h-7 rounded-xl flex items-center justify-center transition-colors"
                        style={{
                          background: copiedLink
                            ? "rgba(16,185,129,0.15)"
                            : "rgba(0,0,0,0.07)",
                        }}
                      >
                        {copiedLink ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-gray-500" />
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-400 text-center">
                      Anyone with this link can book one of your available times
                    </p>
                  </motion.div>
                ) : (
                  <motion.button
                    key="generate-btn"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={handleGenerateLink}
                    className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(5,150,105,0.07) 100%)",
                      border: "1.5px dashed rgba(16,185,129,0.4)",
                      color: "#059669",
                    }}
                  >
                    <Hash className="w-4 h-4" />
                    Generate Booking Link
                  </motion.button>
                )}
              </AnimatePresence>
            </section>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 pt-2 pb-6 flex gap-3 flex-shrink-0 border-t border-black/[0.05] mt-1">
          <button
            onClick={() => { clearBlocks(); onClose(); }}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold text-gray-600 transition-colors"
            style={{ background: "rgba(0,0,0,0.06)" }}
          >
            Clear & Close
          </button>
          <button
            onClick={handleCopyText}
            disabled={availableBlocks.length === 0}
            className="flex-1 py-3 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
            style={{
              background:
                "linear-gradient(135deg, #10B981 0%, #059669 100%)",
              boxShadow: availableBlocks.length > 0
                ? "0 4px 16px rgba(16,185,129,0.38)"
                : "none",
            }}
          >
            {copiedText ? (
              <>
                <Check className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy Text
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
