import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Users, Clapperboard, Briefcase, IndianRupee, Wallet, Crown, Clock, Check, EyeOff, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { useMe } from "@/context/MeContext";
import { errMsg, inr } from "@/lib/api";

const Stat = ({ icon: Icon, label, value, testid }) => (
  <div className="glass rounded-[22px] p-4" data-testid={testid}>
    <Icon className="h-5 w-5" />
    <p className="mt-2 text-2xl font-extrabold">{value}</p>
    <p className="text-xs text-white/70">{label}</p>
  </div>
);

const Row = ({ children, testid }) => <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-3 last:border-0" data-testid={testid}>{children}</div>;
const Box = ({ children }) => <div className="glass overflow-hidden rounded-[22px]">{children}</div>;
const Empty = ({ t }) => <p className="p-8 text-center text-sm text-white/60">{t}</p>;

export default function Admin() {
  const { me, api } = useMe();
  const [d, setD] = useState(null);

  const load = useCallback(async () => {
    const [s, c, deals, p, u] = await Promise.all([api.get("/admin/stats"), api.get("/admin/creators"), api.get("/admin/deals"), api.get("/admin/payments"), api.get("/users")]);
    setD({ stats: s.data, creators: c.data, deals: deals.data, payments: p.data, users: u.data });
  }, [api]);

  useEffect(() => { if (me.user.role === "admin") load(); }, [load, me.user.role]);
  if (me.user.role !== "admin") return <Navigate to="/app" replace />;
  if (!d) return <div className="grid place-items-center py-20"><Loader2 className="h-7 w-7 animate-spin" /></div>;

  const run = async (fn, ok) => { try { await fn(); toast.success(ok); load(); } catch (e) { toast.error(errMsg(e)); } };
  const setStatus = (id, status) => run(() => api.patch(`/admin/creators/${id}`, { status }), `Creator ${status}`);
  const release = (id) => run(() => api.post(`/admin/deals/${id}/release`), "Payout released");
  const setRole = (id, role) => run(() => api.patch(`/users/${id}/role`, { role }), "Role updated");
  const pending = d.creators.filter((c) => c.status === "pending");
  const s = d.stats;

  return (
    <div data-testid="admin-page">
      <h1 className="text-[22px] font-extrabold tracking-tight">Admin</h1>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon={Users} label="Users" value={s.users} testid="admin-stat-users" />
        <Stat icon={Clapperboard} label={`Live creators · ${s.creators_pending} pending`} value={s.creators_live} testid="admin-stat-creators" />
        <Stat icon={IndianRupee} label="Deal volume paid" value={inr(s.gmv)} testid="admin-stat-gmv" />
        <Stat icon={Wallet} label={`Platform revenue · ${s.pro_subs} Pro`} value={inr(s.revenue)} testid="admin-stat-revenue" />
      </div>
      <Tabs defaultValue="approvals" className="mt-8">
        <TabsList className="no-scrollbar h-auto w-full justify-start overflow-x-auto rounded-full bg-white/15 p-1 text-white">
          <TabsTrigger value="approvals" className="rounded-full" data-testid="admin-tab-approvals">Approvals ({pending.length})</TabsTrigger>
          <TabsTrigger value="creators" className="rounded-full" data-testid="admin-tab-creators">Creators</TabsTrigger>
          <TabsTrigger value="deals" className="rounded-full" data-testid="admin-tab-deals">Deals & payouts ({s.payouts_ready})</TabsTrigger>
          <TabsTrigger value="payments" className="rounded-full" data-testid="admin-tab-payments">Payments</TabsTrigger>
          <TabsTrigger value="users" className="rounded-full" data-testid="admin-tab-users">Users</TabsTrigger>
        </TabsList>
        <TabsContent value="approvals" className="mt-4"><Box>
          {pending.length === 0 ? <Empty t="No profiles waiting for review" /> : pending.map((c) => (
            <Row key={c.user_id} testid={`admin-pending-${c.user_id}`}>
              <img src={c.photo} alt="" className="h-12 w-12 rounded-2xl object-cover" />
              <div className="min-w-0 flex-1"><p className="font-semibold">{c.name}</p><p className="text-xs text-white/65">{c.category} · {c.city} · from {inr(c.rate_per_video)} · {c.intro_video ? <a href={c.intro_video} target="_blank" rel="noreferrer" className="underline">intro video</a> : "no intro video"}</p></div>
              <Button size="sm" className="gap-1 rounded-full" onClick={() => setStatus(c.user_id, "approved")} data-testid={`admin-approve-${c.user_id}`}><Check className="h-4 w-4" />Approve</Button>
              <Button size="sm" variant="outline" className="gap-1 rounded-full" onClick={() => setStatus(c.user_id, "hidden")} data-testid={`admin-hide-${c.user_id}`}><EyeOff className="h-4 w-4" />Reject</Button>
            </Row>
          ))}
        </Box></TabsContent>
        <TabsContent value="creators" className="mt-4"><Box>
          {d.creators.map((c) => (
            <Row key={c.user_id} testid={`admin-creator-${c.user_id}`}>
              <img src={c.photo} alt="" className="h-10 w-10 rounded-full object-cover" />
              <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{c.name}{c.is_sample && <span className="ml-2 text-[10px] uppercase text-white/50">sample</span>}</p><p className="text-xs text-white/65">{c.category} · {c.city}</p></div>
              <span className="text-xs font-semibold capitalize text-white/65">{c.status}</span>
              {c.status !== "approved" && <Button size="sm" variant="outline" className="rounded-full" onClick={() => setStatus(c.user_id, "approved")} data-testid={`admin-show-${c.user_id}`}>Show</Button>}
              {c.status !== "hidden" && <Button size="sm" variant="ghost" className="rounded-full text-rose-600" onClick={() => setStatus(c.user_id, "hidden")} data-testid={`admin-hide2-${c.user_id}`}>Hide</Button>}
            </Row>
          ))}
        </Box></TabsContent>
        <TabsContent value="deals" className="mt-4"><Box>
          {d.deals.length === 0 ? <Empty t="No deals yet" /> : d.deals.map((x) => (
            <Row key={x.id} testid={`admin-deal-${x.id}`}>
              <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{x.business_name} → {x.creator_name}</p><p className="text-xs text-white/65">{x.plan_label} · {inr(x.price)} · payout: {x.payout_status || "—"}</p></div>
              <StatusBadge status={x.status} testid={`admin-deal-status-${x.id}`} />
              {x.payout_status === "ready" && <Button size="sm" className="gap-1 rounded-full" onClick={() => release(x.id)} data-testid={`admin-release-${x.id}`}><Wallet className="h-4 w-4" />Release {inr(x.price - Math.round(x.price * 0.1))}</Button>}
            </Row>
          ))}
        </Box></TabsContent>
        <TabsContent value="payments" className="mt-4"><Box>
          {d.payments.length === 0 ? <Empty t="No payments yet" /> : d.payments.map((p) => (
            <Row key={p.id} testid={`admin-payment-${p.id}`}>
              {p.kind === "pro" ? <Crown className="h-5 w-5 text-amber-500" /> : <Briefcase className="h-5 w-5 text-indigo-600" />}
              <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{p.description}</p><p className="text-xs text-white/65">{new Date(p.paid_at || p.created_at).toLocaleString()} · {p.mode}</p></div>
              <span className="font-semibold">{inr(p.amount)}</span>
            </Row>
          ))}
        </Box></TabsContent>
        <TabsContent value="users" className="mt-4"><Box>
          {d.users.users.map((u) => (
            <Row key={u.user_id} testid={`admin-user-${u.user_id}`}>
              <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{u.name}{u.is_pro && <Crown className="ml-1 inline h-3.5 w-3.5 text-amber-500" />}</p><p className="truncate text-xs text-white/65">{u.email} · {u.active_mode ? `${u.active_mode} mode` : "no profile yet"}</p></div>
              <Select value={u.role} onValueChange={(r) => setRole(u.user_id, r)}>
                <SelectTrigger className="h-9 w-32 rounded-full" data-testid={`admin-role-select-${u.user_id}`}><SelectValue /></SelectTrigger>
                <SelectContent>{d.users.roles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </Row>
          ))}
        </Box></TabsContent>
      </Tabs>
      <p className="mt-6 flex items-center gap-1.5 text-xs text-white/60"><Clock className="h-3.5 w-3.5" />Payouts are released manually: send the amount to the creator's UPI, then press Release.</p>
    </div>
  );
}
