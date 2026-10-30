import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, Loader2, ChevronRight, Inbox, Search } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { SubHeader, Seg, Empty } from "@/components/AppBits";
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
      {PIPELINE.map((s, i) => <span key={s} className={`h-1.5 flex-1 rounded-full ${i <= idx ? "bg-gradient-to-r from-[#FF5FA2] to-[#B35CFF]" : "bg-white/20"}`} />)}
    </div>
  );
};

export const Avatar = ({ img, name, size = "h-14 w-14", rounded = "rounded-full" }) =>
  img ? <img src={img} alt="" className={`${size} ${rounded} shrink-0 object-cover`} />
    : <span className={`${size} ${rounded} grid shrink-0 place-items-center bg-white text-xl font-extrabold text-[#6C4CF1]`}>{name?.[0]}</span>;

const DealRow = ({ d, uid }) => {
  const asBiz = d.business_id === uid;
  const name = asBiz ? d.creator_name : d.business_name;
  return (
    <Link to={`/app/chat/${d.id}`} data-testid={`deal-row-${d.id}`} className="glass rise group flex items-center gap-3.5 rounded-[24px] p-3.5 transition-colors hover:bg-white/20">
      <Avatar img={asBiz ? d.creator_photo : d.business_logo} name={name} rounded="rounded-[18px]" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center justify-between gap-2"><p className="truncate font-extrabold">{name}</p><StatusBadge status={d.status} testid={`deal-status-${d.id}`} /></div>
        <p className="truncate text-[13px] text-white/75">{d.plan_label} · {inr(d.status === "countered" ? d.counter_price : d.price)} · {asBiz ? "Hiring" : "Hired"} · {timeAgo(d.updated_at)}</p>
        <Progress status={d.status} />
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-white/50 transition-transform group-hover:translate-x-1" />
    </Link>
  );
};

export default function Deals() {
  const { me, api } = useMe();
  const both = me.creator && me.business;
  const [side, setSide] = useState(me.user.active_mode || (me.creator ? "creator" : "business"));
  const [group, setGroup] = useState("all");
  const [deals, setDeals] = useState(null);

  useEffect(() => { api.get("/deals", { params: { side: both ? side : "all" } }).then((r) => setDeals(r.data.filter((d) => d.status !== "chat"))); }, [api, side, both]);
  const shown = useMemo(() => (deals || []).filter(GROUPS[group]), [deals, group]);

  return (
    <div data-testid="deals-page">
      <SubHeader title="My Deals" sub="Pending → Accepted → Paid → Delivered → Completed" />
                <Link to="/app/jobs" className="glass mb-3 flex items-center justify-between rounded-[20px] px-4 py-3 text-sm font-bold" data-testid="deals-jobs-link"><span className="flex items-center gap-2"><Briefcase className="h-4 w-4" />{me.business ? "My jobs & interested creators" : "Jobs I'm interested in"}</span><ChevronRight className="h-4 w-4" /></Link>
      {both && <div className="mb-3"><Seg value={side} onChange={setSide} options={[["business", "Hiring"], ["creator", "Working"]]} testid="deals-side" /></div>}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {[["all", "All"], ["open", "Open"], ["active", "In progress"], ["done", "Completed"], ["closed", "Closed"]].map(([k, l]) => (
          <button key={k} onClick={() => setGroup(k)} data-testid={`deals-filter-${k}`}
            className={`h-9 shrink-0 rounded-full px-4 text-[13px] font-bold transition-colors ${group === k ? "bg-white text-[#3B25A8]" : "bg-white/15 hover:bg-white/25"}`}>{l}</button>
        ))}
      </div>
      <div className="mt-4 space-y-2.5">
        {deals === null ? <div className="grid place-items-center py-16"><Loader2 className="h-7 w-7 animate-spin" /></div>
          : shown.length === 0 ? (
            <Empty icon={Inbox} title="No deals here yet" testid="deals-empty"
              text={me.business ? "Find a creator and send your first offer." : me.creator ? "Offers from businesses will show up here." : "Tap + to become a creator or hire as a business."}
              action={me.business && <Link to="/app" className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-extrabold text-[#3B25A8]"><Search className="h-4 w-4" />Find creators</Link>} />
          ) : shown.map((d) => <DealRow key={d.id} d={d} uid={me.user.user_id} />)}
      </div>
      {!me.business && !me.creator && <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-white/60"><Briefcase className="h-3.5 w-3.5" />Deals appear once you send or receive an offer.</p>}
    </div>
  );
}
