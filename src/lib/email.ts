import { readFile } from "fs/promises";
import path from "path";
import { issueEmailVerification } from "./auth";
import { logOutboundEmail, type LeadUser } from "./leads-sheet";
import { emailSiteUrl } from "./site";

type SendResult = { sent: boolean; skipped: boolean };

function fromAddress() {
  return process.env.RESEND_FROM || "RemoteJobsPK <hello@remotejobspk.com>";
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function logoBase64() {
  try {
    const file = path.join(process.cwd(), "public", "logo-signature.jpg");
    return (await readFile(file)).toString("base64");
  } catch (err) {
    console.error("[email] logo missing", err);
    return null;
  }
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendResult> {
  const logo = await logoBase64();
  const key = process.env.RESEND_API_KEY?.trim();
  if (key) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromAddress(),
          to: [input.to],
          subject: input.subject,
          html: input.html,
          text: input.text,
          ...(logo
            ? { attachments: [{ filename: "logo.jpg", content: logo, content_id: "logo" }] }
            : {}),
        }),
      });
      if (res.ok) return { sent: true, skipped: false };
      console.error("[email] resend failed", res.status, await res.text().catch(() => ""));
    } catch (err) {
      console.error("[email] resend error", err);
    }
  }

  const url = process.env.LEADS_SHEET_WEBHOOK_URL?.trim();
  const secret = process.env.EMAIL_WEBHOOK_SECRET?.trim();
  if (url && secret) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sendEmail",
          secret,
          to: input.to,
          subject: input.subject,
          html: input.html,
          text: input.text,
          logoBase64: logo,
        }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean } | null;
      if (res.ok && data?.ok) return { sent: true, skipped: false };
      console.error("[email] workspace mail failed", res.status);
    } catch (err) {
      console.error("[email] workspace mail error", err);
    }
  }

  if (process.env.NODE_ENV !== "production") {
    console.info(`[email] not sent to=${input.to} subject=${input.subject}`);
  }
  return { sent: false, skipped: !key && !(url && secret) };
}

function footerLink(path: string, label: string) {
  return `<a href="${emailSiteUrl()}${path}" style="color:#0f7a5a">${escapeHtml(label)}</a>`;
}

function letter(title: string, body: string) {
  return `<div style="font-family:Georgia,serif;color:#0b1f33;line-height:1.55;max-width:560px">
    <img src="cid:logo" width="280" alt="RemoteJobsPK" style="display:block;margin:0 0 20px" />
    <h1 style="font-size:24px;font-weight:600;margin:0 0 12px">${escapeHtml(title)}</h1>
    ${body}
    <table role="presentation" style="margin-top:28px;border-top:1px solid #c9d5df;padding-top:16px" cellpadding="0" cellspacing="0">
      <tr>
        <td style="font-family:Georgia,serif;font-size:13px;line-height:1.5;color:#5b6b7c">
          <strong style="color:#0f7a5a">RemoteJobsPK</strong><br />
          Worldwide remote jobs for people in Pakistan<br />
          <a href="mailto:hello@remotejobspk.com" style="color:#0f7a5a">hello@remotejobspk.com</a><br />
          We list jobs. We are not the employer. Employment is not guaranteed.<br />
          ${footerLink("/terms", "Terms")}
          &nbsp;·&nbsp;
          ${footerLink("/privacy", "Privacy")}
        </td>
      </tr>
    </table>
  </div>`;
}

function termsCopy() {
  return `<p>RemoteJobsPK lists worldwide remote jobs a person in Pakistan can apply for. We are not the employer, and a listing here is not a job offer. Employment is not guaranteed.</p>
    <p>The account is free. Browse, saved searches, and apply links are included. Signing up does not buy an interview. Creating an account means you agree to these terms. A made-up address cannot open matches until this email is confirmed. Google sign-in counts as confirmation because Google has already verified the address.</p>
    <p>Apply happens on the employer’s site. Check the role yourself before you share documents or pay anyone. Tell us if a listing looks closed, fake, or closed to Pakistan, and we can hide it.</p>
    <p>Listings from Himalayas stay attributed to Himalayas. Do not copy this board into another job aggregator. Write to hello@remotejobspk.com if something here is wrong.</p>
    <p>We store the name, email, phone, city, state, qualification, and specialty on an account, plus saved jobs and searches, so we can match roles and reply. We do not sell that list. Write to hello@remotejobspk.com to ask us to delete an account.</p>`;
}

function welcomeTitle(name: string | null | undefined) {
  const clean = name?.trim() || "";
  const compact = clean.toLowerCase().replace(/[^a-z]/g, "");
  if (!clean || compact === "remotejobspk" || compact === "remotejobs") return "Welcome to RemoteJobsPK";
  return `Welcome, ${clean}`;
}

function verifyButton(link: string, label: string) {
  return `<p style="margin:22px 0">
    <a href="${escapeHtml(link)}" style="display:inline-block;background:#0f7a5a;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700">${escapeHtml(label)}</a>
  </p>`;
}

