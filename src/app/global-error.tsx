"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#f3f6f8",
          color: "#0b1f33",
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>Something went wrong</h1>
          <p style={{ color: "#5b6b7c", marginBottom: "1.25rem" }}>
            Please try again. If this keeps happening, email hello@remotejobspk.com.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              border: 0,
              borderRadius: 999,
              background: "#0f7a5a",
              color: "#fff",
              padding: "0.75rem 1.25rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
