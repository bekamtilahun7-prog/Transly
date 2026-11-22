import { CloudUpload, Download, Search } from "lucide-react";
import SectionTitle from "../components/SectionTitle";

const steps = [
  {
    n: 1,
    icon: CloudUpload,
    title: "Upload Your Document",
    text: "Upload a PDF or image document.",
  },
  {
    n: 2,
    icon: Search,
    title: "Review Your Content",
    text: "Check extracted text and translation.",
  },
  {
    n: 3,
    icon: Download,
    title: "Download and Verify",
    text: "Get your translated document with a QR code.",
  },
];

export default function HowItWorksSection() {
  return (
    <div id="how-it-works" className="px-6 md:px-16 lg:px-24 xl:px-32">
      <SectionTitle
        text1="Simple Process"
        text2="How Transly Works"
        text3="Move from document upload to a reviewed, downloadable, and verifiable result."
      />
      <ol className="mx-auto mt-12 flex max-w-4xl flex-col items-stretch gap-6 rounded-2xl bg-bg-2 px-6 py-10 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-10">
        {steps.map((s, i) => (
          <li key={s.title} className="flex flex-1 flex-col items-center text-center">
            <span
              className="home-loop home-loop-step relative flex size-14 items-center justify-center rounded-full bg-surface text-orange-600 shadow-sm ring-1 ring-orange-100 dark:ring-orange-500/20"
              style={{ animationDelay: `${i * 1.2}s` }}
            >
              <s.icon size={22} aria-hidden />
              <span className="absolute -top-1 -left-1 flex size-6 items-center justify-center rounded-full bg-orange-500 text-[11px] font-semibold text-white">
                {s.n}
              </span>
            </span>
            <p className="mt-4 text-sm font-semibold text-ink">{s.title}</p>
            <p className="mt-1 max-w-[12rem] text-xs text-ink-2">{s.text}</p>
            {i < steps.length - 1 && (
              <span className="mt-4 hidden h-px w-full bg-orange-200 sm:sr-only" />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
