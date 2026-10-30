import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Play, Store, Crown, Pencil, User, Tag, Camera, MapPin, Settings, ShieldCheck, Bookmark, ChevronRight, Briefcase, Wallet, Clock, EyeOff, BadgeCheck, Plus, Repeat } from "lucide-react";
import { Switch } from "@/components/AppBits";
import { PLAN_BY_ID } from "@/constants/options";
import { useMe } from "@/context/MeContext";
import { errMsg } from "@/lib/api";

export const ToolRow = ({ to, icon: Icon, title, sub, testid, onClick }) => {
  const inner = (<><Icon className="h-5 w-5 shrink-0" /><span className="min-w-0 flex-1"><span className="block font-bold">{title}</span>{sub && <span className="block truncate text-xs text-white/65">{sub}</span>}</span><ChevronRight className="h-4 w-4 shrink-0 text-white/50" /></>);
  const cls = "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/10";
  return to ? <Link to={to} className={cls} data-testid={testid}>{inner}</Link> : <button onClick={onClick} className={cls} data-testid={testid}>{inner}</button>;
};
export const Panel = ({ title, children, testid }) => (
  <section className="glass overflow-hidden rounded-[24px]" data-testid={testid}>
    {title && <h3 className="px-4 pt-4 text-xs font-bold uppercase tracking-widest text-white/60">{title}</h3>}
    <div className="divide-y divide-white/10">{children}</div>
  </section>
);

export const VisibilityCard = ({ kind, live, onToggle, pending }) => (
  <section className={`rounded-[24px] p-4 ${live ? "bg-gradient-to-br from-[#14B8A6]/40 to-[#6C4CF1]/40 ring-1 ring-[#5CE0A0]/50" : "glass"}`} data-testid={`visibility-${kind}`}>
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-extrabold tracking-widest text-white/70">{kind === "creator" ? "CREATOR" : "BUSINESS"} VISIBILITY</p>
        <p className="mt-0.5 flex items-center gap-2 text-lg font-extrabold"><span className={`h-2.5 w-2.5 rounded-full ${live ? "bg-[#5CE0A0] shadow-[0_0_8px_#5CE0A0]" : "bg-white/40"}`} />{live ? (pending ? "Live after approval" : "You're live") : "You're offline"}</p>
        <p className="text-[13px] text-white/75">{pending && live ? "Your profile is under review. Once approved, businesses can find you." : kind === "creator" ? (live ? "Businesses can find you and send offers." : "Hidden from Discover. Existing deals continue.") : (live ? "Your open jobs are visible to creators." : "Your jobs are hidden from creators.")}</p>
      </div>
      <Switch on={live} onClick={onToggle} testid={`visibility-toggle-${kind}`} label={live ? "Go offline" : "Go live"} />
    </div>
  </section>
);

const STATUS = { pending: [Clock, "Under review"], approved: [BadgeCheck, "Approved"], hidden: [EyeOff, "Not approved"], rejected: [EyeOff, "Not approved"] };

