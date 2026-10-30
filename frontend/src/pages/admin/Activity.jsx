import { History } from "lucide-react";
import { Box, H1, Nothing, Row, Spinner, useAdminData, when } from "@/pages/admin/bits";

export default function Activity() {
  const [log] = useAdminData("/admin/log");
  return (
    <div className="max-w-3xl" data-testid="admin-activity">
      <H1 sub="Who did what and when">Activity log</H1>
      {!log ? <Spinner /> : (
        <Box testid="activity-list">
          {log.length === 0 ? <Nothing t="No admin actions yet" /> : log.map((l) => (
            <Row key={l.id} testid={`activity-${l.id}`}>
              <History className="h-5 w-5 shrink-0 text-white/60" />
              <div className="min-w-0 flex-1">
                <p className="text-sm"><b>{l.admin_name}</b> {l.action} <b>{l.target}</b></p>
                {l.detail && <p className="truncate text-xs text-white/60">{l.detail}</p>}
              </div>
              <span className="text-xs text-white/55">{when(l.at)}</span>
            </Row>
          ))}
        </Box>
      )}
    </div>
  );
}
