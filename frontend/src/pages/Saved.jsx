import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CreatorCard } from "@/components/CreatorCard";
import { useMe } from "@/context/MeContext";

export default function Saved() {
  const { api } = useMe();
  const [list, setList] = useState(null);
  useEffect(() => { api.get("/saved").then((r) => setList(r.data)); }, [api]);
  const remove = async (id) => {
    await api.delete(`/saved/${id}`);
    setList((l) => l.filter((c) => c.user_id !== id));
    toast.success("Removed from shortlist");
  };
  return (
    <div data-testid="saved-page">
      <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">Shortlist</h1>
      <p className="mt-1 text-sm text-slate-500">Creators you've saved for later.</p>
      {list === null ? <div className="grid place-items-center py-16"><Loader2 className="h-7 w-7 animate-spin text-violet-600" /></div>
        : list.length === 0 ? (
          <div className="mt-6 flex flex-col items-center rounded-3xl border border-dashed border-slate-300 py-16 text-center" data-testid="saved-empty">
            <Heart className="h-10 w-10 text-slate-300" /><p className="mt-3 font-semibold">No saved creators</p>
            <Link to="/app" className="mt-2 text-sm font-semibold text-violet-700">Discover creators</Link>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
            {list.map((c, i) => <CreatorCard key={c.user_id} c={c} index={i} saved onToggleSave={remove} />)}
          </div>
        )}
    </div>
  );
}
