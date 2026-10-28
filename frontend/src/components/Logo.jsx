import { Link } from "react-router-dom";

export const Logo = ({ to = "/", light = false, className = "" }) => (
  <Link to={to} data-testid="brand-logo" className={`flex items-center gap-2 group ${className}`}>
    <span className="relative grid h-9 w-9 place-items-center rounded-xl brand-gradient shadow-lg shadow-violet-500/30 transition-transform duration-300 group-hover:rotate-6">
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <circle cx="12" cy="9" r="3.5" />
        <path d="M5 20c1.4-3.2 4-4.8 7-4.8s5.6 1.6 7 4.8" />
      </svg>
      <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-pink-500 ring-2 ring-white" />
    </span>
    <span className={`font-heading text-xl font-extrabold tracking-tight ${light ? "text-white" : "text-slate-900"}`}>
      HireMy<span className={light ? "text-violet-200" : "text-violet-600"}>Face</span>
    </span>
  </Link>
);
