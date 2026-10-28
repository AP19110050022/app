import { useRef } from "react";
import { Camera, Link2 } from "lucide-react";
import { Input } from "@/components/ui/input";

function resize(file, max = 640) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => { img.src = reader.result; };
    reader.onerror = reject;
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL("image/jpeg", 0.82));
    };
    reader.readAsDataURL(file);
  });
}

export const ImagePicker = ({ value, onChange, testid, round = true, label = "Upload photo" }) => {
  const ref = useRef(null);
  const pick = async (e) => {
    const f = e.target.files?.[0];
    if (f) onChange(await resize(f));
  };
  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => ref.current?.click()}
        data-testid={`${testid}-button`}
        className={`group relative grid h-24 w-24 shrink-0 place-items-center overflow-hidden border-2 border-dashed border-violet-300 bg-violet-50 transition-colors hover:border-violet-500 ${round ? "rounded-full" : "rounded-2xl"}`}
      >
        {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <Camera className="h-7 w-7 text-violet-500" />}
        <span className="absolute inset-0 grid place-items-center bg-violet-900/50 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">Change</span>
      </button>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={pick} data-testid={`${testid}-file`} />
      <div className="flex-1 space-y-2">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <div className="relative">
          <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="…or paste an image link"
            value={value?.startsWith("data:") ? "" : value || ""}
            onChange={(e) => onChange(e.target.value)}
            className="pl-9"
            data-testid={`${testid}-url`}
          />
        </div>
      </div>
    </div>
  );
};
