import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Bookmark, Grid3x3, Tag, Info, Star, Play, MessageSquare, Instagram, Youtube, Check, Pencil, Loader2, ExternalLink, MapPin, Languages } from "lucide-react";
import { toast } from "sonner";
import { OfferDialog } from "@/components/OfferDialog";
import { PLANS } from "@/constants/options";
import { useMe } from "@/context/MeContext";
import { inr } from "@/lib/api";

const isImg = (u) => /\.(png|jpe?g|webp|gif)(\?|$)/i.test(u) || u.startsWith("data:image") || u.includes("images.unsplash.com");
const TABS = [["posts", "Posts", Grid3x3], ["prices", "Prices", Tag], ["about", "About", Info], ["reviews", "Reviews", Star]];
const TONES = ["from-[#6C4CF1] to-[#3B82F6]", "from-[#FF5FA2] to-[#7C5CFF]", "from-[#14B8A6] to-[#6C4CF1]", "from-[#F59E0B] to-[#FF5FA2]"];

const Posts = ({ c }) => {
  const items = [{ img: c.photo, label: "Profile" }, ...(c.intro_video ? [{ link: c.intro_video, label: "Intro" }] : []), ...(c.samples || []).map((s, i) => (isImg(s) ? { img: s, label: `Sample ${i + 1}` } : { link: s, label: `Sample ${i + 1}` }))];
  return (
    <div className="grid grid-cols-3 gap-[2px] sm:grid-cols-4" data-testid="creator-posts">
      {items.map((it, i) => it.img ? (
        <div key={i} className="relative aspect-square overflow-hidden"><img src={it.img} alt="" className="h-full w-full object-cover" /><span className="absolute bottom-1.5 left-2 text-[11px] font-bold drop-shadow">{it.label}</span></div>
      ) : (
        <a key={i} href={it.link} target="_blank" rel="noreferrer" data-testid={`creator-post-link-${i}`} className={`relative flex aspect-square flex-col items-center justify-center bg-gradient-to-br ${TONES[i % 4]} transition-opacity hover:opacity-90`}>
          <Play className="h-8 w-8 fill-white" /><span className="absolute bottom-1.5 left-2 text-[11px] font-bold">{it.label}</span><ExternalLink className="absolute right-2 top-2 h-3.5 w-3.5" />
        </a>
      ))}
    </div>
  );
};

