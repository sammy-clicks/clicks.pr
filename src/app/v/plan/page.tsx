"use client";
import { Suspense, useEffect, useState } from "react";
import { Nav } from "@/components/Nav";

function $$(n: number) { return `$${(n / 100).toFixed(2)}`; }

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

  useEffect(() => {
    fetch("/api/v/plan").then(r => r.json()).then(j => {
      if (!j.error) setData(j); else setError(j.error);
    });
  }, []);

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
      <div className="header">
        <h2>Payment History</h2>
        <a href="/v/account"><button className="btn secondary">Back to Account</button></a>
      </div>

      {!data && <p className="muted">Loading...</p>}

      {data && (
        <>
          <div className="card" style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>{data.venueName}</div>
              <span className={`badge${isPro ? " active" : ""}`} style={{ fontSize: 14, padding: "4px 14px" }}>
                {isPro ? "PRO" : "FREE"}
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
    </div>
  );
}
