import { useRef } from "react";
import { Camera } from "lucide-react";
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
      <button type="button" onClick={() => ref.current?.click()} data-testid={`${testid}-button`}
        className={`ring-story shrink-0 p-[3px] transition-transform active:scale-95 ${round ? "rounded-full" : "rounded-[22px]"}`}>
        <span className={`grid h-24 w-24 place-items-center overflow-hidden border-[3px] border-[#3B25A8] bg-[#4530C8] ${round ? "rounded-full" : "rounded-[20px]"}`}>
          {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <Camera className="h-7 w-7 text-white" />}
        </span>
      </button>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={pick} data-testid={`${testid}-file`} />
      <div className="flex-1 space-y-2">
        <p className="text-[13px] font-bold text-white/85">{label}</p>
        <Input placeholder="Tap the circle, or paste an image link" value={value?.startsWith("data:") ? "" : value || ""} onChange={(e) => onChange(e.target.value)} data-testid={`${testid}-url`} />
      </div>
    </div>
  );
};
