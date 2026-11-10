import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Bookmark, Pencil, Loader2, MapPin, Globe } from "lucide-react";
import { JobCard } from "@/pages/Discover";
import { ReportButton } from "@/components/ReportButton";
import { PLAN_BY_ID } from "@/constants/options";
import { useMe } from "@/context/MeContext";
import { errMsg } from "@/lib/api";

export default function BusinessProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { me, api } = useMe();
  const [b, setB] = useState(null);
  const [saved, setSaved] = useState(false);
  const [missing, setMissing] = useState(false);
  const [applied, setApplied] = useState([]);
  useEffect(() => {
    api.get(`/businesses/${id}`).then((r) => setB(r.data)).catch(() => setMissing(true));
    api.get("/saved/ids").then((r) => setSaved(r.data.includes(id)));
    api.get("/interests/mine").then((r) => setApplied(r.data.map((i) => i.job_id)));
  }, [api, id]);
  if (missing) return <p className="py-20 text-center font-bold" data-testid="business-not-found">Business not found</p>;
  if (!b) return <div className="grid place-items-center py-20"><Loader2 className="h-7 w-7 animate-spin" /></div>;
  const own = id === me.user.user_id;
  const toggleSave = async () => { await (saved ? api.delete(`/saved/${id}`) : api.post(`/saved/${id}`, null, { params: { kind: "business" } })); setSaved(!saved); };
  const interest = async (j) => {
    if (!me.creator) return toast.error("Set up your presenter profile first. Tap + to start.");
    try { await api.post(`/jobs/${j.id}/interest`, { note: "" }); setApplied((a) => [...a, j.id]); toast.success("Interest sent"); } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <div className="mx-auto max-w-2xl" data-testid="business-profile-page">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="grid h-11 w-11 place-items-center rounded-full bg-white/15" aria-label="Back" data-testid="business-back"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="min-w-0 flex-1 truncate text-xl font-extrabold">{b.company}</h1>
        {own ? <Link to="/app/setup/business" className="grid h-11 w-11 place-items-center rounded-full bg-white/15" data-testid="business-edit"><Pencil className="h-5 w-5" /></Link>
          : <button onClick={toggleSave} className="grid h-11 w-11 place-items-center rounded-full bg-white/15" aria-label="Save" data-testid="business-save"><Bookmark className={`h-5 w-5 ${saved ? "fill-white" : ""}`} /></button>}
      </div>
      <div className="mt-4 flex items-center gap-5">
        <span className="ring-story shrink-0 rounded-full p-[3px]">{b.logo ? <img src={b.logo} alt="" className="h-[86px] w-[86px] rounded-full border-[3px] border-[#3B25A8] object-cover" /> : <span className="grid h-[86px] w-[86px] place-items-center rounded-full border-[3px] border-[#3B25A8] bg-white text-3xl font-extrabold text-[#6C4CF1]">{b.company[0]}</span>}</span>
        <div className="grid flex-1 grid-cols-2 text-center">
          <div><p className="text-xl font-extrabold">{b.jobs.length}</p><p className="text-[13px] text-white/75">Open jobs</p></div>
          <div><p className="truncate text-xl font-extrabold">{b.city}</p><p className="text-[13px] text-white/75">{b.state || "India"}</p></div>
        </div>
      </div>
      <p className="mt-3 text-[17px] font-extrabold">{b.company}{b.live === false && <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-[10px] uppercase">Offline</span>}</p>
      <p className="text-[14px] text-white/80">{b.industry}</p>
      {b.description && <p className="mt-1 text-[14px]">{b.description}</p>}
      {!own && <div className="mt-1"><ReportButton type="business" id={b.user_id} label="Report business" testid="business-report-button" /></div>}
      <div className="glass mt-4 space-y-1.5 rounded-[22px] p-4 text-sm">
        <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-white/60" />{b.city}{b.state ? `, ${b.state}` : ""}</p>
        {b.website && <p className="flex items-center gap-2 truncate"><Globe className="h-4 w-4 text-white/60" />{b.website}</p>}
        <p>Usually hires: <b>{(b.need_plans || []).map((p) => PLAN_BY_ID[p]?.label).join(", ")}</b> · Budget <b>{b.budget}</b></p>
        {b.languages?.length > 0 && <p>Languages: {b.languages.join(", ")}</p>}
      </div>
      <p className="mb-3 mt-6 text-lg font-extrabold">Open jobs ({b.jobs.length})</p>
      {b.jobs.length ? <div className="space-y-3">{b.jobs.map((j, i) => <JobCard key={j.id} j={{ ...j, applied: applied.includes(j.id) }} i={i} mine={own} onInterest={interest} />)}</div>
        : <p className="glass-soft rounded-[22px] p-6 text-center text-sm text-white/70">No open jobs right now.</p>}
    </div>
  );
}
