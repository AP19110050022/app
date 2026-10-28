import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useClerk, useUser } from "@clerk/react";
import { toast } from "sonner";
import { Play, Store, Crown, Pencil, Plus, LogOut, Trash2, Wallet, Bookmark, ShieldCheck, Clock, EyeOff, BadgeCheck, Receipt, ChevronRight, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useMe } from "@/context/MeContext";
import { errMsg, inr } from "@/lib/api";

const CREATOR_STATUS = {
  pending: { t: "Under review", i: Clock, c: "bg-amber-300/20 text-amber-100" },
  approved: { t: "Live", i: BadgeCheck, c: "bg-emerald-300/20 text-emerald-100" },
  hidden: { t: "Hidden", i: EyeOff, c: "bg-rose-300/20 text-rose-100" },
};

const RoleCard = ({ kind, profile, active, onSwitch }) => {
  const isC = kind === "creator";
  const Icon = isC ? Play : Store;
  const st = isC && profile ? CREATOR_STATUS[profile.status] : null;
  return (
    <div className={`rounded-[24px] p-4 ${active ? "bg-white text-[#1F1B2E]" : "glass"}`} data-testid={`profile-role-${kind}`}>
      <div className="flex items-center gap-3">
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white ${isC ? "bg-gradient-to-br from-[#7C5CFF] to-[#FF5FA2]" : "bg-gradient-to-br from-[#3B82F6] to-[#7C5CFF]"}`}><Icon className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="font-extrabold">{isC ? "Creator" : "Business"}{active && <span className="ml-2 rounded-full bg-[#EDE8FF] px-2 py-0.5 text-[10px] font-extrabold uppercase text-[#3B25A8]">Active</span>}</p>
          <p className={`truncate text-[13px] ${active ? "text-[#5B5675]" : "text-white/70"}`}>{profile ? (isC ? `${profile.category} · ${profile.city}` : `${profile.company} · ${profile.city}`) : isC ? "Get hired by brands" : "Hire creators for your brand"}</p>
        </div>
        {st && <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${active ? "bg-[#EDE8FF] text-[#3B25A8]" : st.c}`} data-testid="creator-status-pill"><st.i className="h-3.5 w-3.5" />{st.t}</span>}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {profile ? (<>
          <Link to={`/app/setup/${kind}`} className={`inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-bold ${active ? "bg-[#EDE8FF] text-[#3B25A8]" : "bg-white/15"}`} data-testid={`profile-edit-${kind}`}><Pencil className="h-3.5 w-3.5" />Edit</Link>
          {!active && <button onClick={onSwitch} className="inline-flex h-9 items-center rounded-full bg-white px-4 text-[13px] font-extrabold text-[#3B25A8]" data-testid={`profile-switch-${kind}`}>Switch to {kind}</button>}
          {isC && profile.status === "approved" && <Link to={`/app/creator/${profile.user_id}`} className={`inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-bold ${active ? "bg-[#EDE8FF] text-[#3B25A8]" : "bg-white/15"}`} data-testid="profile-view-public"><Eye className="h-3.5 w-3.5" />View profile</Link>}
        </>) : (
          <Link to={`/app/setup/${kind}`} className="cta inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-extrabold" data-testid={`profile-create-${kind}`}><Plus className="h-3.5 w-3.5" />Set up</Link>
        )}
      </div>
    </div>
  );
};

const Row = ({ to, icon: Icon, label, testid, right }) => (
  <Link to={to} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-white/10" data-testid={testid}>
    <Icon className="h-5 w-5" /><span className="flex-1 font-semibold">{label}</span>{right}<ChevronRight className="h-4 w-4 text-white/50" />
  </Link>
);

