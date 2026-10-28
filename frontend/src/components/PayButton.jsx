import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, FlaskConical, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useMe } from "@/context/MeContext";
import { errMsg, inr } from "@/lib/api";

function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export const PayButton = ({ body, label, onPaid, testid = "pay-button", className = "" }) => {
  const { api, refresh } = useMe();
  const [busy, setBusy] = useState(false);
  const [testOrder, setTestOrder] = useState(null);

  const done = async () => {
    await refresh();
    toast.success("Payment successful");
    onPaid?.();
  };

  const start = async () => {
    setBusy(true);
    try {
      const { data: o } = await api.post("/payments/order", body);
      if (o.mode === "test") {
        setTestOrder(o);
        return;
      }
      if (!(await loadRazorpay())) throw new Error("Could not load Razorpay");
      new window.Razorpay({
        key: o.key_id, amount: o.amount, currency: o.currency, name: "HireMyFace", description: o.description,
        order_id: o.order_id, prefill: o.prefill, theme: { color: "#7C3AED" },
        handler: async (r) => {
          try {
            await api.post("/payments/verify", { payment_id: o.payment_id, ...r });
            await done();
          } catch (e) { toast.error(errMsg(e)); }
        },
      }).open();
    } catch (e) {
      toast.error(errMsg(e, e.message));
    } finally {
      setBusy(false);
    }
  };

  const confirmTest = async () => {
    setBusy(true);
    try {
      await api.post("/payments/verify", { payment_id: testOrder.payment_id });
      setTestOrder(null);
      await done();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <>
      <Button onClick={start} disabled={busy} className={`gap-2 rounded-full ${className}`} data-testid={testid}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} {label}
      </Button>
      <Dialog open={!!testOrder} onOpenChange={(o) => !o && setTestOrder(null)}>
        <DialogContent data-testid="test-payment-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-heading"><FlaskConical className="h-5 w-5 text-violet-600" />Test payment</DialogTitle>
            <DialogDescription>Razorpay keys aren't added yet, so this is a simulated payment. No real money moves.</DialogDescription>
          </DialogHeader>
          {testOrder && (
            <div className="rounded-2xl bg-violet-50 p-4">
              <p className="text-sm text-slate-600">{testOrder.description}</p>
              <p className="font-heading text-3xl font-bold text-slate-900">{inr(testOrder.amount / 100)}</p>
            </div>
          )}
          <Button onClick={confirmTest} disabled={busy} className="rounded-full" data-testid="test-payment-confirm-button">
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Complete test payment
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};
