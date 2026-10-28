import { privacyPoints } from "../content";
import { Icon } from "./Icons";
import { SectionHeading } from "./SectionHeading";

const reportRows = [
  { label: "Source code", value: "stays local" },
  { label: "Telemetry", value: "none" },
  { label: "Remote builds", value: "none" },
  { label: "Project files", value: "unchanged" },
] as const;

export function Privacy() {
  return (
    <section id="privacy" className="scroll-mt-20 py-24 sm:py-28 lg:py-32">
      <div className="container-page">
        <div className="grid items-center gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16">
          <div>
            <SectionHeading
              eyebrow="Privacy"
              title={
                <>
                  Your code never
                  <span className="text-paper-500"> leaves your machine.</span>
                </>
              }
              copy="A preview should not require a cloud account or a remote build farm. Convat runs as a local process and serves the browser on the loopback interface."
            />

            <ul className="mt-8 space-y-3.5">
              {privacyPoints.map((point) => (
                <li key={point} className="flex items-start gap-3 text-[0.86rem] leading-6 text-paper-300">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-lime-400/15 bg-lime-400/[0.06] text-lime-400">
                    <Icon name="check" className="size-3" />
                  </span>
                  {point}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
              <Icon name="info" className="mt-0.5 size-4 shrink-0 text-paper-500" />
              <p className="text-[0.76rem] leading-5 text-paper-400">
                <code className="text-paper-200">--share</code> is planned for later. If it ships, it will be
                opt-in and documented with its privacy tradeoffs — never a default.
              </p>
            </div>
          </div>

          <div className="relative">
            <div
              className="pointer-events-none absolute -inset-8 -z-10 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(73,217,155,0.08),transparent_65%)] blur-2xl"
              aria-hidden="true"
            />
            <div className="terminal-window">
              <div className="flex h-11 items-center justify-between border-b border-white/[0.075] bg-white/[0.025] px-4">
                <div className="flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.13em] text-paper-500">
                  <Icon name="shield" className="size-3.5 text-full" />
                  Network boundary
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-full/20 bg-full/[0.07] px-2 py-1 font-mono text-[0.55rem] text-full">
                  <span className="status-dot" />
                  loopback only
                </span>
              </div>

              <div className="p-5 sm:p-6">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-paper-500">
                      Data sent off-device
                    </p>
                    <p className="mt-2 text-[3.1rem] font-medium leading-none tracking-[-0.06em] text-paper-50">
                      0<span className="ml-2 text-[0.9rem] font-normal tracking-normal text-paper-400">bytes</span>
                    </p>
                  </div>
                  <Icon name="lock" className="mb-1 size-7 text-full/70" />
                </div>

                <div className="mt-6 border-t border-white/[0.06]">
                  {reportRows.map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between border-b border-white/[0.055] py-2.5 text-[0.76rem]"
                    >
                      <span className="text-paper-400">{row.label}</span>
                      <span className="inline-flex items-center gap-1.5 font-mono text-[0.62rem] text-full">
                        <Icon name="check" className="size-3" />
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-xl border border-white/[0.06] bg-black/25 p-3.5">
                  <div className="flex flex-wrap items-center justify-center gap-2 font-mono text-[0.58rem] text-paper-400">
                    <span className="rounded border border-white/[0.07] bg-white/[0.03] px-2 py-1.5 text-paper-200">
                      browser
                    </span>
                    <span className="text-lime-400">↔</span>
                    <span className="rounded border border-lime-400/20 bg-lime-400/[0.07] px-2 py-1.5 text-lime-300">
                      127.0.0.1
                    </span>
                    <span className="text-lime-400">↔</span>
                    <span className="rounded border border-white/[0.07] bg-white/[0.03] px-2 py-1.5 text-paper-200">
                      component
                    </span>
                  </div>
                  <p className="mt-3 text-center font-mono text-[0.55rem] uppercase tracking-[0.11em] text-paper-500">
                    the only network path
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
