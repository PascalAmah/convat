type LogoProps = {
  compact?: boolean;
  className?: string;
};

export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="32" height="32" rx="9" fill="#0B0D11" />
      <rect x="0.5" y="0.5" width="31" height="31" rx="8.5" stroke="#D6FF62" strokeOpacity="0.24" />
      <path
        d="M13.5 9H11.25A2.25 2.25 0 0 0 9 11.25v9.5A2.25 2.25 0 0 0 11.25 23h2.25"
        stroke="#D6FF62"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M18.5 9h2.25A2.25 2.25 0 0 1 23 11.25v9.5A2.25 2.25 0 0 1 20.75 23H18.5"
        stroke="#D6FF62"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="16" cy="16" r="2.25" fill="#D6FF62" />
    </svg>
  );
}

export function Logo({ compact = false, className = "" }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className="size-8" />
      {!compact && (
        <span className="flex items-baseline gap-2">
          <span className="text-[1.05rem] font-semibold tracking-[-0.03em] text-paper-50">Convat</span>
          <span className="hidden rounded border border-white/10 bg-white/[0.035] px-1.5 py-0.5 font-mono text-[0.58rem] text-paper-400 sm:inline">
            v1.0
          </span>
        </span>
      )}
    </span>
  );
}
