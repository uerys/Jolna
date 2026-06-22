import { FormattedMessage } from "react-intl";
import PublicLayout from "@/components/PublicLayout";
import { Users, HeartPulse, BarChart3, GraduationCap } from "lucide-react";

export default function About() {
  return (
    <PublicLayout>
      <main className="max-w-5xl mx-auto px-6 py-16 sm:py-24 space-y-16">
        {/* Intro Hero Section */}
        <section className="space-y-4 text-center sm:text-left">
          <span className="inline-flex items-center bg-[#EEEDFE] text-[#534AB7] text-[10px] font-semibold px-2.5 py-0.5 rounded-[8px] border-[0.5px] border-[#534AB7]/10 uppercase tracking-wider">
            <FormattedMessage
              id="home.aboutSubtitle"
              defaultMessage="Our Mission"
            />
          </span>
          <h1 className="text-3xl sm:text-[36px] font-medium text-slate-900 tracking-tight leading-tight max-w-2xl font-sans">
            <FormattedMessage id="about.title" defaultMessage="About JOLNA" />
          </h1>
          <p className="text-[15px] leading-[1.7] text-slate-500 max-w-2xl font-normal">
            <FormattedMessage
              id="about.subtitle"
              defaultMessage="Learn more about our mission and core team."
            />
          </p>
        </section>

        {/* Content Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          <div className="space-y-6">
            <h2 className="text-xl font-medium text-slate-900 font-sans">
              <FormattedMessage
                id="about.storyTitle"
                defaultMessage="The Story Behind JOLNA"
              />
            </h2>
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

          {/* Academic context Card */}
          <div className="bg-white border-[0.5px] border-slate-200/80 rounded-[12px] p-6 space-y-4 shadow-sm">
            <div className="w-10 h-10 rounded-[8px] bg-[#EEEDFE] text-[#534AB7] flex items-center justify-center shrink-0">
              <GraduationCap className="size-5" />
            </div>
            <h3 className="font-semibold text-slate-900 text-sm font-sans">
              <FormattedMessage
                id="about.academicTitle"
                defaultMessage="Academic Project"
              />
            </h3>
            <p className="text-xs text-slate-500 leading-[1.8] font-normal">
              <FormattedMessage
                id="about.academicDesc"
                defaultMessage="This platform was conceptualized and developed under the academic guidance of the Computer Science and Information Technology department at Paragon International University, Phnom Penh, Cambodia. It is aimed at addressing local healthcare digitization challenges in physical therapy."
              />
            </p>
          </div>
        </section>

        {/* Meet the Team Section */}
        <section className="space-y-8">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-[#534AB7] uppercase tracking-widest block font-sans">
              <FormattedMessage
                id="about.teamSubtitle"
                defaultMessage="The Creators"
              />
            </span>
            <h2 className="text-2xl font-medium text-slate-900 font-sans">
              <FormattedMessage
                id="about.teamTitle"
                defaultMessage="Meet the Team"
              />
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl">
            {/* Team Member 1 */}
            <div className="bg-white border-[0.5px] border-slate-200/80 rounded-[12px] p-6 flex items-center gap-4 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="w-12 h-12 rounded-full bg-[#EEEDFE] text-[#534AB7] font-bold flex items-center justify-center text-sm shrink-0">
                KT
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-sm font-sans">
                  Kuyhav Tea
                </h3>
                <p className="text-xs text-slate-500 font-normal">
                  <FormattedMessage
                    id="about.roleCoDeveloper"
                    defaultMessage="Co-Developer & Researcher"
                  />
                </p>
              </div>
            </div>

            {/* Team Member 2 */}
            <div className="bg-white border-[0.5px] border-slate-200/80 rounded-[12px] p-6 flex items-center gap-4 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#0F6E56] font-bold flex items-center justify-center text-sm shrink-0">
                VN
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-sm font-sans">
                  Vattanac Ny
                </h3>
                <p className="text-xs text-slate-500 font-normal">
                  <FormattedMessage
                    id="about.roleCoDeveloper"
                    defaultMessage="Co-Developer & Researcher"
                  />
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pillars / Values Section */}
        <section className="space-y-8">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">
              <FormattedMessage
                id="about.pillarsSubtitle"
                defaultMessage="How We Build"
              />
            </span>
            <h2 className="text-2xl font-medium text-slate-900 font-sans">
              <FormattedMessage
                id="home.aboutValuesTitle"
                defaultMessage="Platform Pillars"
              />
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pillar 1 */}
            <div className="bg-white border-[0.5px] border-slate-200/80 rounded-[12px] p-5 space-y-4 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="w-10 h-10 rounded-[8px] bg-[#EEEDFE] text-[#534AB7] flex items-center justify-center shrink-0">
                <Users className="size-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-medium text-slate-900 text-sm font-sans">
                  <FormattedMessage
                    id="home.aboutValue1Title"
                    defaultMessage="Bilingual Communication"
                  />
                </h3>
                <p className="text-xs text-slate-500 font-normal leading-[1.7]">
                  <FormattedMessage
                    id="home.aboutValue1Desc"
                    defaultMessage="Fully localized in English and Khmer to support local clinical needs."
                  />
                </p>
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="bg-white border-[0.5px] border-slate-200/80 rounded-[12px] p-5 space-y-4 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="w-10 h-10 rounded-[8px] bg-emerald-50 text-[#0F6E56] flex items-center justify-center shrink-0">
                <HeartPulse className="size-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-medium text-slate-900 text-sm font-sans">
                  <FormattedMessage
                    id="home.aboutValue2Title"
                    defaultMessage="Clinical Supervision"
                  />
                </h3>
                <p className="text-xs text-slate-500 font-normal leading-[1.7]">
                  <FormattedMessage
                    id="home.aboutValue2Desc"
                    defaultMessage="Directly link with professional physiotherapists who customize your routine."
                  />
                </p>
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="bg-white border-[0.5px] border-slate-200/80 rounded-[12px] p-5 space-y-4 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="w-10 h-10 rounded-[8px] bg-blue-50 text-[#185FA5] flex items-center justify-center shrink-0">
                <BarChart3 className="size-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-medium text-slate-900 text-sm font-sans">
                  <FormattedMessage
                    id="home.aboutValue3Title"
                    defaultMessage="Progress Insights"
                  />
                </h3>
                <p className="text-xs text-slate-500 font-normal leading-[1.7]">
                  <FormattedMessage
                    id="home.aboutValue3Desc"
                    defaultMessage="Track pain score trends and compliance metrics over time."
                  />
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </PublicLayout>
  );
}
