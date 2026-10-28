import { STATUS } from "@/constants/options";

export const StatusBadge = ({ status, testid }) => {
  const s = STATUS[status] || STATUS.pending;
  const Icon = s.icon;
  return (
    <span data-testid={testid || `status-badge-${status}`} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${s.cls}`}>
      <Icon className="h-3.5 w-3.5" /> {s.label}
    </span>
  );
};
