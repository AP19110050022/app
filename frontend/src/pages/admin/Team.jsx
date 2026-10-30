import { useState } from "react";
import { Navigate } from "react-router-dom";
import { UserPlus, Trash2, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useMe } from "@/context/MeContext";
import { Avatar } from "@/pages/admin/Users";
import { Box, Btn, H1, Nothing, Pill, ReasonDialog, Row, Spinner, useAdminData, useAdminRun, when } from "@/pages/admin/bits";

export default function Team() {
  const { me } = useMe();
  const [d, reload] = useAdminData(me.user.role === "owner" ? "/admin/team" : "/admin/log");
  const run = useAdminRun(reload);
  const [email, setEmail] = useState("");
  const [rm, setRm] = useState(null);
  if (me.user.role !== "owner") return <Navigate to="/admin" replace />;
  const add = async (e) => { e.preventDefault(); if (await run("post", "/admin/team", { email }, "Admin added")) setEmail(""); };
  return (
    <div className="max-w-3xl" data-testid="admin-team">
      <H1 sub="Helper admins can do everything except manage the team and block admins">Admin team</H1>
      <form onSubmit={add} className="glass mb-5 flex flex-col gap-2 rounded-[22px] p-4 sm:flex-row">
        <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="helper@email.com" className="rounded-full" data-testid="team-email-input" />
        <button type="submit" className="cta inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full px-5 text-sm font-extrabold" data-testid="team-add-button"><UserPlus className="h-4 w-4" />Add helper</button>
      </form>
      <p className="-mt-3 mb-5 px-1 text-xs text-white/60">If they don't have a HireMyFace account yet, they become admin as soon as they sign up with this email.</p>
      {!d?.admins ? <Spinner /> : (<>
        <Box testid="team-list">
          {d.admins.map((a) => (
            <Row key={a.user_id} testid={`team-admin-${a.user_id}`}>
              <Avatar src={a.image_url} name={a.name} />
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{a.name}</p><p className="truncate text-xs text-white/65">{a.email}</p></div>
              <Pill s={a.role} label={a.role === "owner" ? "Main admin" : "Helper"} />
              {a.role === "admin" && <Btn small danger onClick={() => setRm(a.email)} testid={`team-remove-${a.user_id}`}><Trash2 className="h-3.5 w-3.5" />Remove</Btn>}
            </Row>
          ))}
        </Box>
        <p className="mb-2 mt-6 text-xs font-extrabold uppercase tracking-widest text-white/55">Waiting to sign up ({d.invites.length})</p>
        <Box testid="team-invites">
          {d.invites.length === 0 ? <Nothing t="No pending invites" /> : d.invites.map((i) => (
            <Row key={i.email} testid={`team-invite-${i.email}`}>
              <Mail className="h-5 w-5 text-white/70" /><p className="min-w-0 flex-1 truncate text-sm">{i.email}<span className="block text-xs text-white/55">invited {when(i.created_at)}</span></p>
              <Btn small danger onClick={() => setRm(i.email)} testid={`team-cancel-${i.email}`}><Trash2 className="h-3.5 w-3.5" />Cancel</Btn>
            </Row>
          ))}
        </Box>
      </>)}
      <ReasonDialog open={!!rm} onOpenChange={(o) => !o && setRm(null)} danger noReason cta="Remove" testid="team-remove-dialog"
        title="Remove this admin?" text={`${rm} loses access to the admin panel right away.`}
        onConfirm={() => run("delete", `/admin/team/${encodeURIComponent(rm)}`, undefined, "Admin removed")} />
    </div>
  );
}
