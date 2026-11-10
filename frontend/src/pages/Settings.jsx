import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useClerk, useUser } from "@clerk/react";
import { toast } from "sonner";
import { ArrowLeft, Bell, Wallet, Shield, HelpCircle, FileText, LogOut, Trash2, Receipt } from "lucide-react";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Switch } from "@/components/AppBits";
import { VisibilityCard } from "@/pages/Profile";
import { useMe } from "@/context/MeContext";
import { errMsg, inr } from "@/lib/api";

const PREFS = [["offers", "New offers & job interest", "When someone sends you an offer or shows interest"], ["deals", "Deal & payment updates", "Accepted, paid, delivered, payouts and ratings"], ["messages", "Chat messages", "When you get a new message"]];

const Item = ({ value, icon: Icon, title, children }) => (
  <AccordionItem value={value} className="border-white/10 px-4" id={value}>
    <AccordionTrigger className="hover:no-underline" data-testid={`settings-${value}`}><span className="flex items-center gap-3 font-bold"><Icon className="h-5 w-5" />{title}</span></AccordionTrigger>
    <AccordionContent className="space-y-3 text-[13px] text-white/80">{children}</AccordionContent>
  </AccordionItem>
);

export default function SettingsPage() {
  const { me, api, refresh, config } = useMe();
  const navigate = useNavigate();
  const { signOut } = useClerk();
  const { user } = useUser();
  const prefs = { offers: true, deals: true, messages: true, ...(me.user.notify_prefs || {}) };
  const [upi, setUpi] = useState(me.user.payout_upi || "");
  const [payments, setPayments] = useState([]);
  useEffect(() => { api.get("/payments/mine").then((r) => setPayments(r.data)); }, [api]);

  const setPref = async (k) => { await api.patch("/me", { notify_prefs: { ...prefs, [k]: !prefs[k] } }); await refresh(); toast.success("Notification settings saved"); };
  const saveUpi = async () => { await api.patch("/me", { payout_upi: upi }); await refresh(); toast.success("Payout details saved"); };
  const vis = async (kind, live) => { try { await api.patch("/me/visibility", { kind, live }); await refresh(); } catch (e) { toast.error(errMsg(e)); } };
  const del = async () => { await api.delete("/me"); try { await user?.delete(); } catch {} await signOut(); };

  return (
    <div className="mx-auto max-w-xl space-y-4" data-testid="settings-page">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="grid h-11 w-11 place-items-center rounded-full bg-white/15" aria-label="Back" data-testid="settings-back"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-[22px] font-extrabold">Settings</h1>
      </div>
      <Accordion type="single" collapsible defaultValue={window.location.hash.slice(1) || undefined} className="glass overflow-hidden rounded-[24px]">
        <Item value="notifications" icon={Bell} title="Notifications">
          {PREFS.map(([k, t, d]) => (
            <div key={k} className="flex items-center gap-3"><div className="flex-1"><p className="font-bold text-white">{t}</p><p>{d}</p></div><Switch on={prefs[k]} onClick={() => setPref(k)} testid={`pref-${k}`} label={t} /></div>
          ))}
        </Item>
        <Item value="payments" icon={Wallet} title="Payments & payouts">
          <p>Deal payments and payouts are temporarily unavailable. Businesses can send offers and discuss details in chat. Existing payment history remains available below.</p>
          {me.creator && <div className="flex gap-2"><Input value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="name@upi" data-testid="settings-upi-input" /><button onClick={saveUpi} className="h-11 shrink-0 rounded-full bg-white px-5 text-sm font-extrabold text-[#3B25A8]" data-testid="settings-upi-save">Save</button></div>}
          {payments.length > 0 && <div className="divide-y divide-white/10">{payments.map((p) => <p key={p.id} className="flex justify-between py-1.5"><span className="flex items-center gap-1.5"><Receipt className="h-3.5 w-3.5" />{p.description}{p.mode === "test" ? " (test)" : ""}</span><b>{inr(p.amount)}</b></p>)}</div>}
        </Item>
        <Item value="privacy" icon={Shield} title="Privacy & visibility">
          {me.creator && <VisibilityCard kind="creator" live={me.creator.live !== false} onToggle={() => vis("creator", me.creator.live === false)} />}
          {me.business && <VisibilityCard kind="business" live={me.business.live !== false} onToggle={() => vis("business", me.business.live === false)} />}
          <p>Phone numbers, emails and links in chat are hidden for now. Your phone number is never shown on your profile.</p>
        </Item>
        <Item value="help" icon={HelpCircle} title="Help">
          <p><b className="text-white">Can't find my profile in Discover?</b> It needs a photo, at least one plan with a price, approval by our team, and visibility set to Live.</p>
          <p><b className="text-white">How do businesses find me?</b> They filter by location, category and plan. Showing interest in their jobs also helps.</p>
          <p><b className="text-white">How do I get paid?</b> Deal payments and payouts are temporarily unavailable. We'll make this available later.</p>
        </Item>
        <Item value="legal" icon={FileText} title="Terms & privacy">
          <p>Only upload content you have permission to share. Presenters and businesses agree on the scope of work and usage rights in each offer. Full terms and privacy policy: [placeholder, add your legal pages].</p>
        </Item>
      </Accordion>
      <div className="flex flex-wrap gap-3 pt-1">
        <button onClick={() => signOut()} className="glass inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-bold" data-testid="profile-logout-button"><LogOut className="h-4 w-4" />Log out</button>
        <AlertDialog>
          <AlertDialogTrigger asChild><button className="inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-bold text-rose-200" data-testid="profile-delete-button"><Trash2 className="h-4 w-4" />Delete account</button></AlertDialogTrigger>
          <AlertDialogContent className="rounded-[24px] border-white/10 text-white">
            <AlertDialogHeader><AlertDialogTitle>Delete your account?</AlertDialogTitle><AlertDialogDescription className="text-white/70">This removes your presenter and business profiles, saved list and notifications. Deal records stay for the other party.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel className="rounded-full" data-testid="delete-cancel">Cancel</AlertDialogCancel><AlertDialogAction onClick={del} className="rounded-full bg-rose-500 text-white hover:bg-rose-600" data-testid="delete-confirm">Delete</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
