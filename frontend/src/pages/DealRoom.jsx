import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Send, Lock, ShieldAlert, Check, X, Repeat, Ban, Link2, PackageCheck, Star, Crown, Loader2, Calendar, ExternalLink, Wallet, ChevronDown, AlertTriangle, PauseCircle } from "lucide-react";
import { ReportButton } from "@/components/ReportButton";
import { OfferDialog } from "@/components/OfferDialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";
import { PayButton } from "@/components/PayButton";
import { Progress, Avatar } from "@/pages/Deals";
import { useMe } from "@/context/MeContext";
import { errMsg, inr } from "@/lib/api";

const Btn = ({ children, onClick, tone = "white", testid }) => (
  <button onClick={onClick} data-testid={testid} className={`inline-flex h-11 items-center justify-center gap-1.5 rounded-full px-5 text-sm font-extrabold transition-transform active:scale-95 ${tone === "cta" ? "cta" : tone === "ghost" ? "bg-white/15" : "bg-white text-[#3B25A8]"}`}>{children}</button>
);

const InlineInput = ({ placeholder, type = "text", onSubmit, cta, testid, icon: Icon }) => {
  const [v, setV] = useState("");
  return (
    <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (v) onSubmit(v); }}>
      <Input type={type} value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} data-testid={`${testid}-input`} className="rounded-full" />
      <button type="submit" className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-extrabold text-[#3B25A8]" data-testid={`${testid}-submit`}><Icon className="h-4 w-4" />{cta}</button>
    </form>
  );
};

const Rate = ({ onRate }) => {
  const [stars, setStars] = useState(5);
  const [review, setReview] = useState("");
  return (
    <div className="space-y-2" data-testid="rate-form">
      <p className="text-sm font-bold">Rate this creator</p>
      <div className="flex gap-1">{[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => setStars(n)} data-testid={`rate-star-${n}`}><Star className={`h-7 w-7 transition-transform hover:scale-110 ${n <= stars ? "fill-amber-300 text-amber-300" : "text-white/30"}`} /></button>
      ))}</div>
      <Textarea rows={2} value={review} onChange={(e) => setReview(e.target.value)} placeholder="A few words (optional)" data-testid="rate-review-input" />
      <Btn onClick={() => onRate(stars, review)} testid="rate-submit-button">Submit rating</Btn>
    </div>
  );
};

const Dispute = ({ act }) => {
  const [open, setOpen] = useState(false);
  if (!open) return <Btn tone="ghost" onClick={() => setOpen(true)} testid="deal-dispute-button"><AlertTriangle className="h-4 w-4" />Raise a dispute</Btn>;
  return <div className="w-full"><InlineInput placeholder="What went wrong?" cta="Send" icon={AlertTriangle} testid="deal-dispute" onSubmit={(v) => act("dispute", { note: v })} /></div>;
};

