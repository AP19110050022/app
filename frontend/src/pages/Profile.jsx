import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useClerk, useUser } from "@clerk/react";
import { toast } from "sonner";
import { Clapperboard, Briefcase, Crown, Pencil, Plus, LogOut, Trash2, Wallet, Heart, ShieldCheck, Clock, EyeOff, BadgeCheck, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useMe } from "@/context/MeContext";
import { errMsg, inr } from "@/lib/api";

const Card = ({ children, className = "", testid }) => <div className={`rounded-3xl bg-white p-5 ring-1 ring-slate-200 ${className}`} data-testid={testid}>{children}</div>;

const CREATOR_STATUS = {
  pending: { t: "Under review", i: Clock, c: "text-amber-700 bg-amber-50" },
  approved: { t: "Live", i: BadgeCheck, c: "text-emerald-700 bg-emerald-50" },
  hidden: { t: "Hidden", i: EyeOff, c: "text-rose-700 bg-rose-50" },
};

const RoleCard = ({ kind, profile, active, onSwitch }) => {
  const isC = kind === "creator";
  const Icon = isC ? Clapperboard : Briefcase;
  const st = isC && profile ? CREATOR_STATUS[profile.status] : null;
  return (
    <Card testid={`profile-role-${kind}`} className={active ? "ring-2 ring-violet-500" : ""}>
      <div className="flex items-start gap-3">
        <span className={`grid h-11 w-11 place-items-center rounded-2xl text-white ${isC ? "bg-gradient-to-br from-violet-600 to-fuchsia-500" : "bg-gradient-to-br from-indigo-600 to-sky-500"}`}><Icon className="h-5 w-5" /></span>
        <div className="flex-1">
          <p className="font-heading font-bold">{isC ? "Creator" : "Business"}{active && <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase text-violet-700">Active</span>}</p>
          <p className="text-sm text-slate-500">{profile ? (isC ? `${profile.category} · ${profile.city}` : `${profile.company} · ${profile.city}`) : isC ? "Get hired by brands" : "Hire creators for your brand"}</p>
          {st && <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.c}`} data-testid="creator-status-pill"><st.i className="h-3.5 w-3.5" />{st.t}</span>}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {profile ? (
          <>
            <Link to={`/app/setup/${kind}`}><Button variant="outline" size="sm" className="gap-1.5 rounded-full" data-testid={`profile-edit-${kind}`}><Pencil className="h-3.5 w-3.5" />Edit</Button></Link>
            {!active && <Button size="sm" className="rounded-full" onClick={onSwitch} data-testid={`profile-switch-${kind}`}>Switch to {kind}</Button>}
            {isC && profile.status === "approved" && <Link to={`/app/creator/${profile.user_id}`}><Button variant="ghost" size="sm" className="rounded-full" data-testid="profile-view-public">View public profile</Button></Link>}
          </>
        ) : (
          <Link to={`/app/setup/${kind}`}><Button size="sm" className="gap-1.5 rounded-full" data-testid={`profile-create-${kind}`}><Plus className="h-3.5 w-3.5" />Set up</Button></Link>
        )}
      </div>
    </Card>
  );
};

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
    <div className="mx-auto max-w-3xl space-y-5" data-testid="profile-page">
      <div className="flex items-center gap-4">
        <img src={user?.imageUrl || me.user.image_url} alt="" className="h-16 w-16 rounded-full object-cover ring-4 ring-violet-100" />
        <div>
          <h1 className="font-heading text-2xl font-bold" data-testid="profile-name">{me.user.name}</h1>
          <p className="text-sm text-slate-500">{me.user.email}</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <RoleCard kind="creator" profile={me.creator} active={me.user.active_mode === "creator"} onSwitch={() => switchTo("creator")} />
        <RoleCard kind="business" profile={me.business} active={me.user.active_mode === "business"} onSwitch={() => switchTo("business")} />
      </div>
      {me.business && (
        <Card testid="profile-subscription">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Crown className={`h-6 w-6 ${me.is_pro ? "text-amber-500" : "text-slate-300"}`} />
              <div>
                <p className="font-semibold">{me.is_pro ? "Business Pro" : "Free plan"}</p>
                <p className="text-sm text-slate-500">{me.is_pro ? `Active until ${new Date(me.user.pro_until).toLocaleDateString()}` : `${me.offers_this_month}/2 offers used this month · no chat`}</p>
              </div>
            </div>
            <Link to="/app/upgrade"><Button size="sm" className="rounded-full" data-testid="profile-upgrade-button">{me.is_pro ? "Extend" : "Upgrade"}</Button></Link>
          </div>
        </Card>
      )}
      {me.creator && (
        <Card testid="profile-payout">
          <p className="flex items-center gap-2 font-semibold"><Wallet className="h-5 w-5 text-violet-600" />Payout details</p>
          <p className="mt-1 text-sm text-slate-500">Your earnings are sent here when a deal is completed.</p>
          <div className="mt-3 flex gap-2">
            <Input value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="name@upi" data-testid="profile-upi-input" />
            <Button onClick={saveUpi} className="rounded-full" data-testid="profile-upi-save">Save</Button>
          </div>
        </Card>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Link to="/app/saved"><Card className="flex items-center gap-3 transition-colors hover:bg-violet-50" testid="profile-link-saved"><Heart className="h-5 w-5 text-pink-500" />Shortlist</Card></Link>
        {me.user.role === "admin" && <Link to="/app/admin"><Card className="flex items-center gap-3 transition-colors hover:bg-violet-50" testid="profile-link-admin"><ShieldCheck className="h-5 w-5 text-violet-600" />Admin panel</Card></Link>}
      </div>
      {payments.length > 0 && (
        <Card testid="profile-payments">
          <p className="flex items-center gap-2 font-semibold"><Receipt className="h-5 w-5 text-violet-600" />Payments</p>
          <div className="mt-3 divide-y">
            {payments.map((p) => <div key={p.id} className="flex justify-between py-2 text-sm"><span>{p.description}{p.mode === "test" && <span className="ml-2 text-xs text-slate-400">(test)</span>}</span><span className="font-semibold">{inr(p.amount)}</span></div>)}
          </div>
        </Card>
      )}
      <div className="flex flex-wrap gap-3 pt-2">
        <Button variant="outline" className="gap-2 rounded-full" onClick={() => signOut()} data-testid="profile-logout-button"><LogOut className="h-4 w-4" />Log out</Button>
        <AlertDialog>
          <AlertDialogTrigger asChild><Button variant="ghost" className="gap-2 rounded-full text-rose-600" data-testid="profile-delete-button"><Trash2 className="h-4 w-4" />Delete account</Button></AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>This removes your creator and business profiles, shortlist and notifications. Deal records are kept for the other party.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="delete-cancel">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={deleteAccount} className="bg-rose-600 hover:bg-rose-700" data-testid="delete-confirm">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
