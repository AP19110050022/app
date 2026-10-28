import { Check } from "lucide-react";

export const ChipSelect = ({ options, value, onChange, multi = false, testid, max }) => {
  const isOn = (o) => (multi ? (value || []).includes(o) : value === o);
  const toggle = (o) => {
    if (!multi) return onChange(value === o ? "" : o);
    const cur = value || [];
    if (cur.includes(o)) return onChange(cur.filter((x) => x !== o));
    if (max && cur.length >= max) return;
    onChange([...cur, o]);
  };
  return (
    <div className="flex flex-wrap gap-2" data-testid={testid}>
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
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-[background-color,color,border-color,transform] duration-200 active:scale-95 ${
              on ? "border-violet-600 bg-violet-600 text-white shadow-md shadow-violet-500/25" : "border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50"
            }`}
          >
            {on && multi ? <Check className="h-3.5 w-3.5" /> : Icon ? <Icon className="h-3.5 w-3.5" /> : null}
            {o}
          </button>
        );
      })}
    </div>
  );
};
