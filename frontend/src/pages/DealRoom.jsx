import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Send, ShieldAlert, Check, CheckCheck, Loader2, Calendar, ChevronDown, PauseCircle } from "lucide-react";
import { ReportButton } from "@/components/ReportButton";
import { OfferDialog } from "@/components/OfferDialog";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { Avatar } from "@/pages/Deals";
import { useMe } from "@/context/MeContext";
import { errMsg, inr } from "@/lib/api";

const Btn = ({ children, onClick, tone = "white", testid }) => (
  <button onClick={onClick} data-testid={testid} className={`inline-flex h-11 items-center justify-center gap-1.5 rounded-full px-5 text-sm font-extrabold transition-transform active:scale-95 ${tone === "cta" ? "cta" : tone === "ghost" ? "bg-white/15" : "bg-white text-[#3B25A8]"}`}>{children}</button>
);

const Actions = () => null;

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
  const [t, setT] = useState("");
  if (["declined", "cancelled"].includes(deal.status)) return <p className="p-4 text-center text-sm text-white/50">This deal is closed.</p>;
  return (
    <form className="flex gap-2 p-3" onSubmit={(e) => { e.preventDefault(); if (t.trim()) { onSend(t); setT(""); } }}>
      <Input value={t} onChange={(e) => setT(e.target.value)} placeholder="Message…" className="rounded-full" data-testid="chat-message-input" />
      <button type="submit" className="cta grid h-11 w-11 shrink-0 place-items-center rounded-full" data-testid="chat-send-button" aria-label="Send"><Send className="h-4 w-4" /></button>
    </form>
  );
};

export default function DealRoom() {
  const { id } = useParams();
  const { me, api } = useMe();
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
        {open && (
          <div className="mt-3 space-y-3">
            <p className="text-[14px] text-white/90">{deal.brief}</p>
            <p className="flex items-center gap-1.5 text-xs text-white/60"><Calendar className="h-4 w-4" />Starts {deal.start_date}</p>
            {deal.status === "countered" && <p className="rounded-2xl bg-white/10 p-3 text-sm">Counter-offer: <b>{inr(deal.counter_price)}</b></p>}
            <div className="border-t border-white/15 pt-3"><Actions deal={deal} /></div>
          </div>
        )}
      </div>}
      {!paid && (
        <p className="mt-3 flex items-start gap-2 rounded-2xl bg-amber-400/15 px-3.5 py-2.5 text-xs text-amber-100" data-testid="chat-safety-notice">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />Phone numbers, emails and links are hidden in chat for now.
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
                  <p className={`mt-0.5 flex items-center gap-1 text-[10px] ${mine ? "text-[#5B5675]" : "text-white/60"}`}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {mine && <span className="inline-flex items-center" title={m.seen ? "Seen" : "Sent"} aria-label={m.seen ? "Seen" : "Sent"} data-testid={`chat-receipt-${m.id}`}>
                      {m.seen ? <CheckCheck className="h-3.5 w-3.5 text-sky-600" /> : <Check className="h-3.5 w-3.5" />}
                    </span>}
                  </p>
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
