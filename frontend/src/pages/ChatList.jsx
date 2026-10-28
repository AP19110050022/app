import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, MessageCircle, ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { useMe } from "@/context/MeContext";
import { timeAgo } from "@/lib/api";

export default function ChatList() {
  const { me, api } = useMe();
  const [deals, setDeals] = useState(null);
  useEffect(() => { api.get("/deals").then((r) => setDeals(r.data)); }, [api]);
  const uid = me.user.user_id;

  return (
    <div data-testid="chat-list-page">
      <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">Chat</h1>
      <p className="mt-1 text-sm text-slate-500">Each offer has its own conversation. Contact details stay hidden until the deal is paid.</p>
      <div className="mt-6 overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200">
        {deals === null ? <div className="grid place-items-center py-16"><Loader2 className="h-7 w-7 animate-spin text-violet-600" /></div>
          : deals.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center" data-testid="chat-empty">
              <MessageCircle className="h-10 w-10 text-slate-300" />
              <p className="mt-3 font-semibold">No conversations yet</p>
              <p className="text-sm text-slate-500">A chat opens as soon as an offer is sent.</p>
            </div>
          ) : deals.map((d) => {
            const asBiz = d.business_id === uid;
            const name = asBiz ? d.creator_name : d.business_name;
            const img = asBiz ? d.creator_photo : d.business_logo;
            return (
              <Link key={d.id} to={`/app/chat/${d.id}`} data-testid={`chat-row-${d.id}`} className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5 transition-colors last:border-0 hover:bg-violet-50/60">
                {img ? <img src={img} alt="" className="h-12 w-12 rounded-full object-cover" /> : <span className="grid h-12 w-12 place-items-center rounded-full bg-indigo-100 font-bold text-indigo-700">{name?.[0]}</span>}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-semibold">{name}</p>
                    <span className="shrink-0 text-xs text-slate-400">{timeAgo(d.updated_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm text-slate-500">{d.last_message || `${d.plan_label} offer`}</p>
                    <span className="ml-auto shrink-0"><StatusBadge status={d.status} testid={`chat-status-${d.id}`} /></span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </Link>
            );
          })}
      </div>
    </div>
  );
}
