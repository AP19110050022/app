import { useState } from "react";
import { SlidersHorizontal, RotateCcw } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ChipSelect } from "@/components/ChipSelect";
import { CATEGORIES, CITIES, LANGUAGES, GENDERS, PLANS } from "@/constants/options";
import { inr } from "@/lib/api";

export const EMPTY_FILTERS = { category: "", city: "", language: "", plan: "", gender: "", min_price: 0, max_price: 0 };
const MAX = 100000;

const Section = ({ title, children }) => (
  <div className="space-y-2.5">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
    {children}
  </div>
);

export const FilterSheet = ({ filters, onApply }) => {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(filters);
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));
  const count = Object.entries(filters).filter(([, v]) => v).length;
  const planOpts = PLANS.map((p) => p.label);
  const planLabel = PLANS.find((p) => p.id === f.plan)?.label || "";

  return (
    <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (o) setF(filters); }}>
      <SheetTrigger asChild>
        <Button variant="outline" className="h-11 gap-2 rounded-full border-slate-200 bg-white px-4" data-testid="open-filters-button">
          <SlidersHorizontal className="h-4 w-4" /> Filters
          {count > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-violet-600 px-1.5 text-xs text-white" data-testid="filters-count">{count}</span>}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md" data-testid="filters-sheet">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle className="font-heading text-xl">Filter creators</SheetTitle>
        </SheetHeader>
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <Section title="Category"><ChipSelect options={CATEGORIES} value={f.category} onChange={set("category")} testid="filter-category" /></Section>
          <Section title="Plan"><ChipSelect options={planOpts} value={planLabel} onChange={(l) => set("plan")(PLANS.find((p) => p.label === l)?.id || "")} testid="filter-plan" /></Section>
          <Section title={`Price${f.plan ? ` (${planLabel})` : " per video"}: ${inr(f.min_price)} – ${f.max_price ? inr(f.max_price) : "Any"}`}>
            <Slider
              min={0} max={MAX} step={500}
              value={[f.min_price, f.max_price || MAX]}
              onValueChange={([a, b]) => setF((p) => ({ ...p, min_price: a, max_price: b >= MAX ? 0 : b }))}
              data-testid="filter-price-slider"
            />
          </Section>
          <Section title="City"><ChipSelect options={CITIES} value={f.city} onChange={set("city")} testid="filter-city" /></Section>
          <Section title="Language"><ChipSelect options={LANGUAGES} value={f.language} onChange={set("language")} testid="filter-language" /></Section>
          <Section title="Gender"><ChipSelect options={GENDERS} value={f.gender} onChange={set("gender")} testid="filter-gender" /></Section>
        </div>
        <div className="flex gap-3 border-t px-6 py-4">
          <Button variant="ghost" className="gap-2" onClick={() => setF(EMPTY_FILTERS)} data-testid="filters-reset-button"><RotateCcw className="h-4 w-4" />Reset</Button>
          <Button className="flex-1 rounded-full" onClick={() => { onApply(f); setOpen(false); }} data-testid="filters-apply-button">Show creators</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
