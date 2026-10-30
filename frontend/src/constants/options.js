import {
  Shirt, UtensilsCrossed, Cpu, Dumbbell, Sparkles, GraduationCap, Building2, Shapes,
  Video, CalendarClock, Crown, Clock, CheckCircle2, CreditCard, PackageCheck, BadgeCheck, XCircle, Repeat, Ban,
} from "lucide-react";

export const CATEGORIES = [
  { id: "Fashion", icon: Shirt },
  { id: "Food", icon: UtensilsCrossed },
  { id: "Tech", icon: Cpu },
  { id: "Fitness", icon: Dumbbell },
  { id: "Beauty", icon: Sparkles },
  { id: "Education", icon: GraduationCap },
  { id: "Real estate", icon: Building2 },
  { id: "Other", icon: Shapes },
];

export const CITIES = ["Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai", "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Kochi", "Lucknow", "Chandigarh", "Remote"];
export const LANGUAGES = ["English", "Hindi", "Tamil", "Telugu", "Kannada", "Malayalam", "Marathi", "Bengali", "Gujarati", "Punjabi"];
export const GENDERS = ["Female", "Male", "Other"];
export const INDUSTRIES = ["Retail / D2C", "Food & Restaurants", "Tech / SaaS", "Fitness & Health", "Beauty & Salon", "Education", "Real estate", "Agency", "Other"];
export const BUDGETS = ["Under ₹5k", "₹5k–20k", "₹20k–50k", "₹50k+"];

export const PLANS = [
  {
    id: "per_video", label: "Per Video", unit: "/video", icon: Video, rate: "rate_per_video",
    short: "One finished video",
    bullets: ["1 reel, short or ad video", "1 revision included", "Best for launches & one-off promos"],
  },
  {
    id: "part_time", label: "Part-time", unit: "/month", icon: CalendarClock, rate: "rate_part_time",
    short: "Regular content every month",
    bullets: ["Up to 8 videos a month", "1 live session or shoot day", "Best for steady social posting"],
  },
  {
    id: "full_time", label: "Full-time", unit: "/month", icon: Crown, rate: "rate_full_time",
    short: "Your dedicated brand face",
    bullets: ["Up to 20 videos a month", "Exclusive in your category", "Best for brands that want one face"],
  },
];
export const PLAN_BY_ID = Object.fromEntries(PLANS.map((p) => [p.id, p]));

export const STATUS = {
  pending: { label: "Pending", cls: "bg-amber-100 text-amber-800 border-amber-200", icon: Clock },
  countered: { label: "Countered", cls: "bg-purple-100 text-purple-800 border-purple-200", icon: Repeat },
  accepted: { label: "Accepted", cls: "bg-blue-100 text-blue-800 border-blue-200", icon: CheckCircle2 },
  paid: { label: "Paid · held", cls: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: CreditCard },
  delivered: { label: "Delivered", cls: "bg-cyan-100 text-cyan-800 border-cyan-200", icon: PackageCheck },
  completed: { label: "Completed", cls: "bg-green-100 text-green-800 border-green-200", icon: BadgeCheck },
  declined: { label: "Declined", cls: "bg-rose-100 text-rose-800 border-rose-200", icon: XCircle },
  cancelled: { label: "Cancelled", cls: "bg-slate-100 text-slate-600 border-slate-200", icon: Ban },
  disputed: { label: "In dispute", cls: "bg-orange-100 text-orange-800 border-orange-200", icon: XCircle },
  refunded: { label: "Refunded", cls: "bg-sky-100 text-sky-800 border-sky-200", icon: Repeat },
};

export const PIPELINE = ["pending", "accepted", "paid", "delivered", "completed"];
