import { site } from "../content";
import { Icon } from "./Icons";
import { Logo } from "./Logo";

const footerLinks = [
  { label: "GitHub", href: site.github },
  { label: "npm", href: site.npm },
  { label: "README", href: site.readme },
  { label: "MIT license", href: `${site.github}/blob/main/LICENSE` },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-white/[0.055] py-12">
      <div className="container-page">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-[0.82rem] leading-6 text-paper-400">
              Component previews, without the project. Local-first, zero-config, and honest about what it stubbed.
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Footer">
            {footerLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[0.82rem] text-paper-400 transition-colors hover:text-paper-50"
              >
                {link.label}
                <Icon name="arrow-up-right" className="size-3 opacity-60" />
              </a>
            ))}
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-white/[0.055] pt-5 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-paper-500 sm:flex-row sm:items-center sm:justify-between">
          <span>
            {site.name} v{site.version} · MIT licensed
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="size-1 rounded-full bg-lime-400/60" />
            runs locally · 127.0.0.1
          </span>
        </div>
      </div>
    </footer>
  );
}
