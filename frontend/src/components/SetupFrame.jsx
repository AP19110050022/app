import { ArrowLeft, Loader2 } from "lucide-react";
import { Stepper } from "@/components/Stepper";

export const SetupFrame = ({ step, total, onBack, title, sub, children, cta, onNext, disabled, busy, testid }) => (
  <div className="mx-auto max-w-xl pb-6" data-testid={testid}>
    <div className="flex items-center gap-3">
      <button onClick={onBack} className="grid h-11 w-11 place-items-center rounded-full bg-white/15 transition-transform active:scale-90" data-testid="setup-back-button" aria-label="Back"><ArrowLeft className="h-5 w-5" /></button>
      <span className="text-sm font-bold">Step {step + 1} of {total}</span>
    </div>
    <div className="mt-4"><Stepper steps={Array.from({ length: total }, (_, i) => String(i))} current={step} /></div>
    <h1 className="rise mt-6 text-[30px] font-extrabold leading-[1.1] tracking-tight" key={`t${step}`}>{title}</h1>
    {sub && <p className="mt-2 text-[15px] text-white/75">{sub}</p>}
    <div className="rise mt-6 space-y-5" key={`b${step}`}>{children}</div>
    <button onClick={onNext} disabled={disabled || busy} data-testid={step + 1 < total ? "setup-next-button" : "setup-submit-button"}
      className="cta mt-8 flex h-[54px] w-full items-center justify-center gap-2 rounded-[27px] text-base font-extrabold transition-opacity disabled:opacity-40">
      {busy && <Loader2 className="h-4 w-4 animate-spin" />}{cta}
    </button>
  </div>
);
