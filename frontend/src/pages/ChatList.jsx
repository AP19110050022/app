import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, MessageCircle } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { SubHeader, Empty } from "@/components/AppBits";
import { Avatar } from "@/pages/Deals";
import { useMe } from "@/context/MeContext";
import { timeAgo } from "@/lib/api";

export default function ChatList() {
  const { me, api } = useMe();
  const [deals, setDeals] = useState(null);
  useEffect(() => { api.get("/deals").then((r) => setDeals(r.data)); }, [api]);
  const uid = me.user.user_id;

  return (
    <div className="mx-auto max-w-2xl" data-testid="chat-list-page">
      <SubHeader title="Chat" sub="Message creators and businesses. Contacts stay hidden until a deal is paid." />
      {deals === null ? <div className="grid place-items-center py-16"><Loader2 className="h-7 w-7 animate-spin" /></div>
        : deals.length === 0 ? <Empty icon={MessageCircle} title="No conversations yet" text="Tap Message on a creator's profile to start a chat." testid="chat-empty" />
        : (
          <div className="space-y-1">
            {deals.map((d) => {
              const asBiz = d.business_id === uid;
              const name = asBiz ? d.creator_name : d.business_name;
              return (
                <Link key={d.id} to={`/app/chat/${d.id}`} data-testid={`chat-row-${d.id}`} className="flex items-center gap-3 rounded-[22px] px-2 py-2.5 transition-colors hover:bg-white/10">
                  <span className="ring-story shrink-0 rounded-full p-[2px]"><span className="block rounded-full border-2 border-[#3B25A8]"><Avatar img={asBiz ? d.creator_photo : d.business_logo} name={name} size="h-12 w-12" /></span></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2"><p className="truncate font-extrabold">{name}</p><span className="shrink-0 text-xs text-white/60">{timeAgo(d.updated_at)}</span></div>
                    <div className="flex items-center gap-2"><p className="truncate text-[13px] text-white/75">{d.last_message || (d.status === "chat" ? "Say hello" : `${d.plan_label} offer`)}</p><span className="ml-auto shrink-0"><StatusBadge status={d.status} testid={`chat-status-${d.id}`} /></span></div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
    </div>
  );
}
