import { useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { Seg } from "@/components/AppBits";
import { Box, Nothing, Spinner, useAdminData } from "@/pages/admin/bits";

const fmt = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const axis = { stroke: "rgba(255,255,255,.55)", fontSize: 11, tickLine: false, axisLine: false };

export const SignInHealth = () => {
  const [days, setDays] = useState(14);
  const [h] = useAdminData("/admin/signin-health", { days });
  const bad = h && h.today_fail_rate >= 20;
  return (
    <section data-testid="admin-signin-health">
      <div className="mb-3 mt-8 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-extrabold uppercase tracking-widest text-white/55">Sign-in health</p>
        <div className="w-56"><Seg value={String(days)} onChange={(v) => setDays(Number(v))} testid="signin-range" options={[["7", "7 days"], ["14", "14 days"], ["30", "30 days"]]} /></div>
      </div>
      {!h ? <Spinner /> : (<>
        <p className={`mb-3 flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-sm ${bad ? "bg-rose-500/25 text-rose-100" : "bg-emerald-300/15 text-emerald-100"}`} data-testid="signin-today">
          {bad ? <ShieldAlert className="h-4 w-4 shrink-0" /> : <ShieldCheck className="h-4 w-4 shrink-0" />}
          Today {h.today_fail_rate}% of sign-ins failed{bad ? " — something may be wrong with sign-in." : "."}
        </p>
        <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
          <div className="glass rounded-[22px] p-4" data-testid="signin-chart">
            <p className="mb-2 font-extrabold">Sign-ins per day</p>
            <div className="h-52"><ResponsiveContainer>
              <BarChart data={h.days}><CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} /><XAxis dataKey="date" tickFormatter={fmt} {...axis} minTickGap={20} /><YAxis allowDecimals={false} width={28} {...axis} />
                <Tooltip contentStyle={{ background: "#2A1B7A", border: "1px solid rgba(255,255,255,.15)", borderRadius: 14, color: "#fff" }} labelFormatter={fmt} cursor={{ fill: "rgba(255,255,255,.06)" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="signed_in" name="Signed in" stackId="a" fill="#5CE0A0" />
                <Bar dataKey="me_failed" name="Couldn't finish" stackId="a" fill="#FF5FA2" />
                <Bar dataKey="bounced" name="Sent back to login" stackId="a" fill="#F59E0B" radius={[4, 4, 0, 0]} /></BarChart>
            </ResponsiveContainer></div>
          </div>
          <Box testid="signin-hosts">
            <p className="px-4 pt-3 font-extrabold">By web address</p>
            {h.hosts.length === 0 ? <Nothing t="No sign-in activity yet" /> : (
              <table className="w-full text-sm"><thead><tr className="text-left text-xs text-white/60"><th className="px-4 py-2">Address</th><th className="px-2">OK</th><th className="px-2">Failed</th><th className="px-4">Login page</th></tr></thead>
                <tbody>{h.hosts.map((x) => (
                  <tr key={x.host} className="border-t border-white/10" data-testid={`signin-host-${x.host}`}>
                    <td className="max-w-[160px] truncate px-4 py-2 font-bold" title={x.host}>{x.host}</td><td className="px-2">{x.signed_in}</td>
                    <td className={`px-2 font-extrabold ${x.me_failed + x.bounced ? "text-rose-200" : ""}`}>{x.me_failed + x.bounced}</td><td className="px-4">{x.signin_page}</td>
                  </tr>
                ))}</tbody></table>
            )}
          </Box>
        </div>
        <p className="mt-2 text-xs text-white/55">"Sent back to login" means someone opened the login page and was signed out again within 3 minutes — the sign-in loop. "Couldn't finish" means they signed in but their account couldn't load.</p>
      </>)}
    </section>
  );
};
