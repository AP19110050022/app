import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Loader2, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChipSelect } from "@/components/ChipSelect";
import { ImagePicker } from "@/components/ImagePicker";
import { Stepper, Field } from "@/components/Stepper";
import { CITIES, LANGUAGES, INDUSTRIES, BUDGETS, PLANS } from "@/constants/options";
import { useMe } from "@/context/MeContext";
import { errMsg } from "@/lib/api";

const BLANK = { company: "", logo: "", industry: "", city: "", website: "", phone: "", need_plan: "per_video", budget: "", languages: [] };

export default function BusinessSetup() {
  const { me, api, refresh } = useMe();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editing = !!me.business;
  const [f, setF] = useState({ ...BLANK, ...(me.business || {}) });
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v?.target ? v.target.value : v }));
  const valid0 = f.company.trim().length >= 2 && f.industry && f.city;

  const save = async () => {
    setBusy(true);
    try {
      await api.put("/businesses/me", f);
      await refresh();
      toast.success(editing ? "Business profile updated" : "Business profile ready! Start finding creators.");
      const next = params.get("next");
      navigate(next && next.startsWith("/app") ? next : editing ? "/app/profile" : "/app/search");
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-2xl" data-testid="business-setup-page">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-sky-500 text-white shadow-lg"><Briefcase className="h-6 w-6" /></span>
        <div>
          <h1 className="font-heading text-2xl font-bold sm:text-3xl">{editing ? "Edit business profile" : "Hire as a business"}</h1>
          <p className="text-sm text-slate-500">2 quick steps and you can send offers.</p>
        </div>
      </div>
      <Stepper steps={["Your business", "What you need"]} current={step} />
      <div className="mt-6 space-y-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8">
        {step === 0 ? (
          <>
            <ImagePicker value={f.logo} onChange={set("logo")} testid="business-logo" round={false} label="Logo (optional)" />
            <Field label="Company / brand name"><Input value={f.company} onChange={set("company")} data-testid="business-company-input" /></Field>
            <Field label="Industry"><ChipSelect options={INDUSTRIES} value={f.industry} onChange={set("industry")} testid="business-industry" /></Field>
            <Field label="City">
              <Input list="bcities" value={f.city} onChange={set("city")} placeholder="Type or pick your city" data-testid="business-city-input" />
              <datalist id="bcities">{CITIES.map((c) => <option key={c} value={c} />)}</datalist>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Website or Instagram"><Input value={f.website} onChange={set("website")} placeholder="https://… or @brand" data-testid="business-website-input" /></Field>
              <Field label="Phone (private)"><Input value={f.phone} onChange={set("phone")} placeholder="+91…" data-testid="business-phone-input" /></Field>
            </div>
          </>
        ) : (
          <>
            <Field label="Which plan do you usually need?">
              <div className="grid gap-3 sm:grid-cols-3">
                {PLANS.map((p) => (
                  <button type="button" key={p.id} onClick={() => set("need_plan")(p.id)} data-testid={`business-need-${p.id}`}
                    className={`rounded-2xl border p-4 text-left transition-[border-color,background-color] ${f.need_plan === p.id ? "border-indigo-600 bg-indigo-50" : "border-slate-200 hover:border-indigo-300"}`}>
                    <p.icon className={`h-5 w-5 ${f.need_plan === p.id ? "text-indigo-600" : "text-slate-400"}`} />
                    <p className="mt-2 font-semibold">{p.label}</p>
                    <p className="text-xs text-slate-500">{p.short}</p>
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Typical budget"><ChipSelect options={BUDGETS} value={f.budget} onChange={set("budget")} testid="business-budget" /></Field>
            <Field label="Preferred languages"><ChipSelect multi options={LANGUAGES} value={f.languages} onChange={set("languages")} testid="business-languages" /></Field>
          </>
        )}
        <div className="flex justify-between pt-2">
          <Button variant="ghost" className="gap-2" disabled={step === 0} onClick={() => setStep(0)} data-testid="bsetup-back-button"><ArrowLeft className="h-4 w-4" />Back</Button>
          {step === 0 ? (
            <Button className="gap-2 rounded-full px-6" disabled={!valid0} onClick={() => setStep(1)} data-testid="bsetup-next-button">Next<ArrowRight className="h-4 w-4" /></Button>
          ) : (
            <Button className="gap-2 rounded-full px-6" disabled={!f.budget || busy} onClick={save} data-testid="bsetup-submit-button">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{editing ? "Save changes" : "Finish"}</Button>
          )}
        </div>
      </div>
    </div>
  );
}
