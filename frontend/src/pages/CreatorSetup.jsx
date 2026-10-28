import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Loader2, Plus, X, Clapperboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChipSelect } from "@/components/ChipSelect";
import { ImagePicker } from "@/components/ImagePicker";
import { Stepper, Field } from "@/components/Stepper";
import { CATEGORIES, CITIES, LANGUAGES, GENDERS, PLANS } from "@/constants/options";
import { useMe } from "@/context/MeContext";
import { errMsg } from "@/lib/api";

const BLANK = { name: "", photo: "", city: "", category: "", gender: "", languages: [], bio: "", intro_video: "", samples: [], instagram: "", youtube: "", followers: 0, phone: "", rate_per_video: "", rate_part_time: "", rate_full_time: "" };
const HINT = { per_video: "Most creators start between ₹500 and ₹3,000", part_time: "Usually 6–8× your per-video price", full_time: "Usually 15–20× your per-video price" };

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
    <div className="mx-auto max-w-2xl" data-testid="creator-setup-page">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-lg"><Clapperboard className="h-6 w-6" /></span>
        <div>
          <h1 className="font-heading text-2xl font-bold sm:text-3xl">{editing ? "Edit creator profile" : "Become a creator"}</h1>
          <p className="text-sm text-slate-500">3 short steps. You can change everything later.</p>
        </div>
      </div>
      <Stepper steps={["Basics", "Showcase", "Rates"]} current={step} />
      <div className="mt-6 space-y-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8">
        {step === 0 && (
          <>
            <ImagePicker value={f.photo} onChange={set("photo")} testid="creator-photo" label="Profile photo (a clear face photo works best)" />
            <Field label="Full name"><Input value={f.name} onChange={set("name")} data-testid="creator-name-input" /></Field>
            <Field label="City">
              <Input list="cities" value={f.city} onChange={set("city")} placeholder="Type or pick your city" data-testid="creator-city-input" />
              <datalist id="cities">{CITIES.map((c) => <option key={c} value={c} />)}</datalist>
            </Field>
            <Field label="Category"><ChipSelect options={CATEGORIES} value={f.category} onChange={set("category")} testid="creator-category" /></Field>
            <Field label="Languages you can present in"><ChipSelect multi options={LANGUAGES} value={f.languages} onChange={set("languages")} testid="creator-languages" /></Field>
            <Field label="Gender"><ChipSelect options={GENDERS} value={f.gender} onChange={set("gender")} testid="creator-gender" /></Field>
          </>
        )}
        {step === 1 && (
          <>
            <Field label="Short bio" hint="What do you present, and what makes you a great face for brands?">
              <Textarea rows={3} maxLength={500} value={f.bio} onChange={set("bio")} data-testid="creator-bio-input" />
            </Field>
            <Field label="Intro video link" hint="A 30–60s video of you on camera (YouTube, Instagram or Drive link)">
              <Input value={f.intro_video} onChange={set("intro_video")} placeholder="https://…" data-testid="creator-intro-input" />
            </Field>
            <Field label={`Work samples (${f.samples.length}/6)`} hint="Links to reels, ads or photos of your past work">
              <div className="space-y-2">
                {f.samples.map((s, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={s} onChange={(e) => set("samples")(f.samples.map((x, j) => (j === i ? e.target.value : x)))} placeholder="https://…" data-testid={`creator-sample-input-${i}`} />
                    <Button type="button" variant="ghost" size="icon" onClick={() => set("samples")(f.samples.filter((_, j) => j !== i))} data-testid={`creator-sample-remove-${i}`}><X className="h-4 w-4" /></Button>
                  </div>
                ))}
                {f.samples.length < 6 && <Button type="button" variant="outline" className="gap-2 rounded-full" onClick={() => set("samples")([...f.samples, ""])} data-testid="creator-sample-add"><Plus className="h-4 w-4" />Add sample</Button>}
              </div>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Instagram handle"><Input value={f.instagram} onChange={set("instagram")} placeholder="@yourname" data-testid="creator-instagram-input" /></Field>
              <Field label="YouTube handle"><Input value={f.youtube} onChange={set("youtube")} placeholder="@yourchannel" data-testid="creator-youtube-input" /></Field>
              <Field label="Total followers"><Input type="number" min={0} value={f.followers} onChange={set("followers")} data-testid="creator-followers-input" /></Field>
              <Field label="Phone (private)" hint="Never shown publicly"><Input value={f.phone} onChange={set("phone")} placeholder="+91…" data-testid="creator-phone-input" /></Field>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <p className="rounded-2xl bg-violet-50 p-4 text-sm text-violet-900">Set your price for each plan. Businesses see “From ₹…” on your card and can send offers on any plan. HireMyFace keeps a 10% service fee when a deal is paid.</p>
            {PLANS.map((p) => (
              <div key={p.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center">
                <div className="flex flex-1 items-start gap-3">
                  <p.icon className="mt-0.5 h-5 w-5 text-violet-600" />
                  <div><p className="font-semibold">{p.label}</p><p className="text-xs text-slate-500">{p.bullets[0]} · {p.bullets[1]}</p><p className="text-xs text-violet-600">{HINT[p.id]}</p></div>
                </div>
                <div className="relative sm:w-44">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
                  <Input type="number" min={100} className="pl-7" value={f[p.rate]} onChange={set(p.rate)} placeholder={p.unit} data-testid={`creator-rate-${p.id}`} />
                </div>
              </div>
            ))}
            <Field label="Payout UPI ID" hint="Where we send your earnings. You can add or change it later in Profile."><Input value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="name@upi" data-testid="creator-upi-input" /></Field>
          </>
        )}
        <div className="flex justify-between pt-2">
          <Button variant="ghost" className="gap-2" disabled={step === 0} onClick={() => setStep(step - 1)} data-testid="setup-back-button"><ArrowLeft className="h-4 w-4" />Back</Button>
          {step < 2 ? (
            <Button className="gap-2 rounded-full px-6" disabled={!valid[step]} onClick={() => setStep(step + 1)} data-testid="setup-next-button">Next<ArrowRight className="h-4 w-4" /></Button>
          ) : (
            <Button className="gap-2 rounded-full px-6" disabled={!valid[2] || busy} onClick={save} data-testid="setup-submit-button">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{editing ? "Save changes" : "Submit profile"}</Button>
          )}
        </div>
      </div>
    </div>
  );
}
