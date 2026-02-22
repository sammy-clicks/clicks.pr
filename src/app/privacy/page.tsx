export default function Privacy() {
  return (
    <div className="auth-bg" style={{ justifyContent: "flex-start", alignItems: "center" }}>
      <div style={{
        position: "relative", zIndex: 1, width: "100%", maxWidth: 680,
        padding: "48px 24px 80px",
      }}>
        <a href="/auth/signup" style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          fontSize: 13, color: "rgba(255,255,255,0.38)", textDecoration: "none",
          marginBottom: 32,
        }}>&#8592; Back to sign up</a>

        <h1 style={{ color: "#fff", fontSize: 28, fontWeight: 800, margin: "0 0 6px" }}>Privacy Policy</h1>
        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, margin: "0 0 40px" }}>
          Effective date: February 22, 2026 · Clicks PR LLC
        </p>

        {[
          {
            title: "1. Information We Collect",
            body: `We collect information you provide directly: name, username, email address, birthdate, country, and password (stored as a secure hash). We also collect activity data such as check-ins, orders, clicks, votes, and wallet transactions. Device and usage data (IP address, browser type, timestamps) may be collected for security and analytics.`,
          },
          {
            title: "2. How We Use Your Information",
            body: `We use your information to: (a) operate and improve the Service; (b) process orders and wallet transactions; (c) display public leaderboard data (username only — no full name or email is ever shown publicly); (d) send security-related communications; (e) enforce our Terms of Service.`,
          },
          {
            title: "3. Sharing of Information",
            body: `We do not sell, rent, or trade your personal information to third parties for marketing purposes. We may share data with: service providers who assist in operating the platform (e.g., database hosting on Render); law enforcement when required by law; successor entities in the event of a merger or acquisition.`,
          },
          {
            title: "4. Wallet & Financial Data",
            body: `Wallet balances and transaction records are stored securely and never shared with third parties except as required for fraud prevention or legal compliance. We do not store full payment card numbers — top-up integrations are handled by PCI-compliant processors.`,
          },
          {
            title: "5. Location Data",
            body: `Check-in and geo-based features require access to your device location. Location data is used solely to verify eligibility for check-in and is not stored beyond the check-in event or sold to third parties.`,
          },
          {
            title: "6. Data Retention",
            body: `We retain your account data for as long as your account is active. You may request account deletion by emailing support@clickspr.com. Upon deletion, personal data is removed or anonymized within 30 days, except where retention is required by law.`,
          },
          {
            title: "7. Cookies & Local Storage",
            body: `We use a single authentication cookie (clicks_token) to keep you logged in. We use localStorage to persist your active order tracker across page navigations. No third-party advertising cookies are used.`,
          },
          {
            title: "8. Children's Privacy",
            body: `The Service is not intended for users under 18 years of age. We do not knowingly collect personal information from minors. If we become aware that a minor has provided us with personal data, we will delete it promptly.`,
          },
          {
            title: "9. Security",
            body: `We implement industry-standard security measures including HTTPS encryption, hashed passwords (bcrypt), and JWT-based authentication. No method of transmission over the internet is 100% secure; we cannot guarantee absolute security.`,
          },
          {
            title: "10. Your Rights",
            body: `You have the right to access, correct, or delete your personal data. You may also request a copy of the data we hold about you. To exercise these rights, contact us at support@clickspr.com. We will respond within 30 days.`,
          },
          {
            title: "11. Changes to This Policy",
            body: `We may update this Privacy Policy periodically. We will notify you of significant changes via the app or email. Continued use of the Service after changes constitutes acceptance of the updated policy.`,
          },
          {
            title: "12. Contact",
            body: `For privacy inquiries, contact: support@clickspr.com · Clicks PR LLC · Puerto Rico`,
          },
        ].map(s => (
          <div key={s.title} style={{ marginBottom: 28 }}>
            <h2 style={{ color: "#08daf4", fontSize: 15, fontWeight: 700, margin: "0 0 8px" }}>{s.title}</h2>
            <p style={{ color: "rgba(255,255,255,0.62)", fontSize: 14, lineHeight: 1.75, margin: 0 }}>{s.body}</p>
          </div>
        ))}

        <p style={{ marginTop: 48, fontSize: 12, color: "rgba(255,255,255,0.18)", textAlign: "center" }}>
          © 2026 Clicks PR LLC — All rights reserved.
        </p>
      </div>
    </div>
  );
}
