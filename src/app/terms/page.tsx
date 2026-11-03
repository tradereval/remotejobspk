import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-12 text-[var(--muted)]">
      <h1 className="font-[family-name:var(--font-display)] text-4xl text-[var(--ink)]">Terms</h1>
      <p>
        RemoteJobsPK lists worldwide remote jobs a person in Pakistan can apply for. We are not the
        employer, and a listing here is not a job offer. Employment is not guaranteed.
      </p>
      <p>
        The account is free. Browse, saved searches, and apply links are included. Signing up does not
        buy an interview. Creating an account means you agree to these terms. We email them with the
        verification message. A made-up address cannot open matches until that email is confirmed. Google
        sign-in counts as confirmation because Google has already verified the address.
      </p>
      <p>
        Apply happens on the employer’s site. Check the role yourself before you share documents or pay
        anyone. Tell us if a listing looks closed, fake, or closed to Pakistan, and we can hide it.
      </p>
      <p>
        Listings from Himalayas stay attributed to Himalayas. Do not copy this board into another job
        aggregator. Write to hello@remotejobspk.com if something here is wrong.
      </p>
    </div>
  );
}
