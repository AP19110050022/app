import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, Loader2, ChevronRight, Inbox } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/StatusBadge";
import { PIPELINE } from "@/constants/options";
import { useMe } from "@/context/MeContext";
import { inr, timeAgo } from "@/lib/api";

const GROUPS = {
  all: () => true,
  open: (d) => ["pending", "countered", "accepted"].includes(d.status),
  active: (d) => ["paid", "delivered"].includes(d.status),
  done: (d) => d.status === "completed",
  closed: (d) => ["declined", "cancelled"].includes(d.status),
};

export const Progress = ({ status }) => {
  const idx = PIPELINE.indexOf(status === "countered" ? "pending" : status);
  if (idx < 0) return null;
  return (
    <div className="flex gap-1" data-testid="deal-progress">
      {PIPELINE.map((s, i) => <span key={s} className={`h-1.5 flex-1 rounded-full ${i <= idx ? "bg-gradient-to-r from-violet-600 to-indigo-500" : "bg-slate-200"}`} />)}
    </div>
  );
};

export const DealRow = ({ d, uid, to }) => {
  const asBiz = d.business_id === uid;
  const name = asBiz ? d.creator_name : d.business_name;
  const img = asBiz ? d.creator_photo : d.business_logo;
  return (
    <Link to={to || `/app/chat/${d.id}`} data-testid={`deal-row-${d.id}`} className="rise group flex items-center gap-4 rounded-3xl bg-white p-4 ring-1 ring-slate-200 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-violet-500/10">
      {img ? <img src={img} alt="" className="h-14 w-14 shrink-0 rounded-2xl object-cover" /> : <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-indigo-100 font-heading text-xl font-bold text-indigo-700">{name?.[0]}</span>}
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-semibold">{name}</p>
          <StatusBadge status={d.status} testid={`deal-status-${d.id}`} />
        </div>
        <p className="truncate text-sm text-slate-500">{d.plan_label} · {inr(d.counter_price && d.status === "countered" ? d.counter_price : d.price)} · {asBiz ? "You're hiring" : "You're hired"} · {timeAgo(d.updated_at)}</p>
        <Progress status={d.status} />
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-violet-600" />
    </Link>
  );
};

export default function Deals() {
  const { me, api } = useMe();
  const both = me.creator && me.business;
  const [side, setSide] = useState(me.user.active_mode || (me.creator ? "creator" : "business"));
  const [group, setGroup] = useState("all");
  const [deals, setDeals] = useState(null);

  useEffect(() => {
    api.get("/deals", { params: { side: both ? side : "all" } }).then((r) => setDeals(r.data));
  }, [api, side, both]);

  const shown = useMemo(() => (deals || []).filter(GROUPS[group]), [deals, group]);

  return (
    <div data-testid="deals-page">
      <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">My Deals</h1>
      <p className="mt-1 text-sm text-slate-500">Every offer, from pending to paid and completed.</p>
      {both && (
        <Tabs value={side} onValueChange={setSide} className="mt-5">
          <TabsList className="rounded-full">
            <TabsTrigger value="business" className="rounded-full" data-testid="deals-side-business">Hiring</TabsTrigger>
            <TabsTrigger value="creator" className="rounded-full" data-testid="deals-side-creator">Working</TabsTrigger>
          </TabsList>
        </Tabs>
      )}
      <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto">
        {[["all", "All"], ["open", "Open"], ["active", "In progress"], ["done", "Completed"], ["closed", "Closed"]].map(([k, l]) => (
          <button key={k} onClick={() => setGroup(k)} data-testid={`deals-filter-${k}`}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${group === k ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-violet-50"}`}>{l}</button>
        ))}
      </div>
      <div className="mt-5 space-y-3">
        {deals === null ? <div className="grid place-items-center py-16"><Loader2 className="h-7 w-7 animate-spin text-violet-600" /></div>
          : shown.length === 0 ? (
            <div className="flex flex-col items-center rounded-3xl border border-dashed border-slate-300 py-16 text-center" data-testid="deals-empty">
              <Inbox className="h-10 w-10 text-slate-300" />
              <p className="mt-3 font-semibold">No deals here yet</p>
              <p className="text-sm text-slate-500">{me.business ? "Find a creator and send your first offer." : me.creator ? "Offers from businesses will show up here." : "Tap + to become a creator or hire as a business."}</p>
              {me.business && <Link to="/app/search" className="mt-4 inline-flex items-center gap-2 rounded-full bg-violet-600 px-5 py-2 text-sm font-semibold text-white"><Briefcase className="h-4 w-4" />Find creators</Link>}
            </div>
          ) : shown.map((d) => <DealRow key={d.id} d={d} uid={me.user.user_id} />)}
      </div>
    </div>
  );
}
