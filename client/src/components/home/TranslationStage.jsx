import { CheckIcon, UserRoundIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { useLocale } from "../../context/LocaleContext";
import { Logo } from "../common/Logo";
import { useLoopIndex, useMotionOk } from "../../lib/motion";

const PAIRS = [
  {
    from: { code: "OM", name: "Afaan Oromo", lines: ["Dokumentiin kun hiika", "barbaada akka ifa ta'u."] },
    to: { code: "EN", name: "English", lines: ["This document needs a", "clear translation."] },
  },
  {
    from: { code: "AM", name: "Amharic", lines: ["ይህ ሰነድ በትክክል", "መተርጎም አለበት።"] },
    to: { code: "EN", name: "English", lines: ["This document should be", "translated accurately."] },
  },
  {
    from: { code: "EN", name: "English", lines: ["Official records should", "be clear in every language."] },
    to: { code: "OM", name: "Afaan Oromo", lines: ["Galmeewwan seeraa", "afaan hundaan ifa ta'uu qabu."] },
  },
];

const GLYPHS = [
  { text: "አ", phase: 0.2 },
  { text: "a", phase: 1.1 },
  { text: "ላ", phase: 2.4 },
  { text: "OM", phase: 3.3 },
  { text: "EN", phase: 4.6 },
  { text: "የ", phase: 5.5 },
];

function LangBadge({ code }) {
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[10px] font-semibold text-orange-800">
      {code}
    </span>
  );
}

function PageCard({ side, lang, lines, originalLabel, translatedLabel }) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border p-3 ${
        side === "to" ? "border-orange-200 bg-orange-50/70 dark:border-orange-500/30 dark:bg-orange-500/10" : "border-line bg-surface"
      }`}
    >
      {side === "from" && (
        <span
          data-scan
          className="pointer-events-none absolute inset-x-0 h-8 bg-gradient-to-b from-transparent via-orange-400/30 to-transparent"
          style={{ top: "18%" }}
        />
      )}
      <div className="flex items-center gap-2">
        <LangBadge code={lang.code} />
        <div className="leading-tight">
          <p className="text-[11px] font-semibold text-ink">{side === "from" ? originalLabel : translatedLabel}</p>
          <p className="text-[10px] text-ink-2">{lang.name}</p>
        </div>
      </div>
      <div className="mt-3 space-y-1.5">
        {lines.map((line) => (
          <p key={line} className="text-xs/5 text-ink">
            {line}
          </p>
        ))}
        <span className="mt-2 block h-1.5 w-4/5 rounded-full bg-line" />
        <span className="block h-1.5 w-3/5 rounded-full bg-line" />
      </div>
    </div>
  );
}

export default function TranslationStage() {
  const { t } = useLocale();
  const ok = useMotionOk();
  const pair = PAIRS[useLoopIndex(PAIRS.length, 4800)];
  const rootRef = useRef(null);
  const named = {
    from: { ...pair.from, name: t(`langs.${pair.from.code.toLowerCase()}`) },
    to: { ...pair.to, name: t(`langs.${pair.to.code.toLowerCase()}`) },
  };

  useEffect(() => {
    if (!ok) return;
    const root = rootRef.current;
    if (!root) return;
    const plane = root.querySelector("[data-plane]");
    const glyphs = root.querySelectorAll("[data-glyph]");
    const stamp = root.querySelector("[data-stamp]");
    let raf = 0;
    const start = performance.now();

    const tick = (now) => {
      const t = (now - start) / 1000;
      const scan = root.querySelector("[data-scan]");
      if (plane) {
        const x = 50 + 36 * Math.sin(t * 0.7);
        const y = 42 + 22 * Math.sin(t * 1.4);
        const dx = 36 * 0.7 * Math.cos(t * 0.7);
        const dy = 22 * 1.4 * Math.cos(t * 1.4);
        const deg = (Math.atan2(dy, dx) * 180) / Math.PI;
        plane.style.left = `${x}%`;
        plane.style.top = `${y}%`;
        plane.style.transform = `translate(-50%, -50%) rotate(${deg}deg)`;
      }
      if (scan) {
        const y = 12 + 70 * (0.5 + 0.5 * Math.sin(t * 1.35));
        scan.style.top = `${y}%`;
      }
      glyphs.forEach((el, i) => {
        const g = GLYPHS[i];
        const ang = t * 0.55 + g.phase;
        const x = 50 + 42 * Math.cos(ang);
        const y = 48 + 34 * Math.sin(ang * 1.15);
        el.style.left = `${x}%`;
        el.style.top = `${y}%`;
        el.style.opacity = String(0.28 + 0.42 * (0.5 + 0.5 * Math.sin(t * 1.8 + g.phase)));
      });
      if (stamp) {
        const pulse = 0.92 + 0.08 * Math.sin(t * 2.2);
        stamp.style.transform = `scale(${pulse})`;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ok]);

  return (
    <div ref={rootRef} className="relative mx-auto w-full max-w-xl" aria-hidden="true">
      {GLYPHS.map((g) => (
        <span
          key={g.text + g.phase}
          data-glyph
          className="pointer-events-none absolute z-0 text-sm font-semibold text-orange-400/80"
          style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
        >
          {g.text}
        </span>
      ))}

      <div className="relative z-10 rounded-2xl border border-line bg-surface p-4 shadow-[0px_20px_60px] shadow-orange-900/10 sm:p-5">
        <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
          <span className="text-ink">
            <Logo size={22} />
          </span>
          <div className="hidden items-center gap-5 text-[11px] text-ink-2 sm:flex">
            <span className="font-medium text-ink">{t("stage.dashboard")}</span>
            <span>{t("stage.documents")}</span>
          </div>
          <span className="flex size-7 items-center justify-center rounded-full bg-bg-2 text-ink-2">
            <UserRoundIcon size={14} />
          </span>
        </div>

        <p className="mt-4 text-sm font-semibold text-ink">{t("stage.live")}</p>
        <p className="mt-0.5 text-[11px] text-ink-2">{t("stage.langs")}</p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <PageCard side="from" lang={named.from} lines={named.from.lines} originalLabel={t("stage.original")} translatedLabel={t("stage.translated")} />
          <PageCard side="to" lang={named.to} lines={named.to.lines} originalLabel={t("stage.original")} translatedLabel={t("stage.translated")} />
        </div>
      </div>

      <div
        data-plane
        className="pointer-events-none absolute z-20 size-10 rounded-full bg-orange-500 shadow-lg shadow-orange-500/40"
        style={{ left: "50%", top: "40%", transform: "translate(-50%, -50%)" }}
      >
        <img src="/assets/transly-mark.png" alt="" className="size-10 p-1.5 brightness-0 invert" />
      </div>

      <div
        data-stamp
        className="absolute -bottom-3 right-4 z-20 flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 shadow-md sm:right-6"
      >
        <span className="flex size-5 items-center justify-center rounded-full bg-green-600 text-white">
          <CheckIcon size={12} strokeWidth={3} />
        </span>
        <span className="text-[11px] font-semibold text-ink">{t("stage.verified")}</span>
      </div>
    </div>
  );
}
