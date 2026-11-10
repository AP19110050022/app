import { Link } from "react-router-dom";

export const Logo = ({ to = "/", className = "", size = "text-2xl" }) => (
  <Link to={to} data-testid="brand-logo" aria-label="HireAvatar" className={`inline-flex items-center gap-2 font-heading font-extrabold tracking-tight text-white transition-opacity hover:opacity-90 ${size} ${className}`}>
    <span className="grid h-[1.35em] w-[1.35em] shrink-0 place-items-center overflow-hidden rounded-[0.2em] bg-white">
      <img src="/hireavatar-logo2.jpeg" alt="" className="h-full w-full object-cover" />
    </span>
    HireAvatar<span className="text-[#FF5FA2]">.</span>
  </Link>
);
