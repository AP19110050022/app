import { useEffect, useState } from "react";
import { Crown, Percent, CalendarDays, MessageCircle, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useMe } from "@/context/MeContext";
import { errMsg, inr } from "@/lib/api";
import { H1, Spinner, useAdminData } from "@/pages/admin/bits";

const FIELDS = [
  ["pro_price", "Business Pro price (₹)", Crown, "What a business pays for each Pro period"],
  ["pro_days", "Pro period (days)", CalendarDays, "How long one Pro payment lasts"],
  ["fee_pct", "Service fee on paid deals (%)", Percent, "Taken from the presenter's payout"],
  ["free_contacts", "Free presenter contacts", MessageCircle, "Presenters a business can chat with or send offers to"],
];

export default function Pricing() {
  const { me, api, refresh } = useMe();
  const [p, reload] = useAdminData("/admin/pricing");
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (p) setF(p); }, [p]);
  const owner = me.user.role === "owner";
  if (!f) return <Spinner />;
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { await api.put("/admin/pricing", Object.fromEntries(FIELDS.map(([k]) => [k, Number(f[k])]))); toast.success("Prices updated"); reload(); refresh(); }
    catch (er) { toast.error(errMsg(er)); }
    setBusy(false);
  };
  return (
    <div className="max-w-2xl" data-testid="admin-pricing">
      <H1 sub={owner ? "Changes apply to new payments right away. Paid deals keep the fee they were paid with." : "Only the main admin can change prices"}>Prices</H1>
      <form onSubmit={save} className="space-y-3">
        {FIELDS.map(([k, label, Icon, hint]) => (
          <label key={k} className="glass flex items-center gap-4 rounded-[22px] p-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/15"><Icon className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1"><span className="block font-bold">{label}</span><span className="block text-xs text-white/65">{hint}</span></span>
            <Input type="number" required disabled={!owner} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} className="w-28 rounded-full text-right" data-testid={`pricing-${k}`} />
          </label>
        ))}
        <p className="px-1 text-xs text-white/60">Preview: Business Pro {inr(f.pro_price)} for {f.pro_days} days · {f.fee_pct}% fee · {f.free_contacts} free contacts.</p>
        {owner && <button type="submit" disabled={busy} className="cta inline-flex h-12 items-center gap-2 rounded-full px-6 font-extrabold disabled:opacity-60" data-testid="pricing-save-button">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save prices</button>}
      </form>
    </div>
  );
}
