"use client";
import { useEffect, useState, useRef } from "react";
import { Nav } from "@/components/Nav";

function fmt(cents: number) { return `$${(cents / 100).toFixed(2)}`; }

function Avatar({ username, avatarUrl, size = 34 }: { username: string; avatarUrl?: string | null; size?: number }) {
  return avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={avatarUrl} alt={username} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
  ) : (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: "#9b5de5",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.4, fontWeight: 700, color: "#fff", flexShrink: 0,
    }}>{username ? username[0].toUpperCase() : "?"}</div>
  );
}

const TXN_ICON: Record<string, string> = { TOPUP: "", TRANSFER_OUT: "", TRANSFER_IN: "", REFUND: "", ADJUSTMENT: "" };
const TXN_LABEL: Record<string, string> = { TOPUP: "Transfer", TRANSFER_OUT: "Sent", TRANSFER_IN: "Received", REFUND: "Refund", ADJUSTMENT: "Adjustment" };

export default function Wallet() {
  const [data, setData]           = useState<any>(null);
  const [buddyIds, setBuddyIds]   = useState<Set<string>>(new Set());
  const [topupAmt, setTopupAmt]   = useState(10);
  const [recipient, setRecipient] = useState<{ id: string; username: string; avatarUrl?: string | null } | null>(null);
  const [search, setSearch]       = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [sendAmt, setSendAmt]     = useState("10.00");
  const [sendMemo, setSendMemo]   = useState("");
  const [msg, setMsg]             = useState<{ text: string; ok: boolean } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function load() {
    const [walletR, buddiesR] = await Promise.all([
      fetch("/api/wallet").then(r => r.json()),
      fetch("/api/buddies").then(r => r.json()),
    ]);
    setData(walletR);
    const ids = new Set<string>((buddiesR.buddies ?? []).map((b: any) => b.friendId as string));
    setBuddyIds(ids);
  }
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const q = search.trim().replace(/^@/, "");
    if (q.length < 2) { setSuggestions([]); return; }
    timerRef.current = setTimeout(async () => {
      const r = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
      const j = await r.json();
      const users: any[] = j.users ?? [];
      users.sort((a, b) => (buddyIds.has(b.id) ? 1 : 0) - (buddyIds.has(a.id) ? 1 : 0));
      setSuggestions(users);
    }, 300);
  }, [search, buddyIds]);

  async function topup() {
    if (topupAmt < 10) { setMsg({ text: "Minimum transfer is $10.", ok: false }); return; }
    const r = await fetch("/api/wallet/topup", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ dollars: topupAmt }),
    });
    const j = await r.json();
    if (!r.ok) { setMsg({ text: j.error || "Failed", ok: false }); return; }
    setMsg({ text: `+${fmt(topupAmt * 100)} transferred!`, ok: true });
    load();
  }

  async function sendToFriend() {
    if (!recipient) { setMsg({ text: "Select a recipient.", ok: false }); return; }
    const dollars = parseFloat(sendAmt);
    if (isNaN(dollars) || dollars < 10) { setMsg({ text: "Minimum transfer is $10.", ok: false }); return; }
    const r = await fetch("/api/wallet/transfer", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ toUsername: recipient.username, dollars, memo: sendMemo }),
    });
    const j = await r.json();
    if (!r.ok) { setMsg({ text: j.error || "Transfer failed", ok: false }); return; }
    setMsg({ text: `Sent ${fmt(dollars * 100)} to @${recipient.username}!`, ok: true });
    setRecipient(null); setSearch(""); setSendMemo(""); setSendAmt("10.00");
    load();
  }

  return (
    <div className="container">
      <Nav role="u" />

      {/* BIG Balance */}
      <div style={{ textAlign: "center", padding: "36px 0 28px" }}>
        <p className="muted" style={{ fontSize: 12, margin: "0 0 8px", letterSpacing: 1.5, textTransform: "uppercase" }}>Balance</p>
        <div style={{ fontSize: 58, fontWeight: 900, letterSpacing: -3, lineHeight: 1 }}>
          {data ? fmt(data.balanceCents) : ""}
        </div>
      </div>

      {msg && (
        <div style={{ textAlign: "center", marginBottom: 16, padding: "10px 16px", borderRadius: 10,
          background: msg.ok ? "rgba(46,204,113,0.1)" : "rgba(255,80,80,0.1)",
          color: msg.ok ? "#2ecc71" : "#f66", fontWeight: 600, fontSize: 14 }}>
          {msg.text}
          <button onClick={() => setMsg(null)} style={{ marginLeft: 10, background: "none", border: "none", cursor: "pointer", color: "inherit", fontWeight: 700 }}></button>
        </div>
      )}

      <div className="row" style={{ alignItems: "flex-start", gap: 14 }}>

        {/* Transfers */}
        <div className="card" style={{ flex: "1 1 240px" }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 16 }}>Transfers</h3>
          <label style={{ fontSize: 12 }}>Amount ($, min $10)</label>
          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            {[10, 20, 50, 100].map(v => (
              <button key={v} onClick={() => setTopupAmt(v)}
                style={{ flex: 1, padding: "7px 0", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer",
                  background: topupAmt === v ? "var(--accent)" : "var(--surface)",
                  border: topupAmt === v ? "1.5px solid var(--accent)" : "1px solid var(--border)",
                  color: topupAmt === v ? "#000" : "var(--ink)" }}>
                ${v}
              </button>
            ))}
          </div>
          <input type="number" value={topupAmt} min={10} step={5}
            onChange={e => setTopupAmt(parseInt(e.target.value || "10", 10))} />
          <button className="btn" style={{ marginTop: 12, width: "100%" }} onClick={topup}>Transfer</button>
        </div>

        {/* Send to Friend */}
        <div className="card" style={{ flex: "1 1 240px" }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 16 }}>Send to Friend</h3>
          {recipient ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
              background: "rgba(8,218,244,0.08)", borderRadius: 10, border: "1.5px solid var(--accent)",
              marginBottom: 12 }}>
              <Avatar username={recipient.username} avatarUrl={recipient.avatarUrl} size={32} />
              <span style={{ fontWeight: 700, flex: 1 }}>@{recipient.username}</span>
              <button onClick={() => { setRecipient(null); setSearch(""); }}
                style={{ background: "none", border: "none", color: "var(--muted-text)", cursor: "pointer", fontSize: 18 }}></button>
            </div>
          ) : (
            <div style={{ position: "relative", marginBottom: 12 }}>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search @username" style={{ width: "100%", boxSizing: "border-box" }} />
              {suggestions.length > 0 && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
                  background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.35)", maxHeight: 240, overflowY: "auto" }}>
                  {suggestions.map((u: any) => (
                    <div key={u.id}
                      onClick={() => { setRecipient(u); setSearch(""); setSuggestions([]); }}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                        cursor: "pointer", borderBottom: "1px solid var(--border)" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "")}>
                      <Avatar username={u.username} avatarUrl={u.avatarUrl} size={34} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>@{u.username}</div>
                        {buddyIds.has(u.id) && (
                          <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600 }}> Buddy</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <label style={{ fontSize: 12 }}>Amount ($, min $10)</label>
          <input type="number" value={sendAmt} min="10" step="0.01"
            onChange={e => setSendAmt(e.target.value)} />
          <label style={{ fontSize: 12, marginTop: 8 }}>Memo (optional)</label>
          <input value={sendMemo} onChange={e => setSendMemo(e.target.value)} placeholder="Drinks, etc." />
          <button className="btn" style={{ marginTop: 12, width: "100%" }} onClick={sendToFriend}>Send</button>
        </div>

      </div>

      {/* Transactions */}
      <h3 style={{ marginTop: 28, marginBottom: 12 }}>Transactions</h3>
      {!data || data.txns.length === 0 ? (
        <p className="muted">No transactions yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {data.txns.map((t: any) => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 14,
              padding: "13px 16px", background: "var(--surface)", borderRadius: 14,
              border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 22, width: 28, textAlign: "center", flexShrink: 0 }}>
                {TXN_ICON[t.type] ?? ""}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{TXN_LABEL[t.type] ?? t.type}</div>
                {t.memo && t.memo !== "Transfer" && (
                  <div className="muted" style={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.memo}</div>
                )}
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 15,
                  color: t.type === "TRANSFER_OUT" ? "#f66" : t.type === "TRANSFER_IN" ? "#2ecc71" : "var(--ink)" }}>
                  {t.type === "TRANSFER_OUT" ? "-" : "+"}{fmt(t.amountCents)}
                </div>
                <div className="muted" style={{ fontSize: 11 }}>
                  {new Date(t.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}