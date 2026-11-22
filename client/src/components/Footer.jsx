import { Link } from "react-router-dom";
import { Logo } from "./common/Logo";

export default function Footer() {
  return (
    <footer data-no-speak className="px-6 md:px-16 lg:px-24 xl:px-32 mt-24 w-full text-ink-2">
      <div className="flex flex-col md:flex-row justify-between w-full gap-10 border-b border-line pb-8">
        <div className="md:max-w-114">
          <Link to="/" className="text-ink inline-flex" aria-label="Transly home">
            <Logo size={32} />
          </Link>
          <p className="mt-6 text-sm">
            Bridging languages. Empowering communication. Translate, review, issue, and
            verify documents between Afaan Oromo, Amharic, and English.
          </p>
        </div>
        <div className="flex-1 flex flex-wrap items-start md:justify-end gap-12">
          <div>
            <h2 className="font-semibold mb-5 text-ink">Features</h2>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#features" className="hover:text-orange-600">
                  Document Translation
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-orange-600">
                  Text Extraction
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-orange-600">
                  Human Review
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-orange-600">
                  QR Verification
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="font-semibold mb-5 text-ink">Supported Languages</h2>
            <ul className="space-y-2 text-sm">
              <li>Afaan Oromo (OM)</li>
              <li>Amharic (AM)</li>
              <li>English (EN)</li>
            </ul>
          </div>
          <div>
            <h2 className="font-semibold mb-5 text-ink">Help</h2>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#how-it-works" className="hover:text-orange-600">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-orange-600">
                  FAQ
                </a>
              </li>
              <li>Privacy Policy</li>
              <li>Terms of Service</li>
            </ul>
          </div>
        </div>
      </div>
      <p className="pt-4 text-center pb-6 text-xs">
        © {new Date().getFullYear()} Transly. All rights reserved. Transly is an independent
        project, not a government service.
      </p>
    </footer>
  );
}
