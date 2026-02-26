"use client";
import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";

const ROLES = ["VENUE", "USER", "ADMIN"];
function $$(n: number) { return `$${(n / 100).toFixed(2)}`; }
function fmtDate(d: string) { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }

function BanForm({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [days, setDays] = useState("7");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    setLoading(true); setErr("");
    const body: any = { action: "ban", reason };
    if (days !== "perm") body.durationDays = parseInt(days);
    const r = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    });
    const j = await r.json();
    setLoading(false);
    if (!r.ok) { setErr(j.error || "Failed"); return; }
    onDone();
  }

  return (
    <div style={{ marginTop: 10, padding: "12px 14px", background: "rgba(220,38,38,0.08)", borderRadius: 10, border: "1px solid rgba(220,38,38,0.25)" }}>
      <div style={{ marginBottom: 8, fontWeight: 700, fontSize: 13, color: "#f87171" }}>Ban User</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select value={days} onChange={e => setDays(e.target.value)} style={{ width: 130 }}>
          <option value="1">1 day</option>
          <option value="7">7 days</option>
          <option value="30">30 days</option>
          <option value="90">90 days</option>
          <option value="perm">Permanent</option>
        </select>
        <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason (optional)" style={{ flex: 1, minWidth: 140 }} />
        <button className="btn sm" style={{ background: "#c0392b" }} onClick={submit} disabled={loading}>
          {loading ? "Banning…" : "Confirm Ban"}
        </button>
      </div>
      {err && <p className="muted" style={{ marginTop: 4, color: "#f66", fontSize: 12 }}>{err}</p>}
    </div>
  );
}

