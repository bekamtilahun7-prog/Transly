import BottomBanner from "../sections/BottomBanner";
import { FaqSection } from "../sections/FaqSection";
import FeaturesSection from "../sections/FeaturesSection";
import HeroSection from "../sections/HeroSection";
import HowItWorksSection from "../sections/HowItWorksSection";
import LanguageRibbon from "../sections/LanguageRibbon";
import Pricing from "../sections/Pricing";
import TrustedCompanies from "../sections/TrustedCompanies";

export default function Home() {
  return (
    <>
      <HeroSection />
      <LanguageRibbon />
      <FeaturesSection />
      <HowItWorksSection />
      <TrustedCompanies />
      <Pricing />
      <FaqSection />
      <BottomBanner />
    </>
  );
}
