import { useState } from "react";
import { SlidersHorizontal, RotateCcw } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ChipSelect } from "@/components/ChipSelect";
import { CATEGORIES, LANGUAGES, GENDERS, PLANS } from "@/constants/options";
import { inr } from "@/lib/api";

export const EMPTY_FILTERS = { category: "", city: "", language: "", plan: "", gender: "", min_price: 0, max_price: 0 };
const MAX = 100000;

const Section = ({ title, children }) => (
  <div className="space-y-2.5">
    <p className="text-xs font-bold uppercase tracking-wider text-white/60">{title}</p>
    {children}
  </div>
);

export const FilterSheet = ({ filters, onApply }) => {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(filters);
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));
  const count = Object.entries(filters).filter(([k, v]) => v && k !== "city").length;
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
          <Section title="Category"><ChipSelect options={CATEGORIES} value={f.category} onChange={set("category")} testid="filter-category" /></Section>
          <Section title="Plan"><ChipSelect options={PLANS.map((p) => p.label)} value={planLabel} onChange={(l) => set("plan")(PLANS.find((p) => p.label === l)?.id || "")} testid="filter-plan" /></Section>
          <Section title={`Price${f.plan ? ` (${planLabel})` : " per video"}: ${inr(f.min_price)} – ${f.max_price ? inr(f.max_price) : "Any"}`}>
            <Slider min={0} max={MAX} step={500} value={[f.min_price, f.max_price || MAX]}
              onValueChange={([a, b]) => setF((p) => ({ ...p, min_price: a, max_price: b >= MAX ? 0 : b }))} data-testid="filter-price-slider" />
          </Section>
          <Section title="Language"><ChipSelect options={LANGUAGES} value={f.language} onChange={set("language")} testid="filter-language" /></Section>
          <Section title="Gender"><ChipSelect options={GENDERS} value={f.gender} onChange={set("gender")} testid="filter-gender" /></Section>
        </div>
        <div className="flex gap-3 px-6 py-4">
          <Button variant="ghost" className="gap-2 rounded-full text-white" onClick={() => setF({ ...EMPTY_FILTERS, city: f.city })} data-testid="filters-reset-button"><RotateCcw className="h-4 w-4" />Reset</Button>
          <button className="cta h-12 flex-1 rounded-full font-bold" onClick={() => { onApply(f); setOpen(false); }} data-testid="filters-apply-button">Show creators</button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
