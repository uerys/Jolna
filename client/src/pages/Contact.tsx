import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { toast } from "sonner";
import PublicLayout from "@/components/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Mail, Clock } from "lucide-react";

export default function Contact() {
  const intl = useIntl();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !subject || !message) {
      toast.error(
        intl.formatMessage({
          id: "form.required",
          defaultMessage: "Please fill in all required fields.",
        })
      );
      return;
    }

    setIsSubmitting(true);

    // Simulate sending message
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success(
        intl.formatMessage({
          id: "contact.toast.success",
          defaultMessage:
            "Your message has been sent successfully. We will get back to you soon!",
        })
      );
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    }, 1200);
  };

  return (
    <PublicLayout>
      <main className="max-w-5xl mx-auto px-6 py-16 sm:py-24 space-y-12">
        {/* Contact Page Header */}
        <section className="space-y-4 text-center sm:text-left">
          <span className="inline-flex items-center bg-[#EEEDFE] text-[#534AB7] text-[10px] font-semibold px-2.5 py-0.5 rounded-lg border-[0.5px] border-[#534AB7]/10 uppercase tracking-wider">
            <FormattedMessage id="nav.contact" defaultMessage="Contact" />
          </span>
          <h1 className="text-3xl sm:text-[36px] font-medium text-slate-900 tracking-tight leading-tight font-sans">
            <FormattedMessage id="contact.title" defaultMessage="Contact us" />
          </h1>
          <p className="text-[15px] leading-[1.7] text-slate-500 max-w-xl font-normal">
            <FormattedMessage
              id="contact.subtitle"
              defaultMessage="We are here to support your recovery journey. Reach out to our team."
            />
          </p>
        </section>

        {/* Form and Info Section */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Contact Form */}
          <div className="md:col-span-7 bg-white border-[0.5px] border-slate-200/80 rounded-xl p-6 sm:p-8 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label
                  htmlFor="name"
                  className="text-xs font-semibold text-slate-700"
                >
                  <FormattedMessage
                    id="contact.form.name"
                    defaultMessage="Full Name"
                  />
                </label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="rounded-lg border-slate-200 focus:border-[#534AB7] focus:ring-[#534AB7]/20"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="text-xs font-semibold text-slate-700"
                >
                  <FormattedMessage
                    id="contact.form.email"
                    defaultMessage="Email Address"
                  />
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="e.g. john@example.com"
                  className="rounded-lg border-slate-200 focus:border-[#534AB7] focus:ring-[#534AB7]/20"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="subject"
                  className="text-xs font-semibold text-slate-700"
                >
                  <FormattedMessage
                    id="contact.form.subject"
                    defaultMessage="Subject"
                  />
                </label>
                <Input
                  id="subject"
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="e.g. Inquiry about rehabilitation plan"
                  className="rounded-lg border-slate-200 focus:border-[#534AB7] focus:ring-[#534AB7]/20"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="message"
                  className="text-xs font-semibold text-slate-700"
                >
                  <FormattedMessage
                    id="contact.form.message"
                    defaultMessage="Message"
                  />
                </label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Type your message here..."
                  rows={5}
                  className="rounded-lg border-slate-200 focus:border-[#534AB7] focus:ring-[#534AB7]/20 resize-none"
                  disabled={isSubmitting}
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#534AB7] hover:bg-[#534AB7]/90 text-white font-semibold text-xs py-2 px-4 rounded-full transition shadow-sm"
              >
                {isSubmitting ? (
                  <FormattedMessage
                    id="contact.form.sending"
                    defaultMessage="Sending..."
                  />
                ) : (
                  <FormattedMessage
                    id="contact.form.send"
                    defaultMessage="Send Message"
                  />
                )}
              </Button>
            </form>
          </div>

          {/* Contact Info Sidebar */}
          <div className="md:col-span-5 space-y-6">
            <div className="bg-white border-[0.5px] border-slate-200/80 rounded-xl p-6 shadow-sm space-y-5">
              <h3 className="font-semibold text-slate-900 text-sm font-sans">
                <FormattedMessage
                  id="contact.info.title"
                  defaultMessage="Contact Information"
                />
              </h3>

              <div className="space-y-4">
                {/* Address */}
                <div className="flex gap-3">
                  <MapPin className="size-5 text-[#534AB7] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900">
                      <FormattedMessage
                        id="contact.info.address"
                        defaultMessage="Address"
                      />
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      <FormattedMessage
                        id="contact.info.address.val"
                        defaultMessage="Paragon International University, Phnom Penh, Cambodia"
                      />
                    </p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex gap-3">
                  <Mail className="size-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900">
                      <FormattedMessage
                        id="contact.info.email"
                        defaultMessage="Email"
                      />
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">—</p>
                  </div>
                </div>

                {/* Hours */}
                <div className="flex gap-3">
                  <Clock className="size-5 text-slate-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900">
                      <FormattedMessage
                        id="contact.info.hours"
                        defaultMessage="Working Hours"
                      />
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      <FormattedMessage
                        id="contact.info.hours.val"
                        defaultMessage="Monday - Friday: 8:00 AM - 5:00 PM"
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
