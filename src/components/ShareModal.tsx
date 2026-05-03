import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  X,
  Copy,
  Check,
  Link2,
  Trash2,
  CalendarCheck,
  Loader2,
} from "lucide-react";
import { useAvailabilityStore } from "@/store/availabilityStore";
import { useUser } from "@clerk/react";

interface ShareModalProps {
  onClose: () => void;
}

function formatBlock(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const fmt = (d: Date) => {
    const h = d.getHours();
    const m = d.getMinutes();
    const ampm = h < 12 ? "AM" : "PM";
    const dh = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${dh}:${String(m).padStart(2, "0")} ${ampm}`;
  };
  return {
    day: format(s, "EEEE, MMMM d"),
    time: `${fmt(s)} – ${fmt(e)}`,
    durationMin: Math.round((e.getTime() - s.getTime()) / 60000),
  };
}

export function ShareModal({ onClose }: ShareModalProps) {
  const { user } = useUser();
  const {
    availableBlocks,
    sharedLink,
    isSubmitting,
    removeBlock,
    clearBlocks,
    createSharedLink,
  } = useAvailabilityStore();

  const [title, setTitle] = useState("30 Min Meeting");
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCreate = async () => {
    if (!user) return;
    await createSharedLink(user.id, title);
  };

  const handleCopy = () => {
    if (!sharedLink) return;
    navigator.clipboard.writeText(sharedLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const blocksByDay = availableBlocks.reduce(
    (acc, block) => {
      const key = format(new Date(block.start), "yyyy-MM-dd");
      if (!acc[key]) acc[key] = [];
      acc[key].push(block);
      return acc;
    },
    {} as Record<string, typeof availableBlocks>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        className="w-full max-w-md rounded-3xl overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.82) 0%, rgba(245,248,255,0.78) 100%)",
          backdropFilter: "blur(40px) saturate(1.8)",
          border: "1px solid rgba(255,255,255,0.55)",
          boxShadow:
            "0 24px 64px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                boxShadow: "0 4px 12px rgba(16,185,129,0.35)",
              }}
            >
              <CalendarCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Share Availability
              </h2>
              <p className="text-xs text-gray-500">
                {availableBlocks.length} time{availableBlocks.length !== 1 ? "s" : ""} selected
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Divider */}
        <div className="h-px mx-6 bg-gray-200/70" />

        {/* Content */}
        <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Title input */}
          {!sharedLink && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Meeting Title
              </label>
              <input
                ref={inputRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="30 Min Meeting"
                className="mt-1.5 w-full px-4 py-2.5 rounded-2xl text-sm font-medium text-gray-900 placeholder:text-gray-400 outline-none transition-all"
                style={{
                  background: "rgba(0,0,0,0.05)",
                  border: "1px solid rgba(0,0,0,0.08)",
                }}
                onFocus={(e) =>
                  (e.target.style.border = "1px solid rgba(16,185,129,0.5)")
                }
                onBlur={(e) =>
                  (e.target.style.border = "1px solid rgba(0,0,0,0.08)")
                }
              />
            </div>
          )}

          {/* Time blocks */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Available Times
            </label>
            {Object.entries(blocksByDay).map(([dayKey, blocks]) => (
              <div key={dayKey} className="space-y-1.5">
                <p className="text-xs font-semibold text-gray-400">
                  {format(new Date(dayKey), "EEEE, MMM d")}
                </p>
                {blocks.map((block) => {
                  const { time, durationMin } = formatBlock(
                    block.start,
                    block.end
                  );
                  return (
                    <div
                      key={block.id}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(5,150,105,0.07) 100%)",
                        border: "1px solid rgba(16,185,129,0.2)",
                      }}
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          {time}
                        </p>
                        <p className="text-xs text-gray-400">
                          {durationMin} min
                        </p>
                      </div>
                      {!sharedLink && (
                        <button
                          onClick={() => removeBlock(block.id)}
                          className="w-6 h-6 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors"
                        >
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {availableBlocks.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">
                No time blocks selected. Close and drag on the calendar.
              </p>
            )}
          </div>

          {/* Generated link */}
          {sharedLink && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Share This Link
              </label>
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-2xl"
                style={{
                  background: "rgba(0,0,0,0.04)",
                  border: "1px solid rgba(0,0,0,0.08)",
                }}
              >
                <Link2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <p className="text-xs text-gray-700 flex-1 truncate font-mono">
                  {sharedLink}
                </p>
                <button
                  onClick={handleCopy}
                  className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
                  style={{
                    background: copied
                      ? "rgba(16,185,129,0.15)"
                      : "rgba(0,0,0,0.06)",
                  }}
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-400 text-center">
                Anyone with this link can book one of your available times
              </p>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2 flex gap-3">
          {sharedLink ? (
            <>
              <button
                onClick={() => {
                  clearBlocks();
                  onClose();
                }}
                className="flex-1 py-3 rounded-2xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Done
              </button>
              <button
                onClick={handleCopy}
                className="flex-1 py-3 rounded-2xl text-sm font-bold text-white transition-all active:scale-95"
                style={{
                  background:
                    "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                  boxShadow: "0 4px 16px rgba(16,185,129,0.4)",
                }}
              >
                {copied ? "Copied!" : "Copy Link"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-2xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={isSubmitting || availableBlocks.length === 0}
                className="flex-1 py-3 rounded-2xl text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{
                  background:
                    availableBlocks.length > 0
                      ? "linear-gradient(135deg, #10B981 0%, #059669 100%)"
                      : "rgba(0,0,0,0.15)",
                  boxShadow:
                    availableBlocks.length > 0
                      ? "0 4px 16px rgba(16,185,129,0.4)"
                      : "none",
                }}
              >
                {isSubmitting && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Create Link
              </button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