function UserDetailPanel({ userId, onClose, onRefresh }: { userId: string; onClose: () => void; onRefresh: () => void }) {
  const [detail, setDetail] = useState<any>(null);
  const [showBanForm, setShowBanForm] = useState(false);
  const [unbanning, setUnbanning] = useState(false);
  const [msg, setMsg] = useState("");
  const [showWalletTxns, setShowWalletTxns] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/users/${userId}`).then(r => r.json()).then(setDetail);
  }, [userId]);

  async function unban() {
    setUnbanning(true);
    const r = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "unban" }),
    });
    setUnbanning(false);
    if (r.ok) {
      setMsg("Unbanned successfully.");
      onRefresh();
      setDetail((d: any) => ({ ...d, user: { ...d.user, bannedUntil: null, banReason: null } }));
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 2000 }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 2001,
        background: "var(--surface, #0f1621)", width: "min(480px, 100vw)",
        overflowY: "auto", boxShadow: "-8px 0 48px rgba(0,0,0,0.6)",
        borderLeft: "1px solid rgba(139,92,246,0.2)",
      }}>
        <div style={{ padding: "20px 22px 40px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h3 style={{ margin: 0, color: "#8b5cf6", fontSize: "1.1rem" }}>User Profile</h3>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "var(--ink)", fontSize: 16, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>

          {!detail ? (
            <p className="muted">Loading…</p>
          ) : (() => {
            const u = detail.user;
            const isBanned = u.bannedUntil && new Date(u.bannedUntil) > new Date();
            const perm = isBanned && new Date(u.bannedUntil).getFullYear() >= 2090;

            // Wallet txns overlay
            if (showWalletTxns) {
              const txns: any[] = detail.walletTxns ?? [];
              return (
                <div>
                  <button onClick={() => setShowWalletTxns(false)} style={{ background: "none", border: "none", color: "var(--muted-text)", cursor: "pointer", fontSize: 13, marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
                    ← Back to profile
                  </button>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <h4 style={{ margin: 0 }}>Wallet Transactions</h4>
                    <span style={{ fontWeight: 800, fontSize: 17, color: "#08daf4" }}>{$$(u.wallet?.balanceCents ?? 0)}</span>
                  </div>
                  {txns.length === 0 ? (
                    <p className="muted">No transactions yet.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {txns.map((t: any) => {
                        const positive = t.amountCents > 0;
                        return (
                          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: "var(--bg, #080c12)", border: "1px solid var(--border)" }}>
                            <div style={{ width: 34, height: 34, borderRadius: "50%", background: positive ? "rgba(34,197,94,0.1)" : "rgba(248,113,113,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 14 }}>
                              {t.type === "TOPUP" ? "💰" : t.type === "TRANSFER_OUT" ? "📤" : t.type === "TRANSFER_IN" ? "📥" : t.type === "REFUND" ? "↩️" : "✏️"}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{t.type.replace(/_/g, " ")}</div>
                              {t.memo && <div className="muted" style={{ fontSize: 11, marginTop: 1 }}>{t.memo}</div>}
                              <div className="muted" style={{ fontSize: 11, marginTop: 1 }}>{fmtDate(t.createdAt)}</div>
                            </div>
                            <div style={{ fontWeight: 800, fontSize: 14, color: positive ? "#22c55e" : "#f87171" }}>
                              {positive ? "+" : ""}{$$(t.amountCents)}
                            </div>
                          </div>
                        );
                      })}
                      {txns.length === 50 && <p className="muted" style={{ fontSize: 11, textAlign: "center" }}>Showing last 50 transactions</p>}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <>
                {/* Identity */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, padding: 16, background: "var(--bg, #080c12)", borderRadius: 14, border: "1px solid var(--border)" }}>
                  {u.avatarUrl
                    ? <img src={u.avatarUrl} alt={u.username} style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid rgba(139,92,246,0.4)" }} />
                    : <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(139,92,246,0.15)", border: "2px solid rgba(139,92,246,0.4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 800, fontSize: 24, color: "#8b5cf6" }}>
                        {(u.firstName?.[0] ?? "?").toUpperCase()}
                      </div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 2 }}>{u.firstName} {u.lastName}</div>
                    <div style={{ color: "#8b5cf6", fontWeight: 700, fontSize: 14, marginBottom: 6 }}>@{u.username}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <span className={`badge${u.role === "ADMIN" ? " active" : ""}`} style={{ fontSize: 11 }}>{u.role}</span>
                      {isBanned && <span style={{ padding: "2px 8px", borderRadius: 6, background: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.4)", fontSize: 11, color: "#f87171" }}>{perm ? "Perma-ban" : "Banned"}</span>}
                      {u.ghostMode && <span style={{ fontSize: 11, color: "#aaa" }}>👻 Ghost</span>}
                    </div>
                  </div>
                </div>

                {/* Stats — balance is clickable */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 18 }}>
                  <div
                    onClick={() => setShowWalletTxns(true)}
                    style={{ background: "var(--bg)", borderRadius: 10, padding: "10px 6px", textAlign: "center", border: "1px solid rgba(8,218,244,0.3)", cursor: "pointer", transition: "border-color 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "#08daf4")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(8,218,244,0.3)")}
                    title="Click to view wallet transactions"
                  >
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#08daf4" }}>{$$(u.wallet?.balanceCents ?? 0)}</div>
                    <div className="muted" style={{ fontSize: 10, marginTop: 2 }}>Balance 💳</div>
                  </div>
                  {[
                    { label: "Clicks", value: u._count?.clicks ?? 0, color: "#f59e0b" },
                    { label: "Orders", value: u._count?.orders ?? 0, color: "#22c55e" },
                    { label: "Buddies", value: detail.buddyCount ?? 0, color: "#8b5cf6" },
                  ].map(s => (
                    <div key={s.label} style={{ background: "var(--bg)", borderRadius: 10, padding: "10px 6px", textAlign: "center", border: "1px solid var(--border)" }}>
                      <div style={{ fontSize: 17, fontWeight: 800, color: s.color }}>{s.value}</div>
                      <div className="muted" style={{ fontSize: 10, marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Info */}
                <div className="card" style={{ marginBottom: 14, padding: "14px 16px" }}>
                  <div className="muted" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Account Info</div>
                  {[
                    { label: "Email", value: u.email || "—" },
                    { label: "Phone", value: u.phone || "—" },
                    { label: "Country", value: u.country || "—" },
                    { label: "Joined", value: fmtDate(u.createdAt) },
                    { label: "Last active", value: u.lastActiveAt ? fmtDate(u.lastActiveAt) : `—  (joined ${fmtDate(u.createdAt)})` },
                    ...(u.managedVenue ? [{ label: "Venue", value: `${u.managedVenue.name} · ${u.managedVenue.plan}` }] : []),
                  ].map(row => (
                    <div key={row.label} style={{ display: "flex", gap: 12, marginBottom: 7, fontSize: 13 }}>
                      <span className="muted" style={{ minWidth: 85, flexShrink: 0, fontSize: 12 }}>{row.label}</span>
                      <span style={{ fontWeight: 600, wordBreak: "break-all" }}>{row.value}</span>
                    </div>
                  ))}
                  {isBanned && (
                    <div style={{ marginTop: 10, padding: "8px 10px", background: "rgba(220,38,38,0.08)", borderRadius: 8, fontSize: 12 }}>
                      <span style={{ color: "#f87171", fontWeight: 700 }}>Banned {perm ? "permanently" : `until ${fmtDate(u.bannedUntil)}`}</span>
                      {u.banReason && <div style={{ color: "var(--muted-text)", marginTop: 3 }}>Reason: {u.banReason}</div>}
                    </div>
                  )}
                </div>

                {/* Recent orders */}
                {detail.recentOrders?.length > 0 && (
                  <div className="card" style={{ marginBottom: 14, padding: "14px 16px" }}>
                    <div className="muted" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Recent Orders</div>
                    {detail.recentOrders.map((o: any) => (
                      <div key={o.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 8, marginBottom: 8, borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{o.venue?.name ?? "—"}</div>
                          <div className="muted" style={{ fontSize: 11 }}>{o.orderNumber} · {fmtDate(o.createdAt)}</div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                          <span style={{ fontWeight: 700 }}>{$$(o.totalCents)}</span>
                          <span className={`badge${o.status === "COMPLETED" ? " active" : ""}`} style={{ fontSize: 10 }}>{o.status}</span>
                        </div>
                      </div>
                    ))}
                    {detail.recentOrders.length === 10 && <p className="muted" style={{ fontSize: 11, margin: "4px 0 0", textAlign: "center" }}>Showing last 10 orders</p>}
                  </div>
                )}
                {detail.recentOrders?.length === 0 && (
                  <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>No orders placed yet.</p>
                )}

                {msg && <p style={{ color: "#22c55e", fontWeight: 600, fontSize: 13, marginBottom: 10 }}>{msg}</p>}

                {u.role !== "ADMIN" && (
                  <div>
                    {isBanned ? (
                      <button className="btn" style={{ background: "#22c55e", color: "#000", width: "100%", fontWeight: 700 }} onClick={unban} disabled={unbanning}>
                        {unbanning ? "Unbanning…" : "Unban User"}
                      </button>
                    ) : (
                      <button className="btn" style={{ background: "#c0392b", width: "100%", fontWeight: 700 }} onClick={() => setShowBanForm(s => !s)}>
                        {showBanForm ? "Cancel" : "Ban User"}
                      </button>
                    )}
                    {showBanForm && !isBanned && (
                      <BanForm userId={u.id} onDone={() => {
                        setShowBanForm(false); setMsg("User has been banned."); onRefresh();
                        setDetail((d: any) => ({ ...d, user: { ...d.user, bannedUntil: new Date(Date.now() + 86400000).toISOString() } }));
                      }} />
                    )}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>
    </>
  );
}

export default function AdminUsers() {
  const [data, setData] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState({ username: "", firstName: "", lastName: "", email: "", password: "", role: "VENUE" });
  const [creating, setCreating] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  async function load() {
    const r = await fetch("/api/admin/users");
    setData(await r.json());
  }
  useEffect(() => { load(); }, []);

  function setF(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function create() {
    setMsg("");
    if (!form.username.trim()) { setMsg("Username is required."); return; }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(form.username)) { setMsg("Username: 3-20 chars, letters/numbers/underscore only."); return; }
    if (!form.firstName.trim() || !form.lastName.trim()) { setMsg("First and last name are required."); return; }
    if (!form.email.trim()) { setMsg("Email is required."); return; }
    if (form.password.length < 8) { setMsg("Password must be at least 8 characters."); return; }
    setCreating(true);
    try {
      const r = await fetch("/api/admin/users", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form),
      });
      const j = await r.json();
      if (!r.ok) { setMsg(j.error || "Failed to create user."); return; }
      setMsg(`✓ User created (ID: ${j.userId}).`);
      setForm({ username: "", firstName: "", lastName: "", email: "", password: "", role: "VENUE" });
      setShowCreate(false);
      load();
    } catch {
      setMsg("Network error — please try again.");
    } finally {
      setCreating(false);
    }
  }

  const filtered = data?.users?.filter((u: any) => {
    const q = filter.toLowerCase();
    return !q ||
      (u.username || "").toLowerCase().includes(q) ||
      u.firstName.toLowerCase().includes(q) ||
      u.lastName.toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q);
  }) ?? [];

  return (
    <div className="container">
      <div className="header">
        <h2>Users {data ? `(${data.users.length})` : ""}</h2>
        <button className="btn" style={{ background: "#8b5cf6" }} onClick={() => setShowCreate(s => !s)}>
          {showCreate ? "Hide" : "+ New User"}
        </button>
      </div>
      <Nav role="admin" />

      {showCreate && (
        <div className="card" style={{ marginBottom: 20, borderColor: "rgba(139,92,246,0.35)" }}>
          <h3 style={{ margin: "0 0 14px", color: "#8b5cf6" }}>Create User</h3>
          {msg && <p style={{ marginBottom: 10, fontSize: 13, color: msg.startsWith("✓") ? "#22c55e" : "#f87171", fontWeight: 600 }}>{msg}</p>}
          <label>Username</label>
          <input value={form.username} onChange={e => setF("username", e.target.value)} placeholder="venue_bar (3-20 chars)" autoComplete="off" />
          <div className="row">
            <div style={{ flex: 1 }}><label>First name</label><input value={form.firstName} onChange={e => setF("firstName", e.target.value)} autoComplete="off" /></div>
            <div style={{ flex: 1 }}><label>Last name</label><input value={form.lastName} onChange={e => setF("lastName", e.target.value)} autoComplete="off" /></div>
          </div>
          <div className="row">
            <div style={{ flex: 2 }}><label>Email</label><input value={form.email} onChange={e => setF("email", e.target.value)} autoComplete="off" /></div>
            <div style={{ flex: 1 }}>
              <label>Role</label>
              <select value={form.role} onChange={e => setF("role", e.target.value)}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <label>Password (min 8 chars)</label>
          <input type="password" value={form.password} onChange={e => setF("password", e.target.value)} autoComplete="new-password" />
          <button className="btn" style={{ marginTop: 12 }} onClick={create} disabled={creating}>
            {creating ? "Creating…" : "Create user"}
          </button>
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <input value={filter} onChange={e => setFilter(e.target.value)}
          placeholder="Search by name, email, role…" style={{ maxWidth: 400 }} />
      </div>

      <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>Tap any user to see full profile, balance, orders, and actions.</p>

      {!data && <p className="muted">Loading...</p>}

      {data && (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {filtered.map((u: any) => {
            const isBanned = u.bannedUntil && new Date(u.bannedUntil) > new Date();
            return (
              <div key={u.id} onClick={() => setSelectedUserId(u.id)}
                style={{ borderRadius: 12, background: "var(--surface)", border: "1px solid var(--border)", padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", transition: "border-color 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(139,92,246,0.4)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
              >
                {u.avatarUrl
                  ? <img src={u.avatarUrl} alt={u.username} style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid rgba(139,92,246,0.35)" }} />
                  : <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(139,92,246,0.15)", border: "2px solid rgba(139,92,246,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 700, fontSize: 14, color: "#8b5cf6" }}>
                      {(u.firstName?.[0] ?? "?").toUpperCase()}
                    </div>
                }
                <div style={{ flex: "1 1 120px", minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.firstName} {u.lastName}</div>
                  <div className="muted" style={{ fontSize: 11 }}>@{u.username}</div>
                </div>
                <div className="muted" style={{ fontSize: 12, flex: "1 1 150px", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div>
                <span className={`badge${u.role === "ADMIN" ? " active" : ""}`} style={{ flexShrink: 0, fontSize: 11 }}>{u.role}</span>
                {u.managedVenue?.name && <span className="muted" style={{ fontSize: 11, flexShrink: 0, maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.managedVenue.name}</span>}
                {isBanned
                  ? <span style={{ fontSize: 11, color: "#f87171", flexShrink: 0 }}>Banned</span>
                  : u.ghostMode
                  ? <span style={{ fontSize: 11, color: "#aaa", flexShrink: 0 }}>Ghost</span>
                  : <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", flexShrink: 0, display: "inline-block" }} />
                }
                <span style={{ color: "var(--muted-text)", flexShrink: 0 }}>›</span>
              </div>
            );
          })}
          {filtered.length === 0 && data && <p className="muted">No users match.</p>}
        </div>
      )}

      {selectedUserId && (
        <UserDetailPanel
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onRefresh={load}
        />
      )}
    </div>
  );
}
