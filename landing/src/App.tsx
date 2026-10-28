import { Footer } from "./components/Footer";
import { Features } from "./components/Features";
import { Hero } from "./components/Hero";
import { HowItWorks } from "./components/HowItWorks";
import { Install } from "./components/Install";
import { Nav } from "./components/Nav";
import { Privacy } from "./components/Privacy";
import { Problem } from "./components/Problem";
import { StatusModel } from "./components/StatusModel";

export function App() {
  return (
    <div className="relative min-h-screen">
      <div className="page-grid" aria-hidden="true" />
      <div className="page-glow" aria-hidden="true" />
      <div className="noise" aria-hidden="true" />

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-lime-400 focus:px-3.5 focus:py-2 focus:text-sm focus:font-semibold focus:text-ink-950"
      >
        Skip to content
      </a>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Nav />
        <main id="main" className="flex-1">
          <Hero />
          <Problem />
          <Features />
          <HowItWorks />
          <StatusModel />
          <Privacy />
          <Install />
        </main>
        <Footer />
      </div>
    </div>
  );
}
