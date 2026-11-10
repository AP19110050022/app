import { useState } from "react";
import { SlidersHorizontal, RotateCcw, MapPin, ChevronRight } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ChipSelect } from "@/components/ChipSelect";
import { LocationPicker, locLabel } from "@/components/LocationPicker";
import { CATEGORIES, LANGUAGES, GENDERS, PLANS } from "@/constants/options";

export const SORTS = [["recommended", "Recommended"], ["nearest", "Nearest first"], ["price_asc", "Price: low to high"], ["price_desc", "Price: high to low"], ["rating", "Top rated"], ["newest", "Newest"]];

export const LOC_KEYS = ["city", "state", "lat", "lng", "radius_km"];
export const EMPTY_FILTERS = { category: "", city: "", state: "", lat: null, lng: null, radius_km: 0, language: "", plan: "", gender: "", sort: "recommended" };
const RADII = [[0, "Only this city"], [10, "10 km"], [25, "25 km"], [50, "50 km"], [100, "100 km"], [250, "250 km"]];

export const RadiusChips = ({ value, onChange, testid = "radius" }) => (
  <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" data-testid={testid}>
    {RADII.map(([km, l]) => (
      <button key={km} type="button" onClick={() => onChange(km)} data-testid={`${testid}-${km}`}
        className={`h-8 shrink-0 rounded-full px-3.5 text-xs font-bold transition-colors ${value === km ? "bg-white text-[#3B25A8]" : "bg-white/15 hover:bg-white/25"}`}>{km ? `+ ${l}` : l}</button>
    ))}
  </div>
);

const Section = ({ title, children }) => (
  <div className="space-y-2.5">
    <p className="text-xs font-bold uppercase tracking-wider text-white/60">{title}</p>
    {children}
  </div>
);

export const FilterSheet = ({ filters, onApply }) => {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(filters);
  const [pick, setPick] = useState(false);
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));
  const count = Object.entries(filters).filter(([k, v]) => v && !LOC_KEYS.includes(k) && !(k === "sort" && v === "recommended")).length;
  const planLabel = PLANS.find((p) => p.id === f.plan)?.label || "";

  return (
    <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (o) setF(filters); }}>
      <SheetTrigger asChild>
        <button className="glass relative grid h-11 w-11 shrink-0 place-items-center rounded-full text-white transition-transform active:scale-90" data-testid="open-filters-button" aria-label="Filters">
          <SlidersHorizontal className="h-5 w-5" />
          {count > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full border-2 border-[#3B25A8] bg-[#FF4D8D] px-1 text-[10px] font-extrabold" data-testid="filters-count">{count}</span>}
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="mx-auto flex max-h-[88vh] max-w-xl flex-col rounded-t-[28px] border-white/10 p-0 text-white" data-testid="filters-sheet">
        <SheetHeader className="px-6 pb-2 pt-5">
          <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-white/25" />
          <SheetTitle className="font-heading text-xl text-white">Filters</SheetTitle>
        </SheetHeader>
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-3">
          <Section title="Location">
            <button type="button" onClick={() => setPick(true)} data-testid="filter-location-button" className="glass flex h-12 w-full items-center gap-2 rounded-2xl px-4 text-left">
              <MapPin className="h-4 w-4 shrink-0" /><span className="flex-1 truncate font-bold">{locLabel(f)}</span><span className="text-xs text-white/70">Change</span><ChevronRight className="h-4 w-4" />
            </button>
            {f.city && <RadiusChips value={f.radius_km} onChange={set("radius_km")} testid="filter-radius" />}
            <LocationPicker open={pick} onOpenChange={setPick} onPick={(l) => setF((p) => ({ ...p, city: l?.city || "", state: l?.state || "", lat: l?.lat ?? null, lng: l?.lng ?? null, radius_km: l?.city ? 50 : 0 }))} />
          </Section>
          <Section title="Category"><ChipSelect options={CATEGORIES} value={f.category} onChange={set("category")} testid="filter-category" /></Section>
          <Section title="Plan"><ChipSelect options={PLANS.map((p) => p.label)} value={planLabel} onChange={(l) => set("plan")(PLANS.find((p) => p.label === l)?.id || "")} testid="filter-plan" /></Section>
          <Section title="Sort by">
            <ChipSelect options={SORTS.filter(([k]) => k !== "nearest" || f.lat != null).map(([, l]) => l)} value={SORTS.find(([k]) => k === f.sort)?.[1]} onChange={(l) => set("sort")(SORTS.find(([, x]) => x === l)?.[0] || "recommended")} testid="filter-sort" />
          </Section>
          <Section title="Language"><ChipSelect options={LANGUAGES} value={f.language} onChange={set("language")} testid="filter-language" /></Section>
          <Section title="Gender"><ChipSelect options={GENDERS} value={f.gender} onChange={set("gender")} testid="filter-gender" /></Section>
        </div>
        <div className="flex gap-3 px-6 py-4">
          <Button variant="ghost" className="gap-2 rounded-full text-white" onClick={() => setF(EMPTY_FILTERS)} data-testid="filters-reset-button"><RotateCcw className="h-4 w-4" />Reset</Button>
          <button className="cta h-12 flex-1 rounded-full font-bold" onClick={() => { onApply(f); setOpen(false); }} data-testid="filters-apply-button">Show presenters</button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
