import { useNavigate } from "react-router-dom";
import { Play, Store, ChevronRight, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useMe } from "@/context/MeContext";
import { toast } from "sonner";

const Option = ({ icon: Icon, title, text, tag, tone, onClick, testid }) => (
  <button onClick={onClick} data-testid={testid}
    className="glass group flex w-full items-center gap-4 rounded-[24px] p-4 text-left transition-[background-color,transform] duration-200 hover:bg-white/20 active:scale-[.98]">
    <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-white shadow-lg ${tone}`}><Icon className="h-6 w-6" /></span>
    <div className="min-w-0 flex-1">
      <p className="text-lg font-extrabold tracking-tight">{title}</p>
      <p className="text-[13px] leading-snug text-white/75">{text}</p>
      <span className="mt-1.5 inline-block rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-bold">{tag}</span>
    </div>
    <ChevronRight className="h-5 w-5 shrink-0 text-white/60 transition-transform group-hover:translate-x-1" />
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
    navigate(kind === "creator" ? "/app/deals" : "/app");
  };
  const tag = (has, kind) => (has ? (mode === kind ? "Active now" : "Tap to switch") : kind === "creator" ? "3 quick steps" : "2 quick steps");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[28px] border-white/10 bg-gradient-to-b from-[#4530C8] to-[#2A1B7A] text-white" data-testid="role-chooser-dialog">
        <DialogHeader className="text-left">
          <DialogTitle className="font-heading text-[26px] font-extrabold leading-tight text-white">How will you use<br />HireMyFace?</DialogTitle>
          <DialogDescription className="text-white/75">One account, two sides. Switch any time.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Option icon={Play} tone="bg-gradient-to-br from-[#7C5CFF] to-[#FF5FA2]" title="I'm a creator" text="Appear on camera and get hired to promote brands." tag={tag(hasC, "creator")} onClick={() => go("creator")} testid="role-option-creator" />
          <Option icon={Store} tone="bg-gradient-to-br from-[#3B82F6] to-[#7C5CFF]" title="I'm a business" text="Hire presenters for your store, brand or service." tag={tag(hasB, "business")} onClick={() => go("business")} testid="role-option-business" />
        </div>
        {(hasC || hasB) && (
          <div className="flex flex-wrap gap-4 pt-1 text-[13px] font-semibold text-white/75">
            {hasC && <button className="flex items-center gap-1 hover:text-white" onClick={() => { onOpenChange(false); navigate("/app/setup/creator"); }} data-testid="role-edit-creator"><Pencil className="h-3.5 w-3.5" />Edit creator profile</button>}
            {hasB && <button className="flex items-center gap-1 hover:text-white" onClick={() => { onOpenChange(false); navigate("/app/setup/business"); }} data-testid="role-edit-business"><Pencil className="h-3.5 w-3.5" />Edit business profile</button>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
