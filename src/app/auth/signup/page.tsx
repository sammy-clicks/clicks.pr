"use client";
import { useState } from "react";

/* ── Legal content ───────────────────────────────────────────────── */
const TERMS_SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    body: `By checking the agreement box and creating an account on Clicks ("Platform", "Service"), you acknowledge that you have read, understood, and agree to be legally bound by these Terms of Service. If you do not agree, you may not use the Service. These Terms constitute a binding agreement between you and Clicks PR LLC under the laws of the Commonwealth of Puerto Rico and applicable U.S. federal law.`,
  },
  {
    title: "2. Age Requirement — 18+ Only",
    body: `You must be at least 18 years of age to register or use the Service. In accordance with Puerto Rico law, the legal adult age is 18. By creating an account you represent and warrant that you are 18 years of age or older. Accounts found to belong to minors will be permanently terminated immediately and any wallet balance forfeited pending legal review. Providing false age information constitutes fraud.`,
  },
  {
    title: "3. User Accounts & Responsibility",
    body: `You are solely responsible for maintaining the confidentiality of your login credentials and for all activity conducted under your account. You agree to notify Clicks PR immediately at support@clickspr.com upon discovering any unauthorized use. Clicks PR is not liable for losses arising from unauthorized access due to your failure to safeguard credentials.`,
  },
  {
    title: "4. Intellectual Property — All Rights Reserved",
    body: `All content, features, functionality, branding, design, source code, graphics, logos, text, and trade names associated with the Clicks platform — including but not limited to the name "Clicks", the Clicks logo, application design, and any original content — are the exclusive intellectual property of Clicks PR LLC and are protected under U.S. copyright law, Puerto Rico law, and applicable international treaties.\n\nYou may NOT copy, reproduce, distribute, modify, create derivative works from, publicly display, transmit, sell, license, or otherwise exploit any part of the Service or its content without express prior written permission from Clicks PR LLC. Unauthorized use constitutes copyright infringement and may result in civil and criminal penalties under 17 U.S.C. § 101 et seq. and P.R. Law No. 55 of 2012.`,
  },
  {
    title: "5. Prohibited Conduct",
    body: `You agree not to: (a) use the Service for any purpose unlawful under Puerto Rico or U.S. federal law; (b) harass, stalk, threaten, intimidate, or harm any user or third party; (c) impersonate any person or entity; (d) submit false, misleading, or fraudulent information including age; (e) attempt unauthorized access to any part of the platform, server, or database; (f) use automated tools or bots without written authorization; (g) upload or transmit malicious code; (h) reproduce or exploit any part of the Service's intellectual property without written consent.`,
  },
  {
    title: "6. Wallet & In-App Transactions",
    body: `The in-app wallet is used exclusively for ordering at participating Clicks venues. Clicks PR is not a licensed financial institution or bank. Wallet funds are non-refundable except for verified order cancellations per our refund policy. Fraudulent chargebacks or abuse of the refund system will result in immediate account termination and may be reported to relevant authorities.`,
  },
  {
    title: "7. Safety — Disclaimer & Monitoring",
    body: `Clicks PR is NOT a public safety company, emergency services provider, or law enforcement agency. We do not guarantee the physical safety of any user at any venue or event. Your personal safety is entirely your own responsibility.\n\nHowever, Clicks PR actively monitors the platform for patterns and content that may indicate: attempted suicide or self-harm; drug or alcohol intoxication or intoxication facilitation; threats of murder, violence, or physical assault; sexual abuse, rape, or non-consensual activity facilitation; domestic abuse or human trafficking indicators.\n\nWhen such patterns are identified, Clicks PR reserves the right to take immediate action including: permanent account suspension, cooperation with the Puerto Rico Police (PRPD), U.S. federal authorities (FBI, DEA), and local emergency services (911). We are legally obligated to report credible threats of harm under Puerto Rico Law No. 246 of 2014 and applicable U.S. law. By using the Service you expressly consent to this monitoring.`,
  },
  {
    title: "8. User-Generated Content",
    body: `You retain ownership of content you submit. By submitting content to the platform, you grant Clicks PR a worldwide, non-exclusive, royalty-free license to use, store, display, and process that content solely in connection with operating and improving the Service. You represent that you own or have the necessary rights to any content you submit.`,
  },
  {
    title: "9. Account Suspension & Termination",
    body: `Clicks PR reserves the right to suspend or permanently terminate any account at its sole discretion, with or without notice, for violation of these Terms or for conduct deemed harmful to users, venues, or the platform. Accounts terminated for safety or intellectual property violations are not eligible for reinstatement. Appeals may be submitted to support@clickspr.com.`,
  },
  {
    title: "10. Disclaimers",
    body: `The Service is provided "AS IS" and "AS AVAILABLE" without warranties of any kind, express or implied, including warranties of merchantability, fitness for a particular purpose, or non-infringement. Clicks PR does not warrant that the Service will be uninterrupted, error-free, or secure at all times.`,
  },
  {
    title: "11. Limitation of Liability",
    body: `To the maximum extent permitted by applicable law, Clicks PR LLC, its officers, directors, employees, and agents shall not be liable for any direct, indirect, incidental, special, punitive, or consequential damages arising out of or related to your use of or inability to use the Service, even if advised of the possibility of such damages.`,
  },
  {
    title: "12. Governing Law & Jurisdiction",
    body: `These Terms are governed exclusively by the laws of the Commonwealth of Puerto Rico and applicable U.S. federal law. Any legal action or proceeding arising under these Terms must be brought exclusively in the courts of the Commonwealth of Puerto Rico. You irrevocably consent to personal jurisdiction in such courts.`,
  },
  {
    title: "13. Changes to Terms",
    body: `Clicks PR reserves the right to modify these Terms at any time. Material changes will be communicated via the application or email. Continued use of the Service after changes are posted constitutes acceptance of the revised Terms.`,
  },
  {
    title: "14. Contact",
    body: `Clicks PR LLC · Puerto Rico · support@clickspr.com`,
  },
];

