import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BadgeCheck, MapPin, Star, Users, Languages, PlayCircle, Instagram, Youtube, Check, Send, Pencil, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OfferDialog } from "@/components/OfferDialog";
import { PLANS } from "@/constants/options";
import { useMe } from "@/context/MeContext";
import { inr } from "@/lib/api";

const Stat = ({ icon: Icon, value, label }) => (
  <div className="rounded-2xl bg-white p-4 text-center ring-1 ring-slate-200">
    <Icon className="mx-auto h-5 w-5 text-violet-600" />
    <p className="mt-1 font-heading text-lg font-bold">{value}</p>
    <p className="text-xs text-slate-500">{label}</p>
  </div>
);

const isImg = (u) => /\.(png|jpe?g|webp|gif)(\?|$)/i.test(u) || u.startsWith("data:image") || u.includes("images.unsplash.com");

export default function CreatorProfile() {
  const { id } = useParams();
  const { me, api } = useMe();
  const [c, setC] = useState(null);
  const [missing, setMissing] = useState(false);
  const [offerPlan, setOfferPlan] = useState(null);

  useEffect(() => {
    api.get(`/creators/${id}`).then((r) => setC(r.data)).catch(() => setMissing(true));
  }, [api, id]);

  if (missing) return <div className="py-20 text-center" data-testid="creator-not-found"><p className="font-semibold">This creator isn't available.</p><Link to="/app" className="text-violet-700">Back to discover</Link></div>;
  if (!c) return <div className="grid place-items-center py-20"><Loader2 className="h-7 w-7 animate-spin text-violet-600" /></div>;
  const own = c.user_id === me.user.user_id;

  return (
    <div data-testid="creator-profile-page" className="pb-16">
      <Link to="/app" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-violet-700" data-testid="back-to-discover"><ArrowLeft className="h-4 w-4" />Back</Link>
      <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-3xl bg-violet-100 shadow-xl">
            <img src={c.photo} alt={c.name} className="aspect-[4/5] w-full object-cover" />
            <span className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white"><span className="h-1.5 w-1.5 rounded-full bg-white" />Available for hire</span>
            {c.is_sample && <span className="absolute right-4 top-4 rounded-full bg-slate-900/60 px-2.5 py-1 text-[11px] font-bold uppercase text-white">Sample profile</span>}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Stat icon={Star} value={c.rating_count ? c.rating_avg : "New"} label={`${c.rating_count || 0} ratings`} />
            <Stat icon={BadgeCheck} value={c.deals_done || 0} label="Deals done" />
            <Stat icon={Users} value={c.followers >= 1000 ? `${Math.round(c.followers / 1000)}k` : c.followers || "—"} label="Followers" />
          </div>
        </div>
        <div>
          <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">{c.category}</span>
          <h1 className="mt-3 flex items-center gap-2 font-heading text-4xl font-extrabold tracking-tight" data-testid="creator-name">{c.name}<BadgeCheck className="h-7 w-7 text-sky-500" /></h1>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{c.city}</span>
            <span className="flex items-center gap-1"><Languages className="h-4 w-4" />{c.languages.join(", ")}</span>
          </div>
          {c.bio && <p className="mt-5 max-w-2xl text-slate-700">{c.bio}</p>}
          <div className="mt-5 flex flex-wrap gap-2">
            {c.intro_video && <a href={c.intro_video} target="_blank" rel="noreferrer" data-testid="creator-intro-video"><Button variant="outline" className="gap-2 rounded-full"><PlayCircle className="h-4 w-4 text-violet-600" />Intro video</Button></a>}
            {c.instagram && <a href={c.instagram.startsWith("http") ? c.instagram : `https://instagram.com/${c.instagram.replace("@", "")}`} target="_blank" rel="noreferrer"><Button variant="outline" className="gap-2 rounded-full"><Instagram className="h-4 w-4 text-pink-500" />Instagram</Button></a>}
            {c.youtube && <a href={c.youtube.startsWith("http") ? c.youtube : `https://youtube.com/@${c.youtube.replace("@", "")}`} target="_blank" rel="noreferrer"><Button variant="outline" className="gap-2 rounded-full"><Youtube className="h-4 w-4 text-red-500" />YouTube</Button></a>}
            {own && <Link to="/app/setup/creator"><Button variant="secondary" className="gap-2 rounded-full" data-testid="edit-own-profile"><Pencil className="h-4 w-4" />Edit profile</Button></Link>}
          </div>

          <h2 className="mt-10 font-heading text-xl font-bold">Hire {c.name.split(" ")[0]}</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {PLANS.map((p, i) => (
              <div key={p.id} data-testid={`creator-plan-${p.id}`} className={`flex flex-col rounded-3xl border bg-white p-5 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lg ${i === 0 ? "border-violet-400 ring-2 ring-violet-100" : "border-slate-200"}`}>
                <p.icon className="h-6 w-6 text-violet-600" />
                <p className="mt-3 font-heading text-lg font-bold">{p.label}</p>
                <p className="text-xs text-slate-500">{p.short}</p>
                <p className="mt-3 font-heading text-2xl font-extrabold">{i === 0 ? "From " : ""}{inr(c[p.rate])}<span className="text-sm font-medium text-slate-500">{p.unit}</span></p>
                <ul className="mt-3 flex-1 space-y-1.5 text-sm text-slate-600">{p.bullets.slice(0, 2).map((b) => <li key={b} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-violet-600" />{b}</li>)}</ul>
                {!own && <Button className="mt-4 gap-2 rounded-full" variant={i === 0 ? "default" : "outline"} onClick={() => setOfferPlan(p.id)} data-testid={`hire-plan-${p.id}`}><Send className="h-4 w-4" />Send offer</Button>}
              </div>
            ))}
          </div>

          {c.samples?.length > 0 && (
            <>
              <h2 className="mt-10 font-heading text-xl font-bold">Work samples</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {c.samples.map((s, i) => isImg(s) ? (
                  <img key={i} src={s} alt="" className="aspect-square w-full rounded-2xl object-cover" />
                ) : (
                  <a key={i} href={s} target="_blank" rel="noreferrer" className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 p-3 text-center text-xs font-medium text-violet-800 hover:from-violet-200" data-testid={`sample-link-${i}`}>
                    <PlayCircle className="h-8 w-8" /><span className="line-clamp-2 break-all">{s.replace(/^https?:\/\//, "")}</span><ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ))}
              </div>
            </>
          )}

          {c.reviews?.length > 0 && (
            <>
              <h2 className="mt-10 font-heading text-xl font-bold">Reviews</h2>
              <div className="mt-4 space-y-3">
                {c.reviews.map((r, i) => (
                  <div key={i} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                    <div className="flex items-center gap-1">{Array.from({ length: 5 }).map((_, k) => <Star key={k} className={`h-4 w-4 ${k < r.rating.stars ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />)}</div>
                    {r.rating.review && <p className="mt-2 text-sm text-slate-700">{r.rating.review}</p>}
                    <p className="mt-1 text-xs text-slate-400">{r.business_name} · {r.plan_label}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      {!own && (
        <div className="fixed inset-x-0 bottom-[76px] z-30 px-4 lg:hidden">
          <Button className="h-12 w-full gap-2 rounded-full shadow-xl shadow-violet-500/30" onClick={() => setOfferPlan("per_video")} data-testid="sticky-send-offer"><Send className="h-4 w-4" />Send offer · from {inr(c.rate_per_video)}</Button>
        </div>
      )}
      {offerPlan && <OfferDialog creator={c} open={!!offerPlan} initialPlan={offerPlan} onOpenChange={(o) => !o && setOfferPlan(null)} />}
    </div>
  );
}
