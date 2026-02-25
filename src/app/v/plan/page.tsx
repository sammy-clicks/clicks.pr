"use client";
import { Suspense, useEffect, useState } from "react";
import { Nav } from "@/components/Nav";

function $$(n: number) { return `$${(n / 100).toFixed(2)}`; }

const FEATURE_ROWS = [
  { label: "Menu Management",     free: true,  pro: true },
  { label: "Live Orders",         free: true,  pro: true },
  { label: "Basic Dashboard",     free: true,  pro: true },
  { label: "Click Tracking",      free: true,  pro: true },
  { label: "Boost Hour",          free: false, pro: true },
  { label: "Promotions",          free: false, pro: true },
  { label: "Advanced Analytics",  free: false, pro: true },
  { label: "PRO Badge in App",    free: false, pro: true },
  { label: "Priority Support",    free: false, pro: true },
];

function CompareModal({ isPro, priceCents, onUpgrade, upgrading, onClose }: { isPro: boolean; priceCents: number; onUpgrade: () => void; upgrading: boolean; onClose: () => void }) {
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 2000 }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 2001, background: "var(--surface)", borderRadius: 20, padding: "24px 22px", width: "min(520px, calc(100vw - 24px))", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.7)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: "1.1rem" }}>FREE vs PRO</h3>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, width: 32, height: 32, cursor: "pointer", color: "var(--ink)", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        {/* Header row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px", gap: 4, marginBottom: 6 }}>
          <div />
          <div style={{ textAlign: "center", fontWeight: 800, fontSize: 13, color: "var(--muted-text)" }}>FREE</div>
          <div style={{ textAlign: "center", fontWeight: 800, fontSize: 13, color: "var(--venue-brand, #e7a8ff)" }}>PRO</div>
        </div>

        {/* Feature rows */}
        {FEATURE_ROWS.map(f => (
          <div key={f.label} style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px", alignItems: "center", padding: "9px 0", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{f.label}</span>
            <div style={{ textAlign: "center", fontSize: 15 }}>{f.free ? <span style={{ color: "#22c55e" }}>✓</span> : <span style={{ color: "rgba(255,255,255,0.2)" }}>—</span>}</div>
            <div style={{ textAlign: "center", fontSize: 15 }}>{f.pro ? <span style={{ color: "var(--venue-brand, #e7a8ff)" }}>✓</span> : "—"}</div>
          </div>
        ))}

        {/* CTA */}
        <div style={{ marginTop: 20, textAlign: "center" }}>
          {isPro ? (
            <>
              <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(231,168,255,0.08)", border: "1px solid rgba(231,168,255,0.25)", marginBottom: 14 }}>
                <span style={{ color: "var(--venue-brand, #e7a8ff)", fontWeight: 800, fontSize: 16 }}>You&apos;re on PRO</span>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>All PRO features are active for your venue.</div>
              </div>
              <p className="muted" style={{ fontSize: 12 }}>To address any issues due to billing, contact us at <a href="mailto:nightclickspr@gmail.com" style={{ color: "var(--venue-brand, #e7a8ff)" }}>nightclickspr@gmail.com</a></p>
            </>
          ) : (
            <>
              <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 4 }}>{$$(priceCents)}<span className="muted" style={{ fontSize: 13, fontWeight: 400 }}>/mo</span></div>
              <p className="muted" style={{ fontSize: 12, marginBottom: 14 }}>Cancel anytime. No lock-in.</p>
              <button className="btn" onClick={onUpgrade} disabled={upgrading}
                style={{ background: "var(--venue-brand, #e7a8ff)", color: "#080c12", fontWeight: 800, fontSize: 15, padding: "13px 36px", borderRadius: 12, border: "none", cursor: "pointer", width: "100%" }}>
                {upgrading ? "Redirecting…" : "Upgrade to PRO"}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

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
  const [cancelling, setCancelling] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [tab, setTab] = useState<"plan" | "history">("plan");
  const [showCompare, setShowCompare] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);

  useEffect(() => {
    fetch("/api/v/plan").then(r => r.json()).then(j => {
      if (!j.error) setData(j); else setError(j.error);
    });
  }, []);

  const isPro = data?.plan === "PRO";
  const isCancelled = isPro && !!data?.subscriptionCancelledAt;

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

  async function cancelSubscription() {
    setCancelling(true);
    const r = await fetch("/api/v/plan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    const j = await r.json();
    setCancelling(false);
    setCancelConfirm(false);
    if (!r.ok) { alert(j.error || "Failed to cancel."); return; }
    setData((d: any) => ({ ...d, subscriptionCancelledAt: new Date().toISOString() }));
  }

  async function reactivateSubscription() {
    setReactivating(true);
    const r = await fetch("/api/v/plan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "reactivate" }),
    });
    const j = await r.json();
    setReactivating(false);
    if (!r.ok) { alert(j.error || "Failed to reactivate."); return; }
    setData((d: any) => ({ ...d, subscriptionCancelledAt: null }));
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
              <span className={`badge${isPro ? " active" : ""}`} style={{ fontSize: 14, padding: "4px 14px" }}>
                {isPro ? "PRO" : "FREE"}
              </span>
              {isPro && isCancelled && (
                <span className="badge" style={{ fontSize: 11, marginLeft: 8, background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}>Cancellation scheduled</span>
              )}
              {isPro && data.subscriptionStartedAt && (
                <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                  Active since: {new Date(data.subscriptionStartedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              )}
              {isPro && data.subscriptionEndsAt && !isCancelled && (
                <p className="muted" style={{ fontSize: 12 }}>
                  Next billing: {new Date(data.subscriptionEndsAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              )}
              {isPro && data.subscriptionEndsAt && isCancelled && (
                <p style={{ fontSize: 12, color: "#f87171", marginTop: 4 }}>
                  PRO access until: {new Date(data.subscriptionEndsAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
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

          {/* Plan tab — FREE */}
          {tab === "plan" && !isPro && (
            <div>
              <div className="card" style={{ marginBottom: 16, textAlign: "center", padding: "28px 24px", border: "1.5px solid var(--venue-brand)" }}>
                <h2 style={{ margin: "0 0 6px", color: "var(--venue-brand)" }}>Upgrade to PRO</h2>
                <p className="muted" style={{ marginBottom: 4 }}>Unlock the full Clicks experience for your venue.</p>
                <div style={{ fontSize: 32, fontWeight: 900, margin: "12px 0 4px" }}>{$$(data.priceCents)}<span className="muted" style={{ fontSize: 14, fontWeight: 400 }}>/mo</span></div>
                <p className="muted" style={{ fontSize: 12, marginBottom: 16 }}>Cancel anytime. No lock-in.</p>
                <button className="btn" onClick={() => setShowCompare(true)}
                  style={{ background: "var(--venue-brand)", color: "#080c12", fontWeight: 800, fontSize: 15, padding: "13px 36px", borderRadius: 12, border: "none", cursor: "pointer", width: "100%", marginBottom: 10 }}>
                  See FREE vs PRO
                </button>
                <button className="btn" onClick={startUpgrade} disabled={upgrading}
                  style={{ background: "transparent", border: "1.5px solid var(--venue-brand)", color: "var(--venue-brand)", fontWeight: 700, fontSize: 14, padding: "11px 24px", borderRadius: 12, cursor: "pointer", width: "100%" }}>
                  {upgrading ? "Redirecting…" : "Upgrade to PRO"}
                </button>
              </div>
            </div>
          )}

          {/* Plan tab — PRO */}
          {tab === "plan" && isPro && (
            <div className="card" style={{ textAlign: "center", padding: "28px 24px" }}>
              <h3 style={{ margin: "0 0 8px", color: "var(--venue-brand)" }}>You&apos;re on PRO!</h3>
              <p className="muted" style={{ marginBottom: 16 }}>All PRO features are active for your venue.</p>
              <button className="btn secondary" onClick={() => setShowCompare(true)} style={{ marginBottom: 20 }}>View Plan Details</button>

              {/* Cancellation scheduled notice */}
              {isCancelled && data.subscriptionEndsAt && (
                <div style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", marginBottom: 16, textAlign: "left" }}>
                  <div style={{ fontWeight: 700, color: "#f87171", marginBottom: 4 }}>Downgrade scheduled</div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    Your PRO plan will end on <strong style={{ color: "var(--ink)" }}>{new Date(data.subscriptionEndsAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</strong>.
                    After that, your active promotions will be moved to drafts and PRO features will be disabled.
                  </div>
                  <button
                    className="btn"
                    onClick={reactivateSubscription}
                    disabled={reactivating}
                    style={{ marginTop: 12, width: "100%", background: "var(--venue-brand)", color: "#080c12", fontWeight: 700 }}
                  >
                    {reactivating ? "Reactivating…" : "Keep PRO — Undo Cancellation"}
                  </button>
                </div>
              )}

              {/* Downgrade button — only if not yet cancelled */}
              {!isCancelled && (
                !cancelConfirm ? (
                  <button
                    className="btn secondary"
                    onClick={() => setCancelConfirm(true)}
                    style={{ width: "100%", marginBottom: 8, borderColor: "rgba(239,68,68,0.4)", color: "#f87171" }}
                  >
                    Downgrade to Free
                  </button>
                ) : (
                  <div style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.25)", marginBottom: 8, textAlign: "left" }}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>Are you sure?</div>
                    <div className="muted" style={{ fontSize: 13, marginBottom: 14 }}>
                      You&apos;ll keep PRO until <strong style={{ color: "var(--ink)" }}>{data.subscriptionEndsAt ? new Date(data.subscriptionEndsAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "end of current period"}</strong>.
                      After that, active promotions will be moved to drafts and you&apos;ll switch to the Free plan.
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn secondary" onClick={() => setCancelConfirm(false)} style={{ flex: 1 }}>Keep PRO</button>
                      <button
                        className="btn"
                        onClick={cancelSubscription}
                        disabled={cancelling}
                        style={{ flex: 1, background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)", fontWeight: 700 }}
                      >
                        {cancelling ? "Cancelling…" : "Confirm Downgrade"}
                      </button>
                    </div>
                  </div>
                )
              )}

              <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
                To address any issues due to billing, contact us at{" "}
                <a href="mailto:nightclickspr@gmail.com" style={{ color: "var(--venue-brand)" }}>nightclickspr@gmail.com</a>
              </p>
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

      {showCompare && data && (
        <CompareModal
          isPro={isPro}
          priceCents={data.priceCents}
          onUpgrade={() => { setShowCompare(false); startUpgrade(); }}
          upgrading={upgrading}
          onClose={() => setShowCompare(false)}
        />
      )}
    </div>
  );
}
