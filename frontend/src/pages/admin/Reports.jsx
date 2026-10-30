import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Flag, Scale } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Seg } from "@/components/AppBits";
import { useMe } from "@/context/MeContext";
import { inr } from "@/lib/api";
import { Box, Btn, H1, Nothing, Pill, ReasonDialog, Row, Spinner, useAdminData, useAdminRun, when } from "@/pages/admin/bits";

const REASON = { fake_profile: "Fake profile", inappropriate: "Inappropriate content", scam: "Scam", no_show: "No-show", other: "Other", dispute: "Dispute" };
const ACTIONS = {
  report: [["dismiss", "Dismiss"], ["warn", "Warn user"], ["remove", "Remove content", true], ["block", "Block user", true]],
  dispute: [["release", "Release payout to creator"], ["refund", "Refund the business", true]],
};

const Target = ({ r }) => {
  const t = r.target;
  if (!t) return <p className="text-sm text-white/60">This item no longer exists.</p>;
  if (r.target_type === "creator") return <div className="flex items-center gap-3"><img src={t.photo} alt="" className="h-14 w-14 rounded-2xl object-cover" /><div><p className="font-bold">{t.name}</p><p className="text-xs text-white/65">{t.categories?.join(" · ")} · {t.city}</p><Link to={`/app/creator/${t.user_id}`} className="text-xs underline">Open profile</Link></div></div>;
  if (r.target_type === "business") return <div><p className="font-bold">{t.company}</p><p className="text-xs text-white/65">{t.industry} · {t.city}</p><p className="mt-1 text-sm">{t.description}</p></div>;
  if (r.target_type === "job") return <div><p className="font-bold">{t.title}</p><p className="text-xs text-white/65">{t.company} · {t.status}</p><p className="mt-1 text-sm">{t.description}</p></div>;
  return <div><p className="font-bold">{t.business_name} → {t.creator_name}</p><p className="text-xs text-white/65">{t.plan_label} · {inr(t.price)} · {t.status}</p><p className="mt-1 text-sm">{t.brief}</p>{t.delivery_link && <a href={t.delivery_link} target="_blank" rel="noreferrer" className="text-xs underline">Submitted work</a>}</div>;
};

const Detail = ({ id, onClose, onDone }) => {
  const { api } = useMe();
  const [r, setR] = useState(null);
  const [act, setAct] = useState(null);
  const run = useAdminRun(() => { onDone(); onClose(); });
  useEffect(() => { if (id) { setR(null); api.get(`/admin/reports/${id}`).then((x) => setR(x.data)); } }, [api, id]);
  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto border-white/10 bg-gradient-to-b from-[#4530C8] to-[#2A1B7A] text-white sm:max-w-lg" data-testid="report-detail">
        <SheetHeader><SheetTitle className="text-xl font-extrabold text-white">{r?.kind === "dispute" ? "Dispute" : "Report"}</SheetTitle></SheetHeader>
        {!r ? <Spinner /> : (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap gap-1.5"><Pill s={r.status} /><Pill s={r.kind === "dispute" ? "disputed" : "open"} label={REASON[r.reason]} /><Pill s="x" label={r.target_type} /></div>
            <p className="text-sm">By <b>{r.reporter_name || "a user"}</b> · {when(r.created_at)}</p>
            {r.note && <p className="rounded-2xl bg-white/10 p-3 text-sm" data-testid="report-note">“{r.note}”</p>}
            <div className="glass rounded-[20px] p-4"><Target r={r} /></div>
            {r.target_user && <p className="text-sm">Account: <Link className="font-bold underline" to={`/admin/users/${r.target_user.user_id}`}>{r.target_user.name}</Link> · {r.target_user.email}{r.target_user.blocked && " · blocked"}</p>}
            {r.target_type === "deal" && (
              <div><p className="mb-2 text-xs font-extrabold uppercase tracking-widest text-white/55">Deal chat ({r.messages.length})</p>
                <div className="max-h-72 space-y-2 overflow-y-auto rounded-[20px] bg-black/15 p-3" data-testid="report-chat">
                  {r.messages.length === 0 ? <p className="text-center text-xs text-white/50">No messages</p> : r.messages.map((m) => (
                    <div key={m.id} className="rounded-2xl bg-white/10 px-3 py-2 text-sm"><p className="text-[11px] font-bold text-white/60">{m.sender_name} · {when(m.created_at)}</p><p className="whitespace-pre-wrap break-words">{m.text}</p></div>
                  ))}
                </div>
              </div>
            )}
            {r.status === "open" ? (
              <div className="flex flex-wrap gap-2 border-t border-white/15 pt-4">
                {ACTIONS[r.kind].map(([a, label, danger]) => <Btn key={a} danger={danger} onClick={() => setAct([a, label, danger])} testid={`resolve-${a}`}>{label}</Btn>)}
              </div>
            ) : <p className="rounded-2xl bg-white/10 p-3 text-sm" data-testid="report-resolution">Resolved: <b>{r.resolution?.action}</b> by {r.resolution?.by} · {r.resolution?.note}</p>}
          </div>
        )}
        <ReasonDialog open={!!act} onOpenChange={(o) => !o && setAct(null)} danger={act?.[2]} cta={act?.[1]} testid="resolve-dialog"
          title={`${act?.[1]}?`} text="Both sides are notified of the outcome. Add a short note."
          onConfirm={(note) => run("post", `/admin/reports/${id}/resolve`, { action: act[0], note }, "Resolved")} />
      </SheetContent>
    </Sheet>
  );
};

export default function Reports() {
  const [params, setParams] = useSearchParams();
  const kind = params.get("kind") || "";
  const [status, setStatus] = useState("open");
  const [list, reload] = useAdminData("/admin/reports", { status, kind });
  const open = params.get("open");
  const setP = (k, v) => { const p = new URLSearchParams(params); v ? p.set(k, v) : p.delete(k); setParams(p); };
  return (
    <div data-testid="admin-reports">
      <H1 sub="Reports from users and payment disputes">Reports & disputes</H1>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="sm:w-64"><Seg value={status} onChange={setStatus} testid="reports-status" options={[["open", "Open"], ["resolved", "Resolved"]]} /></div>
        <div className="sm:w-80"><Seg value={kind || "all"} onChange={(v) => setP("kind", v === "all" ? "" : v)} testid="reports-kind" options={[["all", "All"], ["report", "Reports"], ["dispute", "Disputes"]]} /></div>
      </div>
      {!list ? <Spinner /> : (
        <Box testid="reports-list">
          {list.length === 0 ? <Nothing t="Nothing to review" testid="reports-empty" /> : list.map((r) => (
            <Row key={r.id} onClick={() => setP("open", r.id)} testid={`report-row-${r.id}`}>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15">{r.kind === "dispute" ? <Scale className="h-5 w-5" /> : <Flag className="h-5 w-5" />}</span>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{REASON[r.reason]} · {r.target_label}</p><p className="truncate text-xs text-white/65">{r.target_type} · by {r.reporter_name || "user"} · {when(r.created_at)}</p></div>
              <Pill s={r.kind === "dispute" ? "disputed" : r.status} label={r.kind === "dispute" ? "Dispute" : r.status} />
            </Row>
          ))}
        </Box>
      )}
      <Detail id={open} onClose={() => setP("open", "")} onDone={reload} />
    </div>
  );
}