export default function Profile() {
  const { me, api, refresh } = useMe();
  const { signOut } = useClerk();
  const { user } = useUser();
  const [upi, setUpi] = useState(me.user.payout_upi || "");
  const [payments, setPayments] = useState([]);
  useEffect(() => { api.get("/payments/mine").then((r) => setPayments(r.data)); }, [api]);

  const switchTo = async (mode) => {
    try { await api.patch("/me", { active_mode: mode }); await refresh(); toast.success(`Switched to ${mode} mode`); } catch (e) { toast.error(errMsg(e)); }
  };
  const saveUpi = async () => { await api.patch("/me", { payout_upi: upi }); await refresh(); toast.success("Payout details saved"); };
  const deleteAccount = async () => {
    await api.delete("/me");
    try { await user?.delete(); } catch {}
    await signOut();
  };

  return (
    <div className="mx-auto max-w-xl space-y-4" data-testid="profile-page">
      <div className="flex items-center gap-4">
        <span className="ring-story shrink-0 rounded-full p-[3px]"><img src={me.creator?.photo || user?.imageUrl || me.user.image_url} alt="" className="h-20 w-20 rounded-full border-[3px] border-[#3B25A8] object-cover" /></span>
        <div className="min-w-0">
          <h1 className="truncate text-[22px] font-extrabold" data-testid="profile-name">{me.user.name}</h1>
          <p className="truncate text-[13px] text-white/70">{me.user.email}</p>
          {me.is_pro && <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-bold"><Crown className="h-3.5 w-3.5 text-amber-300" />Verified business</span>}
        </div>
      </div>
      <p className="pt-2 text-xs font-bold uppercase tracking-widest text-white/60">Your roles</p>
      <RoleCard kind="creator" profile={me.creator} active={me.user.active_mode === "creator"} onSwitch={() => switchTo("creator")} />
      <RoleCard kind="business" profile={me.business} active={me.user.active_mode === "business"} onSwitch={() => switchTo("business")} />
      {me.creator && (
        <div className="glass rounded-[24px] p-4" data-testid="profile-payout">
          <p className="flex items-center gap-2 font-extrabold"><Wallet className="h-5 w-5" />Payout UPI</p>
          <div className="mt-3 flex gap-2">
            <Input value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="name@upi" data-testid="profile-upi-input" />
            <button onClick={saveUpi} className="h-11 shrink-0 rounded-full bg-white px-5 text-sm font-extrabold text-[#3B25A8]" data-testid="profile-upi-save">Save</button>
          </div>
        </div>
      )}
      <div className="glass overflow-hidden rounded-[24px] divide-y divide-white/10">
        {me.business && <Row to="/app/upgrade" icon={Crown} label={me.is_pro ? "Business Pro" : "Upgrade to Business Pro"} testid="profile-upgrade-button"
          right={<span className="text-xs text-white/70">{me.is_pro ? `until ${new Date(me.user.pro_until).toLocaleDateString()}` : `${me.offers_this_month}/2 offers used`}</span>} />}
        <Row to="/app/saved" icon={Bookmark} label="Saved creators & businesses" testid="profile-link-saved" />
        {me.user.role === "admin" && <Row to="/app/admin" icon={ShieldCheck} label="Admin panel" testid="profile-link-admin" />}
      </div>
      {payments.length > 0 && (
        <div className="glass rounded-[24px] p-4" data-testid="profile-payments">
          <p className="flex items-center gap-2 font-extrabold"><Receipt className="h-5 w-5" />Payments</p>
          <div className="mt-2 divide-y divide-white/10">
            {payments.map((p) => <div key={p.id} className="flex justify-between gap-3 py-2 text-sm"><span className="truncate">{p.description}{p.mode === "test" && <span className="ml-1.5 text-xs text-white/50">(test)</span>}</span><span className="font-extrabold">{inr(p.amount)}</span></div>)}
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-3 pt-2">
        <button onClick={() => signOut()} className="glass inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-bold" data-testid="profile-logout-button"><LogOut className="h-4 w-4" />Log out</button>
        <AlertDialog>
          <AlertDialogTrigger asChild><button className="inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-bold text-rose-200" data-testid="profile-delete-button"><Trash2 className="h-4 w-4" />Delete account</button></AlertDialogTrigger>
          <AlertDialogContent className="rounded-[24px] border-white/10 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription className="text-white/70">This removes your creator and business profiles, saved list and notifications. Deal records stay for the other party.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-full" data-testid="delete-cancel">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={deleteAccount} className="rounded-full bg-rose-500 text-white hover:bg-rose-600" data-testid="delete-confirm">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
