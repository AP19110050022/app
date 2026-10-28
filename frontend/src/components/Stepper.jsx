import { Check } from "lucide-react";

export const Stepper = ({ steps, current }) => (
  <div className="flex gap-1.5" data-testid="form-stepper">
    {steps.map((s, i) => <span key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= current ? "bg-white" : "bg-white/20"}`} />)}
  </div>
);

export const Field = ({ label, hint, children }) => (
  <div className="space-y-2">
    <p className="text-[13px] font-bold text-white/85">{label}</p>
    {children}
    {hint && <p className="text-xs text-white/60">{hint}</p>}
  </div>
);

export const Done = Check;
