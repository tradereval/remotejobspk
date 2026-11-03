import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-12 text-[var(--muted)]">
      <h1 className="font-[family-name:var(--font-display)] text-4xl text-[var(--ink)]">Privacy</h1>
      <p>
        RemoteJobsPK is a job research site. Contact hello@remotejobspk.com to ask a question or to ask us
        to delete your account.
      </p>
      <p>
        An account stores your name, email, a password hash, phone, city, state, qualification, and
        specialty. We also store jobs you save or mark applied, searches you save, and reports you send.
        A session cookie keeps you logged in. We email a verification link before a new address can open
        matches. If you use Google, Google confirms that address and we store the Google account id.
      </p>
      <p>
        Signup, profile edits, and emails we send are copied to our own database and, when configured, to a
        private Google Sheet so we can reply to you. We do not sell that list.
      </p>
      <p>
        Job listings come from Himalayas and from roles we add by hand. The apply button opens the employer
        site. What you submit there is handled by that employer, not by this account.
      </p>
      <p>Daily alert mail goes to the address on an account that saved a search.</p>
    </div>
  );
}