export default function Profile() {
  const { me, api, refresh } = useMe();
  const mode = me.user.active_mode || (me.creator ? "creator" : me.business ? "business" : null);
  const isC = mode === "creator";
  const p = isC ? me.creator : me.business;
  const other = isC ? "business" : "creator";
  const hasOther = isC ? !!me.business : !!me.creator;

  const toggle = async (kind, live) => {
    try { await api.patch("/me/visibility", { kind, live }); await refresh(); toast.success(live ? "You're live" : "You're offline"); } catch (e) { toast.error(errMsg(e)); }
  };
  const switchTo = async (m) => { try { await api.patch("/me", { active_mode: m }); await refresh(); toast.success(`Switched to ${m} account`); } catch (e) { toast.error(errMsg(e)); } };

  if (!p) {
    return (
      <div className="mx-auto max-w-xl space-y-4" data-testid="profile-page">
        <div className="flex items-center gap-4"><span className="grid h-20 w-20 place-items-center rounded-full bg-white/15"><User className="h-8 w-8" /></span><div><h1 className="text-[22px] font-extrabold" data-testid="profile-name">{me.user.name}</h1><p className="text-[13px] text-white/70">{me.user.email}</p></div></div>
        <Panel title="Get started">
          <ToolRow to="/app/setup/creator" icon={Play} title="Create a creator profile" sub="Get hired to present brands" testid="profile-create-creator" />
          <ToolRow to="/app/setup/business" icon={Store} title="Create a business profile" sub="Hire presenters and post jobs" testid="profile-create-business" />
        </Panel>
        <Panel><ToolRow to="/app/settings" icon={Settings} title="Settings" sub="Notifications, privacy & account" testid="profile-settings-link" /></Panel>
      </div>
    );
  }
  const status = isC && STATUS[p.status];
  const StatusIcon = status ? status[0] : null;
  const posts = p.samples?.length || 0;

  return (
    <div className="mx-auto max-w-xl space-y-4" data-testid="profile-page">
      <section className="glass rounded-[26px] p-5" data-testid="account-hero">
        <div className="flex items-center gap-4">
          <span className="ring-story shrink-0 rounded-full p-[3px]">
            {(isC ? p.photo : p.logo) ? <img src={isC ? p.photo : p.logo} alt="" className="h-20 w-20 rounded-full border-[3px] border-[#3B25A8] object-cover" /> : <span className="grid h-20 w-20 place-items-center rounded-full border-[3px] border-[#3B25A8] bg-white text-2xl font-extrabold text-[#6C4CF1]">{p.company?.[0]}</span>}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-[22px] font-extrabold" data-testid="profile-name">{isC ? p.name : p.company}</h1>
            <p className="text-[13px] font-semibold">{isC ? "Creator account" : `Business account · ${p.industry}`}</p>
            <p className="flex items-center gap-1 truncate text-xs text-white/70"><MapPin className="h-3 w-3" />{p.city}{p.state ? `, ${p.state}` : ""}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 rounded-2xl bg-white/10 py-3 text-center">
          {(isC ? [[posts, "Posts"], [p.views || 0, "Visits"], [p.live !== false ? "Live" : "Offline", "Visibility"]]
            : [[me.jobs_count ?? "–", "Jobs posted"], [(p.need_plans || []).length, "Plans needed"], [me.is_pro ? "Pro" : "Free", "Plan"]]).map(([v, l]) => (
            <div key={l}><p className="text-lg font-extrabold">{v}</p><p className="text-[11px] text-white/70">{l}</p></div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link to={isC ? `/app/creator/${p.user_id}` : `/app/business/${p.user_id}`} className="flex h-11 items-center justify-center gap-1.5 rounded-full bg-white text-sm font-extrabold text-[#3B25A8]" data-testid="profile-preview-button"><User className="h-4 w-4" />Preview profile</Link>
          <Link to={`/app/setup/${mode}`} className="flex h-11 items-center justify-center gap-1.5 rounded-full bg-white/15 text-sm font-bold" data-testid="profile-edit-button"><Pencil className="h-4 w-4" />Edit profile</Link>
        </div>
        {status && p.status !== "approved" && <p className="mt-3 flex items-center gap-1.5 text-xs text-amber-200" data-testid="creator-status-pill"><StatusIcon className="h-3.5 w-3.5" />{p.status === "rejected" ? `${status[1]}: ${p.review_note || "see notifications"}. Edit your profile to send it for review again.` : `${status[1]}. Your profile shows in Discover once approved.`}</p>}
      </section>
      <VisibilityCard kind={mode} live={p.live !== false} pending={isC && p.status !== "approved"} onToggle={() => toggle(mode, p.live === false)} />
      {isC ? (
        <Panel title="Creator tools" testid="creator-tools">
          <ToolRow to="/app/setup/creator?step=2" icon={Tag} title="Services & prices" sub={(p.plans || []).map((x) => PLAN_BY_ID[x]?.label).join(" · ")} testid="tool-services" />
          <ToolRow to="/app/posts" icon={Camera} title="Portfolio posts" sub={`${posts} posts · add or manage your photos and reels`} testid="tool-posts" />
          <ToolRow to="/app/setup/creator" icon={MapPin} title="Work location" sub={`${p.city}${p.state ? `, ${p.state}` : ""}`} testid="tool-location" />
          <ToolRow to="/app/jobs" icon={Briefcase} title="Jobs I'm interested in" sub="Jobs posted by businesses" testid="tool-interests" />
          <ToolRow to="/app/settings#payments" icon={Wallet} title="Payout details" sub={me.user.payout_upi || "Add your UPI ID"} testid="tool-payout" />
        </Panel>
      ) : (
        <Panel title="Business tools" testid="business-tools">
          <ToolRow to="/app/jobs" icon={Briefcase} title="My jobs" sub="Post work so creators can find you and show interest" testid="tool-jobs" />
          <ToolRow to="/app/setup/business?step=1" icon={Pencil} title="Hiring preferences" sub={`${(p.need_plans || []).map((x) => PLAN_BY_ID[x]?.label).join(", ")} · Budget ${p.budget}`} testid="tool-preferences" />
          <ToolRow to="/app/upgrade" icon={Crown} title={me.is_pro ? "Business Pro" : "Upgrade to Business Pro"} sub={me.is_pro ? `Active until ${new Date(me.user.pro_until).toLocaleDateString()}` : `${me.contacts_used}/${me.free_contacts} free creator contacts used`} testid="tool-upgrade" />
        </Panel>
      )}
      <Panel title="Account">
        {hasOther ? <ToolRow onClick={() => switchTo(other)} icon={Repeat} title={`Switch to ${other} account`} sub="Use the app as the other side" testid="profile-switch-account" />
          : <ToolRow to={`/app/setup/${other}`} icon={Plus} title={`Also create a ${other} profile`} sub={other === "creator" ? "Get hired as a presenter" : "Hire presenters for your brand"} testid="profile-create-other" />}
        <ToolRow to="/app/saved" icon={Bookmark} title="Saved" sub="Creators and businesses you saved" testid="profile-link-saved" />
        <ToolRow to="/app/settings" icon={Settings} title="Settings & support" sub="Notifications, payments, privacy, help" testid="profile-settings-link" />
        {["owner", "admin"].includes(me.user.role) && <ToolRow to="/admin" icon={ShieldCheck} title="Admin panel" testid="profile-link-admin" />}
      </Panel>
      <p className="text-center text-xs text-white/50">{me.user.email}</p>
    </div>
  );
}
