import { useRef, useState } from "react";
import { Camera, Link2, Play, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { resizeImage } from "@/components/ImagePicker";

const isImg = (u) => u.startsWith("data:image") || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(u) || u.includes("images.unsplash.com");

export const PostsEditor = ({ value, onChange, max = 12 }) => {
  const ref = useRef(null);
  const [link, setLink] = useState("");
  const full = value.length >= max;
  const addFiles = async (e) => {
    const files = [...(e.target.files || [])].slice(0, max - value.length);
    const imgs = await Promise.all(files.map((f) => resizeImage(f, 900)));
    onChange([...value, ...imgs]);
    e.target.value = "";
  };
  return (
    <div className="space-y-3" data-testid="posts-editor">
      <div className="grid grid-cols-3 gap-2">
        {value.map((p, i) => (
          <div key={i} className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-white/10">
            {isImg(p) ? <img src={p} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full flex-col items-center justify-center gap-1 p-2 text-center"><Play className="h-6 w-6" /><span className="line-clamp-2 break-all text-[10px] text-white/70">{p.replace(/^https?:\/\//, "")}</span></div>}
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-full bg-black/50" data-testid={`post-delete-${i}`} aria-label="Delete post"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        ))}
        {!full && (
          <button type="button" onClick={() => ref.current?.click()} className="flex aspect-[4/5] flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-white/35 text-xs font-bold hover:bg-white/10" data-testid="post-add-photo">
            <Camera className="h-6 w-6" />Add photos
          </button>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" multiple className="hidden" onChange={addFiles} data-testid="post-file-input" />
      {!full && (
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (link.trim()) { onChange([...value, link.trim()]); setLink(""); } }}>
          <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Or paste a reel / video link" data-testid="post-link-input" />
          <button type="submit" className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-extrabold text-[#3B25A8]" data-testid="post-link-add"><Link2 className="h-4 w-4" />Add</button>
        </form>
      )}
    </div>
  );
};
