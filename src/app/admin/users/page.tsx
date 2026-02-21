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

  async function load() {
    const r = await fetch("/api/admin/users");
    setData(await r.json());
  }
  useEffect(() => { load(); }, []);

  function setF(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function create() {
    setMsg("");
    const r = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error || "Failed"); return; }
    setMsg(`User created (ID: ${j.userId}).`);
    setForm({ username: "", firstName: "", lastName: "", email: "", password: "", role: "VENUE" });
    load();
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
        <input value={form.username} onChange={e => setF("username", e.target.value)} placeholder="venue_bar (3-20 chars)" />
        <div className="row">
          <div style={{ flex: 1 }}><label>First name</label><input value={form.firstName} onChange={e => setF("firstName", e.target.value)} /></div>
          <div style={{ flex: 1 }}><label>Last name</label><input value={form.lastName} onChange={e => setF("lastName", e.target.value)} /></div>
        </div>
        <div className="row">
          <div style={{ flex: 2 }}><label>Email</label><input value={form.email} onChange={e => setF("email", e.target.value)} /></div>
          <div style={{ flex: 1 }}>
            <label>Role</label>
            <select value={form.role} onChange={e => setF("role", e.target.value)}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <label>Password (min 8 chars)</label>
        <input type="password" value={form.password} onChange={e => setF("password", e.target.value)} />
        <button className="btn" style={{ marginTop: 12 }} onClick={create}>Create</button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Search by name, email, or role…"
          style={{ maxWidth: 360 }}
        />
      </div>

      {!data && <p className="muted">Loading…</p>}

      <table>
        <thead>
          <tr><th>Username</th><th>Name</th><th>Email</th><th>Role</th><th>Venue</th><th>Status</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {filtered.map((u: any) => {
            const isBanned = u.bannedUntil && new Date(u.bannedUntil) > new Date();
            return (
              <>
                <tr key={u.id}>
                  <td>@{u.username}</td>
                  <td>{u.firstName} {u.lastName}</td>
                  <td className="muted" style={{ fontSize: 12 }}>{u.email}</td>
                  <td><span className={`badge${u.role === "ADMIN" ? " active" : ""}`}>{u.role}</span></td>
                  <td style={{ fontSize: 12 }}>{u.managedVenue?.name || <span className="muted">—</span>}</td>
                  <td>
                    {isBanned
                      ? <BanBadge until={u.bannedUntil} />
                      : <span style={{ color: u.ghostMode ? "#aaa" : "#6f6" }}>{u.ghostMode ? "👻 Ghost" : "Active"}</span>}
                  </td>
                  <td>
                    {u.role !== "ADMIN" && (
                      isBanned
                        ? <button className="btn sm secondary" onClick={() => { unban(u.id); setBanFormId(null); }}>Unban</button>
                        : <button className="btn sm" style={{ background: "#c0392b" }}
                            onClick={() => setBanFormId(banFormId === u.id ? null : u.id)}>
                            {banFormId === u.id ? "Cancel" : "Ban"}
                          </button>
                    )}
                  </td>
                </tr>
                {banFormId === u.id && (
                  <tr key={`${u.id}-form`}>
                    <td colSpan={7} style={{ padding: "0 8px 8px" }}>
                      <BanForm userId={u.id} onDone={() => { setBanFormId(null); setMsg("Banned."); load(); }} />
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
