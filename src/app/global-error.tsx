"use client";

/** Kök düzen bile çöktüğünde gösterilir (500). Kendi <html>'ini çizer; tasarım token'ları yüklenmeyebilir. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="tr">
      <body style={{ margin: 0, background: "#f5f3ee", color: "#171614", fontFamily: "Georgia, serif" }}>
        <main style={{ maxWidth: 560, margin: "20vh auto", padding: "0 16px" }}>
          <p style={{ fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "#666159" }}>500</p>
          <h1 style={{ fontWeight: 300, fontSize: 40, margin: "8px 0 16px" }}>Bir şeyler ters gitti.</h1>
          <p style={{ color: "#666159", fontFamily: "Helvetica, Arial, sans-serif" }}>
            Sitemizde geçici bir sorun var. Birkaç dakika sonra tekrar deneyin.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{ marginTop: 24, background: "#171614", color: "#f5f3ee", border: 0, padding: "14px 24px", cursor: "pointer" }}
          >
            Tekrar dene
          </button>
        </main>
      </body>
    </html>
  );
}
