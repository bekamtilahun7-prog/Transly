import { CloudUpload, Download, Search } from "lucide-react";
import SectionTitle from "../components/SectionTitle";
import { useLocale } from "../context/LocaleContext";

const STEPS = [
  { n: 1, icon: CloudUpload, titleKey: "how.s1", textKey: "how.s1text" },
  { n: 2, icon: Search, titleKey: "how.s2", textKey: "how.s2text" },
  { n: 3, icon: Download, titleKey: "how.s3", textKey: "how.s3text" },
];

export default function HowItWorksSection() {
  const { t } = useLocale();

  return (
    <div id="how-it-works" className="px-6 md:px-16 lg:px-24 xl:px-32">
      <SectionTitle text1={t("how.kicker")} text2={t("how.title")} text3={t("how.sub")} />
      <ol className="mx-auto mt-12 flex max-w-4xl flex-col items-stretch gap-6 rounded-2xl bg-bg-2 px-6 py-10 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-10">
        {STEPS.map((s, i) => (
          <li key={s.titleKey} className="flex flex-1 flex-col items-center text-center">
            <span
              className="home-loop home-loop-step relative flex size-14 items-center justify-center rounded-full bg-surface text-orange-600 shadow-sm ring-1 ring-orange-100 dark:ring-orange-500/20"
              style={{ animationDelay: `${i * 1.2}s` }}
            >
              <s.icon size={22} aria-hidden />
              <span className="absolute -top-1 -left-1 flex size-6 items-center justify-center rounded-full bg-orange-500 text-[11px] font-semibold text-white">
                {s.n}
              </span>
            </span>
            <p className="mt-4 text-sm font-semibold text-ink">{t(s.titleKey)}</p>
            <p className="mt-1 max-w-[12rem] text-xs text-ink-2">{t(s.textKey)}</p>
            {i < STEPS.length - 1 && <span className="mt-4 hidden h-px w-full bg-orange-200 sm:sr-only" />}
          </li>
        ))}
      </ol>
    </div>
  );
}
