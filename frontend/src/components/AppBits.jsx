export const SubHeader = ({ title, sub, right, back }) => (
  <div className="mb-4 flex items-center gap-3">
    {back}
    <div className="min-w-0 flex-1">
      <h1 className="truncate text-[22px] font-extrabold tracking-tight">{title}</h1>
      {sub && <p className="text-[13px] text-white/70">{sub}</p>}
    </div>
    {right}
  </div>
);

export const Seg = ({ value, onChange, options, testid }) => (
  <div className="flex gap-1 rounded-[20px] bg-white/15 p-[3px]" data-testid={testid}>
    {options.map(([k, label, Icon]) => (
      <button key={k} onClick={() => onChange(k)} data-testid={`${testid}-${k}`}
        className={`flex h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-[17px] px-3 text-sm font-bold transition-[background-color,color] ${value === k ? "bg-white text-[#3B25A8] shadow-[0_4px_12px_rgba(10,5,40,.25)]" : "text-white"}`}>
        {Icon && <Icon className="h-4 w-4" />}{label}
      </button>
    ))}
  </div>
);

export const Empty = ({ icon: Icon, title, text, action, testid }) => (
  <div className="glass-soft flex flex-col items-center rounded-[26px] px-6 py-14 text-center" data-testid={testid}>
    <span className="grid h-16 w-16 place-items-center rounded-full bg-white/15"><Icon className="h-7 w-7" /></span>
    <p className="mt-4 text-lg font-extrabold">{title}</p>
    {text && <p className="mt-1 max-w-xs text-sm text-white/70">{text}</p>}
    {action}
  </div>
);
