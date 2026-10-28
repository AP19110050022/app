import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChipSelect } from "@/components/ChipSelect";
import { ImagePicker } from "@/components/ImagePicker";
import { Field } from "@/components/Stepper";
import { SetupFrame } from "@/components/SetupFrame";
import { CATEGORIES, CITIES, LANGUAGES, GENDERS, PLANS } from "@/constants/options";
import { useMe } from "@/context/MeContext";
import { errMsg } from "@/lib/api";

const BLANK = { name: "", photo: "", city: "", category: "", gender: "", languages: [], bio: "", intro_video: "", samples: [], instagram: "", youtube: "", followers: 0, phone: "", rate_per_video: "", rate_part_time: "", rate_full_time: "" };
const HINT = { per_video: "Most creators start between ₹500 and ₹3,000", part_time: "Usually 6–8× your per-video price", full_time: "Usually 15–20× your per-video price" };
const TITLES = [["Tell brands who you are", "A clear face photo works best."], ["Show your work", "Links to your intro video, reels and socials. All optional."], ["Set your prices", "Brands see “from ₹…” on your card. 10% service fee on paid deals."]];

export default function CreatorSetup() {
  const { me, api, refresh } = useMe();
  const navigate = useNavigate();
  const editing = !!me.creator;
  const [f, setF] = useState(() => ({ ...BLANK, name: me.user.name || "", photo: me.user.image_url || "", ...(me.creator || {}) }));
  const [upi, setUpi] = useState(me.user.payout_upi || "");
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v?.target ? v.target.value : v }));

  const valid = [
    f.name.trim().length >= 2 && f.photo && f.city && f.category && f.gender && f.languages.length,
    true,
    Number(f.rate_per_video) >= 100 && Number(f.rate_part_time) >= 500 && Number(f.rate_full_time) >= 500,
  ];

  const save = async () => {
    setBusy(true);
    try {
      await api.put("/creators/me", {
        ...f, followers: Number(f.followers) || 0, samples: f.samples.filter(Boolean),
        rate_per_video: Number(f.rate_per_video), rate_part_time: Number(f.rate_part_time), rate_full_time: Number(f.rate_full_time),
      });
      if (upi !== (me.user.payout_upi || "")) await api.patch("/me", { payout_upi: upi });
      await refresh();
      toast.success(editing ? "Profile updated" : "Profile submitted for review");
      navigate("/app/profile");
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <SetupFrame testid="creator-setup-page" step={step} total={3} title={TITLES[step][0]} sub={TITLES[step][1]}
      onBack={() => (step ? setStep(step - 1) : navigate(-1))} disabled={!valid[step]} busy={busy}
      cta={step < 2 ? "Continue" : editing ? "Save changes" : "Create creator profile"} onNext={() => (step < 2 ? setStep(step + 1) : save())}>
      {step === 0 && (
        <>
          <ImagePicker value={f.photo} onChange={set("photo")} testid="creator-photo" label="Profile photo" />
          <Field label="Your name"><Input value={f.name} onChange={set("name")} data-testid="creator-name-input" /></Field>
          <Field label="City">
            <Input list="cities" value={f.city} onChange={set("city")} placeholder="Type or pick your city" data-testid="creator-city-input" />
            <datalist id="cities">{CITIES.map((c) => <option key={c} value={c} />)}</datalist>
          </Field>
          <Field label="What do you present?"><ChipSelect tiles options={CATEGORIES} value={f.category} onChange={set("category")} testid="creator-category" /></Field>
          <Field label="Languages"><ChipSelect multi options={LANGUAGES} value={f.languages} onChange={set("languages")} testid="creator-languages" /></Field>
          <Field label="Gender"><ChipSelect options={GENDERS} value={f.gender} onChange={set("gender")} testid="creator-gender" /></Field>
        </>
      )}
      {step === 1 && (
        <>
          <Field label="Short bio"><Textarea rows={3} maxLength={500} value={f.bio} onChange={set("bio")} placeholder="What makes you a great face for brands?" data-testid="creator-bio-input" /></Field>
          <Field label="Intro video link" hint="30–60s of you on camera (YouTube, Instagram or Drive)"><Input value={f.intro_video} onChange={set("intro_video")} placeholder="https://…" data-testid="creator-intro-input" /></Field>
          <Field label={`Work samples (${f.samples.length}/6)`}>
            <div className="space-y-2">
              {f.samples.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={s} onChange={(e) => set("samples")(f.samples.map((x, j) => (j === i ? e.target.value : x)))} placeholder="https://…" data-testid={`creator-sample-input-${i}`} />
                  <button type="button" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/15" onClick={() => set("samples")(f.samples.filter((_, j) => j !== i))} data-testid={`creator-sample-remove-${i}`}><X className="h-4 w-4" /></button>
                </div>
              ))}
              {f.samples.length < 6 && <button type="button" className="glass flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold" onClick={() => set("samples")([...f.samples, ""])} data-testid="creator-sample-add"><Plus className="h-4 w-4" />Add sample link</button>}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Instagram"><Input value={f.instagram} onChange={set("instagram")} placeholder="@yourname" data-testid="creator-instagram-input" /></Field>
            <Field label="YouTube"><Input value={f.youtube} onChange={set("youtube")} placeholder="@channel" data-testid="creator-youtube-input" /></Field>
            <Field label="Total followers"><Input type="number" min={0} value={f.followers} onChange={set("followers")} data-testid="creator-followers-input" /></Field>
            <Field label="Phone (private)"><Input value={f.phone} onChange={set("phone")} placeholder="+91…" data-testid="creator-phone-input" /></Field>
          </div>
        </>
      )}
      {step === 2 && (
        <>
          {PLANS.map((p) => (
            <div key={p.id} className="glass rounded-[22px] p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-white/50"><p.icon className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1"><p className="font-extrabold">{p.label}</p><p className="text-xs text-white/70">{p.bullets[0]} · {p.bullets[1]}</p></div>
              </div>
              <div className="relative mt-3">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-white/70">₹</span>
                <Input type="number" min={100} className="pl-8 font-bold" value={f[p.rate]} onChange={set(p.rate)} placeholder={`Price ${p.unit}`} data-testid={`creator-rate-${p.id}`} />
              </div>
              <p className="mt-1.5 text-xs text-white/60">{HINT[p.id]}</p>
            </div>
          ))}
          <Field label="Payout UPI ID" hint="Where your earnings are sent. You can change it later."><Input value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="name@upi" data-testid="creator-upi-input" /></Field>
          {!editing && <p className="text-xs text-white/60">Your profile goes live after a quick review by our team.</p>}
        </>
      )}
    </SetupFrame>
  );
}
