"use client";
import { Suspense, useEffect, useState } from "react";
import { Nav } from "@/components/Nav";

function $$(n: number) { return `$${(n / 100).toFixed(2)}`; }

const PRO_FEATURES = [
  { icon: "", title: "Boost Hour", desc: "Push your venue to the top for 60 min" },
  { icon: "", title: "Promotions", desc: "Create nightly deals for your guests" },
  { icon: "", title: "Analytics", desc: "Crowd & revenue insights" },
  { icon: "", title: "PRO Badge", desc: "Highlighted in the app for users" },
];

export default function VenuePlanPage() {
  return (
    <Suspense fallback={<div className="container"><Nav role="v" /><p className="muted">Loading...</p></div>}>
      <PlanContent />
    </Suspense>
  );
}

function PlanContent() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [upgrading, setUpgrading] = useState(false);
  const [tab, setTab] = useState<"plan" | "history">("plan");

  useEffect(() => {
    fetch("/api/v/plan").then(r => r.json()).then(j => {
      if (!j.error) setData(j); else setError(j.error);
    });
  }, []);

  const isPro = data?.plan === "PRO";

  async function startUpgrade() {
    setUpgrading(true);
    const r = await fetch("/api/v/plan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "checkout" }),
    });
    const j = await r.json();
    setUpgrading(false);
    if (!r.ok) { alert(j.error || "Failed to start checkout."); return; }
    if (j.checkoutUrl) { window.location.href = j.checkoutUrl; return; }
    if (j.simulated) { window.location.href = j.redirectUrl; return; }
  }

  if (error) return (
    <div className="container">
      <Nav role="v" />
      <p className="muted">{error}</p>
    </div>
  );

  return (
    <div className="container">
      <Nav role="v" />
      <div className="header">
        <h2 style={{ color: "var(--venue-brand)" }}>Plan &amp; Billing</h2>
        <a href="/v/account"><button className="btn secondary">Back</button></a>
      </div>

      {!data && <p className="muted">Loading...</p>}

      {data && (
        <>
          {/* Status banner */}
          <div className="card" style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>{data.venueName}</div>
              <span className={`badge${isPro ? " active" : ""}`} style={{ fontSize: 14, padding: "4px 14px" }}>
                {isPro ? " PRO" : "FREE"}
              </span>
              {isPro && data.subscriptionStartedAt && (
                <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                  Active since: {new Date(data.subscriptionStartedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              )}
              {isPro && data.subscriptionEndsAt && (
                <p className="muted" style={{ fontSize: 12 }}>
                  Next billing: {new Date(data.subscriptionEndsAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {(["plan", "history"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", border: "1.5px solid var(--border)",
                  background: tab === t ? "var(--venue-brand)" : "var(--surface)",
                  color: tab === t ? "#080c12" : "var(--ink)",
                }}>
                {t === "plan" ? "PRO Plan" : "Payment History"}
              </button>
            ))}
          </div>

          {/* Plan tab  FREE */}
          {tab === "plan" && !isPro && (
            <div>
              <div className="card" style={{ marginBottom: 16, textAlign: "center", padding: "28px 24px", border: "1.5px solid var(--venue-brand)" }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}></div>
                <h2 style={{ margin: "0 0 6px", color: "var(--venue-brand)" }}>Upgrade to PRO</h2>
                <p className="muted" style={{ marginBottom: 4 }}>Unlock the full Clicks experience for your venue.</p>
                <div style={{ fontSize: 32, fontWeight: 900, margin: "12px 0 4px" }}>{$$(data.priceCents)}<span className="muted" style={{ fontSize: 14, fontWeight: 400 }}>/mo</span></div>
                <p className="muted" style={{ fontSize: 12, marginBottom: 20 }}>Cancel anytime. No lock-in.</p>
                <button className="btn" onClick={startUpgrade} disabled={upgrading}
                  style={{ background: "var(--venue-brand)", color: "#080c12", fontWeight: 800, fontSize: 15, padding: "13px 36px", borderRadius: 12, border: "none", cursor: "pointer", width: "100%" }}>
                  {upgrading ? "Redirecting" : "Upgrade to PRO "}
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {PRO_FEATURES.map(f => (
                  <div key={f.title} className="card" style={{ padding: "14px 16px" }}>
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{f.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{f.title}</div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Plan tab  PRO */}
          {tab === "plan" && isPro && (
            <div className="card" style={{ textAlign: "center", padding: "28px 24px" }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}></div>
              <h3 style={{ margin: "0 0 8px", color: "var(--venue-brand)" }}>You&apos;re on PRO!</h3>
              <p className="muted">All PRO features are active. Manage your subscription from the billing portal.</p>
              <button className="btn secondary" style={{ marginTop: 14 }} onClick={async () => {
                const r = await fetch("/api/v/plan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "portal" }) });
                const j = await r.json();
                if (j.portalUrl) window.location.href = j.portalUrl;
              }}>Manage subscription</button>
            </div>
          )}

          {/* History tab */}
          {tab === "history" && (
            <>
              <h3 style={{ marginBottom: 12 }}>Payment History</h3>
              {data.payments?.length > 0 ? (
                <table>
                  <thead>
                    <tr><th>Date</th><th>Amount</th><th>Period</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {data.payments.map((p: any) => (
                      <tr key={p.id}>
                        <td className="muted" style={{ fontSize: 13 }}>
                          {new Date(p.paidAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td>{$$(p.amountCents)}</td>
                        <td className="muted" style={{ fontSize: 12 }}>
                          {new Date(p.periodStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          {" - "}
                          {new Date(p.periodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td>
                          <span className={`badge${p.status === "PAID" ? " active" : ""}`} style={{ fontSize: 11 }}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="muted">No payment history yet.</p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
