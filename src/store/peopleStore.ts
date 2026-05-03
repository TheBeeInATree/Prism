import { create } from "zustand";

export interface Contact {
  id: string;
  name: string;
  email: string;
  role: string;
  color: string;
}

export const CONTACTS: Contact[] = [
  { id: "1",  name: "Alex Johnson",    email: "alex@company.com",    role: "Product Manager",    color: "#3B82F6" },
  { id: "2",  name: "Sarah Chen",      email: "sarah@company.com",   role: "Product Designer",   color: "#8B5CF6" },
  { id: "3",  name: "Marcus Williams", email: "marcus@company.com",  role: "Frontend Engineer",  color: "#10B981" },
  { id: "4",  name: "Priya Patel",     email: "priya@company.com",   role: "Engineering Lead",   color: "#F59E0B" },
  { id: "5",  name: "Jordan Kim",      email: "jordan@company.com",  role: "Data Analyst",       color: "#EF4444" },
  { id: "6",  name: "Taylor Reed",     email: "taylor@company.com",  role: "Marketing Manager",  color: "#06B6D4" },
  { id: "7",  name: "Morgan Davis",    email: "morgan@company.com",  role: "Sales Lead",         color: "#84CC16" },
  { id: "8",  name: "Casey Thompson",  email: "casey@company.com",   role: "Customer Success",   color: "#F97316" },
  { id: "9",  name: "Riley Anderson",  email: "riley@company.com",   role: "DevOps Engineer",    color: "#EC4899" },
  { id: "10", name: "Drew Martinez",   email: "drew@company.com",    role: "QA Engineer",        color: "#6366F1" },
  { id: "11", name: "Quinn Brown",     email: "quinn@company.com",   role: "UX Researcher",      color: "#14B8A6" },
  { id: "12", name: "Sam Wilson",      email: "sam@company.com",     role: "Backend Engineer",   color: "#D946EF" },
];

interface PeopleState {
  isOpen: boolean;
  invitedIds: string[];

  openPeople: () => void;
  closePeople: () => void;

  invite: (id: string) => void;
  uninvite: (id: string) => void;
  toggleInvite: (id: string) => void;
  clearInvites: () => void;
}

export const usePeopleStore = create<PeopleState>((set) => ({
  isOpen: false,
  invitedIds: [],

  openPeople: () => set({ isOpen: true }),
  closePeople: () => set({ isOpen: false }),

  invite: (id) =>
    set((s) =>
      s.invitedIds.includes(id) ? s : { invitedIds: [...s.invitedIds, id] }
    ),

  uninvite: (id) =>
    set((s) => ({ invitedIds: s.invitedIds.filter((i) => i !== id) })),

  toggleInvite: (id) =>
    set((s) =>
      s.invitedIds.includes(id)
        ? { invitedIds: s.invitedIds.filter((i) => i !== id) }
        : { invitedIds: [...s.invitedIds, id] }
    ),

  clearInvites: () => set({ invitedIds: [] }),
}));