const Prices = ({ c, own, onHire }) => (
  <div className="space-y-3 px-4 py-4">
    {PLANS.map((p, i) => (
      <div key={p.id} className={`rounded-[22px] p-4 ${i === 0 ? "bg-white text-[#1F1B2E]" : "glass"}`} data-testid={`creator-plan-${p.id}`}>
        <div className="flex items-start gap-3">
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 ${i === 0 ? "border-[#6C4CF1] text-[#6C4CF1]" : "border-white/50"}`}><p.icon className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2"><p className="text-lg font-extrabold">{p.label}</p><p className="text-lg font-extrabold">{i === 0 ? "from " : ""}{inr(c[p.rate])}<span className="text-xs font-semibold opacity-70">{p.unit}</span></p></div>
            <ul className={`mt-1 space-y-0.5 text-[13px] ${i === 0 ? "text-[#5B5675]" : "text-white/75"}`}>{p.bullets.map((b) => <li key={b} className="flex gap-1.5"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />{b}</li>)}</ul>
          </div>
        </div>
        {!own && <button onClick={() => onHire(p.id)} data-testid={`hire-plan-${p.id}`} className={`mt-3 h-11 w-full rounded-full text-sm font-extrabold transition-transform active:scale-[.98] ${i === 0 ? "cta" : "bg-white text-[#3B25A8]"}`}>Hire for {p.label}</button>}
      </div>
    ))}
    <p className="text-center text-xs text-white/60">Payment is held safely until you approve the finished work.</p>
  </div>
);

const About = ({ c }) => (
  <div className="space-y-3 px-4 py-4 text-sm">
    {c.bio && <p className="text-white/90">{c.bio}</p>}
    <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-white/60" />{c.city}</p>
    <p className="flex items-center gap-2"><Languages className="h-4 w-4 text-white/60" />{c.languages.join(", ")}</p>
    <div className="flex flex-wrap gap-2 pt-1">
      {c.instagram && <a href={c.instagram.startsWith("http") ? c.instagram : `https://instagram.com/${c.instagram.replace("@", "")}`} target="_blank" rel="noreferrer" className="glass flex items-center gap-1.5 rounded-full px-3.5 py-2 font-bold"><Instagram className="h-4 w-4" />Instagram</a>}
      {c.youtube && <a href={c.youtube.startsWith("http") ? c.youtube : `https://youtube.com/@${c.youtube.replace("@", "")}`} target="_blank" rel="noreferrer" className="glass flex items-center gap-1.5 rounded-full px-3.5 py-2 font-bold"><Youtube className="h-4 w-4" />YouTube</a>}
    </div>
  </div>
);

const Reviews = ({ c }) => (
  <div className="space-y-2.5 px-4 py-4">
    {!c.reviews?.length ? <p className="py-8 text-center text-sm text-white/60">No reviews yet.</p> : c.reviews.map((r, i) => (
      <div key={i} className="glass-soft rounded-[20px] p-4">
        <div className="flex gap-0.5">{Array.from({ length: 5 }).map((_, k) => <Star key={k} className={`h-4 w-4 ${k < r.rating.stars ? "fill-amber-300 text-amber-300" : "text-white/25"}`} />)}</div>
        {r.rating.review && <p className="mt-1.5 text-sm">{r.rating.review}</p>}
        <p className="mt-1 text-xs text-white/60">{r.business_name} · {r.plan_label}</p>
      </div>
    ))}
  </div>
);

export default function CreatorProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { me, api } = useMe();
  const [c, setC] = useState(null);
  const [missing, setMissing] = useState(false);
  const [tab, setTab] = useState("posts");
  const [offerPlan, setOfferPlan] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get(`/creators/${id}`).then((r) => setC(r.data)).catch(() => setMissing(true));
    api.get("/saved/ids").then((r) => setSaved(r.data.includes(id)));
  }, [api, id]);

  if (missing) return <div className="py-20 text-center" data-testid="creator-not-found"><p className="font-bold">This creator isn't available.</p><Link to="/app" className="text-white/70 underline">Back to discover</Link></div>;
  if (!c) return <div className="grid place-items-center py-20"><Loader2 className="h-7 w-7 animate-spin" /></div>;
  const own = c.user_id === me.user.user_id;
  const toggleSave = async () => { await (saved ? api.delete(`/saved/${id}`) : api.post(`/saved/${id}`)); setSaved(!saved); toast.success(saved ? "Removed from saved" : "Saved"); };
  const message = async () => {
    const { data } = await api.get("/deals", { params: { side: "business" } });
    const d = data.find((x) => x.creator_id === id && !["declined", "cancelled"].includes(x.status));
    d ? navigate(`/app/chat/${d.id}`) : setOfferPlan("per_video");
  };

  return (
    <div className="-mx-4 -mt-4 sm:mx-0" data-testid="creator-profile-page">
      <div className="flex h-14 items-center gap-3 px-4">
        <button onClick={() => navigate(-1)} className="grid h-11 w-11 place-items-center rounded-full bg-white/15" data-testid="back-to-discover" aria-label="Back"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="min-w-0 flex-1 truncate text-xl font-extrabold">{c.name}</h1>
        {own ? <Link to="/app/setup/creator" className="grid h-11 w-11 place-items-center rounded-full bg-white/15" data-testid="edit-own-profile"><Pencil className="h-5 w-5" /></Link>
          : <button onClick={toggleSave} className="grid h-11 w-11 place-items-center rounded-full bg-white/15" data-testid="profile-save-button" aria-label="Save"><Bookmark className={`h-5 w-5 ${saved ? "fill-white" : ""}`} /></button>}
      </div>
      <div className="px-4 pt-2">
        <div className="flex items-center gap-5">
          <span className="ring-story shrink-0 rounded-full p-[3px]"><img src={c.photo} alt={c.name} className="h-[86px] w-[86px] rounded-full border-[3px] border-[#3B25A8] object-cover" /></span>
          <div className="grid flex-1 grid-cols-3 text-center">
            {[[(c.samples?.length || 0) + 1 + (c.intro_video ? 1 : 0), "Posts"], [c.deals_done || 0, "Jobs done"], [c.rating_count ? `${c.rating_avg}★` : "–", c.rating_count ? `${c.rating_count} reviews` : "No reviews"]].map(([v, l]) => (
              <div key={l}><p className="text-xl font-extrabold">{v}</p><p className="text-[13px] text-white/75">{l}</p></div>
            ))}
          </div>
        </div>
        <p className="mt-3 flex items-center gap-2 text-[17px] font-extrabold" data-testid="creator-name">{c.name}<span className="h-2 w-2 rounded-full bg-[#5CE0A0]" />{c.is_sample && <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-extrabold uppercase">Sample</span>}</p>
        <p className="text-[14px] text-white/80">{c.category} presenter{c.followers ? ` · ${c.followers >= 1000 ? `${Math.round(c.followers / 1000)}k` : c.followers} followers` : ""}</p>
        {c.bio && <p className="mt-1 line-clamp-2 text-[14px]">{c.bio}</p>}
        <p className="text-[14px] text-white/70">{c.city} · {c.languages.join(", ")}</p>
        <div className="no-scrollbar mt-4 flex gap-4 overflow-x-auto pb-1">
          {PLANS.map((p) => (
            <button key={p.id} onClick={() => (own ? setTab("prices") : setOfferPlan(p.id))} className="flex shrink-0 flex-col items-center gap-1.5" data-testid={`highlight-${p.id}`}>
              <span className="grid h-[62px] w-[62px] place-items-center rounded-full border-2 border-white/60 bg-white/10 transition-transform hover:scale-105"><p.icon className="h-6 w-6" /></span>
              <span className="text-xs font-bold">{p.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 flex border-b border-white/15">
        {TABS.map(([k, l, I]) => (
          <button key={k} onClick={() => setTab(k)} data-testid={`profile-tab-${k}`} className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 py-3 text-sm font-bold transition-colors ${tab === k ? "border-white text-white" : "border-transparent text-white/60"}`}><I className="h-4 w-4" />{l}</button>
        ))}
      </div>
      <div className="pb-24">
        {tab === "posts" && <Posts c={c} />}
        {tab === "prices" && <Prices c={c} own={own} onHire={setOfferPlan} />}
        {tab === "about" && <About c={c} />}
        {tab === "reviews" && <Reviews c={c} />}
      </div>
      {!own && (
        <div className="fixed inset-x-0 bottom-[88px] z-30 mx-auto flex max-w-md gap-2.5 px-4">
          <button onClick={message} className="glass flex h-[52px] flex-1 items-center justify-center gap-2 rounded-full bg-[#2A1B7A]/70 font-bold" data-testid="profile-message-button"><MessageSquare className="h-5 w-5" />Message</button>
          <button onClick={() => setOfferPlan("per_video")} className="cta h-[52px] flex-[1.4] truncate rounded-full px-4 font-extrabold" data-testid="sticky-send-offer">Hire {c.name.split(" ")[0]}</button>
        </div>
      )}
      {offerPlan && <OfferDialog creator={c} open={!!offerPlan} initialPlan={offerPlan} onOpenChange={(o) => !o && setOfferPlan(null)} />}
    </div>
  );
}
