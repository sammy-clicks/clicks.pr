"use client";
import { useEffect, useState, useRef } from "react";
import { Nav } from "@/components/Nav";

function fmt(cents: number) { return `$${(cents / 100).toFixed(2)}`; }

const TXN_STATUS_LABEL: Record<string, string> = {
  TOPUP: "Paid", TRANSFER_OUT: "Sent", TRANSFER_IN: "Received", REFUND: "Refunded", ADJUSTMENT: "Adjusted",
};

function TxnDetailModal({ txn, onClose }: { txn: any; onClose: () => void }) {
  const isOut = txn.type === "TRANSFER_OUT";
  const isIn  = txn.type === "TRANSFER_IN";
  const amtColor = isOut ? "#f66" : isIn ? "#2ecc71" : "var(--ink)";
  const amtPrefix = isOut ? "−" : "+";
  const date = new Date(txn.createdAt);
  const fullDate = date.toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const fullTime = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const statusLabel = TXN_STATUS_LABEL[txn.type] ?? "Complete";
  const typeLabel   = TXN_LABEL[txn.type] ?? txn.type;

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, zIndex: 1400,
        background: "rgba(0,0,0,0.75)", backdropFilter: "blur(5px)",
      }} />

      {/* Bottom sheet */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1410,
        background: "var(--surface)", borderRadius: "22px 22px 0 0",
        padding: "0 0 env(safe-area-inset-bottom,28px)",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.55)",
      }}>
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "14px 0 4px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border)" }} />
        </div>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px 0" }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", color: "var(--muted-text)" }}>
            Transaction Details
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-text)", fontSize: 22, lineHeight: 1, padding: 4 }}>✕</button>
        </div>

        {/* Big amount */}
        <div style={{ textAlign: "center", padding: "20px 20px 16px" }}>
          <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: -2, color: amtColor, lineHeight: 1 }}>
            {amtPrefix}{fmt(txn.amountCents)}
          </div>
          <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6,
            background: "rgba(46,204,113,0.13)", borderRadius: 20, padding: "4px 14px" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#2ecc71" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#2ecc71" }}>{statusLabel}</span>
          </div>
        </div>

        {/* Detail rows */}
        <div style={{ margin: "0 20px 20px", borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", overflow: "hidden" }}>
          {[
            { label: "Type",   value: `${TXN_ICON[txn.type] ?? ""} ${typeLabel}` },
            { label: "Date",   value: fullDate },
            { label: "Time",   value: fullTime },
            ...(txn.memo && txn.memo !== "Transfer" ? [{ label: "Memo", value: txn.memo }] : []),
            { label: "Status", value: statusLabel },
            { label: "Ref",    value: txn.id.slice(0, 18).toUpperCase() },
          ].map((row, i, arr) => (
            <div key={row.label} style={{
              display: "flex", justifyContent: "space-between", alignItems: "flex-start",
              padding: "13px 16px", gap: 12,
              borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
            }}>
              <span style={{ fontSize: 12, color: "var(--muted-text)", fontWeight: 600, flexShrink: 0 }}>{row.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, textAlign: "right", wordBreak: "break-all" }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

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
  const [buddies, setBuddies]     = useState<any[]>([]);
  const [selectedTxn, setSelectedTxn] = useState<any>(null);
  const [topupAmt, setTopupAmt]   = useState(10);
  const [msg, setMsg]             = useState<{ text: string; ok: boolean } | null>(null);

  // Pagination
  const [txnPage, setTxnPage]     = useState(1);

  // Send tab
  const [tab, setTab]             = useState<"send" | "request">("send");
  const [recipient, setRecipient] = useState<{ id: string; username: string; avatarUrl?: string | null } | null>(null);
  const [search, setSearch]       = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [sendAmt, setSendAmt]     = useState("10.00");
  const [sendMemo, setSendMemo]   = useState("");
  const [sendConfirm, setSendConfirm] = useState(false);

  // Request tab
  const [reqRecipient, setReqRecipient] = useState<{ id: string; username: string; avatarUrl?: string | null } | null>(null);
  const [reqSearch, setReqSearch] = useState("");
  const [reqSuggestions, setReqSuggestions] = useState<any[]>([]);
  const [reqAmt, setReqAmt]       = useState("10.00");
  const [reqNote, setReqNote]     = useState("");
  const [reqConfirm, setReqConfirm] = useState(false);

  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function load(page = txnPage) {
    const [walletR, buddiesR] = await Promise.all([
      fetch(`/api/wallet?page=${page}`).then(r => r.json()),
      fetch("/api/buddies").then(r => r.json()),
    ]);
    setData(walletR);
    const buddyList: any[] = buddiesR.buddies ?? [];
    const ids = new Set<string>(buddyList.map((b: any) => b.friendId as string));
    setBuddyIds(ids);
    setBuddies(buddyList);
  }
  useEffect(() => { load(1); }, []);

  // Send search
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const q = search.trim().replace(/^@/, "");
    if (q.length < 2) { setSuggestions([]); return; }
    timerRef.current = setTimeout(async () => {
      const r = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
      const j = await r.json();
      const users: any[] = j.users ?? [];
      users.sort((a: any, b: any) => (buddyIds.has(b.id) ? 1 : 0) - (buddyIds.has(a.id) ? 1 : 0));
      setSuggestions(users);
    }, 300);
  }, [search, buddyIds]);

  // Request search (buddies only)
  useEffect(() => {
    if (reqTimerRef.current) clearTimeout(reqTimerRef.current);
    const q = reqSearch.trim().replace(/^@/, "");
    if (q.length < 2) { setReqSuggestions([]); return; }
    reqTimerRef.current = setTimeout(async () => {
      const r = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
      const j = await r.json();
      const users: any[] = (j.users ?? []).filter((u: any) => buddyIds.has(u.id));
      setReqSuggestions(users);
    }, 300);
  }, [reqSearch, buddyIds]);

  async function topup() {
    if (topupAmt < 10) { setMsg({ text: "Minimum transfer is $10.", ok: false }); return; }
    const r = await fetch("/api/wallet/topup", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ dollars: topupAmt }),
    });
    const j = await r.json();
    if (!r.ok) { setMsg({ text: j.error || "Failed", ok: false }); return; }
    setMsg({ text: `+${fmt(topupAmt * 100)} transferred!`, ok: true });
    load(txnPage);
  }

  async function confirmSend() {
    setSendConfirm(false);
    if (!recipient) return;
    const dollars = parseFloat(sendAmt);
    const r = await fetch("/api/wallet/transfer", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ toUsername: recipient.username, dollars, memo: sendMemo }),
    });
    const j = await r.json();
    if (!r.ok) { setMsg({ text: j.error || "Transfer failed", ok: false }); return; }
    setMsg({ text: `Sent ${fmt(dollars * 100)} to @${recipient.username}!`, ok: true });
    setRecipient(null); setSearch(""); setSendMemo(""); setSendAmt("10.00");
    load(1); setTxnPage(1);
  }

  async function confirmRequest() {
    setReqConfirm(false);
    if (!reqRecipient) return;
    const dollars = parseFloat(reqAmt);
    // Create or find conversation
    const convR = await fetch("/api/messages", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ buddyId: reqRecipient.id }),
    });
    const convJ = await convR.json();
    if (!convR.ok) { setMsg({ text: convJ.error || "Could not open DM", ok: false }); return; }
    const conversationId = convJ.id ?? convJ.conversationId;
    const me = (await fetch("/api/me").then(r => r.json()));
    const messageText = `💸 Payment Request\n@${me.username ?? "someone"} is requesting ${fmt(dollars * 100)} from you.${reqNote ? `\n📝 Note: ${reqNote}` : ""}\n\nUse the wallet to send payment.`;
    const msgR = await fetch(`/api/messages/${conversationId}`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: messageText }),
    });
    if (!msgR.ok) { setMsg({ text: "Request sent but DM failed.", ok: false }); return; }
    setMsg({ text: `Payment request sent to @${reqRecipient.username}!`, ok: true });
    setReqRecipient(null); setReqSearch(""); setReqNote(""); setReqAmt("10.00");
  }

  function changePage(newPage: number) {
    setTxnPage(newPage);
    load(newPage);
  }

  const sendDollars = parseFloat(sendAmt) || 0;
  const balanceAfter = data ? (data.balanceCents / 100) - sendDollars : 0;

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
          <button onClick={() => setMsg(null)} style={{ marginLeft: 10, background: "none", border: "none", cursor: "pointer", color: "inherit", fontWeight: 700 }}>✕</button>
        </div>
      )}

      <div className="row" style={{ alignItems: "flex-start", gap: 14 }}>

        {/* Add Funds */}
        <div className="card" style={{ flex: "1 1 240px" }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 16 }}>Add Funds</h3>
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
          <button className="btn" style={{ marginTop: 12, width: "100%" }} onClick={topup}>Add Funds</button>
        </div>

        {/* Send / Request */}
        <div className="card" style={{ flex: "1 1 240px" }}>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 0, marginBottom: 14, borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)" }}>
            {(["send", "request"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ flex: 1, padding: "9px 0", fontSize: 13, fontWeight: 700, cursor: "pointer", border: "none",
                  background: tab === t ? "var(--accent)" : "transparent",
                  color: tab === t ? "#000" : "var(--muted-text)", textTransform: "capitalize" }}>
                {t === "send" ? "💸 Send" : "🤝 Request"}
              </button>
            ))}
          </div>

          {tab === "send" ? (
            <>
              {recipient ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
                  background: "rgba(8,218,244,0.08)", borderRadius: 10, border: "1.5px solid var(--accent)", marginBottom: 12 }}>
                  <Avatar username={recipient.username} avatarUrl={recipient.avatarUrl} size={32} />
                  <span style={{ fontWeight: 700, flex: 1 }}>@{recipient.username}</span>
                  <button onClick={() => { setRecipient(null); setSearch(""); }}
                    style={{ background: "none", border: "none", color: "var(--muted-text)", cursor: "pointer", fontSize: 18 }}>✕</button>
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
                        <div key={u.id} onClick={() => { setRecipient(u); setSearch(""); setSuggestions([]); }}
                          style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                            cursor: "pointer", borderBottom: "1px solid var(--border)" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "")}>
                          <Avatar username={u.username} avatarUrl={u.avatarUrl} size={34} />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>@{u.username}</div>
                            {buddyIds.has(u.id) && <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600 }}>👥 Buddy</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <label style={{ fontSize: 12 }}>Amount ($, min $10)</label>
              <input type="number" value={sendAmt} min="10" step="0.01" onChange={e => setSendAmt(e.target.value)} />
              <label style={{ fontSize: 12, marginTop: 8 }}>Memo (optional)</label>
              <input value={sendMemo} onChange={e => setSendMemo(e.target.value)} placeholder="Drinks, etc." />
              <button className="btn" style={{ marginTop: 12, width: "100%" }}
                onClick={() => {
                  if (!recipient) { setMsg({ text: "Select a recipient.", ok: false }); return; }
                  if (isNaN(sendDollars) || sendDollars < 10) { setMsg({ text: "Minimum send is $10.", ok: false }); return; }
                  setSendConfirm(true);
                }}>
                Send
              </button>
            </>
          ) : (
            /* Request tab — buddies only */
            <>
              <p style={{ fontSize: 11, color: "var(--muted-text)", marginBottom: 10, lineHeight: 1.5 }}>
                You can only request money from your buddies.
              </p>
              {reqRecipient ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
                  background: "rgba(8,218,244,0.08)", borderRadius: 10, border: "1.5px solid var(--accent)", marginBottom: 12 }}>
                  <Avatar username={reqRecipient.username} avatarUrl={reqRecipient.avatarUrl} size={32} />
                  <span style={{ fontWeight: 700, flex: 1 }}>@{reqRecipient.username}</span>
                  <button onClick={() => { setReqRecipient(null); setReqSearch(""); }}
                    style={{ background: "none", border: "none", color: "var(--muted-text)", cursor: "pointer", fontSize: 18 }}>✕</button>
                </div>
              ) : (
                <div style={{ position: "relative", marginBottom: 12 }}>
                  <input value={reqSearch} onChange={e => setReqSearch(e.target.value)}
                    placeholder="Search buddies…" style={{ width: "100%", boxSizing: "border-box" }} />
                  {reqSuggestions.length > 0 && (
                    <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
                      background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12,
                      boxShadow: "0 8px 32px rgba(0,0,0,0.35)", maxHeight: 240, overflowY: "auto" }}>
                      {reqSuggestions.map((u: any) => (
                        <div key={u.id} onClick={() => { setReqRecipient(u); setReqSearch(""); setReqSuggestions([]); }}
                          style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                            cursor: "pointer", borderBottom: "1px solid var(--border)" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "")}>
                          <Avatar username={u.username} avatarUrl={u.avatarUrl} size={34} />
                          <div style={{ fontWeight: 700, fontSize: 14 }}>@{u.username}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <label style={{ fontSize: 12 }}>Amount ($, min $1)</label>
              <input type="number" value={reqAmt} min="1" step="0.01" onChange={e => setReqAmt(e.target.value)} />
              <label style={{ fontSize: 12, marginTop: 8 }}>Note (optional)</label>
              <input value={reqNote} onChange={e => setReqNote(e.target.value)} placeholder="Dinner split, etc." />
              <button className="btn" style={{ marginTop: 12, width: "100%" }}
                onClick={() => {
                  if (!reqRecipient) { setMsg({ text: "Select a buddy.", ok: false }); return; }
                  const d = parseFloat(reqAmt);
                  if (isNaN(d) || d < 1) { setMsg({ text: "Minimum request is $1.", ok: false }); return; }
                  setReqConfirm(true);
                }}>
                Send Request
              </button>
            </>
          )}
        </div>

      </div>

      {/* Transactions */}
      <h3 style={{ marginTop: 28, marginBottom: 12 }}>Transactions</h3>
      {!data || data.txns.length === 0 ? (
        <p className="muted">No transactions yet.</p>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.txns.map((t: any) => (
              <div key={t.id} onClick={() => setSelectedTxn(t)}
                style={{ display: "flex", alignItems: "center", gap: 14,
                padding: "13px 16px", background: "var(--surface)", borderRadius: 14,
                border: "1px solid var(--border)", cursor: "pointer", transition: "background 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                onMouseLeave={e => (e.currentTarget.style.background = "var(--surface)")}>
                <div style={{ fontSize: 22, width: 28, textAlign: "center", flexShrink: 0 }}>{TXN_ICON[t.type] ?? "💳"}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{TXN_LABEL[t.type] ?? t.type}</div>
                  {t.memo && t.memo !== "Transfer" && (
                    <div className="muted" style={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.memo}</div>
                  )}
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 15,
                    color: t.type === "TRANSFER_OUT" ? "#f66" : t.type === "TRANSFER_IN" ? "#2ecc71" : "var(--ink)" }}>
                    {t.type === "TRANSFER_OUT" ? "−" : "+"}{fmt(t.amountCents)}
                  </div>
                  <div className="muted" style={{ fontSize: 11 }}>
                    {new Date(t.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 18 }}>
              <button
                onClick={() => changePage(txnPage - 1)}
                disabled={txnPage <= 1}
                style={{ padding: "7px 18px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer",
                  background: txnPage <= 1 ? "var(--surface)" : "var(--accent)",
                  border: "1px solid var(--border)",
                  color: txnPage <= 1 ? "var(--muted-text)" : "#000",
                  opacity: txnPage <= 1 ? 0.4 : 1 }}>
                ← Prev
              </button>
              <span style={{ fontSize: 13, opacity: 0.65 }}>Page {txnPage} of {data.totalPages}</span>
              <button
                onClick={() => changePage(txnPage + 1)}
                disabled={txnPage >= data.totalPages}
                style={{ padding: "7px 18px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer",
                  background: txnPage >= data.totalPages ? "var(--surface)" : "var(--accent)",
                  border: "1px solid var(--border)",
                  color: txnPage >= data.totalPages ? "var(--muted-text)" : "#000",
                  opacity: txnPage >= data.totalPages ? 0.4 : 1 }}>
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* Transaction Detail Modal */}
      {selectedTxn && <TxnDetailModal txn={selectedTxn} onClose={() => setSelectedTxn(null)} />}

      {/* Send Confirmation Modal */}
      {sendConfirm && recipient && (
        <>
          <div onClick={() => setSendConfirm(false)} style={{ position: "fixed", inset: 0, zIndex: 1400, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(5px)" }} />
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1410, background: "var(--surface)", borderRadius: "22px 22px 0 0", padding: "0 0 env(safe-area-inset-bottom,28px)", boxShadow: "0 -8px 40px rgba(0,0,0,0.55)" }}>
            <div style={{ display: "flex", justifyContent: "center", padding: "14px 0 4px" }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border)" }} />
            </div>
            <div style={{ padding: "10px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", color: "var(--muted-text)" }}>Confirm Transfer</span>
              <button onClick={() => setSendConfirm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-text)", fontSize: 22, lineHeight: 1, padding: 4 }}>✕</button>
            </div>
            <div style={{ padding: "16px 20px 0", textAlign: "center" }}>
              <p style={{ fontSize: 13, opacity: 0.65, lineHeight: 1.6, margin: "0 0 16px" }}>
                You&apos;re about to send money to @{recipient.username}. This will be deducted from your wallet balance immediately and cannot be automatically reversed.
              </p>
            </div>
            <div style={{ margin: "0 20px 16px", borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", overflow: "hidden" }}>
              {[
                { label: "Sending to", value: `@${recipient.username}` },
                { label: "Amount", value: fmt(sendDollars * 100) },
                ...(sendMemo ? [{ label: "Memo", value: sendMemo }] : []),
                ...(data ? [{ label: "Balance after", value: fmt(balanceAfter * 100) }] : []),
              ].map((row, i, arr) => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 16px", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <span style={{ fontSize: 12, color: "var(--muted-text)", fontWeight: 600 }}>{row.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{row.value}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, padding: "0 20px 8px" }}>
              <button onClick={() => setSendConfirm(false)} className="btn secondary" style={{ flex: 1 }}>Cancel</button>
              <button onClick={confirmSend} className="btn" style={{ flex: 2 }}>Confirm & Send →</button>
            </div>
          </div>
        </>
      )}

      {/* Request Confirmation Modal */}
      {reqConfirm && reqRecipient && (
        <>
          <div onClick={() => setReqConfirm(false)} style={{ position: "fixed", inset: 0, zIndex: 1400, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(5px)" }} />
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1410, background: "var(--surface)", borderRadius: "22px 22px 0 0", padding: "0 0 env(safe-area-inset-bottom,28px)", boxShadow: "0 -8px 40px rgba(0,0,0,0.55)" }}>
            <div style={{ display: "flex", justifyContent: "center", padding: "14px 0 4px" }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border)" }} />
            </div>
            <div style={{ padding: "10px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", color: "var(--muted-text)" }}>Request Details</span>
              <button onClick={() => setReqConfirm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-text)", fontSize: 22, lineHeight: 1, padding: 4 }}>✕</button>
            </div>
            <div style={{ padding: "16px 20px 0", textAlign: "center" }}>
              <p style={{ fontSize: 13, opacity: 0.65, lineHeight: 1.6, margin: "0 0 16px" }}>
                A payment request message will be sent via Direct Message to @{reqRecipient.username}.
              </p>
            </div>
            <div style={{ margin: "0 20px 16px", borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", overflow: "hidden" }}>
              {[
                { label: "Requesting to", value: `@${reqRecipient.username}` },
                { label: "Amount", value: fmt(parseFloat(reqAmt) * 100) },
                ...(reqNote ? [{ label: "Note", value: reqNote }] : []),
              ].map((row, i, arr) => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 16px", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <span style={{ fontSize: 12, color: "var(--muted-text)", fontWeight: 600 }}>{row.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{row.value}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, padding: "0 20px 8px" }}>
              <button onClick={() => setReqConfirm(false)} className="btn secondary" style={{ flex: 1 }}>Cancel</button>
              <button onClick={confirmRequest} className="btn" style={{ flex: 2 }}>Send Request →</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}