export async function sendAccountVerification(user: LeadUser, nextPath: string, asked?: string) {
  const token = await issueEmailVerification(user.id);
  const link = `${emailSiteUrl()}/verify-email/confirm?token=${encodeURIComponent(token)}&next=${encodeURIComponent(nextPath)}`;
  const askedLine = asked
    ? `You asked for: ${asked}`
    : "After you verify, we open the remote jobs that match what you asked for.";
  const result = await sendEmail({
    to: user.email,
    subject: "Welcome to RemoteJobsPK — verify your email",
    text: `${welcomeTitle(user.name)}\n\n${askedLine}\n\nVerify your email (valid for 24 hours): ${link}\n\nRemoteJobsPK lists worldwide remote jobs a person in Pakistan can apply for. We are not the employer. Employment is not guaranteed. The account is free. Creating an account means you agree to these terms. Write to hello@remotejobspk.com if something here is wrong.\n\nRemoteJobsPK\nWorldwide remote jobs for people in Pakistan\nhello@remotejobspk.com`,
    html: letter(
      welcomeTitle(user.name),
      `<p>${escapeHtml(askedLine)}</p>
       <p>Confirm this inbox is yours. We only open your matches after that, so a made-up address cannot hold an account.</p>
       ${verifyButton(link, "Verify my email")}
       <p style="font-size:13px;color:#5b6b7c">The button works for 24 hours. If you did not create this account, ignore this email.</p>
       <h2 style="font-size:16px;margin:22px 0 8px">Terms</h2>
       ${termsCopy()}`,
    ),
  });
  if (result.sent) await logOutboundEmail(user, "Welcome and verification email");
  return result;
}

export async function sendWelcome(user: LeadUser) {
  const jobs = `${emailSiteUrl()}/jobs`;
  const result = await sendEmail({
    to: user.email,
    subject: "Welcome to RemoteJobsPK",
    text: `${welcomeTitle(user.name)}\n\nYour email is confirmed. The account is free. Open jobs: ${jobs}\n\nRemoteJobsPK lists worldwide remote jobs a person in Pakistan can apply for. We are not the employer. Employment is not guaranteed. Creating an account means you agree to these terms. Write to hello@remotejobspk.com if something here is wrong.\n\nRemoteJobsPK\nWorldwide remote jobs for people in Pakistan\nhello@remotejobspk.com`,
    html: letter(
      welcomeTitle(user.name),
      `<p>Your email is confirmed. The account is free, and you can open every remote listing.</p>
       ${verifyButton(jobs, "See remote jobs")}
       <h2 style="font-size:16px;margin:22px 0 8px">Terms</h2>
       ${termsCopy()}`,
    ),
  });
  if (result.sent) await logOutboundEmail(user, "Welcome email");
  return result;
}

export async function sendPasswordReset(user: LeadUser, token: string) {
  const link = `${emailSiteUrl()}/reset?token=${encodeURIComponent(token)}`;
  const result = await sendEmail({
    to: user.email,
    subject: "Reset your RemoteJobsPK password",
    text: `Reset your password (valid for 1 hour): ${link}`,
    html: letter(
      "Reset your password",
      `<p>This link works for one hour. If you did not ask for it, ignore this email.</p>
       <p><a href="${escapeHtml(link)}">Choose a new password</a></p>`,
    ),
  });
  if (result.sent) await logOutboundEmail(user, "Password reset link sent");
  return { ...result, link };
}

export async function sendReceipt(user: LeadUser, planLabel: string) {
  const result = await sendEmail({
    to: user.email,
    subject: "Premium is on — RemoteJobsPK",
    text: `${planLabel} is active for 30 days. Verified filter, beginners filter, saved searches, and daily email are included. ${emailSiteUrl()}/account`,
    html: letter(
      "Premium is on",
      `<p>${escapeHtml(planLabel)} is active for 30 days. You can use the verified filter, the beginners filter, saved searches, and daily email when new matches land.</p>
       <p><a href="${emailSiteUrl()}/account">Open your account</a></p>`,
    ),
  });
  if (result.sent) await logOutboundEmail(user, `Receipt: ${planLabel}`);
  return result;
}

export async function sendJobAlert(
  user: LeadUser,
  searchName: string,
  jobs: { id: string; title: string; company: string }[],
) {
  const lines = jobs
    .map((job) => `• ${job.title} — ${job.company} — ${emailSiteUrl()}/jobs/${job.id}`)
    .join("\n");
  const items = jobs
    .map(
      (job) =>
        `<li><a href="${emailSiteUrl()}/jobs/${job.id}">${escapeHtml(job.title)}</a> — ${escapeHtml(job.company)}</li>`,
    )
    .join("");
  const result = await sendEmail({
    to: user.email,
    subject: `${jobs.length} new match${jobs.length === 1 ? "" : "es"} — ${searchName}`,
    text: `New jobs for “${searchName}”:\n${lines}`,
    html: letter(`New matches for ${searchName}`, `<ul>${items}</ul>`),
  });
  if (result.sent) await logOutboundEmail(user, `Daily alert “${searchName}” (${jobs.length})`);
  return result;
}

export const REPLY_TEMPLATES = {
  signup: {
    label: "Signup",
    subject: "You're in on RemoteJobsPK",
    body: "Your account is ready. Open the job board, filter for Pakistan + worldwide, and apply on the employer site. Apply links stay free.",
  },
  payment: {
    label: "Payment received",
    subject: "Premium is on",
    body: "We received your payment. Premium is active for 30 days: verified filter, beginners filter, saved searches, and a daily email when new matches land.",
  },
  support: {
    label: "Support",
    subject: "We got your message",
    body: "Thanks for writing to RemoteJobsPK. A reply will come from hello@remotejobspk.com.",
  },
} as const;

export type ReplyTemplateId = keyof typeof REPLY_TEMPLATES;

export async function sendReply(user: LeadUser, templateId: ReplyTemplateId, extra?: string) {
  const template = REPLY_TEMPLATES[templateId];
  const note = extra?.trim();
  const text = note ? `${template.body}\n\n${note}` : template.body;
  const result = await sendEmail({
    to: user.email,
    subject: template.subject,
    text,
    html: letter(
      template.subject,
      `<p>${escapeHtml(template.body)}</p>${note ? `<p>${escapeHtml(note)}</p>` : ""}`,
    ),
  });
  if (result.sent) await logOutboundEmail(user, `Reply “${template.label}”${note ? `: ${note}` : ""}`);
  return result;
}
