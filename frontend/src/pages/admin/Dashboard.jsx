import { useState } from "react";
import { Link } from "react-router-dom";
import { Users, Clapperboard, Store, Crown, Briefcase, Handshake, CheckCircle2, IndianRupee, Wallet, Send, BadgeCheck, Flag, Scale, AlertTriangle, FlaskConical } from "lucide-react";
import { Seg } from "@/components/AppBits";
import { inr } from "@/lib/api";
import { H1, Spinner, useAdminData } from "@/pages/admin/bits";
import { Growth } from "@/pages/admin/Growth";
import { Journey } from "@/pages/admin/Journey";

const Card = ({ icon: Icon, label, value, sub, testid, big }) => (
  <div className={`glass rise rounded-[22px] p-4 ${big ? "bg-white/[.14]" : ""}`} data-testid={testid}>
    <Icon className="h-5 w-5 text-white/80" />
    <p className={`mt-2 font-extrabold tracking-tight ${big ? "text-[26px]" : "text-2xl"}`} data-testid={`${testid}-value`}>{value}</p>
    <p className="text-xs text-white/70">{label}</p>
    {sub && <p className="mt-0.5 text-[11px] text-white/55">{sub}</p>}
  </div>
);

const Attention = ({ to, icon: Icon, label, n, testid }) => (
  <Link to={to} data-testid={testid} className={`flex items-center gap-3 rounded-[20px] p-4 transition-transform hover:-translate-y-0.5 ${n ? "bg-white text-[#3B25A8]" : "glass-soft text-white"}`}>
    <span className={`grid h-11 w-11 place-items-center rounded-full ${n ? "bg-[#EDE8FF]" : "bg-white/15"}`}><Icon className="h-5 w-5" /></span>
    <span className="min-w-0 flex-1 text-sm font-bold">{label}</span>
    <span className="text-2xl font-extrabold" data-testid={`${testid}-count`}>{n}</span>
  </Link>
);

export default function AdminDashboard() {
  const [range, setRange] = useState("all");
  const [s] = useAdminData("/admin/stats", { range });
  return (
    <div data-testid="admin-dashboard">
      <H1 sub="How HireMyFace is doing" right={<div className="w-full sm:w-auto"><Seg value={range} onChange={setRange} testid="admin-range" options={[["today", "Today"], ["7d", "7 days"], ["30d", "30 days"], ["all", "All time"]]} /></div>}>Dashboard</H1>
      {!s ? <Spinner /> : (<>
        <p className="mb-2 text-xs font-extrabold uppercase tracking-widest text-white/55">Needs attention</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Attention to="/admin/approvals" icon={BadgeCheck} label="Creators waiting for approval" n={s.attention.pending_creators} testid="attention-approvals" />
          <Attention to="/admin/reports?kind=report" icon={Flag} label="Open reports" n={s.attention.open_reports} testid="attention-reports" />
          <Attention to="/admin/reports?kind=dispute" icon={Scale} label="Deals in dispute" n={s.attention.disputes} testid="attention-disputes" />
          <Attention to="/admin/deals?f=failed" icon={AlertTriangle} label="Failed payouts" n={s.attention.failed_payouts} testid="attention-failed-payouts" />
        </div>
        <p className="mb-2 mt-8 text-xs font-extrabold uppercase tracking-widest text-white/55">Money</p>
        {s.money_mode === "test" && <p className="mb-3 flex items-center gap-2 rounded-2xl bg-yellow-300/15 px-3.5 py-2.5 text-xs text-yellow-100" data-testid="admin-money-mocked"><FlaskConical className="h-4 w-4 shrink-0" />Payments, payouts and refunds are in TEST MODE (MOCKED) until Razorpay keys are added. No real money moves.</p>}
        <div className="grid gap-3 sm:grid-cols-3">
          <Card big icon={IndianRupee} label="Paid by businesses" value={inr(s.paid_by_businesses)} testid="stat-paid" />
          <Card big icon={Wallet} label="Platform earnings" sub="10% fee + Pro subscriptions" value={inr(s.platform_earnings)} testid="stat-earnings" />
          <Card big icon={Send} label="Paid out to creators" value={inr(s.paid_out)} testid="stat-paid-out" />
        </div>
        <p className="mb-2 mt-8 text-xs font-extrabold uppercase tracking-widest text-white/55">People & activity</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Card icon={Users} label="Users" value={s.users} testid="stat-users" />
          <Card icon={Clapperboard} label="Live creators" sub={`${s.creators_pending} pending · ${s.creators_rejected} rejected`} value={s.creators_live} testid="stat-creators" />
          <Card icon={Store} label="Businesses" value={s.businesses} testid="stat-businesses" />
          <Card icon={Crown} label="Pro subscribers (now)" value={s.pro_subs} testid="stat-pro" />
          <Card icon={Briefcase} label="Open jobs" value={s.open_jobs} testid="stat-jobs" />
          <Card icon={Handshake} label="Active deals" value={s.active_deals} testid="stat-active-deals" />
          <Card icon={CheckCircle2} label="Completed deals" value={s.completed_deals} testid="stat-completed-deals" />
        </div>
        <Growth />
        <Journey range={range} />
      </>)}
    </div>
  );
}
