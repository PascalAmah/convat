import { useEffect, useState } from "react";
import { navLinks, site } from "../content";
import { Logo } from "./Logo";
import { Icon } from "./Icons";

export function Nav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.055] bg-ink-950/78 backdrop-blur-xl">
      <div className="container-page flex h-[4.35rem] items-center justify-between gap-6">
        <a href="#top" className="shrink-0 rounded-lg" aria-label="Convat home">
          <Logo />
        </a>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Main navigation">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[0.82rem] font-medium text-paper-300 transition-colors hover:text-paper-50"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href={site.github}
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-2 rounded-lg px-2.5 py-2 text-[0.8rem] font-medium text-paper-300 transition-colors hover:text-paper-50 sm:flex"
          >
            <Icon name="github" className="size-4" />
            <span>GitHub</span>
          </a>
          <a href="#install" className="button-primary hidden !px-4 !py-2.5 text-[0.78rem] sm:inline-flex">
            Install
            <Icon name="arrow-right" className="size-3.5" />
          </a>
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-paper-200 md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((current) => !current)}
          >
            <Icon name={open ? "x" : "menu"} className="size-4.5" />
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-menu" className="border-t border-white/[0.055] bg-ink-950/96 md:hidden">
          <nav className="container-page flex flex-col py-3" aria-label="Mobile navigation">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="border-b border-white/[0.055] py-3.5 text-[0.92rem] text-paper-200"
              >
                {link.label}
              </a>
            ))}
            <a
              href={site.github}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 py-4 text-[0.92rem] text-paper-200"
            >
              <Icon name="github" className="size-4" />
              GitHub
            </a>
            <a href="#install" onClick={() => setOpen(false)} className="button-primary mt-1 w-full">
              Install Convat
              <Icon name="arrow-right" className="size-3.5" />
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
