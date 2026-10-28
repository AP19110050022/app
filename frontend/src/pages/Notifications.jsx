import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Briefcase, MessageCircle, CreditCard, BadgeCheck, Star, Wallet, Loader2 } from "lucide-react";
import { useMe } from "@/context/MeContext";
import { timeAgo } from "@/lib/api";

const ICONS = { offer: Briefcase, deal: Briefcase, message: MessageCircle, payment: CreditCard, approval: BadgeCheck, rating: Star, payout: Wallet };

export default function Notifications() {
  const { api, refresh } = useMe();
  const navigate = useNavigate();
  const [list, setList] = useState(null);

  useEffect(() => {
    api.get("/notifications").then(async (r) => {
      setList(r.data);
      await api.post("/notifications/read");
      refresh();
    });
  }, [api, refresh]);

  return (
    <div className="mx-auto max-w-2xl" data-testid="notifications-page">
      <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">Notifications</h1>
      <div className="mt-6 overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200">
        {list === null ? <div className="grid place-items-center py-16"><Loader2 className="h-7 w-7 animate-spin text-violet-600" /></div>
          : list.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center" data-testid="notifications-empty"><Bell className="h-10 w-10 text-slate-300" /><p className="mt-3 font-semibold">You're all caught up</p></div>
          ) : list.map((n) => {
            const Icon = ICONS[n.kind] || Bell;
            return (
              <button key={n.id} onClick={() => n.link && navigate(n.link)} data-testid={`notification-${n.id}`}
                className={`flex w-full items-start gap-3 border-b border-slate-100 px-4 py-4 text-left transition-colors last:border-0 hover:bg-violet-50/60 ${n.read ? "" : "bg-violet-50/50"}`}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-violet-100 text-violet-700"><Icon className="h-5 w-5" /></span>
                <div className="flex-1"><p className="text-sm text-slate-800">{n.text}</p><p className="mt-0.5 text-xs text-slate-400">{timeAgo(n.created_at)}</p></div>
                {!n.read && <span className="mt-2 h-2 w-2 rounded-full bg-pink-500" />}
              </button>
            );
          })}
      </div>
    </div>
  );
}