const PRIVACY_SECTIONS = [
  {
    title: "1. Information We Collect",
    body: `We collect: (a) information you provide — name, username, email, birthdate, country, and a securely hashed password; (b) activity data — check-ins, orders, clicks, votes, wallet transactions, messages, and leaderboard entries; (c) technical data — IP addresses, device type, browser, timestamps, and session identifiers for security and fraud prevention.`,
  },
  {
    title: "2. How We Use Your Information",
    body: `Your information is used to: operate and maintain the Service; process orders and wallet transactions; enforce our Terms of Service and age restrictions; display only your username (never full name or email) on public leaderboards; send security and account-related communications; detect and respond to prohibited conduct and safety threats.`,
  },
  {
    title: "3. Information Sharing",
    body: `We do not sell, rent, or trade your personal data to third parties for marketing purposes. We may share data with: infrastructure providers under data processing agreements (e.g., Render for database hosting); law enforcement or emergency services when required by law or when a credible threat to life is identified; successors in a business merger, acquisition, or asset sale.`,
  },
  {
    title: "4. Safety Monitoring & Mandatory Reporting",
    body: `In accordance with Puerto Rican and U.S. federal law, Clicks PR monitors platform activity for indicators of: self-harm, suicidal ideation, violence toward others, sexual assault facilitation, drug or alcohol abuse facilitation, or exploitation. When credible threats are identified, we are required to report to the Puerto Rico Police Department (PRPD), emergency services, or relevant federal authorities. Consent to this monitoring is a condition of using the Service.`,
  },
  {
    title: "5. Intellectual Property & Data Rights",
    body: `All platform content, branding, and design are the exclusive property of Clicks PR LLC. The collection and processing of user data is conducted solely to operate the Service and does not grant third parties any rights to Clicks PR's intellectual property or platform architecture.`,
  },
  {
    title: "6. Location Data",
    body: `Check-in features require access to device location. Location data is used only to verify venue proximity at the moment of check-in and is not stored beyond that event. We do not track your location continuously, sell location data, or share it with advertisers.`,
  },
  {
    title: "7. Wallet & Financial Data",
    body: `Wallet balances and transaction records are stored securely. We do not store payment card numbers — any top-up integrations use PCI-compliant processors. Financial records may be retained for legal and audit compliance.`,
  },
  {
    title: "8. Cookies & Local Storage",
    body: `We use one authentication cookie (clicks_token) to maintain your session. We use browser localStorage to persist your active order tracker across page navigations. No third-party advertising or tracking cookies are used.`,
  },
  {
    title: "9. Children's Privacy — 18+ Only",
    body: `The Service is strictly prohibited for individuals under 18 years of age. We do not knowingly collect personal data from minors. If we discover a minor has registered, the account will be permanently terminated and the data deleted. To report a minor's account, contact support@clickspr.com immediately.`,
  },
  {
    title: "10. Data Security",
    body: `We implement industry-standard security: HTTPS/TLS encryption in transit, bcrypt password hashing, JWT-based authentication, and strict access controls. No internet-based system is 100% secure. We are not liable for unauthorized access resulting from circumstances beyond our reasonable control.`,
  },
  {
    title: "11. Your Rights",
    body: `You have the right to access, correct, or request deletion of your personal data. Email support@clickspr.com and we will respond within 30 days. Note: data related to pending legal or law enforcement matters cannot be deleted until those matters are fully resolved.`,
  },
  {
    title: "12. Data Retention",
    body: `Account data is retained for as long as your account remains active. Upon deletion, personal data is anonymized or removed within 30 days, except where retention is required by Puerto Rico or U.S. federal law.`,
  },
  {
    title: "13. Policy Changes",
    body: `We may update this Privacy Policy at any time. Material changes will be communicated through in-app notifications or email. Continued use of the Service constitutes acceptance of the updated policy.`,
  },
  {
    title: "14. Contact",
    body: `Data inquiries: support@clickspr.com · Clicks PR LLC · Puerto Rico`,
  },
];

