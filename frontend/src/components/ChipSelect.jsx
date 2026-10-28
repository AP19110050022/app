import { Check } from "lucide-react";

export const ChipSelect = ({ options, value, onChange, multi = false, testid, max, tiles = false }) => {
  const isOn = (o) => (multi ? (value || []).includes(o) : value === o);
  const toggle = (o) => {
    if (!multi) return onChange(value === o ? "" : o);
    const cur = value || [];
    if (cur.includes(o)) return onChange(cur.filter((x) => x !== o));
    if (max && cur.length >= max) return;
    onChange([...cur, o]);
  };
  return (
    <div className={tiles ? "grid grid-cols-2 gap-2.5" : "flex flex-wrap gap-2"} data-testid={testid}>
      {options.map((opt) => {
        const o = typeof opt === "string" ? opt : opt.id;
        const Icon = typeof opt === "string" ? null : opt.icon;
        const on = isOn(o);
        return (
          <button
            type="button"
            key={o}
            onClick={() => toggle(o)}
            data-testid={`${testid}-${o.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
            className={`inline-flex items-center gap-2 border font-semibold transition-[background-color,color,transform] duration-200 active:scale-95 ${
              tiles ? "min-h-[56px] rounded-2xl px-4 text-left text-sm" : "rounded-full px-3.5 py-1.5 text-sm"
            } ${on ? "border-white bg-white text-[#3B25A8] shadow-lg shadow-black/20" : "border-white/25 bg-white/10 text-white hover:bg-white/20"}`}
          >
            {on && multi ? <Check className="h-4 w-4" /> : Icon ? <Icon className="h-4 w-4" /> : null}
            {o}
          </button>
        );
      })}
    </div>
  );
};
