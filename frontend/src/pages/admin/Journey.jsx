import { LogOut } from "lucide-react";
import { Box, Nothing, Spinner, useAdminData } from "@/pages/admin/bits";

const secs = (s) => (s == null ? "—" : s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`);

const Funnel = ({ steps, unit, testid, share }) => {
  const top = Math.max(1, steps[0]?.[unit] || 0);
  return (
    <div className="space-y-2" data-testid={testid}>
      {steps.map((s, i) => {
        const n = s[unit];
        const prev = i ? steps[i - 1][unit] : n;
        const tag = share ? (i ? `${Math.round((100 * n) / top)}% of visits` : "") : (i && prev > 0 && n <= prev ? `−${Math.round((100 * (prev - n)) / prev)}%` : "");
        return (
          <div key={s.step} data-testid={`${testid}-step-${i}`}>
            <div className="flex items-baseline justify-between gap-2 text-sm"><span className="font-bold">{s.step}</span><span className="shrink-0 font-extrabold">{n}{tag && <span className={`ml-1.5 text-xs font-bold ${share ? "text-white/60" : "text-rose-200"}`}>{tag}</span>}</span></div>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-[#FF5FA2] to-[#B35CFF] transition-[width] duration-700" style={{ width: `${Math.min(100, (100 * n) / top)}%` }} /></div>
          </div>
        );
      })}
    </div>
  );
};

export const Journey = ({ range }) => {
  const [j] = useAdminData("/admin/journey", { range });
  return (
    <section data-testid="admin-journey">
      <p className="mb-3 mt-8 text-xs font-extrabold uppercase tracking-widest text-white/55">User journey</p>
      {!j ? <Spinner /> : (<>
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="glass rounded-[22px] p-4"><p className="mb-3 font-extrabold">Which pages visits reach <span className="text-xs font-bold text-white/60">({j.sessions} visits)</span></p><Funnel steps={j.funnel} unit="sessions" testid="journey-funnel" share /></div>
          <div className="glass rounded-[22px] p-4"><p className="mb-3 font-extrabold">How far new accounts get</p><Funnel steps={j.accounts} unit="users" testid="account-funnel" /></div>
        </div>
        <p className="mb-2 mt-5 flex items-center gap-1.5 text-sm font-extrabold"><LogOut className="h-4 w-4" />Where people stop</p>
        <p className="-mt-1 mb-3 text-xs text-white/60">Pages where visits ended most often. A high exit rate with long time on page usually means people got stuck; a short time means the page didn't interest them. Setup steps show exactly where sign-up stalls.</p>
        <Box testid="journey-exits">
          {j.pages.length === 0 ? <Nothing t="No visits recorded yet. Data appears as people use the app." /> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead><tr className="border-b border-white/10 text-left text-xs text-white/60"><th className="px-4 py-2.5">Page</th><th className="px-2">Exit rate</th><th className="px-2">Stopped here</th><th className="px-2">Avg. time</th><th className="px-2">Visits</th><th className="px-4">Views</th></tr></thead>
                <tbody>{j.pages.map((p) => (
                  <tr key={p.page} className="border-b border-white/10 last:border-0" data-testid={`journey-page-${p.page}`}>
                    <td className="px-4 py-2.5 font-bold">{p.page}</td>
                    <td className="px-2"><span className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${p.exit_rate >= 60 ? "bg-rose-400/25 text-rose-100" : p.exit_rate >= 30 ? "bg-amber-300/20 text-amber-100" : "bg-emerald-300/20 text-emerald-100"}`}>{p.exit_rate}%</span></td>
                    <td className="px-2">{p.exits}</td><td className="px-2">{secs(p.avg_seconds)}</td><td className="px-2">{p.sessions}</td><td className="px-4">{p.views}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </Box>
      </>)}
    </section>
  );
};
