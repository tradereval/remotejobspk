import { googleAuthConfigured } from "@/lib/google-auth";

export function GoogleAuthLink({ next, label }: { next: string; label: string }) {
  if (!googleAuthConfigured()) return null;
  const href = `/api/auth/google?next=${encodeURIComponent(next)}`;
  return (
    <a
      href={href}
      className="flex w-full items-center justify-center rounded-full border border-[var(--line)] bg-white py-2.5 text-sm text-[var(--ink)]"
    >
      {label}
    </a>
  );
}
