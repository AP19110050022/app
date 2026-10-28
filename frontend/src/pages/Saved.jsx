import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, Loader2, Users, Store } from "lucide-react";
import { toast } from "sonner";
import { CreatorCard } from "@/components/CreatorCard";
import { SubHeader, Empty, Seg } from "@/components/AppBits";
import { BusinessCard } from "@/pages/Discover";
import { useMe } from "@/context/MeContext";

export default function Saved() {
  const { api } = useMe();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("creators");
  useEffect(() => { api.get("/saved").then((r) => setData(r.data)); }, [api]);
  const remove = async (id) => {
    await api.delete(`/saved/${id}`);
    setData((d) => ({ creators: d.creators.filter((c) => c.user_id !== id), businesses: d.businesses.filter((b) => b.user_id !== id) }));
    toast.success("Removed from saved");
  };
  const list = data?.[tab] || [];
  return (
    <div data-testid="saved-page">
      <SubHeader title="Saved" sub="Creators and businesses you want to come back to." />
      <Seg value={tab} onChange={setTab} options={[["creators", `Creators${data ? ` (${data.creators.length})` : ""}`, Users], ["businesses", `Businesses${data ? ` (${data.businesses.length})` : ""}`, Store]]} testid="saved-tabs" />
      <div className="mt-4">
        {data === null ? <div className="grid place-items-center py-16"><Loader2 className="h-7 w-7 animate-spin" /></div>
          : list.length === 0 ? <Empty icon={Bookmark} title="Nothing saved yet" text={`Tap the bookmark on any ${tab === "creators" ? "creator" : "business"} to save it here.`} testid="saved-empty"
              action={<Link to="/app" className="mt-4 rounded-full bg-white px-5 py-2.5 text-sm font-extrabold text-[#3B25A8]">Discover</Link>} />
          : tab === "creators"
            ? <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">{list.map((c, i) => <CreatorCard key={c.user_id} c={c} index={i} saved onToggleSave={remove} />)}</div>
            : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{list.map((b, i) => <BusinessCard key={b.user_id} b={b} i={i} saved onToggleSave={remove} />)}</div>}
      </div>
    </div>
  );
}
