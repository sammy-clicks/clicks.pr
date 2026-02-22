"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Nav } from "@/components/Nav";

function $$(n: number) { return `$${(n / 100).toFixed(2)}`; }

export default function VenuePlanPage() {
  return (
    <Suspense fallback={<div className="container"><Nav role="v" /><p className="muted">Loading…</p></div>}>
      <PlanContent />
    </Suspense>
  );
}

function PlanContent() {
  const router = useRouter();
  const params = useSearchParams();
  const upgraded = params.get("upgraded") === "1";

  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const r = await fetch("/api/v/plan");
    const j = await r.json();
    if (!r.ok) { setError(j.error || "Failed to load plan info."); return; }
    setData(j);
  }

  useEffect(() => { load(); }, []);

  async function upgrade() {
    setLoading(true);
    const r = await fetch("/api/v/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "checkout" }),
    });
    const j = await r.json();
    setLoading(false);
    if (!r.ok) { alert(j.error || "Error starting checkout."); return; }
    if (j.simulated) {
      router.push(j.redirectUrl ?? "/v/plan?upgraded=1");
    } else if (j.checkoutUrl) {
      window.location.href = j.checkoutUrl;
    }
  }

  async function portal() {
    setLoading(true);
    const r = await fetch("/api/v/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "portal" }),
    });
    const j = await r.json();
    setLoading(false);
    if (!r.ok) { alert(j.error || "Error opening billing portal."); return; }
    if (j.portalUrl) window.location.href = j.portalUrl;
  }

  if (error) return (
    <div className="container">
      <Nav role="v" />
      <p className="muted">{error}</p>
    </div>
  );

  const isPro = data?.plan === "PRO";

  return (
    <div className="container">
      <Nav role="v" />
      <div className="header"><h2>Subscription Plan</h2></div>

      {upgraded && (
        <div className="card" style={{ background: "#1a2e1a", borderColor: "#3a7", marginBottom: 16 }}>
          <strong style={{ color: "#5f5" }}>🎉 Welcome to PRO!</strong>
          <p className="muted" style={{ marginTop: 4 }}>Your venue has been upgraded. You can now create promotions and access PRO features.</p>
        </div>
      )}

      {!data && <p className="muted">Loading…</p>}

      {data && (
        <>
          {/* ── Current plan ─────────────────────────────────────────── */}
          <div className="card" style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1 }}>
              <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Current plan — {data.venueName}</div>
              <span className={`badge${isPro ? " active" : ""}`} style={{ fontSize: 16, padding: "6px 16px" }}>
                {isPro ? "⭐ PRO" : "FREE"}
              </span>
              {isPro && data.subscriptionEndsAt && (
                <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
                  Next billing:{" "}
                  {new Date(data.subscriptionEndsAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              )}
              {isPro && data.subscriptionStartedAt && (
                <p className="muted" style={{ fontSize: 12 }}>
                  Active since:{" "}
                  {new Date(data.subscriptionStartedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              )}
            </div>
            <div>
              {isPro
                ? <button className="btn secondary" onClick={portal} disabled={loading}>{loading ? "…" : "Manage Subscription"}</button>
                : <button className="btn" onClick={upgrade} disabled={loading}>{loading ? "Processing…" : "Upgrade to PRO — $49/mo"}</button>
              }
            </div>
          </div>

          {/* ── PRO features ─────────────────────────────────────────── */}
          <h3>What's included in PRO</h3>
          <div className="card">
            <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 2 }}>
              <li>📢 <strong>Promotions</strong> — Create nightly specials with image, description & price</li>
              <li>🗂️ <strong>Draft storage</strong> — Save promos as drafts and publish when ready</li>
              <li>⏰ <strong>Auto-expiry</strong> — Promos expire automatically at your municipality&rsquo;s cutoff time</li>
              <li>📊 <strong>Venue analytics</strong> — Orders, check-ins, and engagement stats</li>
              <li>🚀 <strong>Boost visibility</strong> — Featured placement in zone listings</li>
            </ul>
            {!isPro && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #333" }}>
                <span style={{ fontSize: 22, fontWeight: 700 }}>$49</span>
                <span className="muted"> / month — cancel anytime</span>
              </div>
            )}
          </div>

          {/* ── Payment history ──────────────────────────────────────── */}
          {data.payments?.length > 0 && (
            <>
              <h3>Payment History</h3>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Period</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.payments.map((p: any) => (
                    <tr key={p.id}>
                      <td className="muted" style={{ fontSize: 12 }}>
                        {new Date(p.paidAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td>{$$(p.amountCents)}</td>
                      <td className="muted" style={{ fontSize: 11 }}>
                        {new Date(p.periodStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        {" – "}
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
            </>
          )}
        </>
      )}
    </div>
  );
}
