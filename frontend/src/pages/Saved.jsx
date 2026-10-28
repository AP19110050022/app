import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CreatorCard } from "@/components/CreatorCard";
import { SubHeader, Empty } from "@/components/AppBits";
import { useMe } from "@/context/MeContext";

export default function Saved() {
  const { api } = useMe();
  const [list, setList] = useState(null);
  useEffect(() => { api.get("/saved").then((r) => setList(r.data)); }, [api]);
  const remove = async (id) => {
    await api.delete(`/saved/${id}`);
    setList((l) => l.filter((c) => c.user_id !== id));
    toast.success("Removed from saved");
  };
  return (
    <div data-testid="saved-page">
      <SubHeader title="Saved creators" sub="Your shortlist for later." />
      {list === null ? <div className="grid place-items-center py-16"><Loader2 className="h-7 w-7 animate-spin" /></div>
        : list.length === 0 ? <Empty icon={Bookmark} title="Nothing saved yet" text="Tap the bookmark on any creator to save them here." testid="saved-empty"
            action={<Link to="/app" className="mt-4 rounded-full bg-white px-5 py-2.5 text-sm font-extrabold text-[#3B25A8]">Discover creators</Link>} />
        : <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">{list.map((c, i) => <CreatorCard key={c.user_id} c={c} index={i} saved onToggleSave={remove} />)}</div>}
    </div>
  );
}
