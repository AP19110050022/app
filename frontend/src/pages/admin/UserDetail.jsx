import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Ban, RotateCcw } from "lucide-react";
import { useMe } from "@/context/MeContext";
import { inr } from "@/lib/api";
import { Avatar } from "@/pages/admin/Users";
import { Box, Btn, Nothing, Pill, ReasonDialog, Row, Spinner, useAdminData, useAdminRun, when } from "@/pages/admin/bits";

const Section = ({ title, children, n }) => (
  <div className="mt-6"><p className="mb-2 text-xs font-extrabold uppercase tracking-widest text-white/55">{title}{n != null && ` (${n})`}</p>{children}</div>
);
const List = ({ items, empty, render }) => <Box>{items.length ? items.map(render) : <Nothing t={empty} />}</Box>;

export default function UserDetail() {
  const { id } = useParams();
  const { me } = useMe();
  const [d, reload] = useAdminData(`/admin/users/${id}`);
  const run = useAdminRun(reload);
  const [dlg, setDlg] = useState(false);
  if (!d) return <Spinner />;
  if (!d.user) return <Nothing t="User not found" />;
  const u = d.user;
  const canBlock = u.user_id !== me.user.user_id && u.role !== "owner" && (u.role !== "admin" || me.user.role === "owner");
  return (
    <div data-testid="admin-user-detail">
      <Link to="/admin/users" className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-white/75" data-testid="user-detail-back"><ArrowLeft className="h-4 w-4" />All users</Link>
      <div className="glass flex flex-wrap items-center gap-4 rounded-[24px] p-5">
        <Avatar src={u.image_url} name={u.name} />
        <div className="min-w-0 flex-1">
          <p className="text-xl font-extrabold" data-testid="user-detail-name">{u.name}</p>
          <p className="truncate text-sm text-white/70">{u.email} · joined {when(u.created_at)}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Pill s={u.blocked ? "blocked" : "active"} testid="user-detail-status" />{u.role !== "member" && <Pill s={u.role} label={u.role === "owner" ? "Main admin" : "Admin"} />}
            {u.is_pro && <Pill s="pro" label={`Pro until ${new Date(u.pro_until).toLocaleDateString()}`} />}
          </div>
          {u.blocked && <p className="mt-2 text-xs text-rose-100">Blocked: {u.block_reason}</p>}
        </div>
        {canBlock && (u.blocked ? <Btn onClick={() => setDlg(true)} testid="user-unblock-button"><RotateCcw className="h-4 w-4" />Unblock</Btn>
          : <Btn danger onClick={() => setDlg(true)} testid="user-block-button"><Ban className="h-4 w-4" />Block</Btn>)}
      </div>
      {d.creator && <Section title="Creator profile">
        <Box><Row><img src={d.creator.photo} alt="" className="h-12 w-12 rounded-2xl object-cover" /><div className="min-w-0 flex-1"><p className="font-bold">{d.creator.name}</p><p className="text-xs text-white/65">{d.creator.categories?.join(" · ")} · {d.creator.city} · {d.creator.samples?.length || 0} posts</p></div><Pill s={d.creator.status} />{d.creator.live === false && <Pill s="offline" />}</Row></Box>
      </Section>}
      {d.business && <Section title="Business profile">
        <Box><Row><Avatar src={d.business.logo} name={d.business.company} /><div className="min-w-0 flex-1"><p className="font-bold">{d.business.company}</p><p className="text-xs text-white/65">{d.business.industry} · {d.business.city}</p></div>{d.business.removed && <Pill s="removed" />}</Row></Box>
      </Section>}
      <Section title="Jobs" n={d.jobs.length}><List items={d.jobs} empty="No jobs" render={(j) => <Row key={j.id}><p className="min-w-0 flex-1 truncate text-sm font-bold">{j.title}</p><Pill s={j.status} /></Row>} /></Section>
      <Section title="Deals" n={d.deals.length}><List items={d.deals} empty="No deals" render={(x) => (
        <Row key={x.id}><Link to={`/app/chat/${x.id}`} className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{x.business_name} → {x.creator_name}</p><p className="text-xs text-white/65">{x.plan_label} · {inr(x.price)}</p></Link><Pill s={x.paused ? "paused" : x.status} /></Row>)} /></Section>
      <Section title="Reports against this user" n={d.reports.length}><List items={d.reports} empty="No reports" render={(r) => (
        <Row key={r.id}><Link to={`/admin/reports?open=${r.id}`} className="min-w-0 flex-1"><p className="truncate text-sm font-bold capitalize">{r.kind}: {r.reason.replace(/_/g, " ")}</p><p className="truncate text-xs text-white/65">{r.target_label} · by {r.reporter_name}</p></Link><Pill s={r.status} /></Row>)} /></Section>
      <Section title="Payments" n={d.payments.length}><List items={d.payments} empty="No payments" render={(p) => (
        <Row key={p.id}><p className="min-w-0 flex-1 truncate text-sm">{p.description}<span className="block text-xs text-white/60">{when(p.paid_at)}</span></p><Pill s={p.mode} />{p.refund_status && <Pill s="refunded" />}<b>{inr(p.amount)}</b></Row>)} /></Section>
      <Section title="Payouts received" n={d.payouts.length}><List items={d.payouts} empty="No payouts" render={(p) => (
        <Row key={p.id}><p className="min-w-0 flex-1 truncate text-sm">From {p.business_name}<span className="block text-xs text-white/60">{p.error || when(p.released_at || p.created_at)}</span></p><Pill s={p.status} /><b>{inr(p.amount)}</b></Row>)} /></Section>
      <ReasonDialog open={dlg} onOpenChange={setDlg} danger={!u.blocked} testid="block-dialog"
        cta={u.blocked ? "Unblock" : "Block user"} title={u.blocked ? `Unblock ${u.name}?` : `Block ${u.name}?`}
        text={u.blocked ? "Their profile, jobs and posts come back and paused deals resume." : "They're signed out, can't log in, their profile, jobs and posts disappear, and their ongoing deals are paused. Nothing is deleted."}
        onConfirm={(reason) => run("post", `/admin/users/${u.user_id}/${u.blocked ? "unblock" : "block"}`, { reason }, u.blocked ? "User unblocked" : "User blocked")} />
    </div>
  );
}
