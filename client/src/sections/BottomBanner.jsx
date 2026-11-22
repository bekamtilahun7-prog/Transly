import { ArrowRightIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useLocale } from "../context/LocaleContext";

export default function BottomBanner() {
  const { t } = useLocale();

  return (
    <div className="mt-28 px-6 md:px-16 lg:px-24 xl:px-32">
      <div className="home-loop home-loop-gradient relative flex flex-col items-center justify-between gap-8 overflow-hidden rounded-3xl bg-[linear-gradient(120deg,#171923_0%,#2A1D14_40%,#171923_70%,#3A2412_100%)] px-8 py-12 text-center md:flex-row md:text-left md:px-12">
        <div
          aria-hidden="true"
          className="home-loop home-loop-orb pointer-events-none absolute -right-16 -top-10 size-48 rounded-full bg-orange-500/25 blur-3xl"
        />
        <div className="relative z-10 max-w-xl">
          <p className="text-2xl font-semibold text-white">{t("banner.title")}</p>
          <p className="mt-2 text-sm text-slate-300">{t("banner.body")}</p>
        </div>
        <Link
          to="/register"
          className="home-loop home-loop-shine relative z-10 flex shrink-0 items-center gap-2 rounded-full bg-orange-500 px-6 py-3 font-medium text-white transition hover:bg-orange-600"
        >
          <span>{t("banner.cta")}</span>
          <ArrowRightIcon size={18} />
        </Link>
      </div>
    </div>
  );
}
