"use client";
import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";

function fmt(t: string) {
  return new Date(t).toLocaleString([], {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

type Conversation = {
  id: string;
  user1: { id: string; username: string; avatarUrl: string | null };
  user2: { id: string; username: string; avatarUrl: string | null };
  messages: { body: string; createdAt: string; senderId: string }[];
  lastAt: string;
};

type SupportCase = {
  id: string;
  caseNumber: string;
  status: string;
  description: string;
  updatedAt: string;
  order: { orderNumber: string | null; venue: { name: string } } | null;
  messages: { id: string; fromRole: string; body: string; createdAt: string }[];
};

type Message = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
};

export default function InboxPage() {
  const [me, setMe] = useState<{ id: string } | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [cases, setCases] = useState<SupportCase[]>([]);
  const [tab, setTab] = useState<"dms" | "support">("dms");
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [other, setOther] = useState<{ username: string; avatarUrl: string | null } | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadInbox() {
    const [meR, inboxR] = await Promise.all([
      fetch("/api/me").then(r => r.json()),
      fetch("/api/messages").then(r => r.json()),
    ]);
    if (meR.user) setMe(meR.user);
    setConversations(inboxR.conversations ?? []);
    setCases(inboxR.cases ?? []);
    setLoading(false);
  }

  useEffect(() => { loadInbox(); }, []);

  async function openConv(convId: string) {
    setSelected(convId);
    const r = await fetch(`/api/messages/${convId}`);
    const j = await r.json();
    setMessages(j.conversation?.messages ?? []);
    setOther(j.other ?? null);
  }

  async function sendMessage() {
    if (!selected || !input.trim()) return;
    setSending(true);
    const r = await fetch(`/api/messages/${selected}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: input.trim() }),
    });
    setSending(false);
    if (r.ok) {
      setInput("");
      openConv(selected);
      loadInbox();
    }
  }

  function Avatar({ username, avatarUrl, size = 36 }: { username: string; avatarUrl: string | null; size?: number }) {
    return avatarUrl
      ? <img src={avatarUrl} alt={username} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
      : <div style={{
          width: size, height: size, borderRadius: "50%", flexShrink: 0,
          background: "var(--brand-dim)", border: "1.5px solid var(--brand)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: size * 0.38, fontWeight: 700, color: "var(--brand)",
        }}>{username[0].toUpperCase()}</div>;
  }

  if (loading) return <div className="container"><Nav role="u" /><p className="muted">Loading…</p></div>;

  // When a DM conversation is open
  if (tab === "dms" && selected) {
    return (
      <div className="container">
        <Nav role="u" />
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <button className="btn sm secondary" onClick={() => { setSelected(null); setMessages([]); setOther(null); }}>
            ← Back
          </button>
          {other && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Avatar username={other.username} avatarUrl={other.avatarUrl} />
              <strong>@{other.username}</strong>
            </div>
          )}
        </div>

        <div style={{
          minHeight: 300, maxHeight: "55vh", overflowY: "auto",
          display: "flex", flexDirection: "column", gap: 8,
          padding: "12px 0", marginBottom: 12,
        }}>
          {messages.length === 0 && <p className="muted" style={{ textAlign: "center" }}>No messages yet. Say hi!</p>}
          {messages.map(m => {
            const mine = m.senderId === me?.id;
            return (
              <div key={m.id} style={{
                display: "flex", justifyContent: mine ? "flex-end" : "flex-start",
              }}>
                <div style={{
                  maxWidth: "72%",
                  background: mine ? "var(--brand)" : "var(--surface)",
                  color: mine ? "#080c12" : "var(--ink)",
                  border: mine ? "none" : "1px solid var(--border)",
                  borderRadius: mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  padding: "10px 14px",
                  fontSize: 14, lineHeight: 1.4,
                }}>
                  <p style={{ margin: 0 }}>{m.body}</p>
                  <p style={{ margin: "4px 0 0", fontSize: 10, opacity: 0.6, textAlign: mine ? "right" : "left" }}>
                    {fmt(m.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="row" style={{ gap: 8, alignItems: "flex-end" }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Message…"
            rows={2}
            style={{ flex: 1, resize: "none" }}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          />
          <button className="btn" onClick={sendMessage} disabled={sending || !input.trim()} style={{ flexShrink: 0 }}>
            {sending ? "…" : "Send"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h2>Inbox</h2>
      <Nav role="u" />

      {/* Tab toggle */}
      <div className="row" style={{ marginBottom: 20, gap: 8 }}>
        <button className={`btn sm${tab === "dms" ? " accent" : " secondary"}`} onClick={() => setTab("dms")}>
          Messages
        </button>
        <button className={`btn sm${tab === "support" ? " accent" : " secondary"}`} onClick={() => setTab("support")}>
          Support {cases.filter(c => c.status !== "CLOSED").length > 0 && `(${cases.filter(c => c.status !== "CLOSED").length})`}
        </button>
      </div>

      {/* DMs list */}
      {tab === "dms" && (
        <>
          {conversations.length === 0 && (
            <div className="card" style={{ textAlign: "center", padding: 32 }}>
              <p className="muted">No conversations yet.</p>
              <p className="muted" style={{ fontSize: 13 }}>Go to Buddies to start a chat with a friend.</p>
            </div>
          )}
          {conversations.map(conv => {
            const partnerIsUser1 = conv.user1.id !== me?.id;
            const partner = partnerIsUser1 ? conv.user1 : conv.user2;
            const lastMsg = conv.messages[0];
            return (
              <div
                key={conv.id}
                className="card"
                style={{ marginBottom: 10, cursor: "pointer" }}
                onClick={() => openConv(conv.id)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Avatar username={partner.username} avatarUrl={partner.avatarUrl} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong>@{partner.username}</strong>
                    <p className="muted" style={{ margin: "2px 0 0", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {lastMsg?.body ?? "No messages yet"}
                    </p>
                  </div>
                  {conv.lastAt && (
                    <span style={{ fontSize: 11, color: "var(--muted-text)", flexShrink: 0 }}>
                      {fmt(conv.lastAt)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* Support cases */}
      {tab === "support" && (
        <>
          {cases.length === 0 && (
            <div className="card" style={{ textAlign: "center", padding: 32 }}>
              <p className="muted">No support cases. If you have an issue with an order, use the tracker to submit it after the order completes.</p>
            </div>
          )}
          {cases.map(c => (
            <div key={c.id} className="card" style={{ marginBottom: 12 }}>
              <div className="header" style={{ marginBottom: 8 }}>
                <div>
                  <strong style={{ color: "var(--brand)", fontSize: 15 }}>{c.caseNumber}</strong>
                  {c.order && (
                    <span className="muted" style={{ marginLeft: 8, fontSize: 13 }}>
                      Order {c.order.orderNumber ?? "—"} · {c.order.venue.name}
                    </span>
                  )}
                </div>
                <span className={`badge${c.status === "RESOLVED" ? " success" : c.status === "CLOSED" ? "" : ""}`}
                  style={{ fontSize: 11 }}>{c.status}</span>
              </div>
              <p className="muted" style={{ fontSize: 13, marginBottom: 10 }}>{c.description}</p>
              {/* Messages thread */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {c.messages.map(m => (
                  <div key={m.id} style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    background: m.fromRole === "ADMIN" ? "var(--brand-dim)" : "var(--bg)",
                    border: `1px solid ${m.fromRole === "ADMIN" ? "rgba(8,218,244,0.2)" : "var(--border)"}`,
                    fontSize: 13,
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: m.fromRole === "ADMIN" ? "var(--brand)" : "var(--muted-text)" }}>
                      {m.fromRole === "ADMIN" ? "Clicks Support" : "You"}
                    </span>
                    <p style={{ margin: "4px 0 0" }}>{m.body}</p>
                    <p style={{ margin: "4px 0 0", fontSize: 10, color: "var(--muted-text)" }}>{fmt(m.createdAt)}</p>
                  </div>
                ))}
              </div>
              {c.messages.length > 1 && c.status === "REVIEWING" && (
                <p className="muted" style={{ fontSize: 12, marginTop: 8, fontStyle: "italic" }}>
                  A Clicks Representative has responded. Please check your messages above.
                </p>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
