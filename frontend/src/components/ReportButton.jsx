import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useMe } from "@/context/MeContext";
import { errMsg } from "@/lib/api";

const REASONS = [["fake_profile", "Fake profile"], ["inappropriate", "Inappropriate content"], ["scam", "Scam"], ["no_show", "No-show"], ["other", "Other"]];

export const ReportButton = ({ type, id, label = "Report", className = "", testid = "report-button" }) => {
  const { api } = useMe();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    try { await api.post("/reports", { target_type: type, target_id: id, reason, note }); toast.success("Thanks. Our team will review it."); setOpen(false); }
    catch (e) { toast.error(errMsg(e)); }
    setBusy(false);
  };
  return (
    <>
      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setReason(""); setNote(""); setOpen(true); }} data-testid={testid} aria-label={label}
        className={className || "inline-flex items-center gap-1 text-xs text-white/55 hover:text-rose-200"}>
        <Flag className="h-3.5 w-3.5" />{label}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-[28px] border-white/10 bg-gradient-to-b from-[#4530C8] to-[#2A1B7A] text-white sm:max-w-md" data-testid="report-dialog">
          <DialogHeader><DialogTitle className="text-xl font-extrabold">Report</DialogTitle><DialogDescription className="text-white/75">Only our team sees this. Tell us what's wrong.</DialogDescription></DialogHeader>
          <div className="flex flex-wrap gap-2">
            {REASONS.map(([k, l]) => (
              <button key={k} onClick={() => setReason(k)} data-testid={`report-reason-${k}`}
                className={`h-10 rounded-full border px-4 text-sm font-bold transition-colors ${reason === k ? "border-white bg-white text-[#3B25A8]" : "border-white/25 bg-white/10"}`}>{l}</button>
            ))}
          </div>
          <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Add details (optional)" data-testid="report-note-input" />
          <button disabled={!reason || busy} onClick={send} data-testid="report-submit-button" className="cta inline-flex h-12 items-center justify-center gap-2 rounded-full font-extrabold disabled:opacity-50">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}Send report
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
};
