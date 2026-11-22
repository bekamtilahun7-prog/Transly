import { ArrowRightIcon, CirclePlayIcon } from "lucide-react";
import { Link } from "react-router-dom";
import TranslationStage from "../components/home/TranslationStage";

export default function HeroSection() {
  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="dot-grid pointer-events-none absolute -left-6 top-28 h-56 w-40 opacity-40 [mask-image:linear-gradient(to_right,black,transparent)]"
      />
      <div
        aria-hidden="true"
        className="home-loop home-loop-orb pointer-events-none absolute -right-24 top-10 size-80 rounded-full bg-orange-200/50 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="home-loop home-loop-orb-alt pointer-events-none absolute left-1/2 top-72 size-40 rounded-full bg-orange-100/70 blur-2xl"
      />

      <div className="relative grid items-center gap-10 px-6 pb-20 pt-32 md:px-16 md:pt-40 lg:px-24 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] xl:gap-8 xl:px-32">
        <div className="flex flex-col items-center text-center xl:items-start xl:text-left">
          <a
            href="#features"
            className="flex items-center gap-2 rounded-full bg-orange-50 px-3.5 py-1.5 text-xs font-medium text-orange-800 transition hover:bg-orange-100"
          >
            <span className="home-loop home-loop-pulse size-2 rounded-full bg-orange-500" />
            AI-Powered Translation
          </a>
          <h1 className="mt-5 text-[40px]/12 font-semibold tracking-tight text-ink md:text-[54px]/16 xl:text-[44px]/14 min-[1440px]:text-[50px]/16">
            Documents understood.
            <span className="block text-orange-500">Languages connected.</span>
          </h1>
          <p className="mt-5 max-w-lg text-base/7 text-ink-2">
            Translate your documents between Afaan Oromo, Amharic, and English.
            Review, issue, and verify documents through one simple platform.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 xl:justify-start">
            <Link
              to="/register"
              className="home-loop home-loop-shine flex items-center gap-2 rounded-full bg-orange-500 px-7 py-3.5 font-medium text-white shadow-lg shadow-orange-500/30 transition hover:bg-orange-600 active:bg-orange-700"
            >
              <span>Start Translating</span>
              <ArrowRightIcon size={18} />
            </Link>
            <a
              href="#how-it-works"
              className="flex items-center gap-2 rounded-full border border-line bg-surface px-6 py-3.5 font-medium text-ink transition hover:bg-hover"
            >
              <CirclePlayIcon size={18} />
              <span>Explore How It Works</span>
            </a>
          </div>
        </div>

        <div className="pb-8 sm:pb-4">
          <TranslationStage />
        </div>
      </div>
    </div>
  );
}
