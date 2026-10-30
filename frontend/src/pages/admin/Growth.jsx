import { useState } from "react";
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { Seg } from "@/components/AppBits";
import { inr } from "@/lib/api";
import { Spinner, useAdminData } from "@/pages/admin/bits";

const fmt = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const tip = { contentStyle: { background: "#2A1B7A", border: "1px solid rgba(255,255,255,.15)", borderRadius: 14, color: "#fff" }, labelFormatter: fmt };
const axis = { stroke: "rgba(255,255,255,.55)", fontSize: 11, tickLine: false, axisLine: false };

const Chart = ({ title, total, children, testid }) => (
  <div className="glass rounded-[22px] p-4" data-testid={testid}>
    <div className="mb-2 flex items-baseline justify-between"><p className="font-extrabold">{title}</p><p className="text-sm font-extrabold text-white/80" data-testid={`${testid}-total`}>{total}</p></div>
    <div className="h-52"><ResponsiveContainer>{children}</ResponsiveContainer></div>
  </div>
);

export const Growth = () => {
  const [days, setDays] = useState(30);
  const [rows] = useAdminData("/admin/growth", { days });
  const sum = (k) => (rows || []).reduce((a, r) => a + r[k], 0);
  return (
    <section data-testid="admin-growth">
      <div className="mb-3 mt-8 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-extrabold uppercase tracking-widest text-white/55">Growth over time</p>
        <div className="w-64"><Seg value={String(days)} onChange={(v) => setDays(Number(v))} testid="growth-range" options={[["30", "30 days"], ["90", "90 days"], ["365", "1 year"]]} /></div>
      </div>
      {!rows ? <Spinner /> : (
        <div className="grid gap-3 lg:grid-cols-3">
          <Chart title="New users" total={sum("users")} testid="chart-users">
            <AreaChart data={rows}><defs><linearGradient id="gu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FF5FA2" stopOpacity={0.7} /><stop offset="1" stopColor="#FF5FA2" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} /><XAxis dataKey="date" tickFormatter={fmt} {...axis} minTickGap={24} /><YAxis allowDecimals={false} width={28} {...axis} /><Tooltip {...tip} />
              <Area type="monotone" dataKey="users" name="Users" stroke="#FF5FA2" strokeWidth={2} fill="url(#gu)" /></AreaChart>
          </Chart>
          <Chart title="New profiles & deals" total={`${sum("deals")} deals`} testid="chart-deals">
            <BarChart data={rows}><CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} /><XAxis dataKey="date" tickFormatter={fmt} {...axis} minTickGap={24} /><YAxis allowDecimals={false} width={28} {...axis} /><Tooltip {...tip} cursor={{ fill: "rgba(255,255,255,.06)" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} /><Bar dataKey="creators" name="Creators" stackId="a" fill="#7C5CFF" /><Bar dataKey="businesses" name="Businesses" stackId="a" fill="#3B82F6" /><Bar dataKey="deals" name="Deals" fill="#5CE0A0" radius={[4, 4, 0, 0]} /></BarChart>
          </Chart>
          <Chart title="Platform earnings" total={inr(sum("earnings"))} testid="chart-earnings">
            <AreaChart data={rows}><defs><linearGradient id="ge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5CE0A0" stopOpacity={0.7} /><stop offset="1" stopColor="#5CE0A0" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} /><XAxis dataKey="date" tickFormatter={fmt} {...axis} minTickGap={24} /><YAxis width={44} {...axis} tickFormatter={(v) => `₹${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`} /><Tooltip {...tip} formatter={(v) => inr(v)} />
              <Area type="monotone" dataKey="earnings" name="Earnings" stroke="#5CE0A0" strokeWidth={2} fill="url(#ge)" /></AreaChart>
          </Chart>
        </div>
      )}
    </section>
  );
};