/* ── Legal Modal ─────────────────────────────────────────────────── */
function LegalModal({
  title,
  sections,
  onClose,
}: {
  title: string;
  sections: { title: string; body: string }[];
  onClose: () => void;
}) {
  return (
    <div className="legal-overlay" onClick={onClose}>
      <div className="legal-sheet" onClick={e => e.stopPropagation()}>
        <div className="legal-sheet-header">
          <p className="legal-sheet-title">{title}</p>
          <button className="legal-sheet-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="legal-sheet-body">
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.28)", margin: "0 0 20px" }}>
            Effective February 22, 2026 · Clicks PR LLC · Puerto Rico
          </p>
          {sections.map(s => (
            <div className="legal-section" key={s.title}>
              <h3>{s.title}</h3>
              <p style={{ whiteSpace: "pre-line" }}>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Signup Page ─────────────────────────────────────────────────── */
export default function Signup() {
  const [username, setUsername] = useState("");
  const [firstName, setFirst] = useState("");
  const [lastName, setLast] = useState("");
  const [birthdate, setBirthdate] = useState("2000-01-01");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [country, setCountry] = useState("PR");
  const [agreed, setAgreed] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<"terms" | "privacy" | null>(null);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setMsg("");
    if (!username.trim()) { setMsg("Username is required."); return; }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) { setMsg("Username: 3-20 chars, letters/numbers/underscore only."); return; }
    if (!email) { setMsg("Email is required."); return; }
    if (password.length < 8) { setMsg("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setMsg("Passwords do not match."); return; }
    if (!agreed) { setMsg("You must agree to the Terms of Service and Privacy Policy."); return; }
    setLoading(true);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: username.trim().toLowerCase(), firstName, lastName, birthdate, email, password, country }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setMsg(data.error || "Failed"); return; }
    window.location.href = "/u/zones";
  }

  return (
    <>
      {modal === "terms" && (
        <LegalModal title="Terms of Service" sections={TERMS_SECTIONS} onClose={() => setModal(null)} />
      )}
      {modal === "privacy" && (
        <LegalModal title="Privacy Policy" sections={PRIVACY_SECTIONS} onClose={() => setModal(null)} />
      )}

      <div className="auth-bg">
        <div className="auth-inner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Clicks" className="auth-logo-sm" />

        <a href="/role" className="auth-back">&#8592; Back</a>

        <div className="auth-card">
          <p className="auth-card-title">Create account</p>
          <p className="auth-card-sub">Join Clicks — Puerto Rico&apos;s nightlife radar</p>

          <form onSubmit={submit} autoComplete="on" noValidate>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <label htmlFor="su-first">First name</label>
                <input
                  id="su-first"
                  name="given-name"
                  value={firstName}
                  onChange={e => setFirst(e.target.value)}
                  placeholder="Carlos"
                  autoComplete="given-name"
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <label htmlFor="su-last">Last name</label>
                <input
                  id="su-last"
                  name="family-name"
                  value={lastName}
                  onChange={e => setLast(e.target.value)}
                  placeholder="Mendoza"
                  autoComplete="family-name"
                />
              </div>
            </div>

            <label htmlFor="su-bday">Birthdate</label>
            <input id="su-bday" name="bday" type="date" value={birthdate} onChange={e => setBirthdate(e.target.value)} autoComplete="bday" />

            <label htmlFor="su-country">Country</label>
            <select id="su-country" name="country" value={country} onChange={e => setCountry(e.target.value)} autoComplete="country">
              <option value="PR">Puerto Rico</option>
              <option value="US">United States</option>
            </select>

            <label htmlFor="su-user">
              Username
              <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "rgba(255,255,255,0.25)", marginLeft: 6 }}>
                (shown on leaderboard)
              </span>
            </label>
            <input
              id="su-user"
              name="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="nightrider_pr"
              maxLength={20}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
            />

            <label htmlFor="su-email">Email</label>
            <input
              id="su-email"
              name="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="carlos@example.com"
              autoComplete="email"
            />

            <label htmlFor="su-pw">Password</label>
            <input
              id="su-pw"
              name="new-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min 8 characters"
              autoComplete="new-password"
            />

            <label htmlFor="su-cpw">Confirm password</label>
            <input
              id="su-cpw"
              name="confirm-password"
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat password"
              autoComplete="new-password"
            />

              {/* Agreement checkbox */}
              <div className="auth-terms">
                <input
                  type="checkbox"
                  id="su-agree"
                  checked={agreed}
                  onChange={e => setAgreed(e.target.checked)}
                />
                <label htmlFor="su-agree" className="auth-terms-label">
                  By checking this box, I confirm I am 18 years of age or older and agree to the Clicks{" "}
                  <button
                    type="button"
                    onClick={() => setModal("terms")}
                    style={{ background: "none", border: "none", padding: 0, color: "#08daf4", fontWeight: 600, fontSize: "inherit", cursor: "pointer" }}
                  >Terms of Service</button>
                  {" "}and{" "}
                  <button
                    type="button"
                    onClick={() => setModal("privacy")}
                    style={{ background: "none", border: "none", padding: 0, color: "#08daf4", fontWeight: 600, fontSize: "inherit", cursor: "pointer" }}
                  >Privacy Policy</button>
                  , including Clicks&apos; intellectual property rights, content monitoring policies, and safety reporting obligations.
                </label>
              </div>

            <button type="submit" className="auth-submit-btn" disabled={loading || !agreed}>
              {loading ? "Creating…" : "Create account"}
            </button>
            {msg && <p className="auth-error">{msg}</p>}
          </form>

          <div className="auth-card-footer" style={{ marginTop: 18 }}>
            Already have an account?{" "}
            <a href="/auth/login">Log in →</a>
          </div>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/copyright.png" alt="© Clicks" className="auth-copyright" />
        </div>
      </div>
    </>
  );
}
