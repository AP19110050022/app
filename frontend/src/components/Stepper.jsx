import { Check } from "lucide-react";

export const Stepper = ({ steps, current }) => (
  <div className="flex items-center gap-2" data-testid="form-stepper">
    {steps.map((s, i) => (
      <div key={s} className="flex flex-1 items-center gap-2">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold transition-colors ${i < current ? "bg-violet-600 text-white" : i === current ? "brand-gradient text-white shadow-lg shadow-violet-500/30" : "bg-slate-200 text-slate-500"}`}>
          {i < current ? <Check className="h-4 w-4" /> : i + 1}
        </span>
        <span className={`hidden text-sm font-semibold sm:block ${i === current ? "text-slate-900" : "text-slate-400"}`}>{s}</span>
        {i < steps.length - 1 && <span className={`h-0.5 flex-1 rounded ${i < current ? "bg-violet-600" : "bg-slate-200"}`} />}
      </div>
    ))}
  </div>
);

export const Field = ({ label, hint, children }) => (
  <div className="space-y-2">
    <p className="text-sm font-semibold text-slate-800">{label}</p>
    {children}
    {hint && <p className="text-xs text-slate-500">{hint}</p>}
  </div>
);
