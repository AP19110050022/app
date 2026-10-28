import { useCallback, useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Search, Plus, Loader2, Clapperboard, Briefcase, Clock, SearchX } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreatorCard } from "@/components/CreatorCard";
import { FilterSheet, EMPTY_FILTERS } from "@/components/FilterSheet";
import { CATEGORIES } from "@/constants/options";
import { useMe } from "@/context/MeContext";

const Welcome = ({ me, openPlus }) => {
  if (me.creator?.status === "pending") {
    return (
      <div className="rise mb-8 flex items-center gap-3 rounded-3xl border border-amber-200 bg-amber-50 p-5" data-testid="creator-pending-banner">
        <Clock className="h-6 w-6 text-amber-600" />
        <p className="text-sm text-amber-900">Your creator profile is under review. You'll get a notification once it's live.</p>
      </div>
    );
  }
  if (me.creator || me.business) return null;
  return (
    <div className="rise relative mb-8 overflow-hidden rounded-3xl brand-gradient p-6 text-white sm:p-8" data-testid="welcome-banner">
      <div className="grain absolute inset-0" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold">Welcome, {me.user.name?.split(" ")[0]}!</h2>
          <p className="mt-1 max-w-md text-sm text-white/80">Tap <b>+</b> to become a creator and get hired, or set up your business to send offers.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={openPlus} data-testid="welcome-plus-button" className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-violet-700 transition-transform hover:scale-105">
            <Plus className="h-4 w-4" /> Get started
          </button>
        </div>
      </div>
      <div className="relative mt-5 flex gap-4 text-xs text-white/80">
        <span className="flex items-center gap-1.5"><Clapperboard className="h-4 w-4" />Creator: 3 steps</span>
        <span className="flex items-center gap-1.5"><Briefcase className="h-4 w-4" />Business: 2 steps</span>
      </div>
    </div>
  );
};

export default function Discover({ search = false }) {
  const { me, api } = useMe();
  const { openPlus } = useOutletContext();
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

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => { api.get("/saved/ids").then((r) => setSaved(r.data)); }, [api]);

  const toggleSave = async (id) => {
    const on = saved.includes(id);
    setSaved((s) => (on ? s.filter((x) => x !== id) : [...s, id]));
    await (on ? api.delete(`/saved/${id}`) : api.post(`/saved/${id}`));
    toast.success(on ? "Removed from shortlist" : "Added to shortlist");
  };

  return (
    <div data-testid={search ? "search-page" : "home-page"}>
      {!search && <Welcome me={me} openPlus={openPlus} />}
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">{search ? "Search creators" : "Discover creators"}</h1>
        <p className="text-sm text-slate-500">Find the right face for your next reel, ad or campaign.</p>
      </div>
      <div className="sticky top-[65px] z-20 -mx-4 mt-5 bg-slate-50/90 px-4 py-3 backdrop-blur lg:top-0 lg:mx-0 lg:px-0">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input autoFocus={search} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, city or category…" className="h-11 rounded-full border-slate-200 bg-white pl-11" data-testid="discover-search-input" />
          </div>
          <FilterSheet filters={filters} onApply={setFilters} />
        </div>
        <div className="no-scrollbar mt-3 flex items-center gap-2 overflow-x-auto">
          <button onClick={() => setFilters((f) => ({ ...f, category: "" }))} data-testid="category-chip-all"
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${!filters.category ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-violet-50"}`}>All</button>
          {CATEGORIES.map((c) => (
            <button key={c.id} onClick={() => setFilters((f) => ({ ...f, category: f.category === c.id ? "" : c.id }))} data-testid={`category-chip-${c.id.toLowerCase().replace(/ /g, "-")}`}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${filters.category === c.id ? "bg-violet-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-violet-50"}`}>
              <c.icon className="h-3.5 w-3.5" />{c.id}
            </button>
          ))}
          <div className="ml-auto shrink-0 pl-2">
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="h-9 w-[170px] rounded-full bg-white" data-testid="sort-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recommended">Recommended</SelectItem>
                <SelectItem value="rating">Top rated</SelectItem>
                <SelectItem value="price_asc">Price: low to high</SelectItem>
                <SelectItem value="price_desc">Price: high to low</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      {list === null ? (
        <div className="grid place-items-center py-20"><Loader2 className="h-7 w-7 animate-spin text-violet-600" /></div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center" data-testid="discover-empty">
          <SearchX className="h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold">No creators match these filters</p>
          <button className="mt-2 text-sm text-violet-700" onClick={() => { setFilters(EMPTY_FILTERS); setQ(""); }}>Clear filters</button>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4" data-testid="creator-grid">
          {list.map((c, i) => <CreatorCard key={c.user_id} c={c} index={i} saved={saved.includes(c.user_id)} onToggleSave={toggleSave} />)}
        </div>
      )}
      {!search && me.creator && (
        <p className="mt-10 text-center text-sm text-slate-500">Want to update your rates? <Link to="/app/setup/creator" className="font-semibold text-violet-700">Edit creator profile</Link></p>
      )}
    </div>
  );
}
