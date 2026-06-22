import { FormattedMessage } from "react-intl";
import { useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useI18n } from "@/contexts/I18nContext";
import { Play, Users, HeartPulse, BarChart3 } from "lucide-react";

function dashboardPathFor(role: string | undefined) {
  switch (role) {
    case "admin":
      return "/admin/users";
    case "physiotherapist":
      return "/physio";
    case "client":
    case "user":
    default:
      return "/client/today";
  }
}

export default function Home() {
  const { user, isAuthenticated, loading } = useAuth();
  const [location, navigate] = useLocation();
  const { language, setLanguage } = useI18n();

  const loginUrl = getLoginUrl();

  // Auto-redirect signed-in users to their role dashboard, but only when on "/"
  useEffect(() => {
    if (!loading && isAuthenticated && location === "/") {
      navigate(dashboardPathFor(user?.role), { replace: true });
    }
  }, [loading, isAuthenticated, user?.role, location, navigate]);

  return (
    <div className="min-h-screen bg-slate-50/20 text-slate-700 font-sans leading-[1.7] antialiased">
      {/* Sticky Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b-[0.5px] border-slate-200/80 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2 select-none">
          <img
            src="/logo.png"
            alt="JOLNA Logo"
            className="w-8 h-8 object-contain"
          />
          <span className="text-lg font-bold tracking-tight text-slate-900 font-sans">
            JOLNA
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Language Toggle Pill */}
          <button
            onClick={() => setLanguage(language === "en" ? "kh" : "en")}
            className="h-8 border-[0.5px] border-slate-200 bg-white hover:bg-slate-50 px-3.5 rounded-full text-slate-600 font-semibold text-xs transition flex items-center gap-1.5 focus:outline-none"
            aria-label="Toggle language"
          >
            <span>{language === "en" ? "EN" : "KH"}</span>
          </button>

          {/* Outlined Sign In Button */}
          {!isAuthenticated ? (
            <Button
              asChild
              className="h-8 px-4 bg-[#534AB7] hover:bg-[#534AB7]/90 text-white font-semibold text-xs rounded-full transition shadow-sm border-none"
            >
              <a href={loginUrl}>
                <FormattedMessage id="home.ctaSignIn" />
              </a>
            </Button>
          ) : (
            <Button
              onClick={() => navigate(dashboardPathFor(user?.role))}
              className="h-8 px-4 bg-[#534AB7] hover:bg-[#534AB7]/90 text-white font-semibold text-xs rounded-full transition"
            >
              <FormattedMessage id="home.ctaContinue" />
            </Button>
          )}
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-6 py-16 sm:py-24">
        {/* Hero Section */}
        <section className="space-y-6 flex flex-col items-center sm:items-start text-center sm:text-left">
          {/* Pill Badge */}
          <span className="inline-flex items-center bg-[#EEEDFE] text-[#534AB7] text-[10px] font-semibold px-2.5 py-0.5 rounded-[8px] border-[0.5px] border-[#534AB7]/10 uppercase tracking-wider">
            Bilingual · English & Khmer
          </span>

          {/* Headline */}
          <h1 className="text-3xl sm:text-[36px] font-medium text-slate-900 tracking-tight leading-tight max-w-2xl font-sans">
            <FormattedMessage
              id="home.heroTitle"
              values={{
                accent: (
                  <span className="text-[#534AB7]">
                    {language === "kh" ? "ប្រចាំថ្ងៃ" : "daily"}
                  </span>
                ),
              }}
            />
          </h1>

          {/* Subtitle */}
          <p className="text-[15px] leading-[1.7] text-slate-500 max-w-xl font-normal">
            <FormattedMessage id="home.heroSubtitle" />
          </p>

          {/* CTAs */}
          <div className="flex items-center gap-3 pt-2">
            {!isAuthenticated ? (
              <Button
                asChild
                className="bg-[#534AB7] hover:bg-[#534AB7]/90 text-white font-semibold text-xs px-5 h-9 rounded-full shadow-sm transition"
              >
                <a href={loginUrl}>Get started</a>
              </Button>
            ) : (
              <Button
                onClick={() => navigate(dashboardPathFor(user?.role))}
                className="bg-[#534AB7] hover:bg-[#534AB7]/90 text-white font-semibold text-xs px-5 h-9 rounded-full shadow-sm transition"
              >
                Go to Dashboard
              </Button>
            )}
          </div>
        </section>

        {/* Horizontal Divider */}
        <hr className="border-t-[0.5px] border-slate-200/80 my-12 w-full" />

        {/* Feature Section */}
        <section>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-6 font-sans">
            What JOLNA does
          </span>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl">
            {/* Feature Card 1 */}
            <div className="bg-white border-[0.5px] border-slate-200/80 hover:border-[#534AB7] rounded-[12px] p-5 space-y-4 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="w-10 h-10 rounded-[8px] bg-[#EEEDFE] text-[#534AB7] flex items-center justify-center shrink-0">
                <Users className="size-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-medium text-slate-900 text-sm font-sans">
                  <FormattedMessage id="home.feature1Title" />
                </h3>
                <p className="text-xs text-slate-500 font-normal leading-[1.7]">
                  <FormattedMessage id="home.feature1Desc" />
                </p>
              </div>
            </div>

            {/* Feature Card 2 */}
            <div className="bg-white border-[0.5px] border-slate-200/80 hover:border-[#534AB7] rounded-[12px] p-5 space-y-4 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="w-10 h-10 rounded-[8px] bg-emerald-50 text-[#0F6E56] flex items-center justify-center shrink-0">
                <HeartPulse className="size-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-medium text-slate-900 text-sm font-sans">
                  <FormattedMessage id="home.feature2Title" />
                </h3>
                <p className="text-xs text-slate-500 font-normal leading-[1.7]">
                  <FormattedMessage id="home.feature2Desc" />
                </p>
              </div>
            </div>

            {/* Feature Card 3 */}
            <div className="bg-white border-[0.5px] border-slate-200/80 hover:border-[#534AB7] rounded-[12px] p-5 space-y-4 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="w-10 h-10 rounded-[8px] bg-blue-50 text-[#185FA5] flex items-center justify-center shrink-0">
                <BarChart3 className="size-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-medium text-slate-900 text-sm font-sans">
                  <FormattedMessage id="home.feature3Title" />
                </h3>
                <p className="text-xs text-slate-500 font-normal leading-[1.7]">
                  <FormattedMessage id="home.feature3Desc" />
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
