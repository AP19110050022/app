import { useState } from "react";
import { Trash2, ExternalLink } from "lucide-react";
import { Seg } from "@/components/AppBits";
import { PLAN_BY_ID } from "@/constants/options";
import { Box, Btn, H1, Nothing, Pill, ReasonDialog, Row, Spinner, useAdminData, useAdminRun, when } from "@/pages/admin/bits";

const isImg = (u) => u.startsWith("data:image") || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(u) || u.includes("images.unsplash.com");

const Jobs = ({ onRemove, jobs }) => (
  <Box testid="admin-jobs-list">
    {jobs.length === 0 ? <Nothing t="No jobs posted yet" /> : jobs.map((j) => (
      <Row key={j.id} testid={`admin-job-${j.id}`}>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{j.title}</p>
          <p className="truncate text-xs text-white/65">{j.company} · {j.city} · {j.plans.map((p) => PLAN_BY_ID[p]?.label).join(", ")} · {when(j.created_at)}</p>
          {j.removed_reason && <p className="text-xs text-rose-100">Removed: {j.removed_reason}</p>}
        </div>
        <Pill s={j.blocked ? "blocked" : j.status} />
        {j.status !== "removed" && <Btn small danger onClick={() => onRemove({ kind: "job", item: j })} testid={`remove-job-${j.id}`}><Trash2 className="h-3.5 w-3.5" />Remove</Btn>}
      </Row>
    ))}
  </Box>
);

const Posts = ({ posts, onRemove }) => posts.length === 0 ? <div className="glass rounded-[22px]"><Nothing t="No creator posts yet" /></div> : (
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" data-testid="admin-posts-grid">
    {posts.map((p) => (
      <div key={`${p.creator_id}-${p.index}`} className="glass overflow-hidden rounded-[20px]" data-testid={`admin-post-${p.creator_id}-${p.index}`}>
        {isImg(p.post) ? <img src={p.post} alt="" className="aspect-square w-full object-cover" />
          : <a href={p.post} target="_blank" rel="noreferrer" className="grid aspect-square place-items-center bg-white/10 text-xs"><ExternalLink className="h-6 w-6" /></a>}
        <div className="flex items-center gap-2 p-2.5">
          <img src={p.creator_photo} alt="" className="h-7 w-7 rounded-full object-cover" />
          <p className="min-w-0 flex-1 truncate text-xs font-bold">{p.creator_name}</p>
          <button onClick={() => onRemove({ kind: "post", item: p })} className="grid h-8 w-8 place-items-center rounded-full bg-rose-500/90" aria-label="Remove post" data-testid={`remove-post-${p.creator_id}-${p.index}`}><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>
    ))}
  </div>
);

export default function Content() {
  const [tab, setTab] = useState("jobs");
  const [jobs, reloadJobs] = useAdminData("/admin/jobs");
  const [posts, reloadPosts] = useAdminData("/admin/posts");
  const run = useAdminRun(() => { reloadJobs(); reloadPosts(); });
  const [rm, setRm] = useState(null);
  const confirm = (reason) => rm.kind === "job"
    ? run("post", `/admin/jobs/${rm.item.id}/remove`, { reason }, "Job removed")
    : run("post", "/admin/posts/remove", { creator_id: rm.item.creator_id, index: rm.item.index, prefix: rm.item.prefix, reason }, "Post removed");
  return (
    <div data-testid="admin-content">
      <H1 sub="Remove anything that breaks the rules">Jobs & posts</H1>
      <div className="mb-4 max-w-sm"><Seg value={tab} onChange={setTab} testid="content-tab" options={[["jobs", `Jobs${jobs ? ` (${jobs.length})` : ""}`], ["posts", `Posts${posts ? ` (${posts.length})` : ""}`]]} /></div>
      {tab === "jobs" ? (jobs ? <Jobs jobs={jobs} onRemove={setRm} /> : <Spinner />) : (posts ? <Posts posts={posts} onRemove={setRm} /> : <Spinner />)}
      <ReasonDialog open={!!rm} onOpenChange={(o) => !o && setRm(null)} danger cta="Remove" testid="remove-dialog"
        title={rm?.kind === "job" ? `Remove "${rm.item.title}"?` : `Remove this post by ${rm?.item.creator_name}?`} text="The owner gets a notification with your reason."
        onConfirm={confirm} />
    </div>
  );
}
