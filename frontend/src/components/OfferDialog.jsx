import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Send, Loader2, Info } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/Stepper";
import { PLANS } from "@/constants/options";
import { useMe } from "@/context/MeContext";
import { errMsg, inr } from "@/lib/api";

const Box = ({ children, testid }) => (
  <DialogContent className="max-h-[92vh] overflow-y-auto rounded-[28px] border-white/10 bg-gradient-to-b from-[#4530C8] to-[#2A1B7A] text-white sm:max-w-lg" data-testid={testid}>{children}</DialogContent>
);

export const OfferDialog = ({ creator, open, onOpenChange, initialPlan = "per_video", onSent }) => {
  const { me, api, config, refresh } = useMe();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(initialPlan);
  const [price, setPrice] = useState(0);
  const [brief, setBrief] = useState("");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);

  const offered = PLANS.filter((p) => creator[p.rate]);
  useEffect(() => {
    if (open) {
      const start = offered.find((p) => p.id === initialPlan) || offered[0];
      setPlan(start.id);
      setPrice(creator[start.rate]);
    }
  }, [open, initialPlan, creator]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (p) => { setPlan(p.id); setPrice(creator[p.rate]); };
  const limit = me?.free_contacts ?? config?.free_contacts ?? 3;
  const left = Math.max(0, limit - (me?.contacts_used || 0));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/deals", { creator_id: creator.user_id, plan, brief, start_date: date, price: Number(price) });
      await refresh();
      toast.success("Offer sent!");
      onSent?.();
      onOpenChange(false);
      navigate(`/app/chat/${data.id}`);
    } catch (err) {
      toast.error(errMsg(err));
    } finally { setBusy(false); }
  };

  if (!me?.business) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <Box testid="offer-need-business-dialog">
          <DialogHeader className="text-left">
            <DialogTitle className="text-2xl font-extrabold text-white">Set up your business first</DialogTitle>
            <DialogDescription className="text-white/75">2 quick steps. Creators see your brand name with every offer.</DialogDescription>
          </DialogHeader>
          <button className="cta h-12 rounded-full font-extrabold" onClick={() => navigate(`/app/setup/business?next=/app/creator/${creator.user_id}`)} data-testid="offer-setup-business-button">Create business profile</button>
        </Box>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Box testid="offer-dialog">
        <DialogHeader className="text-left">
          <DialogTitle className="text-2xl font-extrabold text-white">Hire {creator.name}</DialogTitle>
          <DialogDescription className="text-white/75">Pick a plan, describe what you need, and propose a price.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className={`grid gap-2 ${offered.length === 3 ? "grid-cols-3" : offered.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
            {offered.map((p) => (
              <button type="button" key={p.id} onClick={() => pick(p)} data-testid={`offer-plan-${p.id}`}
                className={`rounded-[18px] border p-3 text-left transition-colors ${plan === p.id ? "border-white bg-white text-[#3B25A8]" : "border-white/25 bg-white/10 hover:bg-white/20"}`}>
                <p.icon className="h-5 w-5" />
                <p className="mt-1 text-sm font-extrabold">{p.label}</p>
                <p className="text-[11px] opacity-75">{inr(creator[p.rate])}{p.unit}</p>
              </button>
            ))}
          </div>
          <Field label="Brief">
            <Textarea required minLength={10} rows={4} value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="e.g. 30-second Instagram reel showing our new cold coffee, shot in our café, Hindi + English." data-testid="offer-brief-input" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start date"><Input type="date" required value={date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} className="[color-scheme:dark]" data-testid="offer-date-input" /></Field>
            <Field label="Your price (₹)"><Input type="number" required min={100} value={price} onChange={(e) => setPrice(e.target.value)} data-testid="offer-price-input" /></Field>
          </div>
          {!me.is_pro && (
            <p className="flex items-start gap-2 rounded-2xl bg-white/10 p-3 text-xs text-white/85" data-testid="offer-free-limit-note">
              <Info className="mt-0.5 h-4 w-4 shrink-0" /> Free plan: you can contact {limit} creators ({left} left). Chatting with them is free; paying in the app needs Business Pro.{left === 0 && <> Already used up? <button type="button" onClick={() => navigate("/app/upgrade")} className="font-extrabold underline" data-testid="offer-upgrade-link">Upgrade</button> to contact new creators.</>}
            </p>
          )}
          <button type="submit" disabled={busy} className="cta flex h-[52px] w-full items-center justify-center gap-2 rounded-full font-extrabold disabled:opacity-60" data-testid="offer-submit-button">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send offer · {inr(price)}
          </button>
        </form>
      </Box>
    </Dialog>
  );
};
