import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Briefcase, MessageCircle, CreditCard, BadgeCheck, Star, Wallet, Loader2 } from "lucide-react";
import { SubHeader, Empty } from "@/components/AppBits";
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
      <SubHeader title="Notifications" />
      {list === null ? <div className="grid place-items-center py-16"><Loader2 className="h-7 w-7 animate-spin" /></div>
        : list.length === 0 ? <Empty icon={Bell} title="You're all caught up" testid="notifications-empty" />
        : (
          <div className="space-y-1.5">
            {list.map((n) => {
              const Icon = ICONS[n.kind] || Bell;
              return (
                <button key={n.id} onClick={() => n.link && navigate(n.link)} data-testid={`notification-${n.id}`}
                  className={`flex w-full items-start gap-3 rounded-[22px] p-3.5 text-left transition-colors hover:bg-white/15 ${n.read ? "" : "glass"}`}>
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#6C4CF1]"><Icon className="h-5 w-5" /></span>
                  <div className="flex-1"><p className="text-[14px]">{n.text}</p><p className="mt-0.5 text-xs text-white/60">{timeAgo(n.created_at)}</p></div>
                  {!n.read && <span className="mt-2 h-2.5 w-2.5 rounded-full bg-[#FF4D8D]" />}
                </button>
              );
            })}
          </div>
        )}
    </div>
  );
}