const Actions = ({ deal, act, reload, me, config, api }) => {
  const { status: st, is_business: b, is_creator: c } = deal;
  const fee = Math.round(deal.price * (config?.fee_pct ?? 10) / 100);
  const rate = async (stars, review) => { try { await api.post(`/deals/${deal.id}/rate`, { stars, review }); toast.success("Thanks for rating!"); reload(); } catch (e) { toast.error(errMsg(e)); } };
  const note = (t, cls = "text-white/75") => <p className={`text-[13px] ${cls}`}>{t}</p>;
  return (
    <div className="space-y-3" data-testid="deal-actions">
      {c && st === "pending" && (<>
        <div className="flex flex-wrap gap-2">
          <Btn tone="cta" onClick={() => act("accept")} testid="deal-accept-button"><Check className="h-4 w-4" />Accept {inr(deal.price)}</Btn>
          <Btn tone="ghost" onClick={() => act("decline")} testid="deal-decline-button"><X className="h-4 w-4" />Decline</Btn>
        </div>
        <InlineInput type="number" placeholder="Counter price (₹)" cta="Counter" icon={Repeat} testid="deal-counter" onSubmit={(v) => act("counter", { price: Number(v) })} />
      </>)}
      {c && st === "countered" && note(`You countered at ${inr(deal.counter_price)}. Waiting for the business to reply.`)}
      {b && st === "countered" && (
        <div className="flex flex-wrap gap-2">
          <Btn tone="cta" onClick={() => act("accept_counter")} testid="deal-accept-counter-button"><Check className="h-4 w-4" />Accept {inr(deal.counter_price)}</Btn>
          <Btn tone="ghost" onClick={() => act("decline")} testid="deal-decline-counter-button"><X className="h-4 w-4" />Decline</Btn>
        </div>
      )}
      {b && st === "pending" && note(`Waiting for ${deal.creator_name} to reply.`)}
      {c && st === "accepted" && note(`Waiting for ${deal.business_name} to pay. You'll be notified once the money is held.`)}
      {b && st === "accepted" && (
        <div className="space-y-2.5">
          {note(`Pay ${inr(deal.price)} now. It's held safely and released only after you approve the work.`)}
          {me.is_pro ? <PayButton body={{ kind: "deal", deal_id: deal.id }} label={`Pay ${inr(deal.price)}`} onPaid={reload} testid="deal-pay-button" />
            : <Link to="/app/upgrade"><Btn tone="cta" testid="deal-upgrade-to-pay"><Crown className="h-4 w-4" />Upgrade to Pro to pay</Btn></Link>}
        </div>
      )}
      {c && st === "paid" && (
        <div className="space-y-2">
          {note(`${inr(deal.price)} is held for you. Deliver the work and share the link.`, "text-emerald-300")}
          {deal.delivery_link && <p className="truncate text-xs text-white/60">Submitted: <a href={deal.delivery_link} target="_blank" rel="noreferrer" className="underline">{deal.delivery_link}</a></p>}
          <InlineInput placeholder="Link to the finished video" cta={deal.delivery_link ? "Update" : "Submit"} icon={Link2} testid="deal-submit-work" onSubmit={(v) => act("submit_work", { link: v })} />
        </div>
      )}
      {b && st === "paid" && (deal.delivery_link ? (
        <div className="space-y-2.5">
          <a href={deal.delivery_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-bold underline" data-testid="deal-view-work-link"><ExternalLink className="h-4 w-4" />View submitted work</a>
          {note("Happy with it? Approve to release the payment to the creator.")}
          <div className="flex flex-wrap gap-2">
            <Btn tone="cta" onClick={() => act("mark_delivered")} testid="deal-mark-delivered-button"><PackageCheck className="h-4 w-4" />Approve & mark delivered</Btn>
            <Dispute act={act} />
          </div>
        </div>
      ) : (<div className="space-y-2">{note(`Payment held. Waiting for ${deal.creator_name} to submit the work.`)}<Dispute act={act} /></div>))}
      {st === "disputed" && note(b ? "You raised a dispute. The payout is on hold while our team reviews the deal." : "The business raised a dispute. Your payout is on hold while our team reviews the deal.", "text-orange-200")}
      {st === "refunded" && note(b ? "Our team refunded this payment to you." : "Our team refunded this payment to the business.", "text-sky-200")}
      {c && deal.payout_status === "failed" && <p className="text-[13px] text-rose-200">Add your payout UPI in <Link to="/app/settings" className="underline">Settings</Link> to receive {inr(deal.price - fee)}. It's sent as soon as you save it.</p>}
      {st === "delivered" && deal.payout_status !== "failed" && note(`Work approved. HireMyFace is releasing ${c ? `your payout of ${inr(deal.price - fee)}` : "the payout to the creator"}.`, "text-cyan-200")}
      {st === "completed" && <p className="flex items-center gap-1.5 text-[13px] text-emerald-300"><Wallet className="h-4 w-4" />Completed. {c ? `Payout of ${inr(deal.payout_amount)} released.` : "Payout released to the creator."}</p>}
      {b && ["delivered", "completed"].includes(st) && !deal.rating && <Rate onRate={rate} />}
      {deal.rating && <p className="flex items-center gap-1 text-[13px]">Rated {deal.rating.stars}<Star className="h-4 w-4 fill-amber-300 text-amber-300" />{deal.rating.review && ` · “${deal.rating.review}”`}</p>}
      {b && ["pending", "countered", "accepted"].includes(st) && <button className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-rose-300" onClick={() => act("cancel")} data-testid="deal-cancel-button"><Ban className="h-3.5 w-3.5" />Cancel offer</button>}
      {c && !["declined", "cancelled"].includes(st) && <p className="text-xs text-white/50">You receive {inr(deal.price - fee)} after the {config?.fee_pct ?? 10}% service fee.</p>}
    </div>
  );
};

const ChatOffer = ({ deal, reload }) => {
  const { api } = useMe();
  const [creator, setCreator] = useState(null);
  const open = async () => { try { setCreator((await api.get(`/creators/${deal.creator_id}`)).data); } catch (e) { toast.error(errMsg(e)); } };
  if (!deal.is_business) return <p className="glass-soft mt-4 rounded-[20px] px-4 py-3 text-[13px] text-white/80" data-testid="chat-no-offer-note">{deal.business_name} messaged you. No offer yet — ask anything, an offer will show here when they send one.</p>;
  return (
    <div className="glass mt-4 flex items-center gap-3 rounded-[22px] p-3.5" data-testid="chat-offer-bar">
      <p className="min-w-0 flex-1 text-[13px] text-white/85">Agreed on the details? Send {deal.creator_name.split(" ")[0]} an offer right here.</p>
      <Btn tone="cta" onClick={open} testid="chat-send-offer-button"><Send className="h-4 w-4" />Send offer</Btn>
      {creator && <OfferDialog creator={creator} open={!!creator} initialPlan={creator.plans?.[0]} onSent={reload} onOpenChange={(o) => !o && setCreator(null)} />}
    </div>
  );
};

const Composer = ({ deal, onSend }) => {
  const { config } = useMe();
  const [t, setT] = useState("");
  if (["declined", "cancelled"].includes(deal.status)) return <p className="p-4 text-center text-sm text-white/50">This deal is closed.</p>;
  if (!deal.chat_open) {
    return (
      <div className="flex flex-col items-center gap-2 p-4 text-center" data-testid="chat-locked">
        <Lock className="h-5 w-5" />
        <p className="text-[13px] text-white/80">{deal.is_business ? "You've used your free creator contacts. Upgrade to Business Pro to chat." : "Chat opens once the business upgrades to Business Pro."}</p>
        {deal.is_business && <Link to="/app/upgrade"><Btn tone="cta" testid="chat-upgrade-button"><Crown className="h-4 w-4" />Upgrade · {inr(config?.pro_price ?? 999)}/{config?.pro_days ?? 30} days</Btn></Link>}
      </div>
    );
  }
  return (
    <form className="flex gap-2 p-3" onSubmit={(e) => { e.preventDefault(); if (t.trim()) { onSend(t); setT(""); } }}>
      <Input value={t} onChange={(e) => setT(e.target.value)} placeholder="Message…" className="rounded-full" data-testid="chat-message-input" />
      <button type="submit" className="cta grid h-11 w-11 shrink-0 place-items-center rounded-full" data-testid="chat-send-button" aria-label="Send"><Send className="h-4 w-4" /></button>
    </form>
  );
};

export default function DealRoom() {
  const { id } = useParams();
  const { me, api, config } = useMe();
  const [deal, setDeal] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [missing, setMissing] = useState(false);
  const [open, setOpen] = useState(true);
  const endRef = useRef(null);

  const reload = useCallback(async () => {
    try {
      const [d, m] = await Promise.all([api.get(`/deals/${id}`), api.get(`/deals/${id}/messages`)]);
      setDeal(d.data);
      setMsgs(m.data);
    } catch { setMissing(true); }
  }, [api, id]);

  useEffect(() => { reload(); const t = setInterval(reload, 5000); return () => clearInterval(t); }, [reload]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [msgs.length]);

  const act = async (action, extra = {}) => {
    const msg = { accept: "Offer accepted", decline: "Offer declined", counter: "Counter-offer sent", accept_counter: "Counter accepted", cancel: "Offer cancelled", submit_work: "Work submitted", mark_delivered: "Marked as delivered", dispute: "Dispute sent to our team" }[action];
    try { await api.post(`/deals/${id}/action`, { action, ...extra }); toast.success(msg); reload(); } catch (e) { toast.error(errMsg(e)); }
  };
  const send = async (text) => { try { await api.post(`/deals/${id}/messages`, { text }); reload(); } catch (e) { toast.error(errMsg(e)); } };

  if (missing) return <div className="py-20 text-center" data-testid="deal-not-found"><p className="font-bold">Deal not found</p><Link to="/app/chat" className="text-white/70 underline">Back to chats</Link></div>;
  if (!deal) return <div className="grid place-items-center py-20"><Loader2 className="h-7 w-7 animate-spin" /></div>;
  const other = deal.is_business ? { name: deal.creator_name, img: deal.creator_photo, link: `/app/creator/${deal.creator_id}` } : { name: deal.business_name, img: deal.business_logo };
  const paid = ["paid", "delivered", "completed", "disputed", "refunded"].includes(deal.status);

  return (
    <div className="mx-auto max-w-2xl" data-testid="deal-room-page">
      <div className="flex items-center gap-3">
        <Link to="/app/chat" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/15" data-testid="deal-back-button" aria-label="Back"><ArrowLeft className="h-5 w-5" /></Link>
        <Avatar img={other.img} name={other.name} size="h-11 w-11" />
        <div className="min-w-0 flex-1">
          {other.link ? <Link to={other.link} className="block truncate font-extrabold hover:underline">{other.name}</Link> : <p className="truncate font-extrabold">{other.name}</p>}
          <p className="text-xs text-white/70">{deal.status === "chat" ? "Chat · no offer yet" : `${deal.plan_label} deal`}</p>
        </div>
        <StatusBadge status={deal.status} testid="deal-room-status" />
      </div>
      {deal.paused && <p className="mt-3 flex items-center gap-2 rounded-2xl bg-orange-400/20 px-3.5 py-2.5 text-xs text-orange-100" data-testid="deal-paused-notice"><PauseCircle className="h-4 w-4 shrink-0" />This deal is paused while our team reviews an account.</p>}
      {deal.status === "chat" ? <ChatOffer deal={deal} reload={reload} /> : <div className="glass mt-4 rounded-[24px] p-4" data-testid="deal-summary">
        <button className="flex w-full items-center justify-between" onClick={() => setOpen(!open)} data-testid="deal-summary-toggle">
          <span className="font-extrabold">{deal.plan_label} · <span data-testid="deal-price">{inr(deal.price)}</span></span>
          <ChevronDown className={`h-5 w-5 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        <div className="mt-2.5"><Progress status={deal.status} /></div>
        {open && (
          <div className="mt-3 space-y-3">
            <p className="text-[14px] text-white/90">{deal.brief}</p>
            <p className="flex items-center gap-1.5 text-xs text-white/60"><Calendar className="h-4 w-4" />Starts {deal.start_date}</p>
            {deal.status === "countered" && <p className="rounded-2xl bg-white/10 p-3 text-sm">Counter-offer: <b>{inr(deal.counter_price)}</b></p>}
            <div className="border-t border-white/15 pt-3"><Actions deal={deal} act={act} reload={reload} me={me} config={config} api={api} /></div>
          </div>
        )}
      </div>}
      {!paid && (
        <p className="mt-3 flex items-start gap-2 rounded-2xl bg-amber-400/15 px-3.5 py-2.5 text-xs text-amber-100" data-testid="chat-safety-notice">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />Phone numbers, emails and links are hidden until the deal is paid.
        </p>
      )}
      <div className="glass-soft mt-3 overflow-hidden rounded-[24px]">
        <div className="max-h-[52vh] min-h-[220px] space-y-2.5 overflow-y-auto p-4" data-testid="chat-messages">
          {msgs.length === 0 && <p className="py-10 text-center text-sm text-white/50">No messages yet. Say hello!</p>}
          {msgs.map((m) => {
            const mine = m.sender_id === me.user.user_id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-[22px] px-4 py-2.5 text-sm ${mine ? "rounded-br-md bg-white text-[#1F1B2E]" : "rounded-bl-md bg-white/15"}`} data-testid="chat-message">
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  <p className={`mt-0.5 text-[10px] ${mine ? "text-[#5B5675]" : "text-white/60"}`}>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
        <div className="border-t border-white/10"><Composer deal={deal} onSend={send} /></div>
      </div>
      {(deal.is_business || deal.is_creator) && <div className="mt-3 text-center"><ReportButton type="deal" id={deal.id} label="Report this chat" testid="deal-report-button" /></div>}
    </div>
  );
}
