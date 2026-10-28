const bars = [34, 46, 40, 58, 52, 68, 61, 76, 70, 84, 78, 94];

function RevenueCard() {
  return (
    <div className="w-full rounded-[0.9rem] border border-[#0f1720]/10 bg-white p-4 shadow-[0_18px_45px_-28px_rgba(15,23,32,0.45)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#697586]">Revenue overview</p>
          <p className="mt-2 text-[2rem] font-semibold leading-none tracking-[-0.055em] text-[#101820]">
            $48,290
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#e7f8ee] px-2 py-1 font-mono text-[9px] font-medium text-[#15803d]">
          <span className="size-1 rounded-full bg-[#22c55e]" />
          +12.4%
        </span>
      </div>

      <div className="mt-5 flex h-24 items-end gap-[5px]">
        {bars.map((bar, index) => (
          <div
            key={`${bar}-${index}`}
            className="chart-bar flex-1 rounded-t-[3px] bg-[#a8d8bf]"
            style={{
              height: `${bar}%`,
              animationDelay: `${index * 55 + 120}ms`,
              opacity: bar > 80 ? 1 : 0.7,
            }}
          />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[#0f1720]/8 pt-3">
        <div>
          <p className="text-[9px] text-[#77818f]">Active subscriptions</p>
          <p className="mt-0.5 text-[11px] font-semibold text-[#1a2430]">1,284</p>
        </div>
        <div>
          <p className="text-[9px] text-[#77818f]">Monthly churn</p>
          <p className="mt-0.5 text-[11px] font-semibold text-[#1a2430]">2.1%</p>
        </div>
      </div>
    </div>
  );
}

export function PreviewDemo() {
  return (
    <figure
      className="relative mx-auto w-full max-w-[620px]"
      aria-label="Convat preview interface showing a RevenueCard component with PARTIAL status and two stubbed dependencies"
    >
      <div
        className="pointer-events-none absolute -inset-10 -z-10 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(214,255,98,0.12),transparent_66%)] blur-2xl"
        aria-hidden="true"
      />

      <div className="relative animate-float">
        <div className="pointer-events-none absolute -inset-px rounded-[1.2rem] bg-[linear-gradient(145deg,rgba(214,255,98,0.28),transparent_28%,transparent_72%,rgba(73,217,155,0.16))] opacity-60 blur-[0.5px]" />

        <div className="terminal-window relative">
          <div
            className="flex h-11 items-center gap-2 border-b border-white/[0.075] bg-white/[0.025] px-3.5"
            aria-hidden="true"
          >
            <div className="flex items-center gap-1.5">
              <span className="window-dot bg-[#f87171]/70" />
              <span className="window-dot bg-[#fbbf24]/70" />
              <span className="window-dot bg-[#4ade80]/70" />
            </div>
            <div className="mx-auto flex items-center gap-2 rounded-md border border-white/[0.07] bg-black/20 px-2.5 py-1 font-mono text-[9px] text-paper-400">
              <span className="size-1 rounded-full bg-full" />
              127.0.0.1:3000
            </div>
            <div className="w-12" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[176px_minmax(0,1fr)]" aria-hidden="true">
            <aside className="hidden border-r border-white/[0.07] bg-[#090c10]/80 p-3.5 sm:block">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-paper-500">
                  Coverage
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-partial/25 bg-partial/10 px-1.5 py-0.5 font-mono text-[8px] font-medium text-partial">
                  <span className="status-dot" />
                  PARTIAL
                </span>
              </div>

              <p className="mt-2 text-[10px] leading-4 text-paper-300">
                2 dependencies stubbed.
                <br />
                <span className="text-paper-500">Preview is still usable.</span>
              </p>

              <div className="mt-3.5 border-t border-white/[0.06] pt-3">
                <div className="flex items-center justify-between font-mono text-[8.5px] uppercase tracking-[0.12em] text-paper-500">
                  <span>Props</span>
                  <span className="text-paper-400">8 / 8</span>
                </div>
                <div className="mt-2.5 space-y-2">
                  <div>
                    <span className="font-mono text-[8.5px] text-paper-400">title</span>
                    <div className="mt-1 rounded border border-white/[0.08] bg-white/[0.035] px-2 py-1.5 text-[9.5px] text-paper-200">
                      Revenue overview
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[8.5px] text-paper-400">compact</span>
                    <span className="flex h-3.5 w-6 items-center rounded-full border border-white/10 bg-white/[0.055] p-0.5">
                      <span className="size-2.5 rounded-full bg-paper-500" />
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3.5 border-t border-white/[0.06] pt-3">
                <div className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-paper-500">
                  Classified stubs
                </div>
                <div className="stub-row mt-1.5">
                  <span className="font-mono text-[9px] text-paper-300">useMetrics</span>
                  <span className="rounded bg-partial/10 px-1 py-0.5 font-mono text-[7.5px] text-partial">hook</span>
                </div>
                <div className="stub-row">
                  <span className="font-mono text-[9px] text-paper-300">TrendChart</span>
                  <span className="rounded bg-partial/10 px-1 py-0.5 font-mono text-[7.5px] text-partial">ui</span>
                </div>
              </div>

              <div className="mt-3.5 border-t border-white/[0.06] pt-3">
                <div className="flex items-center justify-between text-[9px] text-paper-400">
                  <span>Styles</span>
                  <span className="font-mono text-[8px] text-full">compatible</span>
                </div>
              </div>
            </aside>

            <div className="relative min-w-0 bg-[#f2efe6]">
              <div className="flex items-center justify-between border-b border-[#0f1720]/8 px-3 py-2">
                <span className="font-mono text-[8.5px] text-[#6b7480]">RevenueCard.tsx</span>
                <span className="rounded border border-[#0f1720]/10 bg-white/60 px-1.5 py-0.5 font-mono text-[7.5px] text-[#65707c]">
                  React 18
                </span>
              </div>

              <div className="dot-grid relative px-3 py-4 sm:px-4 sm:py-5">
                <div className="mb-3 flex items-center justify-between sm:hidden">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#b7791f]/20 bg-[#fdf3dc] px-2 py-1 font-mono text-[8px] font-medium text-[#9a6700]">
                    <span className="size-1 rounded-full bg-[#d69e2e]" />
                    PARTIAL
                  </span>
                  <span className="font-mono text-[8px] text-[#7a828c]">2 stubs</span>
                </div>
                <RevenueCard />
                <div className="mt-3 text-center font-mono text-[7.5px] text-[#8a919a]">
                  rendered at 100% · local preview
                </div>
              </div>
            </div>
          </div>

          <div
            className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.07] bg-[#080a0d] px-3.5 py-2.5 font-mono text-[9px] text-paper-400"
            aria-hidden="true"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="text-lime-400">$</span>
              <span className="truncate">convat ./RevenueCard.tsx</span>
              <span className="animate-blink text-lime-400">▌</span>
            </div>
            <span className="inline-flex items-center gap-1.5 text-partial">
              <span className="status-dot" />
              preview ready · PARTIAL
            </span>
          </div>
        </div>
      </div>

      <figcaption className="sr-only">
        A local Convat preview with an amber PARTIAL badge, two classified stubs, generated prop controls, and a
        rendered revenue card.
      </figcaption>
    </figure>
  );
}
