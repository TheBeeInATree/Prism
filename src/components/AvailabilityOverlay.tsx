import { useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { format } from "date-fns";
import { useAvailabilityStore } from "@/store/availabilityStore";

const SNAP_MINUTES = 15;
const MIN_DURATION = 15;

function snapMinutes(raw: number): number {
  return Math.round(raw / SNAP_MINUTES) * SNAP_MINUTES;
}

function minutesToISO(day: Date, minutes: number): string {
  const d = new Date(day);
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d.toISOString();
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const ampm = h < 12 ? "AM" : "PM";
  const dh = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${dh}:${String(m).padStart(2, "0")} ${ampm}`;
}

interface DragState {
  dayIndex: number;
  startMinute: number;
  currentMinute: number;
  active: boolean;
}

interface Props {
  days: Date[];
  /** Number of day columns (7 for week view, 1 for day view). Default: 7 */
  columns?: number;
  /** Pixels per hour — must match the host view's HOUR_HEIGHT. Default: 64 */
  hourHeight?: number;
}

export function AvailabilityOverlay({ days, columns = 7, hourHeight = 64 }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const { addBlock, removeBlock, availableBlocks } = useAvailabilityStore();
  const [drag, setDrag] = useState<DragState | null>(null);

  const getPosition = useCallback(
    (clientX: number, clientY: number) => {
      const el = overlayRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const relX = clientX - rect.left;
      const relY = clientY - rect.top;
      const colWidth = rect.width / columns;
      const dayIndex = Math.max(0, Math.min(columns - 1, Math.floor(relX / colWidth)));
      const rawMinute = (relY / hourHeight) * 60;
      const minute = Math.max(0, Math.min(23 * 60 + 59, snapMinutes(rawMinute)));
      return { dayIndex, minute };
    },
    [columns, hourHeight]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      const pos = getPosition(e.clientX, e.clientY);
      if (!pos) return;
      setDrag({
        dayIndex: pos.dayIndex,
        startMinute: pos.minute,
        currentMinute: pos.minute,
        active: true,
      });
    },
    [getPosition]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!drag?.active) return;
      const pos = getPosition(e.clientX, e.clientY);
      if (!pos) return;
      setDrag((d) => d && { ...d, currentMinute: pos.minute });
    },
    [drag, getPosition]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!drag?.active) return;
      const pos = getPosition(e.clientX, e.clientY);
      const endMinute = pos ? pos.minute : drag.currentMinute;
      const start = Math.min(drag.startMinute, endMinute);
      const end = Math.max(drag.startMinute, endMinute);

      if (end - start >= MIN_DURATION) {
        const day = days[drag.dayIndex];
        addBlock({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          start: minutesToISO(day, start),
          end: minutesToISO(day, end),
        });
      }
      setDrag(null);
    },
    [drag, getPosition, days, addBlock]
  );

  // Compute live drag rect dimensions
  const dragBlock = (() => {
    if (!drag?.active) return null;
    const start = Math.min(drag.startMinute, drag.currentMinute);
    const end = Math.max(drag.startMinute, drag.currentMinute);
    if (end - start < 1) return null;
    const colW = 100 / columns;
    return {
      left: `${drag.dayIndex * colW}%`,
      width: `${colW}%`,
      top: (start / 60) * hourHeight,
      height: Math.max((end - start) / 60, MIN_DURATION / 60) * hourHeight,
      startMinute: start,
      endMinute: end,
      day: days[drag.dayIndex],
    };
  })();

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 z-30 cursor-crosshair"
      style={{ touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* Committed blocks */}
      <AnimatePresence>
        {availableBlocks.map((block) => {
          const blockDay = new Date(block.start);
          const dayIndex = days.findIndex(
            (d) =>
              d.getFullYear() === blockDay.getFullYear() &&
              d.getMonth() === blockDay.getMonth() &&
              d.getDate() === blockDay.getDate()
          );
          if (dayIndex === -1) return null;

          const startM =
            blockDay.getHours() * 60 + blockDay.getMinutes();
          const endDay = new Date(block.end);
          const endM = endDay.getHours() * 60 + endDay.getMinutes();
          const colW = 100 / columns;

          return (
            <motion.div
              key={block.id}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.15 }}
              className="absolute group rounded-xl overflow-hidden"
              style={{
                left: `calc(${dayIndex * colW}% + 3px)`,
                width: `calc(${colW}% - 6px)`,
                top: (startM / 60) * hourHeight + 1,
                height: Math.max(((endM - startM) / 60) * hourHeight - 2, 22),
                background:
                  "linear-gradient(135deg, rgba(16,185,129,0.28) 0%, rgba(5,150,105,0.22) 100%)",
                border: "1.5px solid rgba(16,185,129,0.5)",
                backdropFilter: "blur(4px)",
                pointerEvents: "auto",
              }}
            >
              <div className="px-2 py-1 h-full flex flex-col justify-between">
                <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 leading-tight truncate">
                  {formatTime(startM)} – {formatTime(endM)}
                </p>
                <p className="text-[9px] text-emerald-500 dark:text-emerald-500 truncate">
                  {format(blockDay, "EEE, MMM d")}
                </p>
              </div>
              {/* Delete button */}
              <button
                className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-emerald-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(ev) => {
                  ev.stopPropagation();
                  removeBlock(block.id);
                }}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Live drag preview */}
      <AnimatePresence>
        {dragBlock && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute rounded-xl pointer-events-none"
            style={{
              left: `calc(${dragBlock.left} + 3px)`,
              width: `calc(${dragBlock.width} - 6px)`,
              top: dragBlock.top + 1,
              height: dragBlock.height,
              background:
                "linear-gradient(135deg, rgba(16,185,129,0.18) 0%, rgba(5,150,105,0.12) 100%)",
              border: "2px dashed rgba(16,185,129,0.6)",
            }}
          >
            <div className="px-2 py-1">
              <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                {formatTime(dragBlock.startMinute)} –{" "}
                {formatTime(dragBlock.endMinute)}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
