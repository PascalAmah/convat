import { problems, solution } from "../content";
import { Icon } from "./Icons";
import { SectionHeading } from "./SectionHeading";

export function Problem() {
  return (
    <section className="relative py-24 sm:py-28 lg:py-32">
      <div className="container-page">
        <SectionHeading
          eyebrow="The setup tax"
          title={
            <>
              One component shouldn&apos;t require
              <span className="text-paper-500"> the whole project.</span>
            </>
          }
          copy="You already know what the component should look like. Getting there is the expensive part."
        />

        <div className="mt-12 grid gap-3 md:grid-cols-3">
          {problems.map((problem) => (
            <article
              key={problem.label}
              className="panel card-hover group relative overflow-hidden rounded-2xl p-5 sm:p-6"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-paper-500">
                  {problem.label}
                </span>
                <span className="flex size-8 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025] text-paper-500 transition-colors group-hover:text-paper-200">
                  <Icon name={problem.icon} className="size-4" />
                </span>
              </div>
              <h3 className="mt-8 text-[1.05rem] font-medium tracking-[-0.02em] text-paper-100">{problem.title}</h3>
              <p className="mt-3 text-[0.86rem] leading-6 text-paper-400">{problem.copy}</p>
              <div className="mt-6 h-px bg-gradient-to-r from-white/10 to-transparent" />
              <div className="mt-4 flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-failed/70">
                <Icon name="x" className="size-3" />
                avoidable
              </div>
            </article>
          ))}
        </div>

        <div className="panel relative mt-4 overflow-hidden rounded-2xl p-5 sm:p-7">
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(ellipse_at_right,rgba(214,255,98,0.09),transparent_68%)]"
            aria-hidden="true"
          />
          <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border border-lime-400/20 bg-lime-400/[0.08] text-lime-400">
                <Icon name="zap" className="size-5" />
              </span>
              <div>
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-lime-400/80">
                  The Convat approach
                </p>
                <p className="mt-2 max-w-2xl text-[0.98rem] leading-6 text-paper-200">{solution}</p>
              </div>
            </div>
            <a
              href="#how-it-works"
              className="inline-flex shrink-0 items-center gap-2 self-start rounded-lg border border-white/10 bg-white/[0.035] px-3.5 py-2 text-[0.76rem] font-medium text-paper-200 transition-colors hover:bg-white/[0.07] md:self-auto"
            >
              See the pipeline
              <Icon name="arrow-right" className="size-3.5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
