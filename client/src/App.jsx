import { Outlet, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import DocumentsPage from "./pages/DocumentsPage";
import UploadPage from "./pages/UploadPage";
import ExtractionReviewPage from "./pages/ExtractionReviewPage";
import TranslationPage from "./pages/TranslationPage";
import IssuedPage from "./pages/IssuedPage";
import TranslatorDashboardPage from "./pages/TranslatorDashboardPage";
import TranslatorReviewPage from "./pages/TranslatorReviewPage";
import VerificationPage from "./pages/VerificationPage";
import NotFoundPage from "./pages/NotFoundPage";
import PricingPage from "./pages/PricingPage";
import OnboardingPricingPage from "./pages/OnboardingPricingPage";
import CheckoutPage from "./pages/CheckoutPage";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { AppLayout } from "./components/layout/AppLayout";
import { RedirectIfAuthed, RequireAuth, RequirePlanChoice, RequireTranslator } from "./components/layout/guards";

function Landing() {
  return (
    <div className="min-h-dvh bg-bg text-ink">
      <Navbar />
      <main id="main" data-page-content>
        <Home />
      </main>
      <Footer />
    </div>
  );
}

function PublicShell() {
  return (
    <div className="min-h-dvh bg-bg text-ink">
      <Navbar />
      <main id="main" data-page-content className="px-6 pb-16 pt-28 md:px-16 lg:px-24 xl:px-32">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

function ErrorShell() {
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-ink">
      <Navbar />
      <main id="main" data-page-content className="flex flex-1 items-center justify-center px-6 pt-20">
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route element={<RedirectIfAuthed />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route element={<PublicShell />}>
        <Route path="/v/:id" element={<VerificationPage />} />
        <Route path="/pricing" element={<PricingPage />} />
      </Route>
      <Route element={<RequireAuth />}>
        <Route path="/onboarding" element={<OnboardingPricingPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route element={<RequirePlanChoice />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/documents/upload" element={<UploadPage />} />
            <Route path="/documents/:id/review" element={<ExtractionReviewPage />} />
            <Route path="/documents/:id/translation" element={<TranslationPage />} />
            <Route path="/documents/issued/:verificationId" element={<IssuedPage />} />
            <Route element={<RequireTranslator />}>
              <Route path="/translator" element={<TranslatorDashboardPage />} />
              <Route path="/translator/:id" element={<TranslatorReviewPage />} />
            </Route>
          </Route>
        </Route>
      </Route>
      <Route element={<ErrorShell />}>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
