import { site, trustItems } from "../content";
import { CopyButton } from "./CopyButton";
import { Icon } from "./Icons";
import { PreviewDemo } from "./PreviewDemo";

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pt-16 sm:pt-24 lg:pt-28">
      <div className="container-page relative z-10">
        <div className="grid items-center gap-14 lg:grid-cols-[1.06fr_0.94fr] lg:gap-10 xl:gap-16">
          <div className="animate-rise">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-lime-400/20 bg-lime-400/[0.055] py-1.5 pl-2 pr-3 text-[0.68rem] font-medium text-lime-300">
              <span className="inline-flex size-4 items-center justify-center rounded-full bg-lime-400/15">
                <span className="status-dot animate-pulse-soft text-lime-400" />
              </span>
              <span className="font-mono tracking-[0.04em]">v{site.version} · local-first preview runtime</span>
            </div>

            <h1 className="heading-display mt-7 text-paper-50">
              See any React
              <span className="block">component.</span>
              <span className="block text-gradient-lime">Without a project.</span>
            </h1>

            <p className="mt-6 max-w-[34rem] text-pretty-copy text-[1.02rem] leading-7 text-paper-300 sm:text-[1.08rem]">
              Point Convat at one <code className="rounded bg-white/[0.055] px-1.5 py-0.5 text-[0.86em] text-paper-100">.tsx</code>{" "}
              file. It builds the smallest runtime it can, mocks the props, stubs what it cannot resolve, and tells
              you exactly how real the preview is.
            </p>

            <div className="mt-8 max-w-[31rem]">
              <div className="install-box">
                <span className="font-mono text-xs text-lime-400">$</span>
                <code className="min-w-0 flex-1 truncate font-mono text-[0.72rem] text-paper-100 sm:text-xs">
                  {site.install}
                </code>
                <CopyButton
                  value={site.install}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-[0.55rem] border border-white/10 bg-white/[0.055] px-2.5 py-2 text-[0.68rem] font-medium text-paper-200 transition-colors hover:bg-white/10 hover:text-paper-50"
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                <a href="#install" className="button-primary">
                  Get started
                  <Icon name="arrow-right" className="size-3.5" />
                </a>
                <a href={site.github} target="_blank" rel="noreferrer" className="button-secondary">
                  <Icon name="github" className="size-4" />
                  View source
                </a>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[0.65rem] text-paper-500">
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="check" className="size-3 text-lime-400" />
                  no project setup
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="check" className="size-3 text-lime-400" />
                  no outbound network
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="check" className="size-3 text-lime-400" />
                  no account
                </span>
              </div>
            </div>
          </div>

          <div className="animate-rise lg:pl-3" style={{ animationDelay: "120ms" }}>
            <PreviewDemo />
          </div>
        </div>

        <div className="mt-16 border-y border-white/[0.055] py-4 sm:mt-20">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            {trustItems.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.13em] text-paper-500"
              >
                <span className="size-1 rounded-full bg-lime-400/60" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
