import { useNavigate } from "react-router-dom";
import { Clapperboard, Briefcase, ArrowRight, Pencil, Repeat } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useMe } from "@/context/MeContext";
import { toast } from "sonner";

const Option = ({ icon: Icon, title, text, badge, tone, onClick, testid, actionLabel }) => (
  <button onClick={onClick} data-testid={testid}
    className="group relative w-full overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 text-left transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-xl hover:shadow-violet-500/10">
    <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20 blur-2xl ${tone}`} />
    <div className="flex items-start gap-4">
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white shadow-lg ${tone}`}><Icon className="h-6 w-6" /></span>
      <div className="flex-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-violet-600">{badge}</span>
        <h3 className="font-heading text-lg font-bold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{text}</p>
        <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-violet-700">{actionLabel}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
      </div>
    </div>
  </button>
);

export const RoleChooser = ({ open, onOpenChange }) => {
  const navigate = useNavigate();
  const { me, api, refresh } = useMe();
  const hasC = !!me?.creator, hasB = !!me?.business;
  const mode = me?.user?.active_mode;

  const go = async (kind) => {
    onOpenChange(false);
    const has = kind === "creator" ? hasC : hasB;
    if (!has) return navigate(`/app/setup/${kind}`);
    if (mode !== kind) {
      await api.patch("/me", { active_mode: kind });
      await refresh();
      toast.success(`Switched to ${kind} mode`);
    }
    navigate(kind === "creator" ? "/app/deals" : "/app/search");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-3xl" data-testid="role-chooser-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">What would you like to do?</DialogTitle>
          <DialogDescription>One account, two sides. You can switch any time from your profile.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Option icon={Clapperboard} tone="bg-gradient-to-br from-violet-600 to-fuchsia-500" badge={hasC ? (mode === "creator" ? "Active" : "Profile ready") : "Earn with your face"}
            title="Become a Creator" text="Get hired by brands for reels, shorts, ads and live sessions. Set your own prices."
            actionLabel={hasC ? (mode === "creator" ? "Go to my deals" : "Switch to creator mode") : "Set up in 3 steps"}
            onClick={() => go("creator")} testid="role-option-creator" />
          <Option icon={Briefcase} tone="bg-gradient-to-br from-indigo-600 to-sky-500" badge={hasB ? (mode === "business" ? "Active" : "Profile ready") : "Grow your brand"}
            title="Hire as a Business" text="Find the right face for your brand, send offers and pay safely in the app."
            actionLabel={hasB ? (mode === "business" ? "Find creators" : "Switch to business mode") : "Set up in 2 steps"}
            onClick={() => go("business")} testid="role-option-business" />
        </div>
        {(hasC || hasB) && (
          <div className="flex flex-wrap gap-2 pt-1 text-sm">
            {hasC && <button className="inline-flex items-center gap-1 text-slate-500 hover:text-violet-700" onClick={() => { onOpenChange(false); navigate("/app/setup/creator"); }} data-testid="role-edit-creator"><Pencil className="h-3.5 w-3.5" />Edit creator profile</button>}
            {hasB && <button className="inline-flex items-center gap-1 text-slate-500 hover:text-violet-700" onClick={() => { onOpenChange(false); navigate("/app/setup/business"); }} data-testid="role-edit-business"><Repeat className="h-3.5 w-3.5" />Edit business profile</button>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
