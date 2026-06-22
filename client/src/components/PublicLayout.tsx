import { ReactNode, useEffect } from "react";
import { FormattedMessage } from "react-intl";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useI18n } from "@/contexts/I18nContext";

type PublicLayoutProps = {
  children: ReactNode;
};

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

export default function PublicLayout({ children }: PublicLayoutProps) {
  const { user, isAuthenticated } = useAuth();
  const [location, navigate] = useLocation();
  const { language, setLanguage } = useI18n();

  const loginUrl = getLoginUrl();

  // Reset scroll to top on navigation/location changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  return (
    <div className="min-h-screen bg-background text-slate-700 font-sans leading-[1.7] antialiased flex flex-col justify-between">
      <div>
        {/* Sticky Navbar */}
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b-[0.5px] border-slate-200/80 px-6 py-3.5 flex items-center justify-between">
          <Link href="/">
            <a className="flex items-center gap-2 select-none cursor-pointer">
              <img
                src="/logo.png"
                alt="JOLNA Logo"
                className="w-8 h-8 object-contain"
              />
              <span className="text-lg font-bold tracking-tight text-slate-900 font-sans">
                JOLNA
              </span>
            </a>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/">
              <a
                className={`text-sm font-medium transition-colors hover:text-[#534AB7] ${location === "/" ? "text-[#534AB7] font-semibold" : "text-slate-600"}`}
              >
                <FormattedMessage id="nav.home" defaultMessage="Home" />
              </a>
            </Link>
            <Link href="/about">
              <a
                className={`text-sm font-medium transition-colors hover:text-[#534AB7] ${location === "/about" ? "text-[#534AB7] font-semibold" : "text-slate-600"}`}
              >
                <FormattedMessage id="nav.about" defaultMessage="About us" />
              </a>
            </Link>
            <Link href="/contact">
              <a
                className={`text-sm font-medium transition-colors hover:text-[#534AB7] ${location === "/contact" ? "text-[#534AB7] font-semibold" : "text-slate-600"}`}
              >
                <FormattedMessage id="nav.contact" defaultMessage="Contact" />
              </a>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Toggle Pill */}
            <button
              onClick={() => setLanguage(language === "en" ? "kh" : "en")}
              className="h-8 border-[0.5px] border-slate-200 bg-white hover:bg-slate-50 px-3.5 rounded-full text-slate-600 font-semibold text-xs transition flex items-center gap-1.5 focus:outline-none"
              aria-label="Toggle language"
            >
              <span>{language === "en" ? "🇺🇸 EN" : "🇰🇭 KH"}</span>
            </button>

            {/* Outlined Sign In Button */}
            {!isAuthenticated ? (
              <Button
                asChild
                className="h-8 px-4 bg-[#534AB7] hover:bg-[#534AB7]/90 text-white font-semibold text-xs rounded-full transition shadow-sm border-none cursor-pointer"
              >
                <a href={loginUrl}>
                  <FormattedMessage
                    id="home.ctaSignIn"
                    defaultMessage="Sign in"
                  />
                </a>
              </Button>
            ) : (
              <Button
                onClick={() => navigate(dashboardPathFor(user?.role))}
                className="h-8 px-4 bg-[#534AB7] hover:bg-[#534AB7]/90 text-white font-semibold text-xs rounded-full transition cursor-pointer"
              >
                <FormattedMessage
                  id="home.ctaContinue"
                  defaultMessage="Go to dashboard"
                />
              </Button>
            )}
          </div>
        </nav>

        {/* Mobile Navigation Links (only visible on small screens) */}
        <div className="md:hidden flex justify-center gap-6 py-2.5 bg-white/40 border-b-[0.5px] border-slate-200/80">
          <Link href="/">
            <a
              className={`text-xs font-semibold transition-colors hover:text-[#534AB7] ${location === "/" ? "text-[#534AB7]" : "text-slate-500"}`}
            >
              <FormattedMessage id="nav.home" defaultMessage="Home" />
            </a>
          </Link>
          <Link href="/about">
            <a
              className={`text-xs font-semibold transition-colors hover:text-[#534AB7] ${location === "/about" ? "text-[#534AB7]" : "text-slate-500"}`}
            >
              <FormattedMessage id="nav.about" defaultMessage="About us" />
            </a>
          </Link>
          <Link href="/contact">
            <a
              className={`text-xs font-semibold transition-colors hover:text-[#534AB7] ${location === "/contact" ? "text-[#534AB7]" : "text-slate-500"}`}
            >
              <FormattedMessage id="nav.contact" defaultMessage="Contact" />
            </a>
          </Link>
        </div>

        <main>{children}</main>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t-[0.5px] border-slate-200/80 py-12 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2 select-none">
              <img
                src="/logo.png"
                alt="JOLNA Logo"
                className="w-7 h-7 object-contain"
              />
              <span className="text-base font-bold tracking-tight text-slate-900 font-sans">
                JOLNA
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              <FormattedMessage id="app.tagline" />
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-950 uppercase tracking-widest mb-3.5">
              <FormattedMessage
                id="footer.quickLinks"
                defaultMessage="Quick Links"
              />
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/">
                  <a
                    className={`text-xs transition-colors hover:text-[#534AB7] ${location === "/" ? "text-[#534AB7] font-semibold" : "text-slate-500"}`}
                  >
                    <FormattedMessage
                      id="footer.linkHome"
                      defaultMessage="Home"
                    />
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/about">
                  <a
                    className={`text-xs transition-colors hover:text-[#534AB7] ${location === "/about" ? "text-[#534AB7] font-semibold" : "text-slate-500"}`}
                  >
                    <FormattedMessage
                      id="footer.linkAbout"
                      defaultMessage="About us"
                    />
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/contact">
                  <a
                    className={`text-xs transition-colors hover:text-[#534AB7] ${location === "/contact" ? "text-[#534AB7] font-semibold" : "text-slate-500"}`}
                  >
                    <FormattedMessage
                      id="nav.contact"
                      defaultMessage="Contact"
                    />
                  </a>
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-950 uppercase tracking-widest mb-3.5">
              <FormattedMessage
                id="footer.academic"
                defaultMessage="Academic Project"
              />
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              <FormattedMessage
                id="footer.projectDesc"
                defaultMessage="Paragon International University Capstone Project."
              />
            </p>
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed italic">
              * <FormattedMessage
                id="footer.disclaimer"
                defaultMessage="This project is a research study. All data is mocked and used for demonstration purposes only."
              />
            </p>
            <p className="text-xs text-slate-400 mt-2.5">
              © {new Date().getFullYear()} JOLNA.{" "}
              <FormattedMessage
                id="footer.rights"
                defaultMessage="All rights reserved."
              />
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
