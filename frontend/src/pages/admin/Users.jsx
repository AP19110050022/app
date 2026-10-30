import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Crown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Box, H1, Nothing, Pill, Row, Spinner, useAdminData, when } from "@/pages/admin/bits";

const Filter = ({ value, onChange, items, testid }) => (
  <Select value={value || "all"} onValueChange={(v) => onChange(v === "all" ? "" : v)}>
    <SelectTrigger className="h-11 w-full rounded-full sm:w-40" data-testid={testid}><SelectValue /></SelectTrigger>
    <SelectContent>{items.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
  </Select>
);

export const Avatar = ({ src, name }) => src
  ? <img src={src} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
  : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/20 font-extrabold">{(name || "?")[0]}</span>;

export default function AdminUsers() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [f, setF] = useState({ role: "", status: "", pro: "" });
  const [list] = useAdminData("/admin/users", { q, ...f });
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  return (
    <div data-testid="admin-users">
      <H1 sub="Everyone on HireMyFace">Users</H1>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email" className="rounded-full pl-10" data-testid="users-search-input" /></div>
        <Filter value={f.role} onChange={set("role")} testid="users-filter-role" items={[["all", "All roles"], ["creator", "Creators"], ["business", "Businesses"], ["both", "Both"], ["none", "No profile"]]} />
        <Filter value={f.status} onChange={set("status")} testid="users-filter-status" items={[["all", "Any status"], ["active", "Active"], ["blocked", "Blocked"]]} />
        <Filter value={f.pro} onChange={set("pro")} testid="users-filter-pro" items={[["all", "Pro or not"], ["yes", "Pro only"]]} />
      </div>
      {!list ? <Spinner /> : (
        <Box testid="users-list">
          {list.length === 0 ? <Nothing t="No users match" /> : list.map((u) => (
            <Row key={u.user_id} onClick={() => navigate(`/admin/users/${u.user_id}`)} testid={`user-row-${u.user_id}`}>
              <Avatar src={u.image_url} name={u.name} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm font-bold">{u.name || "—"}{u.is_pro && <Crown className="h-3.5 w-3.5 text-amber-300" />}</p>
                <p className="truncate text-xs text-white/65">{u.email} · joined {when(u.created_at)}</p>
              </div>
              <Pill s={u.kind} label={u.kind === "none" ? "No profile" : u.kind} />
              {u.role !== "member" && <Pill s={u.role} label={u.role === "owner" ? "Main admin" : "Admin"} />}
              <Pill s={u.blocked ? "blocked" : "active"} testid={`user-status-${u.user_id}`} />
            </Row>
          ))}
        </Box>
      )}
    </div>
  );
}
