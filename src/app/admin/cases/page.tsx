"use client";
import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";

const STATUS_COLORS: Record<string, string> = {
  OPEN:      "#f59e0b",
  REVIEWING: "#3b82f6",
  RESOLVED:  "#10b981",
  CLOSED:    "#6b7280",
};

export default function AdminCases() {
  const [cases, setCases] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");
  const [filter, setFilter] = useState<string>("ALL");

  async function load() {
    const r = await fetch("/api/admin/cases");
    const j = await r.json();
    setCases(j.cases ?? []);
  }
  useEffect(() => { load(); }, []);

  async function sendReply(caseId: string) {
    if (!reply.trim()) return;
    setSending(true);
    const r = await fetch("/api/admin/cases", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ caseId, message: reply.trim() }),
    });
    setSending(false);
    if (r.ok) {
      setReply("");
      setMsg("Reply sent.");
      await load();
      const updated = cases.find(c => c.id === caseId);
      if (updated) setSelected(updated);
    }
  }

  async function setStatus(caseId: string, status: string) {
    const r = await fetch("/api/admin/cases", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "status", caseId, status }),
    });
    if (r.ok) { setMsg(`Status set to ${status}.`); load(); }
  }

  const filtered = cases.filter(c => filter === "ALL" || c.status === filter);

  return (
    <div className="container">
      <h2>Support Cases</h2>
      <Nav role="admin" />

      {msg && <p className="muted" style={{ color: "var(--success)", marginBottom: 12 }}>{msg}</p>}

      {/* Filter */}
      <div className="row" style={{ marginBottom: 20, gap: 8 }}>
        {["ALL", "OPEN", "REVIEWING", "RESOLVED", "CLOSED"].map(s => (
          <button
            key={s}
            className={`btn sm${filter === s ? " accent" : " secondary"}`}
            onClick={() => setFilter(s)}
          >
            {s}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* Cases list */}
        <div style={{ flex: "1 1 280px" }}>
          {filtered.length === 0 && <p className="muted">No cases found.</p>}
          {filtered.map(c => (
            <div
              key={c.id}
              className="card"
              style={{
                marginBottom: 10, cursor: "pointer",
                border: selected?.id === c.id ? "1.5px solid var(--brand)" : undefined,
                boxShadow: selected?.id === c.id ? "0 0 0 3px var(--brand-dim)" : undefined,
              }}
              onClick={() => setSelected(c)}
            >
              <div className="header" style={{ marginBottom: 4 }}>
                <strong style={{ color: "var(--brand)" }}>{c.caseNumber}</strong>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                  background: `${STATUS_COLORS[c.status]}22`,
                  color: STATUS_COLORS[c.status],
                  border: `1px solid ${STATUS_COLORS[c.status]}55`,
                }}>{c.status}</span>
              </div>
              <div className="muted" style={{ fontSize: 13 }}>@{c.user.username}</div>
              {c.order && (
                <div className="muted" style={{ fontSize: 12 }}>
                  {c.order.orderNumber ?? "—"} · {c.order.venue?.name}
                </div>
              )}
              <div className="muted" style={{ fontSize: 12, marginTop: 4, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {c.description}
              </div>
            </div>
          ))}
        </div>

        {/* Case detail */}
        {selected && (
          <div style={{ flex: "2 1 380px" }}>
            <div className="card">
              {/* Header */}
              <div className="header" style={{ marginBottom: 10 }}>
                <div>
                  <strong style={{ fontSize: 18, color: "var(--brand)" }}>{selected.caseNumber}</strong>
                  <span className="muted" style={{ marginLeft: 10, fontSize: 13 }}>
                    @{selected.user.username} · {selected.user.email}
                  </span>
                </div>
                <span style={{
                  fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 6,
                  background: `${STATUS_COLORS[selected.status]}22`,
                  color: STATUS_COLORS[selected.status],
                }}>{selected.status}</span>
              </div>

              {/* Order info */}
              {selected.order && (
                <div style={{
                  background: "var(--bg)", borderRadius: 10, padding: "10px 14px", marginBottom: 14,
                  fontSize: 13,
                }}>
                  <div><strong>Order:</strong> {selected.order.orderNumber ?? "—"} at {selected.order.venue?.name}</div>
                  <div><strong>Status:</strong> {selected.order.status}</div>
                  <div><strong>Total:</strong> ${(selected.order.totalCents / 100).toFixed(2)}</div>
                  <div><strong>Items:</strong> {selected.order.items?.map((i: any) => `${i.qty}x ${i.name}`).join(", ")}</div>
                </div>
              )}

              {/* Issue description */}
              <div style={{
                background: "var(--bg)", borderRadius: 10, padding: "10px 14px", marginBottom: 16,
                fontSize: 13, color: "var(--ink-soft)",
              }}>
                <strong style={{ display: "block", marginBottom: 4 }}>Issue reported:</strong>
                {selected.description}
              </div>

              {/* Messages thread */}
              <h4 style={{ margin: "0 0 10px" }}>Thread</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                {selected.messages?.map((m: any) => (
                  <div key={m.id} style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    background: m.fromRole === "ADMIN" ? "var(--brand-dim)" : "var(--bg)",
                    border: `1px solid ${m.fromRole === "ADMIN" ? "rgba(8,218,244,0.25)" : "var(--border)"}`,
                    fontSize: 13,
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: m.fromRole === "ADMIN" ? "var(--brand)" : "var(--muted-text)" }}>
                      {m.fromRole === "ADMIN" ? "Admin" : `@${selected.user.username}`}
                    </span>
                    <p style={{ margin: "4px 0 0" }}>{m.body}</p>
                    <p style={{ margin: "4px 0 0", fontSize: 10, color: "var(--muted-text)" }}>
                      {new Date(m.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>

              {/* Reply */}
              <label>Reply to user</label>
              <textarea
                value={reply}
                onChange={e => setReply(e.target.value)}
                placeholder="Write your response…"
                rows={4}
              />
              <div className="row" style={{ marginTop: 10, gap: 8, flexWrap: "wrap" }}>
                <button className="btn" onClick={() => sendReply(selected.id)} disabled={sending || !reply.trim()}>
                  {sending ? "Sending…" : "Send reply"}
                </button>
                {["OPEN", "REVIEWING", "RESOLVED", "CLOSED"].map(s => (
                  <button
                    key={s}
                    className="btn secondary sm"
                    onClick={() => setStatus(selected.id, s)}
                    disabled={selected.status === s}
                  >
                    Set {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
