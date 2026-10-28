import { useState } from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import { UserButton } from "@clerk/react";
import { Home, Search, Plus, Briefcase, MessageCircle, User, Bell, Heart, ShieldCheck, Crown, Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { RoleChooser } from "@/components/RoleChooser";
import { useMe } from "@/context/MeContext";

const NAV = [
  { to: "/app", label: "Home", icon: Home, end: true, id: "home" },
  { to: "/app/search", label: "Search", icon: Search, id: "search" },
  { to: "/app/deals", label: "My Deals", icon: Briefcase, id: "deals" },
  { to: "/app/chat", label: "Chat", icon: MessageCircle, id: "chat" },
  { to: "/app/saved", label: "Shortlist", icon: Heart, id: "saved" },
  { to: "/app/notifications", label: "Notifications", icon: Bell, id: "notifications" },
  { to: "/app/profile", label: "Profile", icon: User, id: "profile" },
];

const ModeChip = ({ mode }) =>
  mode ? (
    <span data-testid="mode-chip" className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${mode === "creator" ? "bg-fuchsia-100 text-fuchsia-700" : "bg-indigo-100 text-indigo-700"}`}>
      {mode} mode
    </span>
  ) : null;

const Sidebar = ({ onPlus, me }) => (
  <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white px-4 py-6 lg:flex">
    <Logo to="/app" className="px-2" />
    <button onClick={onPlus} data-testid="sidebar-plus-button"
      className="mt-8 flex items-center justify-center gap-2 rounded-2xl brand-gradient px-4 py-3 font-semibold text-white shadow-lg shadow-violet-500/30 transition-transform duration-200 hover:scale-[1.02] active:scale-95">
      <Plus className="h-5 w-5" /> Create / Switch role
    </button>
    <nav className="mt-6 flex-1 space-y-1">
      {NAV.map((n) => (
        <NavLink key={n.id} to={n.to} end={n.end} data-testid={`sidebar-nav-${n.id}`}
          className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? "bg-violet-50 text-violet-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>
          <n.icon className="h-5 w-5" /> {n.label}
          {n.id === "notifications" && me?.unread_notifications > 0 && <span className="ml-auto rounded-full bg-pink-500 px-2 text-xs text-white">{me.unread_notifications}</span>}
        </NavLink>
      ))}
      {me?.user?.role === "admin" && (
        <NavLink to="/app/admin" data-testid="sidebar-nav-admin"
          className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? "bg-violet-50 text-violet-700" : "text-slate-600 hover:bg-slate-50"}`}>
          <ShieldCheck className="h-5 w-5" /> Admin
        </NavLink>
      )}
    </nav>
    {me?.business && !me?.is_pro && (
      <Link to="/app/upgrade" data-testid="sidebar-upgrade-banner" className="mb-4 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 p-4 text-white transition-transform hover:scale-[1.02]">
        <Crown className="h-5 w-5 text-amber-300" />
        <p className="mt-2 font-heading font-bold">Business Pro</p>
        <p className="text-xs text-white/70">Unlimited offers, chat & in-app payments.</p>
      </Link>
    )}
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3">
      <UserButton />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{me?.user?.name}</p>
        <ModeChip mode={me?.user?.active_mode} />
      </div>
    </div>
  </aside>
);

const BottomNav = ({ onPlus }) => {
  const items = [NAV[0], NAV[1], null, NAV[2], NAV[3], NAV[6]];
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/90 backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-lg items-end justify-around px-2 pb-2 pt-1.5">
        {items.map((n, i) =>
          n ? (
            <NavLink key={n.id} to={n.to} end={n.end} data-testid={`nav-${n.id}`}
              className={({ isActive }) => `flex w-14 flex-col items-center gap-0.5 py-1 text-[10px] font-semibold transition-colors ${isActive ? "text-violet-700" : "text-slate-500"}`}>
              <n.icon className="h-[22px] w-[22px]" /> {n.label.replace("My ", "")}
            </NavLink>
          ) : (
            <button key={i} onClick={onPlus} data-testid="nav-plus-fab" aria-label="Create"
              className="-mt-6 grid h-14 w-14 place-items-center rounded-2xl brand-gradient text-white shadow-xl shadow-violet-500/40 ring-4 ring-white transition-transform duration-200 active:scale-90">
              <Plus className="h-7 w-7" />
            </button>
          ),
        )}
      </div>
    </nav>
  );
};

const MobileTop = ({ me }) => (
  <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/70 bg-white/85 px-4 py-3 backdrop-blur-xl lg:hidden">
    <Logo to="/app" />
    <div className="flex items-center gap-2">
      <ModeChip mode={me?.user?.active_mode} />
      <Link to="/app/notifications" data-testid="mobile-notifications-link" className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-slate-100">
        <Bell className="h-5 w-5 text-slate-700" />
        {me?.unread_notifications > 0 && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-pink-500 ring-2 ring-white" data-testid="mobile-unread-dot" />}
      </Link>
      <UserButton />
    </div>
  </header>
);

export default function AppShell() {
  const { me, error } = useMe();
  const [plus, setPlus] = useState(false);
  if (!me) {
    return (
      <div className="grid min-h-screen place-items-center" data-testid="app-loading">
        {error ? <p className="text-slate-500">Couldn't load your account. Refresh to try again.</p> : <Loader2 className="h-8 w-8 animate-spin text-violet-600" />}
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar onPlus={() => setPlus(true)} me={me} />
      <MobileTop me={me} />
      <main className="pb-28 lg:pb-10 lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <Outlet context={{ openPlus: () => setPlus(true) }} />
        </div>
      </main>
      <BottomNav onPlus={() => setPlus(true)} />
      <RoleChooser open={plus} onOpenChange={setPlus} />
    </div>
  );
}
