import { Link, useNavigate } from "react-router-dom";
import { Crown, Check, X, FlaskConical, Store, ArrowLeft } from "lucide-react";
import { PayButton } from "@/components/PayButton";
import { useMe } from "@/context/MeContext";
import { inr } from "@/lib/api";

const ROWS = [
  ["Browse, filter & save creators", true, true],
  ["Offers per month", "2", "Unlimited"],
  ["Chat with creators", false, true],
  ["Pay safely in the app", false, true],
  ["Verified business badge", false, true],
];
const Cell = ({ v }) => (v === true ? <Check className="mx-auto h-5 w-5 text-emerald-300" /> : v === false ? <X className="mx-auto h-5 w-5 text-white/30" /> : <span className="font-extrabold">{v}</span>);

export default function Upgrade() {
  const { me, config } = useMe();
  const navigate = useNavigate();
  const price = config?.pro_price ?? 999;
  return (
    <div className="mx-auto max-w-xl" data-testid="upgrade-page">
      <button onClick={() => navigate(-1)} className="mb-4 grid h-11 w-11 place-items-center rounded-full bg-white/15" aria-label="Back" data-testid="upgrade-back"><ArrowLeft className="h-5 w-5" /></button>
      <div className="card-shadow relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#FF5FA2] via-[#B35CFF] to-[#6C4CF1] p-6">
        <span className="absolute -right-14 -top-14 h-52 w-52 rounded-full border-[28px] border-white/15" />
        <div className="relative">
          <Crown className="h-9 w-9" />
          <h1 className="mt-3 text-[32px] font-extrabold leading-tight">Business Pro</h1>
          <p className="text-[15px] text-white/90">Unlimited offers, chat with every creator, and safe in-app payments.</p>
          <p className="mt-5"><span className="text-5xl font-extrabold">{inr(price)}</span><span className="text-white/80"> / {config?.pro_days ?? 30} days</span></p>
          {me.is_pro && <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3.5 py-1.5 text-sm font-bold" data-testid="pro-active-badge"><Check className="h-4 w-4" />Active until {new Date(me.user.pro_until).toLocaleDateString()}</p>}
          <div className="mt-5">
            {me.business ? (
              <PayButton body={{ kind: "pro" }} label={me.is_pro ? `Extend 30 days · ${inr(price)}` : `Upgrade · ${inr(price)}`} className="h-[52px] w-full bg-white text-base text-[#3B25A8]" testid="upgrade-pay-button" onPaid={() => navigate("/app/profile")} />
            ) : (
              <Link to="/app/setup/business?next=/app/upgrade" className="flex h-[52px] items-center justify-center gap-2 rounded-full bg-white font-extrabold text-[#3B25A8]" data-testid="upgrade-setup-business"><Store className="h-4 w-4" />Create a business profile first</Link>
            )}
          </div>
        </div>
      </div>
      {config?.payments_mode === "test" && <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-white/60" data-testid="test-mode-note"><FlaskConical className="h-3.5 w-3.5" />Test mode: payments are simulated until Razorpay keys are added.</p>}
      <div className="glass mt-5 overflow-hidden rounded-[24px]">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-white/15 text-left"><th className="p-3.5">Feature</th><th className="p-3.5 text-center">Free</th><th className="p-3.5 text-center">Pro</th></tr></thead>
          <tbody>{ROWS.map(([f, a, b]) => <tr key={f} className="border-b border-white/10 last:border-0"><td className="p-3.5">{f}</td><td className="p-3.5 text-center"><Cell v={a} /></td><td className="p-3.5 text-center"><Cell v={b} /></td></tr>)}</tbody>
        </table>
      </div>
      <p className="mt-4 text-center text-xs text-white/60">Creators join free. A {config?.fee_pct ?? 10}% service fee is taken from the creator's payout on each paid deal.</p>
    </div>
  );
}
