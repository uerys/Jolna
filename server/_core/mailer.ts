import nodemailer from "nodemailer";

export const mailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "localhost",
  port: Number(process.env.SMTP_PORT || 1025),
  secure: process.env.SMTP_SECURE === "true",
  auth:
    process.env.SMTP_USER && process.env.SMTP_PASS
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
      : undefined,
});

export async function sendEmail(to: string, subject: string, html: string) {
  try {
    const info = await mailTransporter.sendMail({
      from: '"Jolna Support" <no-reply@jolna.local>',
      to,
      subject,
      html,
    });
    console.log(`[Mailer] Sent email to ${to}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[Mailer] Failed to send email to ${to}:`, msg);
    return { success: false, error: msg };
  }
}
