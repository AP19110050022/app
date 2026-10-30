import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { RotateCcw, MessageSquare } from "lucide-react";
import { Seg } from "@/components/AppBits";
import { inr } from "@/lib/api";
import { Box, Btn, H1, Nothing, Pill, Row, Spinner, useAdminData, useAdminRun, when } from "@/pages/admin/bits";

const FILTERS = { all: () => true, active: (d) => ["pending", "countered", "accepted", "paid", "delivered"].includes(d.status), disputed: (d) => d.status === "disputed", failed: (d) => d.payout?.status === "failed", completed: (d) => d.status === "completed" };

export default function AdminDeals() {
  const [params] = useSearchParams();
  const [f, setF] = useState(params.get("f") || "all");
  const [deals, reload] = useAdminData("/admin/deals");
  const run = useAdminRun(reload);
  const list = (deals || []).filter(FILTERS[f]);
  return (
    <div data-testid="admin-deals">
      <H1 sub="Payouts go out automatically when the business approves the work">Deals & payouts</H1>
      <div className="no-scrollbar mb-4 overflow-x-auto"><div className="min-w-[520px] max-w-2xl"><Seg value={f} onChange={setF} testid="deals-filter" options={[["all", "All"], ["active", "Active"], ["disputed", "Disputed"], ["failed", "Failed payouts"], ["completed", "Completed"]]} /></div></div>
      {!deals ? <Spinner /> : (
        <Box testid="admin-deals-list">
          {list.length === 0 ? <Nothing t="No deals here" /> : list.map((d) => (
            <Row key={d.id} testid={`admin-deal-${d.id}`}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{d.business_name} → {d.creator_name}</p>
                <p className="truncate text-xs text-white/65">{d.plan_label} · {inr(d.price)} · updated {when(d.updated_at)}</p>
                {d.payout && <p className="truncate text-xs text-white/55">Payout {inr(d.payout.amount)} · {d.payout.mode === "test" ? "TEST MODE (MOCKED)" : d.payout.mode}{d.payout.error ? ` · ${d.payout.error}` : ""}</p>}
              </div>
              <Pill s={d.paused ? "paused" : d.status} testid={`admin-deal-status-${d.id}`} />
              <Pill s={d.payout?.status || d.payout_status || "none"} label={`Payout: ${(d.payout?.status || d.payout_status || "—").replace(/_/g, " ")}`} testid={`admin-deal-payout-${d.id}`} />
              <Link to={`/app/chat/${d.id}`} className="grid h-9 w-9 place-items-center rounded-full bg-white/15" aria-label="Open chat" data-testid={`admin-deal-chat-${d.id}`}><MessageSquare className="h-4 w-4" /></Link>
              {d.payout?.status === "failed" && <Btn small onClick={() => run("post", `/admin/deals/${d.id}/retry-payout`, null, "Payout released")} testid={`retry-payout-${d.id}`}><RotateCcw className="h-3.5 w-3.5" />Retry</Btn>}
            </Row>
          ))}
        </Box>
      )}
    </div>
  );
}
