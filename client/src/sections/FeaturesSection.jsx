import { Languages, QrCode, ScanText, ShieldCheck } from "lucide-react";
import SectionTitle from "../components/SectionTitle";
import { useLocale } from "../context/LocaleContext";

const FEATURES = [
  { icon: Languages, titleKey: "features.translation", textKey: "features.translationText" },
  { icon: ScanText, titleKey: "features.extract", textKey: "features.extractText" },
  { icon: ShieldCheck, titleKey: "features.review", textKey: "features.reviewText" },
  { icon: QrCode, titleKey: "features.qr", textKey: "features.qrText" },
];

export default function FeaturesSection() {
  const { t } = useLocale();

  return (
    <div id="features">
      <SectionTitle text1={t("features.kicker")} text2={t("features.title")} text3={t("features.sub")} />

      <div className="mt-12 grid gap-5 px-6 sm:grid-cols-2 xl:grid-cols-4 md:px-16 lg:px-24 xl:px-32">
        {FEATURES.map((f, i) => (
          <div
            key={f.titleKey}
            className="rounded-2xl border border-line bg-surface p-6 shadow-sm shadow-orange-900/5 transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <span
              className="home-loop home-loop-bob flex size-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600"
              style={{ animationDelay: `${i * 0.35}s` }}
            >
              <f.icon size={22} aria-hidden />
            </span>
            <h3 className="mt-4 text-base font-semibold text-ink">{t(f.titleKey)}</h3>
            <p className="mt-1.5 text-sm text-ink-2">{t(f.textKey)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
