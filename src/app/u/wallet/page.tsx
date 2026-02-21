"use client";
import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";

function fmt(cents: number) { return `$${(cents / 100).toFixed(2)}`; }

export default function Wallet() {
  const [data, setData] = useState<any>(null);
  const [amount, setAmount] = useState(10);
  const [toEmail, setToEmail] = useState("");
  const [sendAmt, setSendAmt] = useState("10.00");
  const [sendMemo, setSendMemo] = useState("");
  const [ghost, setGhost] = useState<boolean | null>(null);
  const [msg, setMsg] = useState("");

  async function load() {
    const [walletR, ghostR] = await Promise.all([
      fetch("/api/wallet").then(r => r.json()),
      fetch("/api/me/ghost").then(r => r.json()),
    ]);
    setData(walletR);
    setGhost(ghostR.ghostMode ?? false);
  }

  useEffect(() => { load(); }, []);

  async function topup() {
    setMsg("");
    const r = await fetch("/api/wallet/topup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dollars: amount }),
    });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error || "Failed"); return; }
    setMsg("Top-up recorded (mock).");
    load();
  }

  async function transfer() {
    setMsg("");
    const dollars = parseFloat(sendAmt);
    if (!toEmail || isNaN(dollars)) { setMsg("Fill in recipient and amount."); return; }
    const r = await fetch("/api/wallet/transfer", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ toEmail, dollars, memo: sendMemo }),
    });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error || "Transfer failed"); return; }
    setMsg("Sent!");
    setToEmail(""); setSendMemo("");
    load();
  }

  async function toggleGhost() {
    const r = await fetch("/api/me/ghost", { method: "POST" });
    const j = await r.json();
    if (r.ok) setGhost(j.ghostMode);
  }

  if (!data) return <div className="container"><Nav role="u" /><p className="muted">Loading…</p></div>;

  const txnTypeLabel: Record<string, string> = {
    TOPUP: "Top-up",
    TRANSFER_OUT: "Sent",
    TRANSFER_IN: "Received",
    REFUND: "Refund",
    ADJUSTMENT: "Adjustment",
  };

  return (
    <div className="container">
      <div className="header">
        <h2>Wallet</h2>
        <span className="badge" style={{ fontSize: 16, padding: "6px 14px" }}>{fmt(data.balanceCents)}</span>
      </div>
      <Nav role="u" />

      {msg && <p className="muted" style={{ marginBottom: 10 }}>{msg}</p>}

      <div className="row" style={{ alignItems: "flex-start" }}>
        {/* Top-up */}
        <div className="card" style={{ flex: "1 1 260px" }}>
          <h3 style={{ margin: "0 0 10px" }}>Top Up (mock)</h3>
          <label>Amount ($, min $10)</label>
          <input type="number" value={amount} min={10} onChange={e => setAmount(parseInt(e.target.value || "10", 10))} />
          <button className="btn" style={{ marginTop: 10 }} onClick={topup}>Top up</button>
        </div>

        {/* Send */}
        <div className="card" style={{ flex: "1 1 260px" }}>
          <h3 style={{ margin: "0 0 10px" }}>Send to Friend</h3>
          <label>Recipient email</label>
          <input value={toEmail} onChange={e => setToEmail(e.target.value)} placeholder="friend@example.com" />
          <label>Amount ($)</label>
          <input type="number" value={sendAmt} step="0.01" min="1" onChange={e => setSendAmt(e.target.value)} />
          <label>Memo (optional)</label>
          <input value={sendMemo} onChange={e => setSendMemo(e.target.value)} placeholder="Drinks, etc." />
          <button className="btn" style={{ marginTop: 10 }} onClick={transfer}>Send</button>
        </div>

        {/* Ghost mode */}
        <div className="card" style={{ flex: "1 1 200px" }}>
          <h3 style={{ margin: "0 0 10px" }}>Privacy</h3>
          <p className="muted">Ghost mode hides you from the leaderboard and buddy location.</p>
          <button
            className={`btn ${ghost ? "" : "secondary"}`}
            style={{ marginTop: 10 }}
            onClick={toggleGhost}
            disabled={ghost === null}
          >
            {ghost ? "👻 Ghost ON" : "Ghost OFF"}
          </button>
        </div>
      </div>

      <h3 style={{ marginTop: 20 }}>Transactions</h3>
      {data.txns.length === 0 && <p className="muted">No transactions yet.</p>}
      <table>
        <thead>
          <tr><th>Type</th><th>Amount</th><th>Memo</th><th>Time</th></tr>
        </thead>
        <tbody>
          {data.txns.map((t: any) => (
            <tr key={t.id}>
              <td><span className={t.type === "TRANSFER_OUT" ? "red" : t.type === "TRANSFER_IN" ? "green" : ""}>{txnTypeLabel[t.type] || t.type}</span></td>
              <td>{t.type === "TRANSFER_OUT" ? "-" : "+"}{fmt(t.amountCents)}</td>
              <td>{t.memo || "—"}</td>
              <td>{new Date(t.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
