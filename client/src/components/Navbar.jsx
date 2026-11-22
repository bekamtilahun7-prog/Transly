import { ArrowRightIcon, MenuIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { navLinks } from "../data/navLinks";
import { AccessibilityLauncher } from "./accessibility/AccessibilityLauncher";
import { Logo } from "./common/Logo";
import { ThemeToggle } from "./common/ThemeToggle";

export default function Navbar() {
  const [openMobileMenu, setOpenMobileMenu] = useState(false);

  useEffect(() => {
    if (openMobileMenu) {
      document.body.classList.add("max-md:overflow-hidden");
    } else {
      document.body.classList.remove("max-md:overflow-hidden");
    }
    return () => document.body.classList.remove("max-md:overflow-hidden");
  }, [openMobileMenu]);

  return (
    <nav
      data-no-speak
      className={`flex items-center justify-between fixed z-50 top-0 w-full px-6 md:px-16 lg:px-24 xl:px-32 py-4 border-b border-line bg-bg/70 ${openMobileMenu ? "bg-bg/90" : "backdrop-blur"}`}
    >
      <Link to="/" aria-label="Transly home" className="text-ink">
        <Logo size={34} />
      </Link>
      <div className="hidden items-center md:gap-8 lg:gap-9 font-medium md:flex">
        {navLinks.map((link) => (
          <a
            key={link.name}
            href={link.href}
            className="transition hover:text-orange-700"
          >
            {link.name}
          </a>
        ))}
      </div>
      {/* Mobile menu */}
      <div
        className={`fixed inset-0 flex flex-col items-center justify-center gap-6 text-lg font-medium bg-bg/95 text-ink backdrop-blur-md md:hidden transition duration-300 ${openMobileMenu ? "translate-x-0" : "-translate-x-full"}`}
        aria-hidden={!openMobileMenu}
        inert={!openMobileMenu}
      >
        {navLinks.map((link) => (
          <a
            key={link.name}
            href={link.href}
            onClick={() => setOpenMobileMenu(false)}
          >
            {link.name}
          </a>
        ))}
        <Link to="/login" onClick={() => setOpenMobileMenu(false)}>
          Log In
        </Link>
        <Link
          to="/register"
          onClick={() => setOpenMobileMenu(false)}
          className="flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 transition text-white rounded-xl"
        >
          Get Started
          <ArrowRightIcon size={18} />
        </Link>
        <button
          aria-label="Close menu"
          className="aspect-square size-10 p-1 items-center justify-center bg-orange-500 hover:bg-orange-600 transition text-white rounded-md flex"
          onClick={() => setOpenMobileMenu(false)}
        >
          <XIcon />
        </button>
      </div>
      <div className="flex items-center gap-3 sm:gap-4">
        <AccessibilityLauncher />
        <ThemeToggle />
        <Link
          to="/login"
          className="hidden md:block font-medium transition hover:text-orange-700"
        >
          Log In
        </Link>
        <Link
          to="/register"
          className="hidden md:flex items-center gap-2 px-5 py-2.5 font-medium bg-orange-500 hover:bg-orange-600 active:bg-orange-700 transition text-white rounded-xl shadow-sm shadow-orange-500/30"
        >
          Get Started
          <ArrowRightIcon size={16} />
        </Link>
        <button
          onClick={() => setOpenMobileMenu(!openMobileMenu)}
          aria-label="Open menu"
          aria-expanded={openMobileMenu}
          className="md:hidden"
        >
          <MenuIcon size={26} className="active:scale-90 transition" />
        </button>
      </div>
    </nav>
  );
}
