export default function Terms() {
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

        <h1 style={{ color: "#fff", fontSize: 28, fontWeight: 800, margin: "0 0 6px" }}>Terms of Service</h1>
        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, margin: "0 0 40px" }}>
          Effective date: February 22, 2026 · Clicks PR LLC
        </p>

        {[
          {
            title: "1. Acceptance",
            body: `By creating an account or using the Clicks platform ("Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service. You must be at least 18 years of age to register.`,
          },
          {
            title: "2. Eligibility",
            body: `The Service is intended for users who are 18 years of age or older. By using the Service, you represent and warrant that you meet this requirement. Clicks PR reserves the right to terminate any account found to be in violation of this requirement.`,
          },
          {
            title: "3. User Accounts",
            body: `You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You agree to notify us immediately at nightclickspr@gmail.com of any unauthorized use.`,
          },
          {
            title: "4. Wallet & Transactions",
            body: `The in-app wallet is used solely for ordering at participating venues. Clicks PR is not a licensed financial institution. Top-up funds are non-transferable to external accounts except through supported transfer features. Refunds are issued exclusively for cancelled orders per our refund policy.`,
          },
          {
            title: "5. Prohibited Conduct",
            body: `You agree not to: (a) use the Service for any unlawful purpose; (b) harass, abuse, or harm another person; (c) submit false information; (d) attempt to gain unauthorized access to any part of the Service; (e) use automated tools to scrape or interact with the Service without written consent.`,
          },
          {
            title: "6. Content",
            body: `You retain ownership of any content you submit. By submitting content, you grant Clicks PR a non-exclusive, royalty-free license to use, display, and distribute it in connection with the Service.`,
          },
          {
            title: "7. Suspension & Termination",
            body: `Clicks PR reserves the right to suspend or permanently terminate your account at its sole discretion for violations of these Terms, without prior notice. Suspended users may contact nightclickspr@gmail.com to appeal.`,
          },
          {
            title: "8. Disclaimers",
            body: `The Service is provided "as is" without warranties of any kind. Clicks PR does not guarantee uninterrupted or error-free access. Venue information, crowd levels, and availability are provided in good faith but may not always be accurate.`,
          },
          {
            title: "9. Limitation of Liability",
            body: `To the fullest extent permitted by law, Clicks PR shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service.`,
          },
          {
            title: "10. Governing Law",
            body: `These Terms are governed by the laws of the Commonwealth of Puerto Rico and applicable U.S. federal law. Any disputes shall be resolved in the courts of Puerto Rico.`,
          },
          {
            title: "11. Changes to Terms",
            body: `We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance of the new Terms. We will make reasonable efforts to notify you of material changes.`,
          },
          {
            title: "12. Contact",
            body: `Questions about these Terms? Contact us at nightclickspr@gmail.com.`,
          },
        ].map(s => (
          <div key={s.title} style={{ marginBottom: 28 }}>
            <h2 style={{ color: "#08daf4", fontSize: 15, fontWeight: 700, margin: "0 0 8px" }}>{s.title}</h2>
            <p style={{ color: "rgba(255,255,255,0.62)", fontSize: 14, lineHeight: 1.75, margin: 0 }}>{s.body}</p>
          </div>
        ))}

        <p style={{ marginTop: 48, fontSize: 12, color: "rgba(255,255,255,0.18)", textAlign: "center" }}>
          © 2026 Clicks PR LLC · All rights reserved.
        </p>
      </div>
    </div>
  );
}
