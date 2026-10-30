import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useMe } from "@/context/MeContext";
import { errMsg } from "@/lib/api";

const TONE = {
  pending: "bg-amber-300/20 text-amber-100", approved: "bg-emerald-300/20 text-emerald-100", rejected: "bg-rose-400/25 text-rose-100",
  blocked: "bg-rose-500/30 text-rose-100", disputed: "bg-orange-400/25 text-orange-100", released: "bg-emerald-300/20 text-emerald-100",
  failed: "bg-rose-400/25 text-rose-100", open: "bg-amber-300/20 text-amber-100", resolved: "bg-white/15 text-white/80",
  removed: "bg-rose-400/25 text-rose-100", refunded: "bg-sky-300/20 text-sky-100", completed: "bg-emerald-300/20 text-emerald-100",
  owner: "bg-fuchsia-400/25 text-fuchsia-100", admin: "bg-indigo-300/25 text-indigo-100", active: "bg-emerald-300/20 text-emerald-100",
  paused: "bg-orange-400/25 text-orange-100", on_hold: "bg-orange-400/25 text-orange-100", test: "bg-yellow-300/25 text-yellow-100",
};

export const Pill = ({ s, label, testid }) => (
  <span data-testid={testid} className={`inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-[11px] font-extrabold capitalize ${TONE[s] || "bg-white/15 text-white/85"}`}>
    {label || String(s || "—").replace(/_/g, " ")}
  </span>
);

export const Box = ({ children, testid }) => <div className="glass overflow-hidden rounded-[22px]" data-testid={testid}>{children}</div>;
export const Row = ({ children, testid, onClick }) => (
  <div onClick={onClick} data-testid={testid} className={`flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-3 last:border-0 ${onClick ? "cursor-pointer transition-colors hover:bg-white/10" : ""}`}>{children}</div>
);
export const Nothing = ({ t, testid }) => <p className="p-8 text-center text-sm text-white/60" data-testid={testid}>{t}</p>;
export const Spinner = () => <div className="grid place-items-center py-20"><Loader2 className="h-7 w-7 animate-spin" /></div>;
export const H1 = ({ children, sub, right }) => (
  <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
    <div><h1 className="text-[24px] font-extrabold tracking-tight">{children}</h1>{sub && <p className="text-[13px] text-white/70">{sub}</p>}</div>{right}
  </div>
);

export function useAdminData(path, params) {
  const { api } = useMe();
  const [data, setData] = useState(null);
  const key = JSON.stringify(params || {});
  const load = useCallback(async () => {
    try { setData((await api.get(path, { params: JSON.parse(key) })).data); } catch (e) { toast.error(errMsg(e)); setData([]); }
  }, [api, path, key]);
  useEffect(() => { load(); }, [load]);
  return [data, load];
}

export function useAdminRun(reload) {
  const { api } = useMe();
  return async (method, path, body, ok) => {
    try { await api[method](path, body); toast.success(ok); reload?.(); return true; } catch (e) { toast.error(errMsg(e)); return false; }
  };
}

export const ReasonDialog = ({ open, onOpenChange, title, text, cta, danger, noReason, onConfirm, testid = "reason-dialog" }) => {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setReason(""); }, [open]);
  const ok = noReason || reason.trim().length >= 3;
  const go = async () => { setBusy(true); const done = await onConfirm(reason.trim()); setBusy(false); if (done !== false) onOpenChange(false); };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[28px] border-white/10 bg-gradient-to-b from-[#4530C8] to-[#2A1B7A] text-white sm:max-w-md" data-testid={testid}>
        <DialogHeader><DialogTitle className="text-xl font-extrabold">{title}</DialogTitle>{text && <DialogDescription className="text-white/75">{text}</DialogDescription>}</DialogHeader>
        {!noReason && <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (the user may see this)" data-testid={`${testid}-input`} />}
        <div className="flex justify-end gap-2">
          <button onClick={() => onOpenChange(false)} className="h-11 rounded-full bg-white/15 px-5 text-sm font-bold" data-testid={`${testid}-cancel`}>Cancel</button>
          <button disabled={!ok || busy} onClick={go} data-testid={`${testid}-confirm`}
            className={`inline-flex h-11 items-center gap-1.5 rounded-full px-5 text-sm font-extrabold disabled:opacity-50 ${danger ? "bg-rose-500 text-white" : "bg-white text-[#3B25A8]"}`}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}{cta}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const Btn = ({ children, onClick, danger, testid, small }) => (
  <button onClick={(e) => { e.stopPropagation(); onClick(); }} data-testid={testid}
    className={`inline-flex items-center gap-1.5 rounded-full font-extrabold transition-transform active:scale-95 ${small ? "h-9 px-3.5 text-xs" : "h-10 px-4 text-sm"} ${danger ? "bg-rose-500/90 text-white" : "bg-white text-[#3B25A8]"}`}>
    {children}
  </button>
);

export const when = (iso) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");
