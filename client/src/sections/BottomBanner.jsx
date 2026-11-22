import { ArrowRightIcon } from "lucide-react";
import { Link } from "react-router-dom";

export default function BottomBanner() {
  return (
    <div className="mt-28 px-6 md:px-16 lg:px-24 xl:px-32">
      <div className="flex flex-col items-center justify-between gap-8 overflow-hidden rounded-3xl bg-midnight px-8 py-12 text-center md:flex-row md:text-left md:px-12">
        <div className="max-w-xl">
          <p className="text-2xl font-semibold text-white">
            Ready to make your documents understandable?
          </p>
          <p className="mt-2 text-sm text-slate-300">
            Start translating your documents between Afaan Oromo, Amharic, and English.
          </p>
        </div>
        <Link
          to="/register"
          className="flex shrink-0 items-center gap-2 rounded-full bg-orange-500 px-6 py-3 font-medium text-white transition hover:bg-orange-600"
        >
          <span>Start Translating</span>
          <ArrowRightIcon size={18} />
        </Link>
      </div>
    </div>
  );
}
