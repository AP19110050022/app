import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { UtensilsCrossed, Shirt, Sparkles, Dumbbell, Home, GraduationCap, Cpu, ShoppingBag, Megaphone, MoreHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ChipSelect } from "@/components/ChipSelect";
import { ImagePicker } from "@/components/ImagePicker";
import { Field } from "@/components/Stepper";
import { SetupFrame } from "@/components/SetupFrame";
import { CITIES, LANGUAGES, BUDGETS, PLANS } from "@/constants/options";
import { useMe } from "@/context/MeContext";
import { errMsg } from "@/lib/api";

const INDUSTRY_TILES = [
  { id: "Restaurant & cafe", icon: UtensilsCrossed }, { id: "Fashion store", icon: Shirt }, { id: "Salon & beauty", icon: Sparkles },
  { id: "Fitness & gym", icon: Dumbbell }, { id: "Real estate", icon: Home }, { id: "Education", icon: GraduationCap },
  { id: "Tech & startup", icon: Cpu }, { id: "E-commerce", icon: ShoppingBag }, { id: "Agency", icon: Megaphone }, { id: "Something else", icon: MoreHorizontal },
];
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
  const valid = [f.company.trim().length >= 2 && f.industry && f.city, !!f.budget];

  const save = async () => {
    setBusy(true);
    try {
      await api.put("/businesses/me", f);
      await refresh();
      toast.success(editing ? "Business profile updated" : "Business profile created. Welcome!");
      const next = params.get("next");
      navigate(next && next.startsWith("/app") ? next : editing ? "/app/profile" : "/app");
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <SetupFrame testid="business-setup-page" step={step} total={2}
      title={step === 0 ? "Set up your business" : "What do you need?"} sub={step === 0 ? "Creators see this with every offer you send." : "We'll use this to show the right creators first."}
      onBack={() => (step ? setStep(0) : navigate(-1))} disabled={!valid[step]} busy={busy}
      cta={step === 0 ? "Continue" : editing ? "Save changes" : "Create business profile"} onNext={() => (step === 0 ? setStep(1) : save())}>
      {step === 0 ? (
        <>
          <ImagePicker value={f.logo} onChange={set("logo")} testid="business-logo" round={false} label="Logo (optional)" />
          <Field label="Business name"><Input value={f.company} onChange={set("company")} data-testid="business-company-input" /></Field>
          <Field label="What type of business do you run?"><ChipSelect tiles options={INDUSTRY_TILES} value={f.industry} onChange={set("industry")} testid="business-industry" /></Field>
          <Field label="City">
            <Input list="bcities" value={f.city} onChange={set("city")} placeholder="Type or pick your city" data-testid="business-city-input" />
            <datalist id="bcities">{CITIES.map((c) => <option key={c} value={c} />)}</datalist>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Website / Instagram"><Input value={f.website} onChange={set("website")} placeholder="@brand" data-testid="business-website-input" /></Field>
            <Field label="Phone (private)"><Input value={f.phone} onChange={set("phone")} placeholder="+91…" data-testid="business-phone-input" /></Field>
          </div>
        </>
      ) : (
        <>
          <Field label="Which plan do you usually need?">
            <div className="space-y-2.5">
              {PLANS.map((p) => (
                <button type="button" key={p.id} onClick={() => set("need_plan")(p.id)} data-testid={`business-need-${p.id}`}
                  className={`flex w-full items-center gap-3 rounded-[22px] border p-4 text-left transition-colors ${f.need_plan === p.id ? "border-white bg-white text-[#3B25A8]" : "border-white/25 bg-white/10 hover:bg-white/20"}`}>
                  <p.icon className="h-6 w-6 shrink-0" />
                  <div><p className="font-extrabold">{p.label}</p><p className="text-[13px] opacity-75">{p.short}</p></div>
                </button>
              ))}
            </div>
          </Field>
          <Field label="Typical budget"><ChipSelect options={BUDGETS} value={f.budget} onChange={set("budget")} testid="business-budget" /></Field>
          <Field label="Preferred languages"><ChipSelect multi options={LANGUAGES} value={f.languages} onChange={set("languages")} testid="business-languages" /></Field>
        </>
      )}
    </SetupFrame>
  );
}
