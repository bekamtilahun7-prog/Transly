import { Link } from "react-router-dom";
import { useLocale } from "../context/LocaleContext";
import { Logo } from "./common/Logo";

export default function Footer() {
  const { t } = useLocale();
  const year = new Date().getFullYear();

  return (
    <footer data-no-speak className="px-6 md:px-16 lg:px-24 xl:px-32 mt-24 w-full text-ink-2">
      <div className="flex flex-col md:flex-row justify-between w-full gap-10 border-b border-line pb-8">
        <div className="md:max-w-114">
          <Link to="/" className="text-ink inline-flex" aria-label={t("nav.home")}>
            <Logo size={32} />
          </Link>
          <p className="mt-6 text-sm">{t("footer.blurb")}</p>
        </div>
        <div className="flex-1 flex flex-wrap items-start md:justify-end gap-12">
          <div>
            <h2 className="font-semibold mb-5 text-ink">{t("nav.features")}</h2>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#features" className="hover:text-orange-600">
                  {t("features.translation")}
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-orange-600">
                  {t("features.extract")}
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-orange-600">
                  {t("features.review")}
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-orange-600">
                  {t("features.qr")}
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="font-semibold mb-5 text-ink">{t("langs.kicker")}</h2>
            <ul className="space-y-2 text-sm">
              <li>{t("langs.om")} (OM)</li>
              <li>{t("langs.am")} (AM)</li>
              <li>{t("langs.en")} (EN)</li>
            </ul>
          </div>
          <div>
            <h2 className="font-semibold mb-5 text-ink">{t("footer.help")}</h2>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#how-it-works" className="hover:text-orange-600">
                  {t("nav.howItWorks")}
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-orange-600">
                  {t("footer.faq")}
                </a>
              </li>
              <li>{t("footer.privacy")}</li>
              <li>{t("footer.terms")}</li>
            </ul>
          </div>
        </div>
      </div>
      <p className="pt-4 text-center pb-6 text-xs">{t("footer.copy", { year })}</p>
    </footer>
  );
}
