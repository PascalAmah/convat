import { installFlags, installNotes, installs, site } from "../content";
import { CopyButton } from "./CopyButton";
import { Icon } from "./Icons";
import { SectionHeading } from "./SectionHeading";

const copyButtonClass =
  "inline-flex shrink-0 items-center gap-1.5 rounded-[0.55rem] border border-white/10 bg-white/[0.055] px-2.5 py-2 text-[0.68rem] font-medium text-paper-200 transition-colors hover:bg-white/10 hover:text-paper-50";

export function Install() {
  return (
    <section
      id="install"
      className="scroll-mt-20 border-y border-white/[0.05] bg-ink-900/45 py-24 sm:py-28 lg:py-32"
    >
      <div className="container-page">
        <SectionHeading
          align="center"
          eyebrow="Install"
          title={
            <>
              One install.
              <span className="text-paper-500"> Then just a file.</span>
            </>
          }
          copy="Convat ships as a single CLI. Install it globally or run it once with npm exec — either way you need Node 18 or newer and nothing else."
        />

        <div className="mt-12 grid gap-3 lg:grid-cols-2">
          {installs.map((install) => (
            <article key={install.label} className="panel rounded-2xl p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-[1rem] font-medium tracking-[-0.02em] text-paper-100">{install.label}</h3>
                  <p className="mt-1.5 max-w-[26rem] text-[0.84rem] leading-6 text-paper-400">{install.copy}</p>
                </div>
                <span className="shrink-0 rounded-full border border-white/[0.07] bg-white/[0.025] px-2 py-1 font-mono text-[0.55rem] uppercase tracking-[0.11em] text-paper-500">
                  {install.tag}
                </span>
              </div>

              <div className="install-box mt-5">
                <span className="font-mono text-xs text-lime-400">$</span>
                <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-[0.7rem] text-paper-100 sm:text-[0.72rem]">
                  {install.command}
                </code>
                <CopyButton value={install.command} iconOnly className={copyButtonClass} />
              </div>

              {install.followUp && (
                <div className="install-box mt-2 opacity-80">
                  <span className="font-mono text-xs text-paper-500">$</span>
                  <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-[0.7rem] text-paper-300 sm:text-[0.72rem]">
                    {install.followUp}
                  </code>
                  <CopyButton value={install.followUp} iconOnly className={copyButtonClass} />
                </div>
              )}
            </article>
          ))}
        </div>

        <div className="panel mt-4 overflow-hidden rounded-2xl">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] px-5 py-4 sm:px-6">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-paper-500">
              Flags you will actually use
            </p>
            <a
              href={site.readme}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-1.5 text-[0.74rem] font-medium text-paper-300 transition-colors hover:text-paper-50"
            >
              Full CLI reference
              <Icon
                name="arrow-up-right"
                className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </a>
          </div>

          <dl className="grid sm:grid-cols-2">
            {installFlags.map((flag) => (
              <div
                key={flag.flag}
                className="flex flex-col gap-1 border-b border-white/[0.055] px-5 py-3.5 sm:odd:border-r sm:px-6"
              >
                <dt>
                  <code className="font-mono text-[0.7rem] text-lime-300">{flag.flag}</code>
                </dt>
                <dd className="text-[0.8rem] leading-5 text-paper-400">{flag.copy}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {installNotes.map((note) => (
            <div
              key={note}
              className="panel-flat flex items-start gap-2.5 rounded-xl px-4 py-3.5 text-[0.78rem] leading-5 text-paper-300"
            >
              <Icon name="check" className="mt-0.5 size-3.5 shrink-0 text-lime-400" />
              {note}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
