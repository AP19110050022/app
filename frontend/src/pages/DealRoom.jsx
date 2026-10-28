import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Send, Lock, ShieldAlert, Check, X, Repeat, Ban, Link2, PackageCheck, Star, Crown, Loader2, Calendar, ExternalLink, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";
import { PayButton } from "@/components/PayButton";
import { Progress } from "@/pages/Deals";
import { useMe } from "@/context/MeContext";
import { errMsg, inr } from "@/lib/api";

const InlineInput = ({ placeholder, type = "text", onSubmit, cta, testid, icon: Icon }) => {
  const [v, setV] = useState("");
  return (
    <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (v) onSubmit(v); }}>
      <Input type={type} value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} data-testid={`${testid}-input`} className="rounded-full" />
      <Button type="submit" className="shrink-0 gap-2 rounded-full" data-testid={`${testid}-submit`}><Icon className="h-4 w-4" />{cta}</Button>
    </form>
  );
};

const Rate = ({ onRate }) => {
  const [stars, setStars] = useState(5);
  const [review, setReview] = useState("");
  return (
    <div className="space-y-2" data-testid="rate-form">
      <p className="text-sm font-semibold">Rate this creator</p>
      <div className="flex gap-1">{[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => setStars(n)} data-testid={`rate-star-${n}`}><Star className={`h-7 w-7 transition-transform hover:scale-110 ${n <= stars ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} /></button>
      ))}</div>
      <Textarea rows={2} value={review} onChange={(e) => setReview(e.target.value)} placeholder="Share a few words (optional)" data-testid="rate-review-input" />
      <Button className="rounded-full" onClick={() => onRate(stars, review)} data-testid="rate-submit-button">Submit rating</Button>
    </div>
  );
};

const Actions = ({ deal, act, reload, me, config }) => {
  const { status: st, is_business: b, is_creator: c } = deal;
  const fee = Math.round(deal.price * (config?.fee_pct ?? 10) / 100);
  return (
    <div className="space-y-3" data-testid="deal-actions">
      {c && st === "pending" && (
        <>
          <div className="flex flex-wrap gap-2">
            <Button className="gap-2 rounded-full" onClick={() => act("accept")} data-testid="deal-accept-button"><Check className="h-4 w-4" />Accept {inr(deal.price)}</Button>
            <Button variant="outline" className="gap-2 rounded-full text-rose-600" onClick={() => act("decline")} data-testid="deal-decline-button"><X className="h-4 w-4" />Decline</Button>
          </div>
          <InlineInput type="number" placeholder="Your counter price (₹)" cta="Counter" icon={Repeat} testid="deal-counter" onSubmit={(v) => act("counter", { price: Number(v) })} />
        </>
      )}
      {c && st === "countered" && <p className="text-sm text-slate-500">You countered at {inr(deal.counter_price)}. Waiting for the business to reply.</p>}
      {b && st === "countered" && (
        <div className="flex flex-wrap gap-2">
          <Button className="gap-2 rounded-full" onClick={() => act("accept_counter")} data-testid="deal-accept-counter-button"><Check className="h-4 w-4" />Accept {inr(deal.counter_price)}</Button>
          <Button variant="outline" className="gap-2 rounded-full text-rose-600" onClick={() => act("decline")} data-testid="deal-decline-counter-button"><X className="h-4 w-4" />Decline counter</Button>
        </div>
      )}
      {b && st === "pending" && <p className="text-sm text-slate-500">Waiting for {deal.creator_name} to reply.</p>}
      {c && st === "accepted" && <p className="text-sm text-slate-500">Waiting for {deal.business_name} to pay. You'll be notified when the money is held.</p>}
      {b && st === "accepted" && (
        <div className="space-y-2 rounded-2xl bg-violet-50 p-4">
          <p className="text-sm text-violet-900">Pay {inr(deal.price)} now. We hold it safely and only release it to the creator after you approve the work.</p>
          {me.is_pro ? <PayButton body={{ kind: "deal", deal_id: deal.id }} label={`Pay ${inr(deal.price)}`} onPaid={reload} testid="deal-pay-button" />
            : <Link to="/app/upgrade"><Button className="gap-2 rounded-full" data-testid="deal-upgrade-to-pay"><Crown className="h-4 w-4" />Upgrade to Pro to pay</Button></Link>}
        </div>
      )}
      {c && st === "paid" && (
        <div className="space-y-2">
          <p className="text-sm text-emerald-700">Payment of {inr(deal.price)} is held. Deliver the work and share the link below.</p>
          {deal.delivery_link && <p className="text-xs text-slate-500">Submitted: <a href={deal.delivery_link} target="_blank" rel="noreferrer" className="text-violet-700 underline">{deal.delivery_link}</a></p>}
          <InlineInput placeholder="Link to the finished video (Drive, YouTube…)" cta={deal.delivery_link ? "Update" : "Submit work"} icon={Link2} testid="deal-submit-work" onSubmit={(v) => act("submit_work", { link: v })} />
        </div>
      )}
      {b && st === "paid" && (deal.delivery_link ? (
        <div className="space-y-2 rounded-2xl bg-cyan-50 p-4">
          <a href={deal.delivery_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-cyan-800 underline" data-testid="deal-view-work-link"><ExternalLink className="h-4 w-4" />View submitted work</a>
          <p className="text-sm text-cyan-900">Happy with it? Approve to release the payment to the creator.</p>
          <Button className="gap-2 rounded-full" onClick={() => act("mark_delivered")} data-testid="deal-mark-delivered-button"><PackageCheck className="h-4 w-4" />Approve & mark delivered</Button>
        </div>
      ) : <p className="text-sm text-slate-500">Payment held. Waiting for {deal.creator_name} to submit the work.</p>)}
      {st === "delivered" && <p className="text-sm text-cyan-800">Work approved. HireMyFace is releasing {c ? `your payout of ${inr(deal.price - fee)}` : "the payout to the creator"}.</p>}
      {st === "completed" && <p className="flex items-center gap-1.5 text-sm text-green-700"><Wallet className="h-4 w-4" />Completed. {c ? `Payout of ${inr(deal.payout_amount)} released.` : "Payout released to the creator."}</p>}
      {b && ["delivered", "completed"].includes(st) && !deal.rating && <Rate onRate={async (stars, review) => { try { await me.api.post(`/deals/${deal.id}/rate`, { stars, review }); toast.success("Thanks for rating!"); reload(); } catch (e) { toast.error(errMsg(e)); } }} />}
      {deal.rating && <p className="flex items-center gap-1 text-sm text-slate-600">Rated {deal.rating.stars}<Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {deal.rating.review && `· “${deal.rating.review}”`}</p>}
      {b && ["pending", "countered", "accepted"].includes(st) && <button className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-rose-600" onClick={() => act("cancel")} data-testid="deal-cancel-button"><Ban className="h-3.5 w-3.5" />Cancel offer</button>}
      {c && deal.status !== "declined" && <p className="text-xs text-slate-400">You receive {inr(deal.price - fee)} after the {config?.fee_pct ?? 10}% service fee.</p>}
    </div>
  );
};

const Composer = ({ deal, onSend, me }) => {
  const [t, setT] = useState("");
  if (["declined", "cancelled"].includes(deal.status)) return <p className="p-4 text-center text-sm text-slate-400">This deal is closed.</p>;
  if (!deal.chat_open) {
    return (
      <div className="flex flex-col items-center gap-2 p-4 text-center" data-testid="chat-locked">
        <Lock className="h-5 w-5 text-violet-600" />
        <p className="text-sm text-slate-600">{deal.is_business ? "Chat unlocks with Business Pro." : "Chat opens once the business upgrades to Business Pro."}</p>
        {deal.is_business && <Link to="/app/upgrade"><Button size="sm" className="gap-2 rounded-full" data-testid="chat-upgrade-button"><Crown className="h-4 w-4" />Upgrade · {inr(999)}/mo</Button></Link>}
      </div>
    );
  }
  return (
    <form className="flex gap-2 p-3" onSubmit={(e) => { e.preventDefault(); if (t.trim()) { onSend(t); setT(""); } }}>
      <Input value={t} onChange={(e) => setT(e.target.value)} placeholder="Write a message…" className="h-11 rounded-full" data-testid="chat-message-input" />
      <Button type="submit" size="icon" className="h-11 w-11 shrink-0 rounded-full" data-testid="chat-send-button"><Send className="h-4 w-4" /></Button>
    </form>
  );
};

export default function DealRoom() {
  const { id } = useParams();
  const { me, api, config } = useMe();
  const [deal, setDeal] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [missing, setMissing] = useState(false);
  const endRef = useRef(null);

  const reload = useCallback(async () => {
    try {
      const [d, m] = await Promise.all([api.get(`/deals/${id}`), api.get(`/deals/${id}/messages`)]);
      setDeal(d.data);
      setMsgs(m.data);
    } catch { setMissing(true); }
  }, [api, id]);

  useEffect(() => { reload(); const t = setInterval(reload, 5000); return () => clearInterval(t); }, [reload]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length]);

  const act = async (action, extra = {}) => {
    try { await api.post(`/deals/${id}/action`, { action, ...extra }); toast.success("Updated"); reload(); } catch (e) { toast.error(errMsg(e)); }
  };
  const send = async (text) => {
    try { await api.post(`/deals/${id}/messages`, { text }); reload(); } catch (e) { toast.error(errMsg(e)); }
  };

  if (missing) return <div className="py-20 text-center" data-testid="deal-not-found"><p className="font-semibold">Deal not found</p><Link to="/app/chat" className="text-violet-700">Back to chats</Link></div>;
  if (!deal) return <div className="grid place-items-center py-20"><Loader2 className="h-7 w-7 animate-spin text-violet-600" /></div>;
  const other = deal.is_business ? { name: deal.creator_name, img: deal.creator_photo, link: `/app/creator/${deal.creator_id}` } : { name: deal.business_name, img: deal.business_logo };
  const paid = ["paid", "delivered", "completed"].includes(deal.status);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]" data-testid="deal-room-page">
      <div className="order-2 flex h-[70vh] flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200 lg:order-1 lg:h-[calc(100vh-5rem)]">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Link to="/app/chat" className="lg:hidden" data-testid="deal-back-button"><ArrowLeft className="h-5 w-5" /></Link>
          {other.img ? <img src={other.img} alt="" className="h-10 w-10 rounded-full object-cover" /> : <span className="grid h-10 w-10 place-items-center rounded-full bg-indigo-100 font-bold text-indigo-700">{other.name?.[0]}</span>}
          <div className="min-w-0 flex-1">
            {other.link ? <Link to={other.link} className="font-semibold hover:text-violet-700">{other.name}</Link> : <p className="font-semibold">{other.name}</p>}
            <p className="text-xs text-slate-500">{deal.plan_label} deal</p>
          </div>
          <StatusBadge status={deal.status} testid="deal-room-status" />
        </div>
        {!paid && (
          <div className="flex items-start gap-2 bg-amber-50 px-4 py-2.5 text-xs text-amber-800" data-testid="chat-safety-notice">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /> Phone numbers, emails and links are hidden until the deal is paid. Keep payments in the app to stay protected.
          </div>
        )}
        <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/60 p-4" data-testid="chat-messages">
          {msgs.length === 0 && <p className="py-10 text-center text-sm text-slate-400">No messages yet. Say hello 👋</p>}
          {msgs.map((m) => {
            const mine = m.sender_id === me.user.user_id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-3xl px-4 py-2.5 text-sm ${mine ? "rounded-br-md bg-violet-600 text-white" : "rounded-bl-md bg-white ring-1 ring-slate-200"}`} data-testid="chat-message">
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  <p className={`mt-1 text-[10px] ${mine ? "text-violet-200" : "text-slate-400"}`}>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
        <div className="border-t"><Composer deal={deal} onSend={send} me={me} /></div>
      </div>
      <aside className="order-1 space-y-4 lg:order-2">
        <Link to="/app/deals" className="hidden items-center gap-1 text-sm text-slate-500 hover:text-violet-700 lg:inline-flex"><ArrowLeft className="h-4 w-4" />All deals</Link>
        <div className="space-y-4 rounded-3xl bg-white p-5 ring-1 ring-slate-200" data-testid="deal-summary">
          <div className="flex items-center justify-between">
            <p className="font-heading text-lg font-bold">{deal.plan_label}</p>
            <p className="font-heading text-2xl font-extrabold" data-testid="deal-price">{inr(deal.price)}</p>
          </div>
          <Progress status={deal.status} />
          <p className="text-sm text-slate-700">{deal.brief}</p>
          <p className="flex items-center gap-1.5 text-xs text-slate-500"><Calendar className="h-4 w-4" />Starts {deal.start_date}</p>
          {deal.status === "countered" && <p className="rounded-xl bg-purple-50 p-3 text-sm text-purple-800">Counter-offer: <b>{inr(deal.counter_price)}</b></p>}
          <div className="border-t pt-4"><Actions deal={deal} act={act} reload={reload} me={{ ...me, api }} config={config} /></div>
        </div>
      </aside>
    </div>
  );
}
