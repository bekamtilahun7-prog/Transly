const phrases = [
  { lang: "Afaan Oromo", text: "Dokumentiin kee ni hiikama." },
  { lang: "አማርኛ", text: "ሰነድዎ በትክክል ይተረጎማል።" },
  { lang: "English", text: "Your document will be translated." },
  { lang: "Afaan Oromo", text: "Afaanota walitti hidhaa." },
  { lang: "አማርኛ", text: "ቋንቋዎችን እናገናኛለን።" },
  { lang: "English", text: "Languages connected." },
];

const loop = [...phrases, ...phrases];

export default function LanguageRibbon() {
  return (
    <div className="relative mt-4 overflow-hidden border-y border-line bg-surface/70 py-4" aria-hidden="true">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-bg to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-bg to-transparent" />
      <div className="home-marquee-track">
        <ul className="home-loop home-loop-marquee flex w-max items-center gap-10 px-6">
          {loop.map((p, i) => (
            <li key={`${p.lang}-${i}`} className="flex shrink-0 items-center gap-3">
              <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">
                {p.lang}
              </span>
              <span className="text-sm font-medium text-ink">{p.text}</span>
              <span className="size-1.5 rounded-full bg-orange-400" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
