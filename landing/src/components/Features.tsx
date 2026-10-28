import { features } from "../content";
import { Icon } from "./Icons";
import { SectionHeading } from "./SectionHeading";

export function Features() {
  return (
    <section id="features" className="scroll-mt-20 border-y border-white/[0.05] bg-ink-900/45 py-24 sm:py-28 lg:py-32">
      <div className="container-page">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            eyebrow="What you get"
            title={
              <>
                A real preview.
                <span className="text-paper-500"> With the receipts.</span>
              </>
            }
            copy="Convat is not trying to become your app. It builds enough context to render the component honestly — and shows you where that context came from."
          />
          <a
            href="https://github.com/PascalAmah/convat#readme"
            target="_blank"
            rel="noreferrer"
            className="group inline-flex shrink-0 items-center gap-2 self-start text-[0.8rem] font-medium text-paper-300 transition-colors hover:text-paper-50 lg:mb-1"
          >
            Read the docs
            <Icon
              name="arrow-up-right"
              className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </a>
        </div>

        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <article
              key={feature.title}
              className="panel card-hover group relative min-h-[15rem] overflow-hidden rounded-2xl p-5 sm:p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="flex size-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-paper-200 transition-colors group-hover:border-lime-400/20 group-hover:bg-lime-400/[0.07] group-hover:text-lime-400">
                  <Icon name={feature.icon} className="size-[1.1rem]" />
                </span>
                <span className="rounded-full border border-white/[0.07] bg-white/[0.025] px-2 py-1 font-mono text-[0.55rem] uppercase tracking-[0.11em] text-paper-500">
                  {feature.detail}
                </span>
              </div>

              <h3 className="mt-7 text-[1.03rem] font-medium tracking-[-0.02em] text-paper-100">{feature.title}</h3>
              <p className="mt-2.5 max-w-[21rem] text-[0.85rem] leading-6 text-paper-400">{feature.copy}</p>

              <span
                className="pointer-events-none absolute -bottom-3 right-3 select-none font-mono text-[3.8rem] font-semibold leading-none tracking-[-0.08em] text-white/[0.025]"
                aria-hidden="true"
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <span
                className="pointer-events-none absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-lime-400/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
                aria-hidden="true"
              />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
