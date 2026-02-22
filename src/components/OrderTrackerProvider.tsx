"use client";
import { useEffect, useRef, useState } from "react";
import { OrderTrackerContext, ActiveOrder } from "./OrderTrackerContext";

const STORAGE_KEY = "clicks_active_order";
const FINAL = ["COMPLETED", "CANCELLED", "PICKED_UP"];
const PHASES = [
  { key: "PLACED",    label: "Sent" },
  { key: "ACCEPTED",  label: "Accepted" },
  { key: "PREPARING", label: "Preparing" },
  { key: "READY",     label: "Ready" },
];

type Popup = "none" | "completed" | "cancelled" | "issue_form" | "issue_submitted";

function fmt(cents: number) { return `$${(cents / 100).toFixed(2)}`; }

export function OrderTrackerProvider({ children }: { children: React.ReactNode }) {
  const [activeOrder, setActiveOrderState] = useState<ActiveOrder | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [codeVisible, setCodeVisible] = useState(false);
  const [popup, setPopup] = useState<Popup>("none");
  const [issueText, setIssueText] = useState("");
  const [issueSending, setIssueSending] = useState(false);
  const [caseNumber, setCaseNumber] = useState("");
  const [cancelledInfo, setCancelledInfo] = useState<{ venueName: string; refundCents: number } | null>(null);
  const [cancellingId, setCancellingId] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevStatus = useRef<string>("");

  function setActiveOrder(o: ActiveOrder | null) {
    setActiveOrderState(o);
    if (o) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(o));
      prevStatus.current = o.status;
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const o: ActiveOrder = JSON.parse(saved);
        setActiveOrderState(o);
        prevStatus.current = o.status;
      }
    } catch { /* ignore */ }
  }, []);

  // Poll every 5s when order is active
  useEffect(() => {
    if (!activeOrder || FINAL.includes(activeOrder.status)) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }

    async function poll() {
      const r = await fetch("/api/orders");
      const j = await r.json();
      const found = (j.orders ?? []).find((o: any) => o.id === activeOrder!.orderId);
      if (!found) return;

      const newStatus: string = found.status;
      const oldStatus = prevStatus.current;

      if (newStatus !== oldStatus) {
        prevStatus.current = newStatus;
        const updated = { ...activeOrder!, status: newStatus };
        setActiveOrderState(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

        if (newStatus === "COMPLETED" || newStatus === "PICKED_UP") {
          setPopup("completed");
          return;
        }
        if (newStatus === "CANCELLED") {
          // Cancelled by venue
          setCancelledInfo({ venueName: activeOrder!.venueName, refundCents: activeOrder!.totalCents });
          setPopup("cancelled");
          return;
        }
      }
    }

    poll();
    pollRef.current = setInterval(poll, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrder?.orderId, activeOrder?.status]);

  async function handleCancel() {
    if (!activeOrder) return;
    setCancellingId(activeOrder.orderId);
    const r = await fetch(`/api/orders/${activeOrder.orderId}/cancel`, { method: "POST" });
    const j = await r.json();
    setCancellingId("");
    if (!r.ok) { alert(j.error || "Could not cancel."); return; }
    setCancelledInfo({ venueName: j.venueName, refundCents: j.refundCents });
    setPopup("cancelled");
    setActiveOrderState(null);
    localStorage.removeItem(STORAGE_KEY);
    if (pollRef.current) clearInterval(pollRef.current);
  }

  async function submitIssue() {
    if (!activeOrder || !issueText.trim()) return;
    setIssueSending(true);
    const r = await fetch(`/api/orders/${activeOrder.orderId}/issue`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ description: issueText.trim() }),
    });
    const j = await r.json();
    setIssueSending(false);
    if (!r.ok) { alert(j.error || "Failed to submit."); return; }
    setCaseNumber(j.caseNumber);
    setPopup("issue_submitted");
    setActiveOrder(null);
  }

  function dismissCompleted() {
    setPopup("none");
    setActiveOrder(null);
  }

  function dismissCancelled() {
    setPopup("none");
    setCancelledInfo(null);
    setActiveOrder(null);
  }

  const phaseIdx = PHASES.findIndex(p => p.key === (activeOrder?.status ?? "PLACED"));
  const current = phaseIdx === -1 ? 0 : phaseIdx;
  const showBanner = !!activeOrder && !FINAL.includes(activeOrder.status) && popup === "none";

  return (
    <OrderTrackerContext.Provider value={{ activeOrder, setActiveOrder }}>
      {children}

      {/* ── Floating order tracker banner ── */}
      {showBanner && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          zIndex: 1000, padding: "0 12px 12px", pointerEvents: "none",
        }}>
          <div style={{
            maxWidth: 560, margin: "0 auto",
            background: "var(--bg, #080c12)",
            borderRadius: expanded ? 18 : 40,
            border: "1px solid rgba(8,218,244,0.35)",
            boxShadow: "0 8px 40px rgba(8,218,244,0.18)",
            overflow: "hidden", pointerEvents: "auto",
            transition: "border-radius 0.25s",
          }}>
            {/* Collapsed pill */}
            {!expanded && (
              <div onClick={() => setExpanded(true)} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 18px", cursor: "pointer",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: "50%", background: "#08daf4",
                    boxShadow: "0 0 0 3px rgba(8,218,244,0.25)", display: "inline-block",
                    animation: "pulse 1.4s ease-in-out infinite",
                  }} />
                  <strong style={{ fontSize: 14, color: "var(--ink, #e2e8f0)" }}>Order Tracking</strong>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 13, color: "#08daf4", fontWeight: 600 }}>{activeOrder.status}</span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Tap to expand</span>
                </div>
              </div>
            )}

            {/* Expanded panel */}
            {expanded && (
              <div style={{ padding: "20px 22px 16px" }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                  <div>
                    <p style={{ margin: "0 0 2px", fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                      {activeOrder.venueName}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{
                        fontSize: 28, fontWeight: 900, letterSpacing: 5,
                        color: codeVisible ? "#08daf4" : "transparent",
                        filter: codeVisible ? "none" : "blur(7px)",
                        background: codeVisible ? "none" : "rgba(255,255,255,0.1)",
                        borderRadius: 6, padding: codeVisible ? 0 : "1px 6px",
                        transition: "all 0.2s", userSelect: codeVisible ? "auto" : "none",
                        textShadow: codeVisible ? "0 0 20px rgba(8,218,244,0.5)" : "none",
                      }}>{activeOrder.orderCode}</span>
                      <button onClick={() => setCodeVisible(v => !v)} style={{
                        background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)",
                        borderRadius: 6, color: "rgba(255,255,255,0.8)", fontSize: 10,
                        padding: "3px 9px", cursor: "pointer",
                      }}>{codeVisible ? "Hide" : "Show"}</button>
                    </div>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                      Show this code to venue staff · {activeOrder.orderNumber}
                    </p>
                  </div>
                  <button onClick={() => setExpanded(false)} style={{
                    background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 8, color: "#fff", fontSize: 11, padding: "6px 11px", cursor: "pointer",
                    flexShrink: 0,
                  }}>Minimize</button>
                </div>

                {/* Progress track */}
                <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
                  {PHASES.map((p, i) => (
                    <div key={p.key} style={{ display: "flex", alignItems: "center", flex: i < PHASES.length - 1 ? 1 : undefined }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: i <= current ? "#08daf4" : "rgba(255,255,255,0.1)",
                        fontWeight: 700, fontSize: 11, color: i <= current ? "#080c12" : "rgba(255,255,255,0.35)",
                        boxShadow: i === current ? "0 0 0 3px rgba(8,218,244,0.3)" : "none",
                        transition: "all 0.3s",
                      }}>{i < current ? "✓" : i + 1}</div>
                      {i < PHASES.length - 1 && (
                        <div style={{
                          flex: 1, height: 3, margin: "0 3px",
                          background: i < current ? "#08daf4" : "rgba(255,255,255,0.1)",
                          transition: "background 0.3s",
                        }} />
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                  {PHASES.map((p, i) => (
                    <div key={p.key} style={{
                      fontSize: 10, textAlign: "center", width: 54,
                      color: i === current ? "#08daf4" : "rgba(255,255,255,0.3)",
                      fontWeight: i === current ? 700 : 400,
                    }}>{p.label}</div>
                  ))}
                </div>

                {activeOrder.status === "READY" && (
                  <div style={{
                    background: "rgba(8,218,244,0.08)", border: "1px solid rgba(8,218,244,0.3)",
                    borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#fff", marginBottom: 12,
                  }}>
                    <strong style={{ color: "#08daf4" }}>Ready for pickup</strong> — Have your valid ID ready.
                  </div>
                )}

                {/* Cancel button — only while PLACED */}
                {activeOrder.status === "PLACED" && (
                  <button onClick={handleCancel} disabled={!!cancellingId} style={{
                    background: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.35)",
                    borderRadius: 8, color: "#f87171", fontSize: 12, padding: "7px 14px",
                    cursor: "pointer", width: "100%",
                  }}>
                    {cancellingId ? "Cancelling…" : "Cancel order"}
                  </button>
                )}

                <p style={{ textAlign: "center", fontSize: 10, margin: "8px 0 0", color: "rgba(255,255,255,0.25)" }}>
                  Live — auto-updates every 5 seconds
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Completion popup ── */}
      {(popup === "completed" || popup === "issue_form") && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
          zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center",
          padding: 16,
        }}>
          <div style={{
            background: "var(--surface, #0f1621)", borderRadius: 20,
            border: "1px solid rgba(8,218,244,0.3)",
            boxShadow: "0 0 60px rgba(8,218,244,0.15)",
            padding: 28, maxWidth: 420, width: "100%",
          }}>
            {popup === "completed" && (
              <>
                <div style={{ textAlign: "center", marginBottom: 20 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: "50%",
                    background: "rgba(8,218,244,0.12)", border: "2px solid #08daf4",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 24, margin: "0 auto 14px",
                  }}>✓</div>
                  <h2 style={{ color: "var(--ink, #e2e8f0)", margin: "0 0 8px", fontSize: "1.3rem" }}>
                    Order Complete
                  </h2>
                  <p style={{ color: "var(--muted-text, #64748b)", margin: 0, fontSize: 14, lineHeight: 1.5 }}>
                    Your order at <strong style={{ color: "var(--ink, #e2e8f0)" }}>{activeOrder?.venueName || cancelledInfo?.venueName}</strong> is complete. Please ensure your order was issued properly before accepting.
                  </p>
                </div>
                <button onClick={dismissCompleted} style={{
                  width: "100%", padding: "12px", borderRadius: 12,
                  background: "#08daf4", border: "none", color: "#080c12",
                  fontWeight: 700, fontSize: 15, cursor: "pointer",
                  boxShadow: "0 0 16px rgba(8,218,244,0.4)",
                  marginBottom: 10,
                }}>Accept</button>
                <div style={{ textAlign: "center" }}>
                  <button onClick={() => setPopup("issue_form")} style={{
                    background: "none", border: "none", color: "var(--muted-text, #64748b)",
                    fontSize: 12, cursor: "pointer", textDecoration: "underline",
                  }}>Submit an issue</button>
                </div>
              </>
            )}

            {popup === "issue_form" && (
              <>
                <h2 style={{ color: "var(--ink, #e2e8f0)", margin: "0 0 6px", fontSize: "1.2rem" }}>Submit an issue</h2>
                <p style={{ color: "var(--muted-text, #64748b)", fontSize: 13, margin: "0 0 14px" }}>
                  Describe what went wrong with your order. We will review it and get back to you within 48–72 hours.
                </p>
                <textarea
                  value={issueText}
                  onChange={e => setIssueText(e.target.value)}
                  placeholder="Describe your issue in detail…"
                  rows={5}
                  style={{
                    width: "100%", borderRadius: 10,
                    border: "1.5px solid var(--border, #1e2d3d)",
                    background: "var(--bg, #080c12)",
                    color: "var(--ink, #e2e8f0)",
                    padding: 12, fontSize: 14, resize: "vertical", boxSizing: "border-box",
                  }}
                />
                <button onClick={submitIssue} disabled={issueSending || issueText.trim().length < 10} style={{
                  width: "100%", marginTop: 12, padding: 12, borderRadius: 12,
                  background: "#08daf4", border: "none", color: "#080c12",
                  fontWeight: 700, fontSize: 14, cursor: "pointer",
                }}>
                  {issueSending ? "Submitting…" : "Submit issue"}
                </button>
                <div style={{ textAlign: "center", marginTop: 8 }}>
                  <button onClick={() => setPopup("completed")} style={{
                    background: "none", border: "none", color: "var(--muted-text, #64748b)",
                    fontSize: 12, cursor: "pointer",
                  }}>Back</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Issue submitted popup ── */}
      {popup === "issue_submitted" && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
          zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center",
          padding: 16,
        }}>
          <div style={{
            background: "var(--surface, #0f1621)", borderRadius: 20,
            border: "1px solid rgba(8,218,244,0.25)",
            padding: 28, maxWidth: 400, width: "100%", textAlign: "center",
          }}>
            <div style={{
              fontSize: 40, marginBottom: 14,
              filter: "drop-shadow(0 0 12px rgba(8,218,244,0.5))",
            }}>✉</div>
            <h2 style={{ color: "var(--ink, #e2e8f0)", margin: "0 0 8px" }}>Issue Submitted</h2>
            <p style={{ color: "var(--muted-text, #64748b)", fontSize: 13, lineHeight: 1.6, margin: "0 0 12px" }}>
              Thank you for submitting your issue. A Clicks Representative will be in touch within 48 to 72 hours while your case is reviewed.
            </p>
            <div style={{
              background: "rgba(8,218,244,0.08)", border: "1px solid rgba(8,218,244,0.25)",
              borderRadius: 10, padding: "10px 16px", marginBottom: 20,
            }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", display: "block" }}>Case number</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: "#08daf4", letterSpacing: 2 }}>{caseNumber}</span>
            </div>
            <button onClick={() => { setPopup("none"); setCaseNumber(""); }} style={{
              width: "100%", padding: 12, borderRadius: 12,
              background: "#08daf4", border: "none", color: "#080c12",
              fontWeight: 700, fontSize: 14, cursor: "pointer",
            }}>Close</button>
          </div>
        </div>
      )}

      {/* ── Cancellation popup ── */}
      {popup === "cancelled" && cancelledInfo && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
          zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center",
          padding: 16,
        }}>
          <div style={{
            background: "var(--surface, #0f1621)", borderRadius: 20,
            border: "1px solid rgba(220,38,38,0.3)",
            padding: 28, maxWidth: 400, width: "100%", textAlign: "center",
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: "50%",
              background: "rgba(220,38,38,0.12)", border: "2px solid #dc2626",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, margin: "0 auto 14px",
            }}>✕</div>
            <h2 style={{ color: "var(--ink, #e2e8f0)", margin: "0 0 10px" }}>Order Cancelled</h2>
            <p style={{ color: "var(--muted-text, #64748b)", fontSize: 14, lineHeight: 1.6, margin: "0 0 20px" }}>
              Your order at <strong style={{ color: "var(--ink, #e2e8f0)" }}>{cancelledInfo.venueName}</strong> was cancelled. The amount of{" "}
              <strong style={{ color: "#08daf4" }}>{fmt(cancelledInfo.refundCents)}</strong> will be refunded to your Clicks wallet. Thank you for using Clicks.
            </p>
            <button onClick={dismissCancelled} style={{
              width: "100%", padding: 12, borderRadius: 12,
              background: "var(--ink, #0d1117)", border: "none", color: "#fff",
              fontWeight: 700, fontSize: 14, cursor: "pointer",
            }}>Dismiss</button>
          </div>
        </div>
      )}
    </OrderTrackerContext.Provider>
  );
}
