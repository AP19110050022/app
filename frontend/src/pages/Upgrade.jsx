import { Link, useNavigate } from "react-router-dom";
import { Crown, Check, X, FlaskConical, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PayButton } from "@/components/PayButton";
import { useMe } from "@/context/MeContext";
import { inr } from "@/lib/api";

const ROWS = [
  ["Browse, filter & shortlist creators", true, true],
  ["Offers per month", "2", "Unlimited"],
  ["Chat with creators", false, true],
  ["Pay safely in the app", false, true],
  ["Verified business badge", false, true],
];

const Cell = ({ v }) => (v === true ? <Check className="mx-auto h-5 w-5 text-violet-600" /> : v === false ? <X className="mx-auto h-5 w-5 text-slate-300" /> : <span className="font-semibold">{v}</span>);

export default function Upgrade() {
  const { me, config } = useMe();
  const navigate = useNavigate();
  const price = config?.pro_price ?? 999;
  return (
    <div className="mx-auto max-w-3xl" data-testid="upgrade-page">
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-8 text-white sm:p-10">
        <div className="grain absolute inset-0" />
        <div className="relative">
          <Crown className="h-10 w-10 text-amber-300" />
          <h1 className="mt-4 font-heading text-4xl font-extrabold">Business Pro</h1>
          <p className="mt-2 max-w-md text-white/75">Unlimited offers, chat with every creator, and safe in-app payments.</p>
          <p className="mt-6"><span className="font-heading text-5xl font-extrabold">{inr(price)}</span><span className="text-white/60"> / {config?.pro_days ?? 30} days</span></p>
          {me.is_pro ? (
            <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-200" data-testid="pro-active-badge">
              <Check className="h-4 w-4" /> Active until {new Date(me.user.pro_until).toLocaleDateString()}
            </p>
          ) : null}
          <div className="mt-6">
            {me.business ? (
              <PayButton body={{ kind: "pro" }} label={me.is_pro ? `Extend 30 days · ${inr(price)}` : `Upgrade · ${inr(price)}`} className="h-12 bg-white px-7 text-violet-800 hover:bg-violet-50" testid="upgrade-pay-button" onPaid={() => navigate("/app/profile")} />
            ) : (
              <Link to="/app/setup/business?next=/app/upgrade"><Button className="h-12 gap-2 rounded-full bg-white px-7 text-violet-800 hover:bg-violet-50" data-testid="upgrade-setup-business"><Briefcase className="h-4 w-4" />Create a business profile first</Button></Link>
            )}
          </div>
          {config?.payments_mode === "test" && <p className="mt-4 flex items-center gap-1.5 text-xs text-white/60" data-testid="test-mode-note"><FlaskConical className="h-3.5 w-3.5" />Test mode: payments are simulated until Razorpay keys are added.</p>}
        </div>
      </div>
      <div className="mt-8 overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-slate-50 text-left"><th className="p-4">Feature</th><th className="p-4 text-center">Free</th><th className="p-4 text-center text-violet-700">Pro</th></tr></thead>
          <tbody>{ROWS.map(([f, a, b]) => <tr key={f} className="border-b last:border-0"><td className="p-4">{f}</td><td className="p-4 text-center"><Cell v={a} /></td><td className="p-4 text-center"><Cell v={b} /></td></tr>)}</tbody>
        </table>
      </div>
      <p className="mt-4 text-center text-xs text-slate-500">A {config?.fee_pct ?? 10}% service fee is taken from the creator's payout on each paid deal. Businesses pay the agreed price only.</p>
    </div>
  );
}
