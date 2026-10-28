import { errorModes, statuses } from "../content";
import { Icon } from "./Icons";
import { SectionHeading } from "./SectionHeading";

const toneStyles = {
  full: {
    text: "text-full",
    border: "border-full/20",
    bg: "bg-full/[0.055]",
    icon: "check-circle" as const,
  },
  partial: {
    text: "text-partial",
    border: "border-partial/20",
    bg: "bg-partial/[0.055]",
    icon: "activity" as const,
  },
  failed: {
    text: "text-failed",
    border: "border-failed/20",
    bg: "bg-failed/[0.055]",
    icon: "x-circle" as const,
  },
};

export function StatusModel() {
  return (
    <section
      id="status"
      className="scroll-mt-20 border-y border-white/[0.05] bg-ink-900/45 py-24 sm:py-28 lg:py-32"
    >
      <div className="container-page">
        <SectionHeading
          align="center"
          eyebrow="Honest by default"
          title={
            <>
              Know how real
              <span className="text-paper-500"> the preview is.</span>
            </>
          }
          copy="Every preview carries a status. The browser panel and the terminal read from the same report, so you never have to guess what was exact and what was approximated."
        />

        <div className="mt-12 grid gap-3 md:grid-cols-3">
          {statuses.map((status) => {
            const tone = toneStyles[status.tone];
            return (
              <article
                key={status.status}
                className={`panel relative overflow-hidden rounded-2xl border-t ${tone.border} p-5 sm:p-6`}
              >
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center gap-2 font-mono text-[0.78rem] font-medium ${tone.text}`}>
                    <span className={`inline-flex size-7 items-center justify-center rounded-full ${tone.bg} ${tone.border} border`}>
                      <Icon name={tone.icon} className="size-3.5" />
                    </span>
                    {status.status}
                  </span>
                  <span className="font-mono text-[0.55rem] uppercase tracking-[0.14em] text-paper-500">
                    status
                  </span>
                </div>

                <h3 className="mt-7 text-[1.02rem] font-medium tracking-[-0.02em] text-paper-100">{status.title}</h3>
                <p className="mt-2.5 text-[0.85rem] leading-6 text-paper-400">{status.copy}</p>

                <div className="mt-5 overflow-hidden rounded-lg border border-white/[0.06] bg-black/25 px-3 py-2.5">
                  <code className={`block truncate font-mono text-[0.62rem] ${tone.text}`}>
                    <span className="mr-1.5 opacity-50">›</span>
                    {status.sample}
                  </code>
                </div>
              </article>
            );
          })}
        </div>

        <div className="panel mt-4 flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center sm:p-6">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-lime-400/20 bg-lime-400/[0.07] text-lime-400">
            <Icon name="shield" className="size-5" />
          </span>
          <div>
            <p className="text-[0.92rem] font-medium text-paper-100">FULL is earned, never defaulted.</p>
            <p className="mt-1 text-[0.82rem] leading-6 text-paper-400">
              If any approximation occurred, the preview says PARTIAL. A clean-looking screen is not evidence that
              everything resolved.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {errorModes.map((mode) => {
            const tone = toneStyles[mode.tone];
            return (
              <article key={mode.title} className="panel card-hover rounded-2xl p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <span className={`flex size-9 items-center justify-center rounded-xl border ${tone.border} ${tone.bg} ${tone.text}`}>
                    <Icon name={mode.icon} className="size-[1.05rem]" />
                  </span>
                  <code className={`rounded-full border ${tone.border} ${tone.bg} px-2 py-1 font-mono text-[0.55rem] ${tone.text}`}>
                    {mode.code}
                  </code>
                </div>
                <h3 className="mt-5 text-[1rem] font-medium tracking-[-0.02em] text-paper-100">{mode.title}</h3>
                <p className="mt-2 text-[0.84rem] leading-6 text-paper-400">{mode.copy}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
