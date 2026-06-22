import PublicLayout from "@/components/PublicLayout";
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
    <PublicLayout>
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
                <a href={loginUrl}>
                  <FormattedMessage
                    id="home.ctaGetStarted"
                    defaultMessage="Get started"
                  />
                </a>
              </Button>
            ) : (
              <Button
                onClick={() => navigate(dashboardPathFor(user?.role))}
                className="bg-[#534AB7] hover:bg-[#534AB7]/90 text-white font-semibold text-xs px-5 h-9 rounded-full shadow-sm transition"
              >
                <FormattedMessage
                  id="home.ctaGoToDashboard"
                  defaultMessage="Go to Dashboard"
                />
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => navigate("/about")}
              className="border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs px-5 h-9 rounded-full shadow-sm transition cursor-pointer"
            >
              <FormattedMessage
                id="home.ctaAboutUs"
                defaultMessage="About us"
              />
            </Button>
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

        {/* Horizontal Divider */}
        <hr className="border-t-[0.5px] border-slate-200/80 my-12 w-full" />

        {/* About Us Section */}
        <section id="about-us" className="space-y-6 scroll-mt-20">
          <span className="text-[10px] font-bold text-[#534AB7] uppercase tracking-widest block mb-2 font-sans">
            <FormattedMessage
              id="home.aboutSubtitle"
              defaultMessage="Our Mission"
            />
          </span>
          <h2 className="text-2xl sm:text-[28px] font-medium text-slate-900 tracking-tight leading-tight max-w-2xl font-sans">
            <FormattedMessage
              id="home.aboutTitle"
              defaultMessage="About JOLNA"
            />
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div className="space-y-4">
              <p className="text-[14px] leading-[1.8] text-slate-500 font-normal">
                <FormattedMessage
                  id="home.aboutDesc1"
                  defaultMessage="JOLNA is a specialized physiotherapy rehabilitation platform designed to bridge the gap between physiotherapists and clients. Developed as a capstone project for Paragon International University, JOLNA enables practitioners to design, prescribe, and track personalized recovery routines, while empowering clients with bilingual visual guidance and seamless progress logging."
                />
              </p>
              <p className="text-[14px] leading-[1.8] text-slate-500 font-normal">
                <FormattedMessage
                  id="home.aboutDesc2"
                  defaultMessage="Our goal is to make physical rehabilitation accessible, engaging, and measurable. By combining structured exercise schedules with daily pain monitoring, JOLNA provides clinical insight that helps prevent setbacks and supports a safer path back to full mobility."
                />
              </p>
            </div>

            {/* Core Values / Stats */}
            <div className="bg-white border-[0.5px] border-slate-200/80 rounded-[12px] p-6 space-y-5 shadow-sm">
              <h3 className="font-semibold text-slate-900 text-sm font-sans mb-1">
                <FormattedMessage
                  id="home.aboutValuesTitle"
                  defaultMessage="Platform Pillars"
                />
              </h3>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#534AB7] mt-2 shrink-0" />
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900">
                      <FormattedMessage
                        id="home.aboutValue1Title"
                        defaultMessage="Bilingual Communication"
                      />
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      <FormattedMessage
                        id="home.aboutValue1Desc"
                        defaultMessage="Fully localized in English and Khmer to support local clinical needs."
                      />
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900">
                      <FormattedMessage
                        id="home.aboutValue2Title"
                        defaultMessage="Clinical Supervision"
                      />
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      <FormattedMessage
                        id="home.aboutValue2Desc"
                        defaultMessage="Directly link with professional physiotherapists who customize your routine."
                      />
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900">
                      <FormattedMessage
                        id="home.aboutValue3Title"
                        defaultMessage="Progress Insights"
                      />
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      <FormattedMessage
                        id="home.aboutValue3Desc"
                        defaultMessage="Track pain score trends and compliance metrics over time."
                      />
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </PublicLayout>
  );
}
