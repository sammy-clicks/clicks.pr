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
          <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>Order revenue</div>
          <strong>{cents(summary.orderRevenueCents)}</strong>
        </div>
        <div className="card" style={{ padding: "10px 16px", minWidth: 140, textAlign: "center" }}>
          <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>Promo redemptions</div>
          <strong>{summary.redemptionCount}</strong>
        </div>
        <div className="card" style={{ padding: "10px 16px", minWidth: 140, textAlign: "center" }}>
          <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>Subscriptions paid</div>
          <strong>{summary.subscriptionCount}</strong>
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
          let mainLine: JSX.Element;
          let subLine: JSX.Element | null = null;
          let detail: JSX.Element | null = null;

          if (tx.kind === "order") {
            const o = tx.row;
            const isCompleted = o.status === "COMPLETED";
            const userName = o.user?.name || o.user?.username || "—";
            const userHandle = o.user?.username ? `@${o.user.username}` : null;
            typeBadge = (
              <span className={`badge${isCompleted ? " active" : ""}`} style={{ fontSize: 11 }}>
                {o.status}
              </span>
            );
            mainLine = (
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                {userName}
                {userHandle && <span className="muted" style={{ fontWeight: 400, marginLeft: 5 }}>{userHandle}</span>}
              </span>
            );
            subLine = (
              <span className="muted" style={{ fontSize: 12 }}>
                Order #{o.orderCode ?? o.id.slice(0,8).toUpperCase()}
                {o.totalCents != null && <span style={{ marginLeft: 8 }}>{cents(o.totalCents)}</span>}
              </span>
            );
            detail = (
              <div style={{ marginTop: 10, fontSize: 13, display: "grid", gap: 4 }}>
                <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: "2px 0" }}>
                  <span className="muted">Order #</span>       <span><strong>{o.orderCode ?? o.id.slice(0,8).toUpperCase()}</strong></span>
                  <span className="muted">Customer</span>      <span>{userName}{userHandle && <span className="muted" style={{ marginLeft: 6 }}>{userHandle}</span>}</span>
                  <span className="muted">Total</span>         <span>{o.totalCents != null ? cents(o.totalCents) : "—"}</span>
                  <span className="muted">Placed at</span>     <span>{fmt(o.createdAt)}</span>
                  <span className="muted">Accepted at</span>   <span>{fmt(o.acceptedAt)}</span>
                  <span className="muted">Ready at</span>      <span>{fmt(o.readyAt)}</span>
                  {isCompleted
                    ? <><span className="muted">Completed at</span><span>{fmt(o.completedAt)}</span></>
                    : <><span className="muted">Cancelled at</span><span style={{ color: "#f88" }}>{fmt(o.cancelledAt)}</span></>
                  }
                </div>
              </div>
            );
          } else if (tx.kind === "subscription") {
            const s = tx.row;
            const isPaid = s.status === "PAID";
            typeBadge = (
              <span className={`badge${isPaid ? " active" : ""}`} style={{ fontSize: 11 }}>
                Subscription {s.status}
              </span>
            );
            mainLine = (
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                {isPaid ? cents(s.amountCents) : "—"}
              </span>
            );
            subLine = (
              <span className="muted" style={{ fontSize: 12 }}>
                {fmtDate(s.periodStart)} – {fmtDate(s.periodEnd)}
              </span>
            );
            detail = (
              <div style={{ marginTop: 10, fontSize: 13, display: "grid", gap: 4 }}>
                <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: "2px 0" }}>
                  <span className="muted">Amount</span>        <span>{isPaid ? cents(s.amountCents) : "—"}</span>
                  <span className="muted">Period</span>        <span>{fmtDate(s.periodStart)} – {fmtDate(s.periodEnd)}</span>
                  <span className="muted">Paid at</span>       <span>{fmt(s.paidAt)}</span>
                  <span className="muted">Status</span>        <span>{s.status}</span>
                  {s.stripeId && <><span className="muted">Stripe ID</span><span style={{ fontFamily: "monospace", fontSize: 11 }}>{s.stripeId}</span></>}
                </div>
              </div>
            );
          } else {
            const r = tx.row;
            const userName = r.user?.name || r.user?.username || "—";
            const userHandle = r.user?.username ? `@${r.user.username}` : null;
            typeBadge = (
              <span className={`badge${r.paidCents > 0 ? " active" : ""}`} style={{ fontSize: 11 }}>
                Redemption
              </span>
            );
            mainLine = (
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                {userName}
                {userHandle && <span className="muted" style={{ fontWeight: 400, marginLeft: 5 }}>{userHandle}</span>}
              </span>
            );
            subLine = (
              <span className="muted" style={{ fontSize: 12 }}>
                {r.promotion?.title ?? "—"}
                {r.paidCents > 0 && <span style={{ marginLeft: 8 }}>{cents(r.paidCents)}</span>}
                {r.paidCents === 0 && <span style={{ marginLeft: 8 }}>Free</span>}
              </span>
            );
            detail = (
              <div style={{ marginTop: 10, fontSize: 13, display: "grid", gap: 4 }}>
                <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: "2px 0" }}>
                  <span className="muted">Customer</span>     <span>{userName}{userHandle && <span className="muted" style={{ marginLeft: 6 }}>{userHandle}</span>}</span>
                  <span className="muted">Promotion</span>    <span>{r.promotion?.title ?? "—"}</span>
                  <span className="muted">Amount paid</span>  <span>{r.paidCents > 0 ? cents(r.paidCents) : "Free"}</span>
                  <span className="muted">Status</span>       <span>{r.status}</span>
                  <span className="muted">Redeemed at</span>  <span>{fmt(r.createdAt)}</span>
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
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                  {mainLine}
                  {subLine}
                </div>
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
