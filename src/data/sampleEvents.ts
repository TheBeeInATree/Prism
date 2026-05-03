export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  startHour?: number;
  durationHours?: number;
  color: string;
  calendar: string;
  provider?: string;
  location?: string;
  description?: string;
}

const today = new Date();
const fmt = (offset: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offset);
  return d.toISOString().split("T")[0];
};

export const SAMPLE_EVENTS: CalendarEvent[] = [
  // ── Today ──────────────────────────────────────────────
  {
    id: "1",
    title: "Team Standup",
    date: fmt(0),
    time: "9:00 – 9:30 AM",
    startHour: 9,
    durationHours: 0.5,
    color: "#3B82F6",
    calendar: "Work",
    provider: "google",
    location: "Zoom",
  },
  {
    id: "2",
    title: "Design Review",
    date: fmt(0),
    time: "9:15 – 10:15 AM",
    startHour: 9.25,
    durationHours: 1,
    color: "#10B981",
    calendar: "Work",
    provider: "microsoft",
    location: "Conf Room B",
  },
  {
    id: "3",
    title: "Sprint Sync",
    date: fmt(0),
    time: "9:00 – 10:30 AM",
    startHour: 9,
    durationHours: 1.5,
    color: "#8B5CF6",
    calendar: "Work",
    provider: "icloud",
    location: "Teams",
  },
  {
    id: "4",
    title: "Lunch with Sarah",
    date: fmt(0),
    time: "12:30 – 2:00 PM",
    startHour: 12.5,
    durationHours: 1.5,
    color: "#F59E0B",
    calendar: "Personal",
    provider: "google",
    location: "Blue Bottle Coffee",
  },
  {
    id: "5",
    title: "1:1 with Manager",
    date: fmt(0),
    time: "1:00 – 1:30 PM",
    startHour: 13,
    durationHours: 0.5,
    color: "#3B82F6",
    calendar: "Work",
    provider: "google",
  },
  {
    id: "6",
    title: "Dentist",
    date: fmt(0),
    time: "4:00 – 5:00 PM",
    startHour: 16,
    durationHours: 1,
    color: "#EC4899",
    calendar: "Personal",
    provider: "icloud",
    location: "Downtown Dental",
  },
  // ── Yesterday ──────────────────────────────────────────
  {
    id: "7",
    title: "Sprint Planning",
    date: fmt(-1),
    time: "9:00 – 10:30 AM",
    startHour: 9,
    durationHours: 1.5,
    color: "#10B981",
    calendar: "Work",
    provider: "microsoft",
  },
  {
    id: "8",
    title: "Coffee Chat",
    date: fmt(-1),
    time: "10:00 – 10:30 AM",
    startHour: 10,
    durationHours: 0.5,
    color: "#F59E0B",
    calendar: "Personal",
    provider: "google",
    location: "Café Blue",
  },
  // ── Tomorrow ───────────────────────────────────────────
  {
    id: "9",
    title: "Gym",
    date: fmt(1),
    time: "6:00 – 7:00 AM",
    startHour: 6,
    durationHours: 1,
    color: "#EF4444",
    calendar: "Personal",
    provider: "icloud",
    location: "Equinox",
  },
  {
    id: "10",
    title: "Product Roadmap",
    date: fmt(1),
    time: "10:00 – 11:30 AM",
    startHour: 10,
    durationHours: 1.5,
    color: "#3B82F6",
    calendar: "Work",
    provider: "google",
  },
  {
    id: "11",
    title: "Legal Review",
    date: fmt(1),
    time: "10:30 – 11:30 AM",
    startHour: 10.5,
    durationHours: 1,
    color: "#8B5CF6",
    calendar: "Work",
    provider: "microsoft",
  },
  // ── Day +2 ─────────────────────────────────────────────
  {
    id: "12",
    title: "Code Review",
    date: fmt(2),
    time: "11:00 AM – 12:00 PM",
    startHour: 11,
    durationHours: 1,
    color: "#3B82F6",
    calendar: "Work",
    provider: "google",
  },
  {
    id: "13",
    title: "Candidate Interview",
    date: fmt(2),
    time: "11:30 AM – 12:30 PM",
    startHour: 11.5,
    durationHours: 1,
    color: "#10B981",
    calendar: "Work",
    provider: "microsoft",
  },
  {
    id: "14",
    title: "Lunch & Learn",
    date: fmt(2),
    time: "12:00 – 1:00 PM",
    startHour: 12,
    durationHours: 1,
    color: "#F59E0B",
    calendar: "Work",
    provider: "google",
  },
  // ── Day +3 ─────────────────────────────────────────────
  {
    id: "15",
    title: "Mom's Birthday",
    date: fmt(3),
    time: "All day",
    startHour: 8,
    durationHours: 2,
    color: "#EC4899",
    calendar: "Birthdays",
    provider: "icloud",
  },
  {
    id: "16",
    title: "Doctor Appointment",
    date: fmt(3),
    time: "2:00 – 3:00 PM",
    startHour: 14,
    durationHours: 1,
    color: "#8B5CF6",
    calendar: "Personal",
    provider: "icloud",
    location: "UCSF Medical Center",
  },
  // ── Day +4 ─────────────────────────────────────────────
  {
    id: "17",
    title: "Yoga Class",
    date: fmt(4),
    time: "7:00 – 8:00 AM",
    startHour: 7,
    durationHours: 1,
    color: "#EF4444",
    calendar: "Personal",
    provider: "google",
    location: "CorePower Yoga",
  },
  // ── Day +5 ─────────────────────────────────────────────
  {
    id: "18",
    title: "Dinner Party",
    date: fmt(5),
    time: "7:00 – 10:00 PM",
    startHour: 19,
    durationHours: 3,
    color: "#F59E0B",
    calendar: "Personal",
    provider: "google",
    location: "Jake's Apartment",
  },
];
