import {
  ArrowRightIcon,
  CheckIcon,
  CirclePlayIcon,
  UserRoundIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Logo } from "../components/common/Logo";
import { useLoopIndex } from "../lib/motion";

/* A QR-like pattern for the illustration only. It is not a real, scannable code. */
const QR_CELLS = [
  "1111111010110101111111",
  "1000001011001001000001",
  "1011101001110101011101",
  "1011101010011001011101",
  "1011101011100101011101",
  "1000001001011001000001",
  "1111111010101011111111",
  "0000000011010000000000",
  "1101011100111010110110",
  "0110100011010111001011",
  "1011011101101001110100",
  "0100110010110110011011",
  "1110101101001011100110",
  "0001010010111100101001",
  "0000000010100110110101",
  "1111111001101011001110",
  "1000001011010100111001",
  "1011101010111011010110",
  "1011101001001101101011",
  "1011101011110010010101",
  "1000001010011101101110",
  "1111111011101010011011",
];

const PAIRS = [
  {
    from: { code: "OM", name: "Afaan Oromo", text: "Dokumentiin kun akka sirritti hubatamuuf hiika barbaada." },
    to: { code: "EN", name: "English", text: "This document needs to be translated for better understanding." },
  },
  {
    from: { code: "AM", name: "Amharic", text: "ይህ ሰነድ በተሻለ እንዲገባ መተርጎም ያስፈልገዋል።" },
    to: { code: "EN", name: "English", text: "This document needs to be translated for better understanding." },
  },
  {
    from: { code: "EN", name: "English", text: "Official records should be clear in every language." },
    to: { code: "OM", name: "Afaan Oromo", text: "Galmeewwan seeraa afaan hundaan ifa ta'uu qabu." },
  },
];

const steps = ["Upload", "Review", "Translate"];

function QrIllustration() {
  return (
    <svg
      viewBox="0 0 22 22"
      className="size-20 text-ink"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {QR_CELLS.flatMap((row, y) =>
        [...row].map((cell, x) =>
          cell === "1" ? (
            <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor" />
          ) : null,
        ),
      )}
    </svg>
  );
}

function LangBadge({ code }) {
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[10px] font-semibold text-orange-800">
      {code}
    </span>
  );
}

/* Illustrative product preview. Sample content only, not a real document or verification result. */
function ProductPreview() {
  const pairIndex = useLoopIndex(PAIRS.length, 4500);
  const pair = PAIRS[pairIndex];
  const activeStep = pairIndex;

  return (
    <div className="relative mx-auto w-full max-w-xl text-left sm:pr-14" aria-hidden="true">
      <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5 shadow-[0px_20px_60px] shadow-orange-900/10">
        <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
          <span className="text-ink">
            <Logo size={22} />
          </span>
          <div className="hidden sm:flex items-center gap-5 text-[11px] text-ink-2">
            <span className="font-medium text-ink">Dashboard</span>
            <span>Documents</span>
            <span>Translator</span>
          </div>
          <span className="flex size-7 items-center justify-center rounded-full bg-bg-2 text-ink-2">
            <UserRoundIcon size={14} />
          </span>
        </div>

        <p className="mt-4 text-sm font-semibold text-ink">Translate Document</p>

        <div className="mt-4 px-2 sm:px-8">
          <div className="relative flex items-start justify-between">
            <span className="absolute left-4 right-4 top-2 h-0.5 overflow-hidden rounded-full bg-orange-100 dark:bg-orange-500/20">
              <span className="home-loop home-loop-progress block h-full origin-left bg-orange-400" />
            </span>
            {steps.map((step, i) => {
              const on = i <= activeStep;
              return (
                <div key={step} className="relative flex flex-col items-center gap-1.5">
                  <span
                    className={`flex size-4.5 items-center justify-center rounded-full ring-4 ring-white transition-colors duration-500 ${
                      on ? "bg-orange-500 text-white" : "bg-orange-100 text-orange-300"
                    }`}
                  >
                    <CheckIcon size={11} strokeWidth={3} />
                  </span>
                  <span className={`text-[11px] ${on ? "text-ink" : "text-ink-2"}`}>{step}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:mr-[72px] sm:gap-3 sm:pb-6">
          <div className="relative overflow-hidden rounded-xl border border-line p-3">
            <span className="home-loop home-loop-scan pointer-events-none absolute inset-x-0 h-8 bg-gradient-to-b from-transparent via-orange-400/25 to-transparent" />
            <div className="flex items-center gap-2">
              <LangBadge code={pair.from.code} />
              <div className="leading-tight">
                <p className="text-[11px] font-semibold text-ink">Original Document</p>
                <p className="text-[10px] text-ink-2">({pair.from.name})</p>
              </div>
            </div>
            <p key={`from-${pairIndex}`} className="home-loop home-loop-swap mt-3 text-xs/5 text-ink">
              {pair.from.text}
            </p>
          </div>
          <span className="home-loop home-loop-bob flex size-7 items-center justify-center rounded-full border border-line bg-surface text-orange-500">
            <ArrowRightIcon size={14} />
          </span>
          <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-3 dark:border-orange-500/30 dark:bg-orange-500/10">
            <div className="flex items-center gap-2">
              <LangBadge code={pair.to.code} />
              <div className="leading-tight">
                <p className="text-[11px] font-semibold text-ink">Translated Document</p>
                <p className="text-[10px] text-ink-2">({pair.to.name})</p>
              </div>
            </div>
            <p key={`to-${pairIndex}`} className="home-loop home-loop-swap mt-3 text-xs/5 text-ink">
              {pair.to.text}
            </p>
          </div>
        </div>
      </div>

      <div className="home-loop home-loop-float mx-auto mt-4 w-36 rounded-2xl border border-line bg-surface p-3 text-center shadow-[0px_16px_40px] shadow-orange-900/15 sm:absolute sm:-bottom-12 sm:right-0 sm:mt-0">
        <span className="home-loop home-loop-pulse mx-auto flex size-8 items-center justify-center rounded-full bg-green-600 text-white">
          <CheckIcon size={18} strokeWidth={3} />
        </span>
        <p className="mt-1.5 text-[11px] font-semibold text-ink">Document Verified</p>
        <div className="mt-2 flex justify-center">
          <QrIllustration />
        </div>
        <p className="mt-1.5 text-[10px] text-ink-2">Scan to verify</p>
      </div>
    </div>
  );
}

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

      <div className="relative grid items-center gap-14 px-6 pb-24 pt-32 md:px-16 md:pt-40 lg:px-24 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] xl:gap-10 xl:px-32">
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

        <div className="pb-0 sm:pb-12">
          <ProductPreview />
          <p className="mt-4 text-center text-[11px] text-muted sm:mt-16">
            Illustrative preview with sample content.
          </p>
        </div>
      </div>
    </div>
  );
}
