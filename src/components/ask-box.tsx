export function AskBox({
  defaultValue = "",
  variant = "hero",
}: {
  defaultValue?: string;
  variant?: "hero" | "page";
}) {
  const onHero = variant === "hero";
  return (
    <form action="/find" className={onHero ? "mt-8 max-w-2xl" : "max-w-2xl"}>
      <label
        htmlFor="ask"
        className={`block text-lg font-medium ${onHero ? "text-white" : "text-[var(--ink)]"}`}
      >
        What kind of remote job are you looking for?
      </label>
      <textarea
        id="ask"
        name="ask"
        required
        minLength={8}
        rows={3}
        defaultValue={defaultValue}
        placeholder="I'm a call center agent with 16 years of experience. I want a role that pays at least $1,300 a month."
        className="mt-3 w-full rounded-2xl border border-white/30 bg-white px-4 py-3 text-[var(--ink)] shadow-sm"
      />
      <button
        type="submit"
        className="mt-3 rounded-full bg-[var(--accent)] px-6 py-3 text-[var(--bg)] hover:brightness-110"
      >
        Find my match
      </button>
    </form>
  );
}
