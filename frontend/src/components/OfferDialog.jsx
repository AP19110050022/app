import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Send, Loader2, Info } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PLANS } from "@/constants/options";
import { useMe } from "@/context/MeContext";
import { errMsg, inr } from "@/lib/api";

export const OfferDialog = ({ creator, open, onOpenChange, initialPlan = "per_video" }) => {
  const { me, api, config, refresh } = useMe();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(initialPlan);
  const [price, setPrice] = useState(0);
  const [brief, setBrief] = useState("");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setPlan(initialPlan);
      setPrice(creator[PLANS.find((p) => p.id === initialPlan).rate]);
    }
  }, [open, initialPlan, creator]);

  const pick = (p) => { setPlan(p.id); setPrice(creator[p.rate]); };
  const limit = config?.free_offer_limit ?? 2;
  const left = Math.max(0, limit - (me?.offers_this_month || 0));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/deals", { creator_id: creator.user_id, plan, brief, start_date: date, price: Number(price) });
      await refresh();
      toast.success("Offer sent!");
      onOpenChange(false);
      navigate(`/app/chat/${data.id}`);
    } catch (err) {
      toast.error(errMsg(err));
    } finally { setBusy(false); }
  };

  if (!me?.business) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="rounded-3xl" data-testid="offer-need-business-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Set up your business first</DialogTitle>
            <DialogDescription>It takes 2 quick steps. Creators see your company name and logo with every offer.</DialogDescription>
          </DialogHeader>
          <Button className="rounded-full" onClick={() => navigate(`/app/setup/business?next=/app/creator/${creator.user_id}`)} data-testid="offer-setup-business-button">Create business profile</Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-3xl sm:max-w-lg" data-testid="offer-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Send an offer to {creator.name}</DialogTitle>
          <DialogDescription>Pick a plan, describe what you need and propose a price.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {PLANS.map((p) => (
              <button type="button" key={p.id} onClick={() => pick(p)} data-testid={`offer-plan-${p.id}`}
                className={`rounded-2xl border p-3 text-left transition-[border-color,background-color] ${plan === p.id ? "border-violet-600 bg-violet-50" : "border-slate-200 hover:border-violet-300"}`}>
                <p.icon className={`h-5 w-5 ${plan === p.id ? "text-violet-600" : "text-slate-400"}`} />
                <p className="mt-1 text-sm font-semibold">{p.label}</p>
                <p className="text-xs text-slate-500">{inr(creator[p.rate])}{p.unit}</p>
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brief">Brief</Label>
            <Textarea id="brief" required minLength={10} rows={4} value={brief} onChange={(e) => setBrief(e.target.value)}
              placeholder="e.g. 30-second Instagram reel showing our new cold coffee, shot in our café, Hindi + English." data-testid="offer-brief-input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="date">Start date</Label>
              <Input id="date" type="date" required value={date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} data-testid="offer-date-input" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="price">Your price (₹)</Label>
              <Input id="price" type="number" required min={100} value={price} onChange={(e) => setPrice(e.target.value)} data-testid="offer-price-input" />
            </div>
          </div>
          {!me.is_pro && (
            <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800" data-testid="offer-free-limit-note">
              <Info className="mt-0.5 h-4 w-4 shrink-0" /> Free plan: {left} of {limit} offers left this month. Chat and payments need Business Pro.
            </p>
          )}
          <Button type="submit" disabled={busy} className="w-full gap-2 rounded-full" data-testid="offer-submit-button">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send offer · {inr(price)}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
