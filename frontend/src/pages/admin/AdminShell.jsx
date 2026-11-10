import { useEffect } from "react";
import { NavLink, Outlet, Link, Navigate, useLocation } from "react-router-dom";
import { LayoutDashboard, BadgeCheck, Flag, Users, Images, Handshake, UserCog, History, ArrowLeft, Loader2, Tag } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useMe } from "@/context/MeContext";
import { BlockedScreen, SignInFailed } from "@/components/layout/AppShell";

const NAV = [
  ["", "Dashboard", LayoutDashboard], ["approvals", "Approvals", BadgeCheck], ["reports", "Reports", Flag], ["users", "Users", Users],
  ["content", "Jobs & posts", Images], ["deals", "Deals", Handshake], ["pricing", "Prices", Tag], ["team", "Team", UserCog, true], ["activity", "Activity", History],
];

const Item = ({ to, label, icon: Icon, mobile }) => (
  <NavLink to={`/admin${to ? `/${to}` : ""}`} end={!to} data-testid={`admin-nav-${to || "dashboard"}${mobile ? "-m" : ""}`}
    className={({ isActive }) => mobile
      ? `flex min-w-[68px] shrink-0 flex-col items-center gap-0.5 rounded-[22px] px-2 py-2 text-[10px] font-bold ${isActive ? "bg-[#EDE8FF] text-[#3B25A8]" : "text-[#5B5675]"}`
      : `flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-bold transition-colors ${isActive ? "bg-white text-[#3B25A8]" : "text-white/85 hover:bg-white/10"}`}>
    <Icon className={mobile ? "h-5 w-5" : "h-[18px] w-[18px]"} />{label}
  </NavLink>
);

export default function AdminShell() {
  const { me, error, blocked } = useMe();
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  if (blocked) return <BlockedScreen />;
  if (!me) return <div className="grid min-h-screen place-items-center text-white">{error ? <SignInFailed /> : <Loader2 className="h-8 w-8 animate-spin" />}</div>;
  const role = me.user.role;
  if (!["owner", "admin"].includes(role)) return <Navigate to="/app" replace />;
  const nav = NAV.filter((n) => !n[3] || role === "owner");
  return (
    <div className="min-h-screen text-white" data-testid="admin-shell">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col gap-1 border-r border-white/10 bg-[#24157a]/60 p-4 backdrop-blur-xl md:flex">
        <div className="mb-1 flex items-center gap-2 px-2"><Logo to="/admin" /></div>
        <p className="mb-3 px-3 text-[11px] font-extrabold uppercase tracking-widest text-white/50">{role === "owner" ? "Main admin" : "Helper admin"}</p>
        {nav.map(([to, label, icon]) => <Item key={to} to={to} label={label} icon={icon} />)}
        <Link to="/app" className="mt-auto flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-sm font-bold text-white/70 hover:bg-white/10" data-testid="admin-back-to-app"><ArrowLeft className="h-4 w-4" />Back to app</Link>
      </aside>
      <header className="topbar sticky top-0 z-30 flex h-[60px] items-center justify-between px-4 md:hidden">
        <Logo to="/admin" />
        <Link to="/app" className="flex h-10 items-center gap-1.5 rounded-full bg-white/15 px-4 text-xs font-bold" data-testid="admin-back-to-app-m"><ArrowLeft className="h-4 w-4" />App</Link>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-32 pt-5 sm:px-6 md:ml-64 md:pb-12 md:pt-8">
        <Outlet />
      </main>
      <nav className="fixed inset-x-3 bottom-3 z-40 md:hidden">
        <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-[30px] bg-white/[.97] p-1.5 shadow-[0_12px_30px_rgba(10,5,40,.4)]">
          {nav.map(([to, label, icon]) => <Item key={to} to={to} label={label} icon={icon} mobile />)}
        </div>
      </nav>
    </div>
  );
}
