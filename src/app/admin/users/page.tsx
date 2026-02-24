"use client";
import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";

const ROLES = ["VENUE", "USER", "ADMIN"];

function BanBadge({ until }: { until: string }) {
  const perm = new Date(until).getFullYear() >= 2090;
  return (
    <span style={{ background: "#f665", border: "1px solid #f66", borderRadius: 6, padding: "2px 8px", fontSize: 12, color: "#f99" }}>
      {perm ? "Permanent ban" : `Banned until ${new Date(until).toLocaleDateString()}`}
    </span>
  );
}

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
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    setLoading(false);
    if (!r.ok) { setErr(j.error || "Failed"); return; }
    onDone();
  }

  return (
    <div style={{ marginTop: 6, padding: "10px 12px", background: "rgba(246,102,102,0.08)", borderRadius: 8 }}>
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
      {err && <p className="muted" style={{ marginTop: 4, color: "#f66" }}>{err}</p>}
    </div>
  );
}

export default function AdminUsers() {
  const [data, setData] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState({ username: "", firstName: "", lastName: "", email: "", password: "", role: "VENUE" });
  const [banFormId, setBanFormId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

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
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await r.json();
      if (!r.ok) { setMsg(j.error || "Failed to create user."); return; }
      setMsg(`✓ User created (ID: ${j.userId}).`);
      setForm({ username: "", firstName: "", lastName: "", email: "", password: "", role: "VENUE" });
      load();
    } catch {
      setMsg("Network error — please try again.");
    } finally {
      setCreating(false);
    }
  }

  async function unban(id: string) {
    const r = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "unban" }),
    });
    if (r.ok) { setMsg("Unbanned."); load(); }
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
        {msg && <span className="muted">{msg}</span>}
      </div>
      <Nav role="admin" />

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 12px" }}>Create user</h3>
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

      <div style={{ marginBottom: 12 }}>
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Search by name, email, or role…"
          style={{ maxWidth: 360 }}
        />
      </div>

      {!data && <p className="muted">Loading...</p>}

      {data && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((u: any) => {
            const isBanned = u.bannedUntil && new Date(u.bannedUntil) > new Date();
            const isExpanded = banFormId === u.id;
            return (
              <div key={u.id} style={{
                borderRadius: 12, background: "var(--surface)",
                border: `1px solid ${isExpanded ? "rgba(139,92,246,0.4)" : "var(--border)"}`,
                overflow: "hidden",
                transition: "border-color 0.2s",
              }}>
                {/* Summary row */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", flexWrap: "wrap" }}>
                  {/* Avatar placeholder */}
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(139,92,246,0.15)", border: "2px solid rgba(139,92,246,0.4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 700, fontSize: 13, color: "#8b5cf6" }}>
                    {(u.firstName?.[0] ?? u.username?.[0] ?? "?").toUpperCase()}
                  </div>
                  {/* Name + username */}
                  <div style={{ flex: "1 1 140px", minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{u.firstName} {u.lastName}</div>
                    <div className="muted" style={{ fontSize: 11 }}>@{u.username}</div>
                  </div>
                  {/* Email */}
                  <div className="muted" style={{ fontSize: 12, flex: "1 1 160px", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {u.email}
                  </div>
                  {/* Role badge */}
                  <span className={`badge${u.role === "ADMIN" ? " active" : ""}`} style={{ flexShrink: 0 }}>{u.role}</span>
                  {/* Venue */}
                  {u.managedVenue?.name && (
                    <span className="muted" style={{ fontSize: 11, flexShrink: 0 }}>{u.managedVenue.name}</span>
                  )}
                  {/* Status */}
                  {isBanned
                    ? <BanBadge until={u.bannedUntil} />
                    : <span style={{ fontSize: 12, color: u.ghostMode ? "#aaa" : "#6fbf6f", flexShrink: 0 }}>{u.ghostMode ? "👻 Ghost" : "Active"}</span>
                  }
                  {/* Actions */}
                  {u.role !== "ADMIN" && (
                    isBanned
                      ? <button className="btn sm secondary" style={{ flexShrink: 0 }} onClick={() => { unban(u.id); setBanFormId(null); }}>Unban</button>
                      : <button className="btn sm" style={{ background: "#c0392b", flexShrink: 0 }}
                          onClick={() => setBanFormId(isExpanded ? null : u.id)}>
                          {isExpanded ? "Cancel" : "Ban"}
                        </button>
                  )}
                </div>
                {/* Expanded ban form */}
                {isExpanded && (
                  <div style={{ padding: "0 14px 12px" }}>
                    <BanForm userId={u.id} onDone={() => { setBanFormId(null); setMsg("Banned."); load(); }} />
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && data && <p className="muted">No users match.</p>}
        </div>
      )}
    </div>
  );
}
