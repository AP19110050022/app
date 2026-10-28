import { Link } from "react-router-dom";

export const Logo = ({ to = "/", className = "", size = "text-2xl" }) => (
  <Link to={to} data-testid="brand-logo" className={`font-heading font-extrabold tracking-tight text-white transition-opacity hover:opacity-90 ${size} ${className}`}>
    hiremyface<span className="text-[#FF5FA2]">.</span>
  </Link>
);
