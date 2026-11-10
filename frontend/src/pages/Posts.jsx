import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { PostsEditor } from "@/components/PostsEditor";
import { useMe } from "@/context/MeContext";
import { errMsg } from "@/lib/api";

export default function Posts() {
  const { me, api, refresh } = useMe();
  const navigate = useNavigate();
  const [posts, setPosts] = useState(me.creator?.samples || []);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try { await api.put("/creators/me/posts", { posts }); await refresh(); toast.success("Posts saved"); navigate("/app/profile"); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  if (!me.creator) { navigate("/app/setup/creator"); return null; }
  return (
    <div className="mx-auto max-w-xl" data-testid="posts-page">
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="grid h-11 w-11 place-items-center rounded-full bg-white/15" aria-label="Back" data-testid="posts-back"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="flex-1 text-[22px] font-extrabold">Your posts</h1>
        <span className="text-sm text-white/70">{posts.length} / 3</span>
      </div>
      <p className="mb-4 text-[13px] text-white/75">Add up to 3 photos or reels of your work. Your profile photo is separate.</p>
      <PostsEditor value={posts} onChange={setPosts} />
      <button onClick={save} disabled={busy} className="cta mt-6 flex h-[52px] w-full items-center justify-center gap-2 rounded-full font-extrabold" data-testid="posts-save-button">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Save posts</button>
    </div>
  );
}
