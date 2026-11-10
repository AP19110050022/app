import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Loader2, Briefcase, Pencil, Trash2, Pause, Play, Send, X, Star } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChipSelect } from "@/components/ChipSelect";
import { Field } from "@/components/Stepper";
import { SubHeader, Empty, Seg } from "@/components/AppBits";
import { OfferDialog } from "@/components/OfferDialog";
import { BUDGETS, LANGUAGES, PLANS, PLAN_BY_ID } from "@/constants/options";
import { useMe } from "@/context/MeContext";
import { errMsg, inr, timeAgo } from "@/lib/api";

const BLANK = { title: "", description: "", plans: ["per_video"], budget: "", languages: [], status: "open" };
const ST = { open: "bg-emerald-300/25 text-emerald-100", paused: "bg-amber-300/25 text-amber-100", closed: "bg-white/15 text-white/70", sent: "bg-white/15", shortlisted: "bg-sky-300/25 text-sky-100", declined: "bg-rose-300/25 text-rose-100", offered: "bg-emerald-300/25 text-emerald-100" };
const Pill = ({ s }) => <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${ST[s]}`} data-testid={`pill-${s}`}>{s === "sent" ? "Interested" : s}</span>;

const JobForm = ({ open, onOpenChange, job, onSaved }) => {
  const { api } = useMe();
  const [f, setF] = useState(BLANK);
  useEffect(() => { if (open) setF(job ? { ...BLANK, ...job } : BLANK); }, [open, job]);
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v?.target ? v.target.value : v }));
  const save = async (e) => {
    e.preventDefault();
    const body = { title: f.title, description: f.description, plans: f.plans, budget: f.budget, languages: f.languages, status: f.status };
    try { await (job ? api.put(`/jobs/${job.id}`, body) : api.post("/jobs", body)); toast.success(job ? "Job updated" : "Job posted. Presenters can now see it."); onOpenChange(false); onSaved(); } catch (err) { toast.error(errMsg(err)); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-[28px] border-white/10 bg-gradient-to-b from-[#4530C8] to-[#2A1B7A] text-white" data-testid="job-form-dialog">
        <DialogHeader className="text-left"><DialogTitle className="text-2xl font-extrabold text-white">{job ? "Edit job" : "Post a job"}</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <Field label="Job title"><Input required minLength={4} value={f.title} onChange={set("title")} placeholder="e.g. Presenter for our café reels" data-testid="job-title-input" /></Field>
          <Field label="What do you need?"><Textarea required minLength={10} rows={4} value={f.description} onChange={set("description")} placeholder="Describe the videos, shoot location, timing and style." data-testid="job-description-input" /></Field>
          <Field label="Plans (one or more)"><ChipSelect multi options={PLANS.map((p) => p.label)} value={f.plans.map((p) => PLAN_BY_ID[p].label)} onChange={(ls) => set("plans")(PLANS.filter((p) => ls.includes(p.label)).map((p) => p.id))} testid="job-plans" /></Field>
          <Field label="Budget"><ChipSelect options={BUDGETS} value={f.budget} onChange={set("budget")} testid="job-budget" /></Field>
          <Field label="Languages"><ChipSelect multi options={LANGUAGES} value={f.languages} onChange={set("languages")} testid="job-languages" /></Field>
          <button type="submit" disabled={!f.plans.length || !f.budget} className="cta h-[52px] w-full rounded-full font-extrabold disabled:opacity-50" data-testid="job-submit-button">{job ? "Save job" : "Post job"}</button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const Interest = ({ i, onStatus, onOffer }) => (
  <div className="flex items-center gap-3 py-2.5" data-testid={`interest-${i.id}`}>
    <Link to={`/app/creator/${i.creator_id}`}><img src={i.creator_photo} alt="" className="h-11 w-11 rounded-full object-cover" /></Link>
    <div className="min-w-0 flex-1"><Link to={`/app/creator/${i.creator_id}`} className="block truncate font-bold hover:underline">{i.creator_name}</Link><p className="text-xs text-white/65">{i.from_price ? `from ${inr(i.from_price)} · ` : ""}{timeAgo(i.created_at)}</p></div>
    <Pill s={i.status} />
    {i.status !== "declined" && i.status !== "offered" && (<>
      <button onClick={() => onOffer(i)} className="grid h-9 w-9 place-items-center rounded-full bg-white text-[#3B25A8]" aria-label="Send offer" data-testid={`interest-offer-${i.id}`}><Send className="h-4 w-4" /></button>
      {i.status === "sent" && <button onClick={() => onStatus(i, "shortlisted")} className="grid h-9 w-9 place-items-center rounded-full bg-white/15" aria-label="Shortlist" data-testid={`interest-shortlist-${i.id}`}><Star className="h-4 w-4" /></button>}
      <button onClick={() => onStatus(i, "declined")} className="grid h-9 w-9 place-items-center rounded-full bg-white/15" aria-label="Decline" data-testid={`interest-decline-${i.id}`}><X className="h-4 w-4" /></button>
    </>)}
  </div>
);

const BusinessJobs = ({ openCreate, onCreateHandled }) => {
  const { api } = useMe();
  const [jobs, setJobs] = useState(null);
  const [form, setForm] = useState({ open: false, job: null });
  const [offer, setOffer] = useState(null);
  useEffect(() => {
    if (openCreate) {
      setForm({ open: true, job: null });
      onCreateHandled();
    }
  }, [openCreate, onCreateHandled]);
  const load = useCallback(() => api.get("/jobs/mine").then((r) => setJobs(r.data)), [api]);
  useEffect(() => { load(); }, [load]);
  const safe = async (fn, ok) => { try { await fn(); if (ok) toast.success(ok); load(); } catch (e) { toast.error(errMsg(e)); } };
  const st = (j, status) => safe(() => api.put(`/jobs/${j.id}`, { ...j, status }), `Job ${status}`);
  const del = (j) => safe(() => api.delete(`/jobs/${j.id}`), "Job deleted");
  const istat = (i, status) => safe(() => api.patch(`/interests/${i.id}`, { status }));
  const openOffer = async (i) => {
    try { const { data } = await api.get(`/creators/${i.creator_id}`); setOffer({ c: data, i }); } catch { toast.error("This presenter isn't available right now"); }
  };
  return (
    <>
      <button onClick={() => setForm({ open: true, job: null })} className="cta mb-4 flex h-[52px] w-full items-center justify-center gap-2 rounded-full font-extrabold" data-testid="post-job-button"><Plus className="h-5 w-5" />Post a job</button>
      {jobs === null ? <div className="grid place-items-center py-16"><Loader2 className="h-7 w-7 animate-spin" /></div>
        : !jobs.length ? <Empty icon={Briefcase} title="No jobs posted" text="Post a job so presenters near you can find it and show interest. Your business appears in Discover only when you have an open job." testid="jobs-mine-empty" />
        : <div className="space-y-3">{jobs.map((j) => (
          <div key={j.id} className="glass rounded-[24px] p-4" data-testid={`my-job-${j.id}`}>
            <div className="flex items-start justify-between gap-2"><p className="text-lg font-extrabold leading-tight">{j.title}</p><Pill s={j.status} /></div>
            <p className="mt-1 text-xs text-white/70">{j.plans.map((p) => PLAN_BY_ID[p].label).join(", ")} · Budget {j.budget} · {j.interests.length} interested</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => setForm({ open: true, job: j })} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/15 px-3.5 text-xs font-bold" data-testid={`job-edit-${j.id}`}><Pencil className="h-3.5 w-3.5" />Edit</button>
              {j.status === "open" ? <button onClick={() => st(j, "paused")} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/15 px-3.5 text-xs font-bold" data-testid={`job-pause-${j.id}`}><Pause className="h-3.5 w-3.5" />Pause</button>
                : <button onClick={() => st(j, "open")} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-3.5 text-xs font-extrabold text-[#3B25A8]" data-testid={`job-open-${j.id}`}><Play className="h-3.5 w-3.5" />{j.status === "closed" ? "Reopen" : "Publish"}</button>}
              {j.status !== "closed" && <button onClick={() => st(j, "closed")} className="inline-flex h-9 items-center rounded-full bg-white/15 px-3.5 text-xs font-bold" data-testid={`job-close-${j.id}`}>Close</button>}
              <button onClick={() => del(j)} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold text-rose-200" data-testid={`job-delete-${j.id}`}><Trash2 className="h-3.5 w-3.5" />Delete</button>
            </div>
            {j.interests.length > 0 && <div className="mt-3 divide-y divide-white/10 border-t border-white/10">{j.interests.map((i) => <Interest key={i.id} i={i} onStatus={istat} onOffer={openOffer} />)}</div>}
          </div>
        ))}</div>}
      <JobForm open={form.open} job={form.job} onOpenChange={(o) => setForm((s) => ({ ...s, open: o }))} onSaved={load} />
      {offer && <OfferDialog creator={offer.c} open={!!offer} initialPlan={offer.c.plans?.[0]} onOpenChange={(o) => { if (!o) setOffer(null); }} onSent={() => istat(offer.i, "offered")} />}
    </>
  );
};

const CreatorInterests = () => {
  const { api } = useMe();
  const [list, setList] = useState(null);
  useEffect(() => { api.get("/interests/mine").then((r) => setList(r.data)); }, [api]);
  if (!list) return <div className="grid place-items-center py-16"><Loader2 className="h-7 w-7 animate-spin" /></div>;
  if (!list.length) return <Empty icon={Briefcase} title="No interests yet" text="Open Discover → Jobs by businesses and tap I'm interested." testid="interests-empty" action={<Link to="/app" className="mt-4 rounded-full bg-white px-5 py-2.5 text-sm font-extrabold text-[#3B25A8]">Find jobs</Link>} />;
  return <div className="space-y-2.5">{list.map((i) => (
    <Link key={i.id} to={`/app/business/${i.business_id}`} className="glass flex items-center gap-3 rounded-[22px] p-4" data-testid={`my-interest-${i.id}`}>
      <div className="min-w-0 flex-1"><p className="truncate font-extrabold">{i.job_title}</p><p className="text-xs text-white/70">{i.company} · {timeAgo(i.created_at)}</p></div><Pill s={i.status} />
    </Link>
  ))}</div>;
};

export default function Jobs() {
  const { me } = useMe();
  const [searchParams, setSearchParams] = useSearchParams();
  const openCreate = searchParams.get("create") === "1";
  const clearCreate = useCallback(() => setSearchParams((current) => {
    const next = new URLSearchParams(current);
    next.delete("create");
    return next;
  }, { replace: true }), [setSearchParams]);
  const both = me.creator && me.business;
  const [side, setSide] = useState(me.user.active_mode === "creator" || !me.business ? "creator" : "business");
  return (
    <div className="mx-auto max-w-2xl" data-testid="jobs-page">
      <SubHeader title={side === "business" ? "My jobs" : "Jobs I'm interested in"} sub={side === "business" ? "Post work so presenters can find you." : "Businesses can send you an offer."} />
      {both && <div className="mb-4"><Seg value={side} onChange={setSide} options={[["business", "My jobs"], ["creator", "My interest"]]} testid="jobs-side" /></div>}
      {side === "business" ? (me.business ? <BusinessJobs openCreate={openCreate} onCreateHandled={clearCreate} /> : null) : me.creator ? <CreatorInterests /> : <Empty icon={Briefcase} title="Create a presenter profile first" testid="jobs-no-creator" action={<Link to="/app/setup/creator" className="mt-4 rounded-full bg-white px-5 py-2.5 text-sm font-extrabold text-[#3B25A8]">Set up</Link>} />}
    </div>
  );
}
