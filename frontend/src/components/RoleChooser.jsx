import { useNavigate } from "react-router-dom";
import { Play, Store, ChevronRight, Briefcase, UserRound } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useMe } from "@/context/MeContext";

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
  const { me } = useMe();
  const hasC = !!me?.creator, hasB = !!me?.business;
  const mode = me?.user?.active_mode;
  const accountType = hasC && hasB ? mode || "creator" : hasC ? "creator" : hasB ? "business" : null;

  const go = (kind) => {
    onOpenChange(false);
    navigate(`/app/setup/${kind}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[28px] border-white/10 bg-gradient-to-b from-[#4530C8] to-[#2A1B7A] text-white" data-testid="role-chooser-dialog">
        <DialogHeader className="text-left">
          {accountType === "creator" ? <>
            <DialogTitle className="font-heading text-[26px] font-extrabold leading-tight text-white">You created a presenter account</DialogTitle>
            <DialogDescription className="text-white/75">Your presenter profile is ready to manage.</DialogDescription>
          </> : accountType === "business" ? <>
            <DialogTitle className="font-heading text-[26px] font-extrabold leading-tight text-white">You created a business account</DialogTitle>
            <DialogDescription className="text-white/75">Post a job to find presenters for your business.</DialogDescription>
          </> : <>
            <DialogTitle className="font-heading text-[26px] font-extrabold leading-tight text-white">Choose one account type</DialogTitle>
            <DialogDescription className="text-white/75">Each person can create either a presenter or a business account.</DialogDescription>
          </>}
        </DialogHeader>
        {accountType === "creator" ? (
          <button onClick={() => { onOpenChange(false); navigate("/app/profile"); }} className="cta flex h-12 w-full items-center justify-center gap-2 rounded-full font-extrabold" data-testid="plus-view-creator"><UserRound className="h-4 w-4" />View presenter profile</button>
        ) : accountType === "business" ? (
          <button onClick={() => { onOpenChange(false); navigate("/app/jobs?create=1"); }} className="cta flex h-12 w-full items-center justify-center gap-2 rounded-full font-extrabold" data-testid="plus-add-job"><Briefcase className="h-4 w-4" />Add job post</button>
        ) : (
          <div className="space-y-3">
            <Option icon={Play} tone="bg-gradient-to-br from-[#7C5CFF] to-[#FF5FA2]" title="I'm a presenter" text="Appear on camera and get hired to promote brands." tag="3 quick steps" onClick={() => go("creator")} testid="role-option-creator" />
            <Option icon={Store} tone="bg-gradient-to-br from-[#3B82F6] to-[#7C5CFF]" title="I'm a business" text="Hire presenters for your store, brand or service." tag="2 quick steps" onClick={() => go("business")} testid="role-option-business" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
