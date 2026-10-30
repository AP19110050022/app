import { useState } from "react";
import { Check, X, MapPin, Play, ExternalLink } from "lucide-react";
import { Seg } from "@/components/AppBits";
import { PLANS } from "@/constants/options";
import { inr } from "@/lib/api";
import { Btn, H1, Nothing, Pill, ReasonDialog, Spinner, useAdminData, useAdminRun, when } from "@/pages/admin/bits";

const isImg = (u) => u.startsWith("data:image") || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(u) || u.includes("images.unsplash.com");

const CreatorReview = ({ c, onApprove, onReject }) => (
  <div className="glass rise rounded-[24px] p-4" data-testid={`approval-card-${c.user_id}`}>
    <div className="flex items-start gap-4">
      <img src={c.photo} alt="" className="h-20 w-20 shrink-0 rounded-[20px] object-cover" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2"><p className="text-lg font-extrabold">{c.name}</p><Pill s={c.status} />{c.updated_at && c.status === "pending" && <Pill s="edited" label="Edited" />}</div>
        <p className="text-[13px] text-white/80">{(c.categories || []).join(" · ")} · {c.gender}</p>
        <p className="flex items-center gap-1 text-xs text-white/65"><MapPin className="h-3 w-3" />{c.city}{c.state ? `, ${c.state}` : ""} · {c.languages?.join(", ")}</p>
        <p className="text-[11px] text-white/50">Submitted {when(c.updated_at || c.created_at)}</p>
      </div>
    </div>
    <div className="mt-3 flex flex-wrap gap-1.5">
      {PLANS.filter((p) => c[p.rate]).map((p) => <span key={p.id} className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold" data-testid={`approval-plan-${c.user_id}-${p.id}`}>{p.label} · {inr(c[p.rate])}{p.unit}</span>)}
    </div>
    {c.bio && <p className="mt-2 text-[13px] text-white/85">{c.bio}</p>}
    {(c.samples?.length > 0 || c.intro_video) && (
      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
        {c.intro_video && <a href={c.intro_video} target="_blank" rel="noreferrer" className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-white/15"><Play className="h-6 w-6" /></a>}
        {c.samples.map((s, i) => isImg(s) ? <img key={i} src={s} alt="" className="h-20 w-20 shrink-0 rounded-2xl object-cover" />
          : <a key={i} href={s} target="_blank" rel="noreferrer" className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-white/15"><ExternalLink className="h-5 w-5" /></a>)}
      </div>
    )}
    {c.review_note && <p className="mt-3 rounded-2xl bg-rose-400/15 px-3 py-2 text-xs text-rose-100">Rejection reason: {c.review_note}</p>}
    <div className="mt-4 flex flex-wrap gap-2">
      {c.status !== "approved" && <Btn onClick={onApprove} testid={`approve-${c.user_id}`}><Check className="h-4 w-4" />Approve</Btn>}
      {c.status !== "rejected" && <Btn danger onClick={onReject} testid={`reject-${c.user_id}`}><X className="h-4 w-4" />Reject</Btn>}
    </div>
  </div>
);

export default function Approvals() {
  const [status, setStatus] = useState("pending");
  const [list, reload] = useAdminData("/admin/creators", { status });
  const run = useAdminRun(reload);
  const [rejecting, setRejecting] = useState(null);
  return (
    <div data-testid="admin-approvals">
      <H1 sub="New and edited creator profiles">Creator approvals</H1>
      <div className="mb-4 max-w-md"><Seg value={status} onChange={setStatus} testid="approvals-filter" options={[["pending", "Waiting"], ["approved", "Approved"], ["rejected", "Rejected"]]} /></div>
      {!list ? <Spinner /> : list.length === 0 ? <div className="glass rounded-[22px]"><Nothing t="Nothing here right now" testid="approvals-empty" /></div> : (
        <div className="grid gap-3 lg:grid-cols-2">
          {list.map((c) => <CreatorReview key={c.user_id} c={c} onApprove={() => run("patch", `/admin/creators/${c.user_id}`, { status: "approved" }, `${c.name} approved`)} onReject={() => setRejecting(c)} />)}
        </div>
      )}
      <ReasonDialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)} danger cta="Reject profile" testid="reject-dialog"
        title={`Reject ${rejecting?.name || ""}?`} text="The creator sees this reason in a notification and on their profile."
        onConfirm={(reason) => run("patch", `/admin/creators/${rejecting.user_id}`, { status: "rejected", reason }, "Profile rejected")} />
    </div>
  );
}
