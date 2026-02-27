"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { OrderTrackerContext, ActiveOrder } from "./OrderTrackerContext";

const STORAGE_KEY = "clicks_active_orders";
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
  const pathname = usePathname();
  const isUserRoute = !pathname || pathname.startsWith("/u/") || pathname === "/u";
  const [activeOrders, setActiveOrdersState] = useState<ActiveOrder[]>([]);
  const [viewIdx, setViewIdx] = useState(0);
  const [expanded, setExpanded] = useState(true);
  const [codeVisible, setCodeVisible] = useState(false);
  const [popup, setPopup] = useState<Popup>("none");
  const [popupOrder, setPopupOrder] = useState<ActiveOrder | null>(null);
  const [issueText, setIssueText] = useState("");
  const [issueSending, setIssueSending] = useState(false);
  const [caseNumber, setCaseNumber] = useState("");
  const [cancelledInfo, setCancelledInfo] = useState<{ venueName: string; refundCents: number } | null>(null);
  const [cancellingId, setCancellingId] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevStatusRef = useRef<Record<string, string>>({});
  const activeOrdersRef = useRef<ActiveOrder[]>([]);
  activeOrdersRef.current = activeOrders;

  // Clamp viewIdx when orders list shrinks
  useEffect(() => {
    setViewIdx(prev => (activeOrders.length === 0 ? 0 : Math.min(prev, activeOrders.length - 1)));
  }, [activeOrders.length]);

  // Reset code visibility when switching viewed order
  useEffect(() => { setCodeVisible(false); }, [viewIdx]);

  function saveToStorage(orders: ActiveOrder[]) {
    if (orders.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  function addActiveOrder(o: ActiveOrder) {
    setActiveOrdersState(prev => {
      const exists = prev.findIndex(x => x.orderId === o.orderId);
      let next: ActiveOrder[];
      if (exists >= 0) {
        next = prev.map((x, i) => (i === exists ? o : x));
      } else {
        next = [...prev, o];
        setViewIdx(next.length - 1);
      }
      saveToStorage(next);
      prevStatusRef.current[o.orderId] = o.status;
      return next;
    });
  }

  function removeActiveOrder(orderId: string) {
    setActiveOrdersState(prev => {
      const next = prev.filter(x => x.orderId !== orderId);
      saveToStorage(next);
      delete prevStatusRef.current[orderId];
      return next;
    });
  }

  function updateActiveOrder(orderId: string, updates: Partial<ActiveOrder>) {
    setActiveOrdersState(prev => {
      const next = prev.map(x => (x.orderId === orderId ? { ...x, ...updates } : x));
      saveToStorage(next);
      return next;
    });
  }

  // Restore from localStorage on mount, then validate against current user via API.
  // Also recovers any active orders from the API that aren't in localStorage
  // (e.g. placed on another tab/device, or after localStorage was cleared).
  useEffect(() => {
    async function restoreAndValidate() {
      let stored: ActiveOrder[] = [];
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          stored = Array.isArray(parsed) ? parsed : [];
        }
      } catch { stored = []; }

      try {
        const r = await fetch("/api/orders");
        if (!r.ok) {
          // Not authenticated (e.g. just logged out) — leave localStorage intact
          // so orders can be restored after the user logs back in.
          if (stored.length > 0) {
            const nonFinal = stored.filter(o => !FINAL.includes(o.status));
            nonFinal.forEach(o => { prevStatusRef.current[o.orderId] = o.status; });
            setActiveOrdersState(nonFinal);
          }
          return;
        }
        const j = await r.json();
        const apiOrders: any[] = j.orders ?? [];

        // Build a map of stored orders for quick lookup
        const storedMap = new Map(stored.map(o => [o.orderId, o]));

        // All non-final API orders that belong to this user
        const activeApiOrders = apiOrders.filter(o => !FINAL.includes(o.status));

        const merged: ActiveOrder[] = activeApiOrders.map(apiOrder => {
          const existing = storedMap.get(apiOrder.id);
          // Prefer API status (source of truth); keep other display fields from
          // localStorage if available, otherwise reconstruct from the API response.
          return {
            orderId:     apiOrder.id,
            orderCode:   existing?.orderCode   ?? apiOrder.orderCode   ?? "----",
            orderNumber: existing?.orderNumber ?? apiOrder.orderNumber ?? "",
            venueName:   existing?.venueName   ?? apiOrder.venue?.name ?? "",
            venueId:     existing?.venueId     ?? apiOrder.venueId     ?? "",
            status:      apiOrder.status,
            totalCents:  existing?.totalCents  ?? apiOrder.totalCents  ?? 0,
          };
        });

        saveToStorage(merged);
        merged.forEach(o => { prevStatusRef.current[o.orderId] = o.status; });
        setActiveOrdersState(merged);
      } catch {
        // Network issue — fall back to stored orders filtered to non-final
        if (stored.length > 0) {
          const nonFinal = stored.filter(o => !FINAL.includes(o.status));
          nonFinal.forEach(o => { prevStatusRef.current[o.orderId] = o.status; });
          setActiveOrdersState(nonFinal);
        }
      }
    }
    restoreAndValidate();
  }, []);

  const hasNonFinalOrders = activeOrders.some(o => !FINAL.includes(o.status));

  // Single polling interval for all active orders
  useEffect(() => {
    if (!hasNonFinalOrders) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }

    async function poll() {
      const r = await fetch("/api/orders");
      if (!r.ok) return;
      const j = await r.json();
      const apiMap = new Map<string, any>((j.orders ?? []).map((o: any) => [o.id, o]));

      for (const order of activeOrdersRef.current) {
        if (FINAL.includes(order.status)) continue;
        const found = apiMap.get(order.orderId);
        if (!found) continue;

        const newStatus: string = found.status;
        const oldStatus = prevStatusRef.current[order.orderId];

        if (newStatus !== oldStatus) {
          prevStatusRef.current[order.orderId] = newStatus;

          if (FINAL.includes(newStatus)) {
            setActiveOrdersState(prev => {
              const next = prev.filter(x => x.orderId !== order.orderId);
              saveToStorage(next);
              delete prevStatusRef.current[order.orderId];
              return next;
            });
            if (newStatus === "COMPLETED" || newStatus === "PICKED_UP") {
              setPopupOrder({ ...order, status: newStatus });
              setPopup("completed");
            } else if (newStatus === "CANCELLED") {
              setCancelledInfo({ venueName: order.venueName, refundCents: order.totalCents });
              setPopup("cancelled");
            }
          } else {
            updateActiveOrder(order.orderId, { status: newStatus });
          }
        }
      }
    }

    poll();
    pollRef.current = setInterval(poll, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasNonFinalOrders]);

  async function handleCancel() {
    const order = activeOrders[viewIdx];
    if (!order) return;
    setCancellingId(order.orderId);
    const r = await fetch(`/api/orders/${order.orderId}/cancel`, { method: "POST" });
    const j = await r.json();
    setCancellingId("");
    if (!r.ok) { alert(j.error || "Could not cancel."); return; }
    setCancelledInfo({ venueName: j.venueName, refundCents: j.refundCents });
    setPopup("cancelled");
    removeActiveOrder(order.orderId);
  }

  async function submitIssue() {
    if (!popupOrder || !issueText.trim()) return;
    setIssueSending(true);
    const r = await fetch(`/api/orders/${popupOrder.orderId}/issue`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ description: issueText.trim() }),
    });
    const j = await r.json();
    setIssueSending(false);
    if (!r.ok) { alert(j.error || "Failed to submit."); return; }
    setCaseNumber(j.caseNumber);
    setPopup("issue_submitted");
    setPopupOrder(null);
  }

  function dismissCompleted() {
    setPopup("none");
    setPopupOrder(null);
  }

  function dismissCancelled() {
    setPopup("none");
    setCancelledInfo(null);
  }

  const viewedOrder = activeOrders[viewIdx] ?? null;
  const phaseIdx = PHASES.findIndex(p => p.key === (viewedOrder?.status ?? "PLACED"));
  const current = phaseIdx === -1 ? 0 : phaseIdx;
  const showBanner = activeOrders.length > 0 && activeOrders.some(o => !FINAL.includes(o.status)) && popup === "none" && isUserRoute;

  return (
    <OrderTrackerContext.Provider value={{ activeOrders, addActiveOrder, removeActiveOrder, updateActiveOrder, bannerShowing: showBanner }}>
      {children}

      {/* ── Floating order tracker banner ── */}
      {showBanner && viewedOrder && (
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
                  {activeOrders.length > 1 && (
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", background: "rgba(8,218,244,0.12)", borderRadius: 8, padding: "2px 7px" }}>
                      {viewIdx + 1}/{activeOrders.length}
                    </span>
                  )}
                  <span style={{ fontSize: 13, color: "#08daf4", fontWeight: 600 }}>{viewedOrder.status}</span>
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
                      {viewedOrder.venueName}
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
                      }}>{viewedOrder.orderCode}</span>
                      <button onClick={() => setCodeVisible(v => !v)} style={{
                        background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)",
                        borderRadius: 6, color: "rgba(255,255,255,0.8)", fontSize: 10,
                        padding: "3px 9px", cursor: "pointer",
                      }}>{codeVisible ? "Hide" : "Show"}</button>
                    </div>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                      Show this code to venue staff · {viewedOrder.orderNumber}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    {/* Multi-order navigation */}
                    {activeOrders.length > 1 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <button
                          onClick={() => setViewIdx(v => Math.max(0, v - 1))}
                          disabled={viewIdx === 0}
                          style={{
                            background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
                            borderRadius: 6, color: viewIdx === 0 ? "rgba(255,255,255,0.2)" : "#fff",
                            fontSize: 14, padding: "4px 8px", cursor: viewIdx === 0 ? "default" : "pointer",
                          }}>‹</button>
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", minWidth: 28, textAlign: "center" }}>
                          {viewIdx + 1}/{activeOrders.length}
                        </span>
                        <button
                          onClick={() => setViewIdx(v => Math.min(activeOrders.length - 1, v + 1))}
                          disabled={viewIdx === activeOrders.length - 1}
                          style={{
                            background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
                            borderRadius: 6, color: viewIdx === activeOrders.length - 1 ? "rgba(255,255,255,0.2)" : "#fff",
                            fontSize: 14, padding: "4px 8px", cursor: viewIdx === activeOrders.length - 1 ? "default" : "pointer",
                          }}>›</button>
                      </div>
                    )}
                    <button onClick={() => setExpanded(false)} style={{
                      background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: 8, color: "#fff", fontSize: 11, padding: "6px 11px", cursor: "pointer",
                    }}>Minimize</button>
                  </div>
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

                {viewedOrder.status === "READY" && (
                  <div style={{
                    background: "rgba(8,218,244,0.08)", border: "1px solid rgba(8,218,244,0.3)",
                    borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#fff", marginBottom: 12,
                  }}>
                    <strong style={{ color: "#08daf4" }}>Ready for pickup</strong> — Have your valid ID ready.
                  </div>
                )}

                {/* Cancel button — only while PLACED */}
                {viewedOrder.status === "PLACED" && (
                  <button onClick={handleCancel} disabled={!!cancellingId} style={{
                    background: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.35)",
                    borderRadius: 8, color: "#f87171", fontSize: 12, padding: "7px 14px",
                    cursor: "pointer", width: "100%",
                  }}>
                    {cancellingId === viewedOrder.orderId ? "Cancelling…" : "Cancel order"}
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
                    Your order at <strong style={{ color: "var(--ink, #e2e8f0)" }}>{popupOrder?.venueName}</strong> is complete. Please ensure your order was issued properly before accepting.
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
                {issueText.trim().length > 0 && issueText.trim().length < 3 && (
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "#f87171" }}>Please describe your issue (at least 3 characters).</p>
                )}
                <button onClick={submitIssue} disabled={issueSending || issueText.trim().length < 3} style={{
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
