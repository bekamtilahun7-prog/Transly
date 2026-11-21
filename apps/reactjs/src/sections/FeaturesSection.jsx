import { Languages, QrCode, ScanText, ShieldCheck } from "lucide-react";
import SectionTitle from "../components/SectionTitle";

const features = [
  {
    icon: Languages,
    title: "Document Translation",
    text: "Translate documents between Afaan Oromo, Amharic, and English.",
  },
  {
    icon: ScanText,
    title: "Text Extraction",
    text: "Extract text from PDF and image documents.",
  },
  {
    icon: ShieldCheck,
    title: "Human Review",
    text: "Let authorized translators review and approve translations.",
  },
  {
    icon: QrCode,
    title: "QR Verification",
    text: "Verify issued documents using a unique QR code.",
  },
];

export default function FeaturesSection() {
  return (
    <div id="features">
      <SectionTitle
        text1="Powerful Features"
        text2="Everything you need for document translation"
        text3="A connected workflow for extraction, translation, human review, and document verification."
      />

      <div className="mt-12 grid gap-5 px-6 sm:grid-cols-2 xl:grid-cols-4 md:px-16 lg:px-24 xl:px-32">
        {features.map((f) => (
          <div
            key={f.title}
            className="rounded-2xl border border-line bg-surface p-6 shadow-sm shadow-orange-900/5 transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className="flex size-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <f.icon size={22} aria-hidden />
            </span>
            <h3 className="mt-4 text-base font-semibold text-ink">{f.title}</h3>
            <p className="mt-1.5 text-sm text-ink-2">{f.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
