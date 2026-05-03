import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, UserPlus, UserCheck, CalendarPlus, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePeopleStore, CONTACTS, type Contact } from "@/store/peopleStore";
import { useUIStore } from "@/store/uiStore";

// ── Avatar ─────────────────────────────────────────────────────────────────
function Avatar({
  contact,
  size = "md",
}: {
  contact: Contact;
  size?: "sm" | "md" | "lg";
}) {
  const sz = size === "sm" ? "w-7 h-7 text-[10px]" : size === "lg" ? "w-11 h-11 text-base" : "w-9 h-9 text-xs";
  const initials = contact.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className={cn("rounded-full flex items-center justify-center font-bold text-white flex-shrink-0", sz)}
      style={{ background: contact.color }}
    >
      {initials}
    </div>
  );
}

// ── Contact row ────────────────────────────────────────────────────────────
function ContactRow({ contact }: { contact: Contact }) {
  const { invitedIds, toggleInvite } = usePeopleStore();
  const invited = invitedIds.includes(contact.id);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.14 }}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-150 cursor-pointer group",
        invited
          ? "bg-primary/8"
          : "hover:bg-muted/70"
      )}
      style={invited ? { background: "hsl(var(--primary) / 0.07)" } : {}}
      onClick={() => toggleInvite(contact.id)}
    >
      <div className="relative flex-shrink-0">
        <Avatar contact={contact} />
        <AnimatePresence>
          {invited && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center"
            >
              <UserCheck className="w-2.5 h-2.5 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-semibold truncate", invited ? "text-primary" : "text-foreground")}>
          {contact.name}
        </p>
        <p className="text-xs text-muted-foreground truncate">{contact.role}</p>
      </div>

      <span className="text-[11px] text-muted-foreground/60 truncate hidden sm:block max-w-[120px]">
        {contact.email}
      </span>

      <motion.div
        whileTap={{ scale: 0.9 }}
        className={cn(
          "w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 transition-all",
          invited
            ? "bg-primary text-primary-foreground"
            : "bg-muted/60 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
        )}
      >
        {invited ? (
          <UserCheck className="w-3.5 h-3.5" />
        ) : (
          <UserPlus className="w-3.5 h-3.5" />
        )}
      </motion.div>
    </motion.div>
  );
}

// ── Invited chips strip ────────────────────────────────────────────────────
function InvitedStrip() {
  const { invitedIds, uninvite } = usePeopleStore();
  const invited = CONTACTS.filter((c) => invitedIds.includes(c.id));
  if (invited.length === 0) return null;

  return (
    <div className="px-4 pb-2 flex flex-wrap gap-1.5">
      <AnimatePresence initial={false}>
        {invited.map((c) => (
          <motion.button
            key={c.id}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 28 }}
            onClick={() => uninvite(c.id)}
            className="flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full text-xs font-semibold transition-all hover:opacity-80"
            style={{ background: c.color + "18", color: c.color, border: `1px solid ${c.color}30` }}
            title={`Remove ${c.name}`}
          >
            <Avatar contact={c} size="sm" />
            {c.name.split(" ")[0]}
            <X className="w-2.5 h-2.5 opacity-60" />
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────
export function PeoplePanel() {
  const { isOpen, closePeople, invitedIds, clearInvites } = usePeopleStore();
  const { openNewEvent } = useUIStore();
  const [query, setQuery] = useState("");

  const filtered = CONTACTS.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.email.toLowerCase().includes(query.toLowerCase()) ||
      c.role.toLowerCase().includes(query.toLowerCase())
  );

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { closePeople(); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, closePeople]);

  // Reset search on open
  useEffect(() => {
    if (isOpen) setQuery("");
  }, [isOpen]);

  const handleNewEventWithPeople = () => {
    closePeople();
    openNewEvent();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="people-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={closePeople}
          />

          {/* Panel */}
          <motion.div
            key="people-panel"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none"
          >
            <div
              className="relative w-full max-w-lg rounded-3xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto"
              style={{
                height: "clamp(480px, 70vh, 620px)",
                background: "hsl(var(--background) / 0.97)",
                backdropFilter: "blur(24px)",
                border: "1px solid hsl(var(--border) / 0.6)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center gap-3 px-5 pt-5 pb-4 flex-shrink-0">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "hsl(var(--primary) / 0.12)" }}
                >
                  <Users className="w-4.5 h-4.5 text-primary" style={{ width: 18, height: 18 }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-foreground leading-tight">People</p>
                  <p className="text-[11px] text-muted-foreground">
                    {invitedIds.length === 0
                      ? "Click a contact to invite them"
                      : `${invitedIds.length} invited`}
                  </p>
                </div>
                <button
                  onClick={closePeople}
                  className="w-7 h-7 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors flex-shrink-0"
                  aria-label="Close"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>

              {/* Search */}
              <div className="px-4 pb-3 flex-shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input
                    autoFocus
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name, role, or email…"
                    className="w-full pl-9 pr-4 py-2.5 rounded-2xl text-sm font-medium text-foreground placeholder:text-muted-foreground outline-none transition-all bg-muted/60 border border-transparent focus:border-primary/30 focus:bg-background"
                  />
                </div>
              </div>

              {/* Invited chips */}
              <InvitedStrip />

              <div className="mx-4 h-px bg-border/40 flex-shrink-0" />

              {/* Contact list */}
              <div className="flex-1 overflow-y-auto px-2 py-2">
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 py-8">
                    <Search className="w-8 h-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No contacts match "{query}"</p>
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {filtered.map((contact) => (
                      <ContactRow key={contact.id} contact={contact} />
                    ))}
                  </AnimatePresence>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 pb-4 pt-3 flex-shrink-0 border-t border-border/40 flex gap-2">
                {invitedIds.length > 0 && (
                  <button
                    onClick={clearInvites}
                    className="py-2.5 px-4 rounded-2xl text-sm font-semibold text-muted-foreground bg-muted/60 hover:bg-muted transition-colors"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={handleNewEventWithPeople}
                  disabled={invitedIds.length === 0}
                  className="flex-1 py-2.5 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40"
                  style={{
                    background: "hsl(var(--primary))",
                    boxShadow: invitedIds.length > 0 ? "0 4px 16px hsl(var(--primary) / 0.35)" : "none",
                  }}
                >
                  <CalendarPlus className="w-4 h-4" />
                  {invitedIds.length === 0
                    ? "Select people to create an event"
                    : `New Event with ${invitedIds.length} ${invitedIds.length === 1 ? "person" : "people"}`}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
