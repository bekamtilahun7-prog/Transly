import SectionTitle from "../components/SectionTitle";

const langs = [
  { flag: "🇪🇹", name: "Afaan Oromo", code: "OM" },
  { flag: "🇪🇹", name: "Amharic", code: "AM" },
  { flag: "🇬🇧", name: "English", code: "EN" },
];

export default function TrustedCompanies() {
  return (
    <div id="languages" className="px-6 md:px-16 lg:px-24 xl:px-32">
      <SectionTitle
        text1="Supported Languages"
        text2="Translate Between These Languages"
        text3="Afaan Oromo, Amharic, and English — in any direction."
      />
      <ul className="mx-auto mt-10 flex max-w-3xl flex-col items-stretch gap-4 sm:flex-row sm:justify-center">
        {langs.map((l, i) => (
          <li
            key={l.code}
            className="home-loop home-loop-bob flex flex-1 items-center justify-center gap-3 rounded-2xl border border-line bg-surface px-5 py-4 shadow-sm"
            style={{ animationDelay: `${i * 0.4}s` }}
          >
            <span className="text-2xl" aria-hidden>
              {l.flag}
            </span>
            <span className="font-medium text-ink">{l.name}</span>
            <span className="text-xs text-muted">({l.code})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
