"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Nav } from "@/components/Nav";

function fmt(date: string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function fmtDate(date: string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function cents(n: number) {
  return `$${(n / 100).toFixed(2)}`;
}

export default function VenueFinances() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/venues/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(d);
      });
  }, [id]);

  function toggle(key: string) {
    setExpanded(p => ({ ...p, [key]: !p[key] }));
  }

  if (error) return (
    <div className="container">
      <Nav role="admin" />
      <p style={{ color: "#f66" }}>{error}</p>
    </div>
  );
  if (!data) return (
    <div className="container">
      <Nav role="admin" />
      <p className="muted">Loading...</p>
    </div>
  );

  const { venue, orders, subscriptions, redemptions, summary } = data;

  // Build unified chronological transaction list
  type Tx =
    | { kind: "order"; date: string; row: any }
    | { kind: "subscription"; date: string; row: any }
    | { kind: "redemption"; date: string; row: any };

  const txns: Tx[] = [
    ...orders.map((r: any) => ({ kind: "order" as const, date: r.createdAt, row: r })),
    ...subscriptions.map((r: any) => ({ kind: "subscription" as const, date: r.paidAt ?? r.periodStart, row: r })),
    ...redemptions.map((r: any) => ({ kind: "redemption" as const, date: r.createdAt, row: r })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="container">
      <Nav role="admin" />

      {/* Header */}
      <div className="header" style={{ marginBottom: 4 }}>
        <div>
          <a href="/admin/venues" style={{ fontSize: 13, opacity: 0.5 }}>{"<"} Back to Venues</a>
          <h2 style={{ margin: "6px 0 0" }}>{venue.name}</h2>
          <span className="muted">{venue.zone?.name}</span>
        </div>
        <span className={`badge${venue.plan === "PRO" ? " active" : ""}`}>{venue.plan}</span>
      </div>

      {/* Summary cards */}
      <div className="row" style={{ gap: 10, flexWrap: "wrap", marginBottom: 24, marginTop: 16 }}>
        <div className="card" style={{ padding: "10px 16px", minWidth: 140, textAlign: "center" }}>
          <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>Orders (completed)</div>
          <strong>{summary.completedOrderCount} / {summary.orderCount}</strong>
        </div>
        <div className="card" style={{ padding: "10px 16px", minWidth: 140, textAlign: "center" }}>
          <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>Order commissions</div>
          <strong>{cents(summary.orderCommissionCents)}</strong>
        </div>
        <div className="card" style={{ padding: "10px 16px", minWidth: 140, textAlign: "center" }}>
          <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>Promo commissions</div>
          <strong>{cents(summary.promoCommissionCents)}</strong>
        </div>
        <div className="card" style={{ padding: "10px 16px", minWidth: 140, textAlign: "center" }}>
          <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>Subscriptions</div>
          <strong>{cents(summary.subscriptionRevenueCents)}</strong>
        </div>
        <div className="card" style={{ padding: "10px 16px", minWidth: 140, textAlign: "center", borderColor: "rgba(100,200,100,0.3)" }}>
          <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>Total to Clicks</div>
          <strong style={{ fontSize: 18 }}>{cents(summary.totalClicksRevenueCents)}</strong>
        </div>
      </div>

      {/* Transaction list */}
      <h3 style={{ marginBottom: 12 }}>All Transactions ({txns.length})</h3>

      {txns.length === 0 && <p className="muted">No transactions yet.</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {txns.map(tx => {
          const key = `${tx.kind}-${tx.row.id}`;
          const open = expanded[key];

          let typeBadge: JSX.Element;
          let amountStr: string;
          let detail: JSX.Element | null = null;

          if (tx.kind === "order") {
            const o = tx.row;
            const isCompleted = o.status === "COMPLETED";
            typeBadge = (
              <span className={`badge${isCompleted ? " active" : ""}`} style={{ fontSize: 11 }}>
                {o.status}
              </span>
            );
            amountStr = o.totalCents != null
              ? `${cents(o.totalCents)} (${cents(Math.round(o.totalCents * 0.15))} to Clicks)`
              : "—";
            detail = (
              <div style={{ marginTop: 10, fontSize: 13, display: "grid", gap: 4 }}>
                <div>Order code: <strong>{o.orderCode ?? "—"}</strong></div>
                <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: "2px 0", marginTop: 4 }}>
                  <span className="muted">Placed at</span>      <span>{fmt(o.createdAt)}</span>
                  <span className="muted">Accepted at</span>    <span>{fmt(o.acceptedAt)}</span>
                  <span className="muted">Ready at</span>       <span>{fmt(o.readyAt)}</span>
                  {isCompleted
                    ? <><span className="muted">Completed at</span><span>{fmt(o.completedAt)}</span></>
                    : <><span className="muted">Cancelled at</span><span style={{ color: "#f88" }}>{fmt(o.cancelledAt)}</span></>
                  }
                </div>
              </div>
            );
          } else if (tx.kind === "subscription") {
            const s = tx.row;
            typeBadge = (
              <span className={`badge${s.status === "PAID" ? " active" : ""}`} style={{ fontSize: 11 }}>
                Subscription {s.status}
              </span>
            );
            amountStr = s.status === "PAID" ? cents(s.amountCents) : "—";
            detail = (
              <div style={{ marginTop: 10, fontSize: 13, display: "grid", gap: 4 }}>
                <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: "2px 0" }}>
                  <span className="muted">Period</span>
                  <span>{fmtDate(s.periodStart)} – {fmtDate(s.periodEnd)}</span>
                  <span className="muted">Paid at</span>        <span>{fmt(s.paidAt)}</span>
                  <span className="muted">Status</span>         <span>{s.status}</span>
                  {s.stripeId && <><span className="muted">Stripe ID</span><span style={{ fontFamily: "monospace", fontSize: 11 }}>{s.stripeId}</span></>}
                </div>
              </div>
            );
          } else {
            const r = tx.row;
            const earned = r.paidCents > 0 ? Math.round(r.paidCents * 0.15) : 0;
            typeBadge = (
              <span className={`badge${r.paidCents > 0 ? " active" : ""}`} style={{ fontSize: 11 }}>
                Redemption
              </span>
            );
            amountStr = r.paidCents > 0
              ? `${cents(r.paidCents)} paid  (${cents(earned)} to Clicks)`
              : "Free";
            detail = (
              <div style={{ marginTop: 10, fontSize: 13, display: "grid", gap: 4 }}>
                <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: "2px 0" }}>
                  <span className="muted">Promotion</span>  <span>{r.promotion?.title ?? "—"}</span>
                  <span className="muted">Venue received</span> <span>{cents(r.paidCents)}</span>
                  <span className="muted">Clicks earned</span> <span>{cents(earned)}</span>
                  <span className="muted">Status</span>     <span>{r.status}</span>
                </div>
              </div>
            );
          }

          return (
            <div key={key} className="card" style={{ padding: "10px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span className="muted" style={{ fontSize: 12, whiteSpace: "nowrap", minWidth: 130 }}>
                  {fmt(tx.date)}
                </span>
                {typeBadge}
                <span style={{ flex: 1, fontSize: 13 }}>{amountStr}</span>
                <button
                  className={`btn sm${open ? "" : " secondary"}`}
                  style={{ fontSize: 11 }}
                  onClick={() => toggle(key)}
                >
                  {open ? "Hide" : "Details"}
                </button>
              </div>
              {open && detail && (
                <div style={{
                  marginTop: 8,
                  paddingTop: 10,
                  borderTop: "1px solid rgba(255,255,255,0.07)",
                }}>
                  {detail}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
