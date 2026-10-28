import { pipeline, steps } from "../content";
import { Icon } from "./Icons";
import { SectionHeading } from "./SectionHeading";

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 py-24 sm:py-28 lg:py-32">
      <div className="container-page">
        <SectionHeading
          eyebrow="How it works"
          title={
            <>
              From file path to preview
              <span className="text-paper-500"> in one command.</span>
            </>
          }
          copy="No wizard, no config file, no hidden build step. The pipeline runs in dependency order and stops at the smallest useful preview."
        />

        <div className="mt-14 grid gap-3 md:grid-cols-3">
          {steps.map((step, index) => (
            <article key={step.number} className="group relative">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[0.65rem] tracking-[0.16em] text-lime-400">{step.number}</span>
                <span className="h-px flex-1 bg-gradient-to-r from-white/15 to-transparent" />
                {index < steps.length - 1 && (
                  <Icon
                    name="arrow-right"
                    className="hidden size-3.5 text-paper-600 md:block"
                    aria-hidden="true"
                  />
                )}
              </div>
              <h3 className="mt-6 text-[1.35rem] font-medium tracking-[-0.03em] text-paper-50">{step.title}</h3>
              <p className="mt-2.5 min-h-[4.5rem] text-[0.86rem] leading-6 text-paper-400">{step.copy}</p>
              <div className="mt-5 overflow-hidden rounded-xl border border-white/[0.07] bg-black/25 px-3.5 py-3">
                <code className="block truncate font-mono text-[0.68rem] text-paper-400">
                  <span className="text-lime-400">$ </span>
                  {step.code.replace("$ ", "")}
                </code>
              </div>
            </article>
          ))}
        </div>

        <div className="panel relative mt-4 overflow-hidden rounded-2xl p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-paper-500">
              Pipeline order · one pass
            </p>
            <p className="font-mono text-[0.6rem] text-paper-500">
              <span className="text-lime-400">8</span> modules ·{" "}
              <span className="text-full">1</span> local preview
            </p>
          </div>

          <div className="mt-5 flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {pipeline.map((node, index) => (
              <div key={node} className="flex shrink-0 items-center gap-1.5">
                <span
                  className={`pipeline-node rounded-md ${
                    index === 0
                      ? "border-lime-400/25 bg-lime-400/[0.07] text-lime-300"
                      : index === pipeline.length - 1
                        ? "border-full/25 bg-full/[0.07] text-full"
                        : ""
                  }`}
                >
                  {node}
                </span>
                {index < pipeline.length - 1 && <Icon name="chevron-down" className="size-3 -rotate-90 text-paper-600" />}
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-4 border-t border-white/[0.06] pt-5 sm:grid-cols-3">
            <div>
              <p className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-paper-500">Input</p>
              <p className="mt-1.5 text-[0.82rem] text-paper-300">A component file or stdin</p>
            </div>
            <div>
              <p className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-paper-500">Build</p>
              <p className="mt-1.5 text-[0.82rem] text-paper-300">Only the dependencies in use</p>
            </div>
            <div>
              <p className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-paper-500">Output</p>
              <p className="mt-1.5 text-[0.82rem] text-paper-300">Preview plus coverage report</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
