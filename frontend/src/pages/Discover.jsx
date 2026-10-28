import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Users, Store, MapPin, ChevronDown, Loader2, SearchX, Clock, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreatorCard } from "@/components/CreatorCard";
import { FilterSheet, EMPTY_FILTERS } from "@/components/FilterSheet";
import { Seg, Empty } from "@/components/AppBits";
import { CATEGORIES, CITIES, PLAN_BY_ID } from "@/constants/options";
import { useMe } from "@/context/MeContext";

const Banner = ({ me, openPlus }) => {
  if (me.creator?.status === "pending") {
    return (
      <div className="glass rise mb-3 flex items-center gap-3 rounded-[22px] p-4" data-testid="creator-pending-banner">
        <Clock className="h-5 w-5 shrink-0 text-amber-300" />
        <p className="text-[13px]">Your creator profile is under review. You'll get a notification once it's live.</p>
      </div>
    );
  }
  if (me.creator || me.business) return null;
  return (
    <button onClick={openPlus} data-testid="welcome-plus-button" className="cta rise relative mb-3 flex w-full items-center gap-3 overflow-hidden rounded-[26px] p-4 text-left">
      <span className="absolute -right-12 -top-12 h-40 w-40 rounded-full border-[24px] border-white/15" />
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-[#6C4CF1]"><Plus className="h-6 w-6" strokeWidth={2.6} /></span>
      <span className="relative">
        <b className="block text-[17px]">Hi {me.user.name?.split(" ")[0]}! Get started</b>
        <span className="text-[13px] text-white/90">Become a creator or hire as a business.</span>
      </span>
    </button>
  );
};

const CityPill = ({ city, onChange }) => (
  <Select value={city || "any"} onValueChange={(v) => onChange(v === "any" ? "" : v)}>
    <SelectTrigger className="h-11 flex-1 rounded-full border-0 bg-white px-4 text-[14px] font-extrabold text-[#1F1B2E] [&>svg]:hidden" data-testid="city-select">
      <span className="flex min-w-0 items-center gap-2"><MapPin className="h-4 w-4 shrink-0 text-[#6C4CF1]" /><span className="truncate">{city || "All cities"}</span><span className="text-[13px] font-semibold text-[#5B5675]">· Any distance</span></span>
      <ChevronDown className="h-4 w-4 shrink-0 text-[#5B5675]" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="any">All cities</SelectItem>
      {CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
    </SelectContent>
  </Select>
);

const BusinessCard = ({ b, i, onOpen }) => (
  <button onClick={() => onOpen(b)} data-testid={`business-card-${b.user_id}`} style={{ animationDelay: `${i * 60}ms` }}
    className="rise card-shadow relative w-full overflow-hidden rounded-[26px] bg-gradient-to-br from-[#6C4CF1] to-[#3B25A8] p-4 text-left transition-transform active:scale-[.98]">
    <span className="absolute -right-12 -top-12 h-[190px] w-[190px] rounded-full border-[26px] border-white/15" />
    <div className="relative flex items-center gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-[14px] bg-white text-lg font-extrabold text-[#6C4CF1]">{b.logo ? <img src={b.logo} alt="" className="h-full w-full object-cover" /> : b.company[0]}</span>
      <div className="min-w-0"><p className="truncate font-extrabold">{b.company}</p><p className="truncate text-xs text-white/80">{b.industry} · {b.city}</p></div>
    </div>
    <div className="relative mt-3 flex flex-wrap gap-1.5">
      <span className="inline-flex h-6 items-center rounded-full bg-white/20 px-2.5 text-[11px] font-bold">Needs: {PLAN_BY_ID[b.need_plan]?.label}</span>
      <span className="inline-flex h-6 items-center rounded-full bg-white/20 px-2.5 text-[11px] font-bold">Budget {b.budget}</span>
    </div>
  </button>
);

const Businesses = () => {
  const { api } = useMe();
  const [list, setList] = useState(null);
  const [open, setOpen] = useState(null);
  useEffect(() => { api.get("/businesses").then((r) => setList(r.data)); }, [api]);
  if (!list) return <div className="grid place-items-center py-16"><Loader2 className="h-7 w-7 animate-spin" /></div>;
  if (!list.length) return <Empty icon={Store} title="No businesses yet" text="Brands that join and set up a profile show up here." testid="businesses-empty" />;
  return (
    <>
      <p className="mb-3 text-xs text-white/75">{list.length} businesses are looking for faces. Set up a creator profile so they can send you offers.</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="business-grid">{list.map((b, i) => <BusinessCard key={b.user_id} b={b} i={i} onOpen={setOpen} />)}</div>
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="rounded-[28px] border-white/10 text-white" data-testid="business-detail-dialog">
          {open && (<>
            <DialogHeader><DialogTitle className="text-xl font-extrabold text-white">{open.company}</DialogTitle></DialogHeader>
            <p className="text-sm text-white/80">{open.industry} · {open.city}</p>
            <p className="text-sm">Usually hires: <b>{PLAN_BY_ID[open.need_plan]?.label}</b> · Budget <b>{open.budget}</b></p>
            {open.languages?.length > 0 && <p className="text-sm">Languages: {open.languages.join(", ")}</p>}
            {open.website && <p className="truncate text-sm text-white/70">{open.website}</p>}
          </>)}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default function Discover({ search = false }) {
  const { me, api } = useMe();
  const { openPlus } = useOutletContext();
  const [tab, setTab] = useState("creators");
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sort, setSort] = useState("recommended");
  const [list, setList] = useState(null);
  const [saved, setSaved] = useState([]);

  const load = useCallback(async () => {
    const params = { sort, q, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) };
    const { data } = await api.get("/creators", { params });
    setList(data);
  }, [api, filters, sort, q]);

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  useEffect(() => { api.get("/saved/ids").then((r) => setSaved(r.data)); }, [api]);

  const toggleSave = async (id) => {
    const on = saved.includes(id);
    setSaved((s) => (on ? s.filter((x) => x !== id) : [...s, id]));
    await (on ? api.delete(`/saved/${id}`) : api.post(`/saved/${id}`));
    toast.success(on ? "Removed from saved" : "Saved");
  };

  return (
    <div data-testid={search ? "search-page" : "home-page"}>
      <Banner me={me} openPlus={openPlus} />
      {search && (
        <div className="relative mb-3">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" />
          <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, city or category" className="rounded-full border-[1.5px] border-white/30 bg-white/15 pl-11 font-semibold" data-testid="discover-search-input" />
        </div>
      )}
      {!search && <Seg value={tab} onChange={setTab} options={[["creators", "Creators", Users], ["businesses", "Businesses", Store]]} testid="discover-tabs" />}
      {tab === "businesses" && !search ? <div className="mt-4"><Businesses /></div> : (
        <>
          <div className="mt-2 flex gap-2">
            <FilterSheet filters={filters} onApply={setFilters} />
            <CityPill city={filters.city} onChange={(city) => setFilters((f) => ({ ...f, city }))} />
          </div>
          <div className="no-scrollbar -mx-4 mt-3 flex items-center gap-2 overflow-x-auto px-4">
            {[{ id: "" }, ...CATEGORIES].map((c) => (
              <button key={c.id || "all"} onClick={() => setFilters((f) => ({ ...f, category: c.id }))} data-testid={`category-chip-${(c.id || "all").toLowerCase().replace(/ /g, "-")}`}
                className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-bold transition-colors ${filters.category === c.id ? "bg-white text-[#3B25A8]" : "bg-white/15 text-white hover:bg-white/25"}`}>
                {c.icon && <c.icon className="h-3.5 w-3.5" />}{c.id || "All"}
              </button>
            ))}
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="h-9 w-auto shrink-0 gap-1 rounded-full border-0 bg-white/15 px-3.5 text-[13px] font-bold" data-testid="sort-select">
                <span>{{ recommended: "Recommended", rating: "Top rated", price_asc: "Price ↑", price_desc: "Price ↓", newest: "Newest" }[sort]}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recommended">Recommended</SelectItem>
                <SelectItem value="rating">Top rated</SelectItem>
                <SelectItem value="price_asc">Price: low to high</SelectItem>
                <SelectItem value="price_desc">Price: high to low</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {list && <p className="mt-3 text-xs text-white/75" data-testid="discover-count">{list.length} creators{filters.city ? ` in ${filters.city}` : ""}. Tap one to see prices and hire them. Profiles marked Sample are examples.</p>}
          {list === null ? <div className="grid place-items-center py-20"><Loader2 className="h-7 w-7 animate-spin" /></div>
            : list.length === 0 ? (
              <div className="mt-4"><Empty icon={SearchX} title="No creators match" text="Try another city or clear your filters." testid="discover-empty"
                action={<button className="mt-4 rounded-full bg-white px-5 py-2 text-sm font-bold text-[#3B25A8]" onClick={() => { setFilters(EMPTY_FILTERS); setQ(""); }}>Clear filters</button>} /></div>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4" data-testid="creator-grid">
                {list.map((c, i) => <CreatorCard key={c.user_id} c={c} index={i} saved={saved.includes(c.user_id)} onToggleSave={toggleSave} />)}
              </div>
            )}
        </>
      )}
    </div>
  );
}
