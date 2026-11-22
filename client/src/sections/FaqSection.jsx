import { ChevronDown } from "lucide-react";
import { useState } from "react";
import SectionTitle from "../components/SectionTitle";
import { useLocale } from "../context/LocaleContext";

export const FaqSection = () => {
  const { t, faqs } = useLocale();
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <div id="faq" className="max-w-2xl mx-auto flex flex-col items-center justify-center px-4 md:px-0">
      <SectionTitle text1={t("faq.kicker")} text2={t("faq.title")} text3={t("faq.sub")} />
      <div className="mt-8">
        {faqs.map((faq, index) => (
          <div
            className="border-b border-line py-4 cursor-pointer w-full"
            key={faq.q}
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-medium">{faq.q}</h3>
              <ChevronDown
                size={18}
                className={`${openIndex === index && "rotate-180"} transition-all duration-500 ease-in-out`}
              />
            </div>
            <p
              className={`text-sm text-ink-2 transition-all duration-500 ease-in-out max-w-xl ${openIndex === index ? "opacity-100 max-h-[500px] translate-y-0 pt-4" : "opacity-0 max-h-0 overflow-hidden -translate-y-2"}`}
            >
              {faq.a}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
