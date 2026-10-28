import { Link } from "react-router-dom";
import { Heart, MapPin, Star, BadgeCheck } from "lucide-react";
import { inr } from "@/lib/api";

export const CreatorCard = ({ c, saved, onToggleSave, to, index = 0 }) => (
  <div className="rise group relative" style={{ animationDelay: `${Math.min(index, 10) * 50}ms` }} data-testid={`creator-card-${c.user_id}`}>
    <Link to={to || `/app/creator/${c.user_id}`} className="block overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/70 transition-[box-shadow,transform] duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-500/10">
      <div className="relative aspect-[4/5] overflow-hidden bg-violet-100">
        <img src={c.photo} alt={c.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/10 to-transparent" />
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-violet-700 backdrop-blur">{c.category}</span>
        {c.is_sample && <span className="absolute left-3 top-11 rounded-full bg-slate-900/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur">Sample</span>}
        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-heading text-lg font-bold">{c.name}</h3>
            <BadgeCheck className="h-4 w-4 shrink-0 text-sky-300" />
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-white/80">
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{c.city}</span>
            {c.rating_count > 0 ? (
              <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{c.rating_avg} ({c.rating_count})</span>
            ) : <span>New</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">From</p>
          <p className="font-heading text-base font-bold text-slate-900" data-testid={`creator-card-price-${c.user_id}`}>{inr(c.rate_per_video)}<span className="text-xs font-medium text-slate-500">/video</span></p>
        </div>
        <span className="truncate pl-2 text-right text-xs text-slate-500">{(c.languages || []).slice(0, 2).join(" · ")}</span>
      </div>
    </Link>
    {onToggleSave && (
      <button
        onClick={() => onToggleSave(c.user_id)}
        data-testid={`save-creator-${c.user_id}`}
        aria-label="Save creator"
        className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 shadow backdrop-blur transition-transform duration-200 hover:scale-110 active:scale-90"
      >
        <Heart className={`h-4.5 w-4.5 h-[18px] w-[18px] ${saved ? "fill-pink-500 text-pink-500" : "text-slate-600"}`} />
      </button>
    )}
  </div>
);
