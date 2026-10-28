import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ChevronRight, Crosshair, Globe2, Loader2, MapPin, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { publicApi } from "@/lib/api";

const Row = ({ icon: Icon = MapPin, title, sub, onClick, testid, chevron }) => (
  <button onClick={onClick} data-testid={testid} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-white/10">
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15"><Icon className="h-4 w-4" /></span>
    <span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-bold">{title}</span>{sub && <span className="block truncate text-xs text-white/60">{sub}</span>}</span>
    {chevron && <ChevronRight className="h-4 w-4 shrink-0 text-white/50" />}
  </button>
);

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export const locLabel = (l) => (l?.city ? `${l.city}, ${l.state}` : l?.state || "All India");

export const LocationPicker = ({ open, onOpenChange, onPick, allowArea = true }) => {
  const [q, setQ] = useState("");
  const [state, setState] = useState(null);
  const [states, setStates] = useState([]);
  const [res, setRes] = useState(null);
  const [cities, setCities] = useState([]);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setState(null);
    if (!states.length) publicApi.get("/locations/states").then((r) => setStates(r.data));
  }, [open, states.length]);

  useEffect(() => {
    if (!q.trim() || state) { setRes(null); return; }
    const t = setTimeout(() => publicApi.get("/locations/search", { params: { q } }).then((r) => setRes(r.data)), 200);
    return () => clearTimeout(t);
  }, [q, state]);

  useEffect(() => {
    if (state) { setCities([]); publicApi.get("/locations/cities", { params: { state } }).then((r) => setCities(r.data)); }
  }, [state]);

  const pick = (v) => { onPick(v); onOpenChange(false); };
  const pickCity = (c) => pick({ city: c.name, state: c.state, lat: c.lat, lng: c.lng });
  const openState = (s) => { setState(s); setQ(""); };

  const gps = () => {
    if (!navigator.geolocation) return toast.error("Location isn't available on this device");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        const { latitude: lat, longitude: lng } = p.coords;
        const { data } = await publicApi.get("/locations/nearest", { params: { lat, lng } });
        setLocating(false);
        pick({ city: data.name, state: data.state, lat, lng });
      },
      () => { setLocating(false); toast.error("Allow location access, or search for your city"); },
      { timeout: 10000 },
    );
  };

  const shown = state ? cities.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())) : res?.cities || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] max-w-md flex-col gap-3 rounded-[28px] border-white/10 bg-gradient-to-b from-[#4530C8] to-[#2A1B7A] p-5 text-white" data-testid="location-picker">
        <DialogHeader className="flex-row items-center gap-2 space-y-0 text-left">
          {state && <button onClick={() => { setState(null); setQ(""); }} className="grid h-9 w-9 place-items-center rounded-full bg-white/15" data-testid="location-back" aria-label="Back"><ArrowLeft className="h-4 w-4" /></button>}
          <DialogTitle className="text-xl font-extrabold text-white">{state || "Choose location"}</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" />
          <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={state ? `Search a city in ${state}` : "Search city, town or state"} className="rounded-full pl-11" data-testid="location-search-input" />
        </div>
        <div className="-mx-2 flex-1 overflow-y-auto">
          {!state && !q && (
            <>
              <Row icon={locating ? Loader2 : Crosshair} title="Use my current location" sub="Shows people near you first" onClick={gps} testid="location-use-gps" />
              {allowArea && <Row icon={Globe2} title="All India" onClick={() => pick(null)} testid="location-all-india" />}
              <p className="px-3 pb-1 pt-3 text-xs font-bold uppercase tracking-widest text-white/60">States & union territories</p>
              {states.map((s) => <Row key={s.state} title={s.state} sub={`${s.cities} cities & towns`} chevron onClick={() => openState(s.state)} testid={`location-state-${slug(s.state)}`} />)}
            </>
          )}
          {state && allowArea && !q && <Row icon={Globe2} title={`All of ${state}`} onClick={() => pick({ state })} testid="location-whole-state" />}
          {!state && q && res?.states?.map((s) => <Row key={s} icon={Globe2} title={s} sub="State" chevron onClick={() => openState(s)} testid={`location-result-state-${slug(s)}`} />)}
          {(state || q) && shown.slice(0, 300).map((c) => (
            <Row key={`${c.name}-${c.state}`} title={c.name} sub={c.state} onClick={() => pickCity(c)} testid={`location-city-${slug(c.name)}`} />
          ))}
          {q && !state && res && !res.cities.length && !res.states.length && <p className="px-3 py-8 text-center text-sm text-white/60">No place called “{q}”. Try a nearby town.</p>}
          {state && !cities.length && <div className="grid place-items-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const LocationField = ({ value, onChange, testid }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} data-testid={testid}
        className="flex h-11 w-full items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-4 text-left text-sm">
        <MapPin className="h-4 w-4 shrink-0 text-white/70" />
        <span className={`flex-1 truncate ${value?.city ? "font-semibold" : "text-white/50"}`}>{value?.city ? locLabel(value) : "Choose your city or town"}</span>
        <ChevronRight className="h-4 w-4 text-white/50" />
      </button>
      <LocationPicker open={open} onOpenChange={setOpen} allowArea={false} onPick={onChange} />
    </>
  );
};
