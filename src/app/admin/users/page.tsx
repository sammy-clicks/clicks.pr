"use client";
import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";

const ROLES = ["VENUE", "USER", "ADMIN"];

export default function AdminUsers() {
  const [data, setData] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState({ username: "", firstName: "", lastName: "", email: "", password: "", role: "VENUE" });

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
      <h2>Users {data ? `(${data.users.length})` : ""}</h2>
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
        {msg && <p className="muted" style={{ marginTop: 6 }}>{msg}</p>}
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
          <tr><th>Username</th><th>Name</th><th>Email</th><th>Role</th><th>Venue</th><th>Ghost</th><th>Joined</th></tr>
        </thead>
        <tbody>
          {filtered.map((u: any) => (
            <tr key={u.id}>
              <td><code style={{fontSize:12}}>@{u.username}</code></td>
              <td>{u.firstName} {u.lastName}</td>
              <td>{u.email || <span className="muted">—</span>}</td>
              <td><span className={`badge${u.role === "ADMIN" ? " active" : ""}`}>{u.role}</span></td>
              <td>{u.managedVenue?.name || <span className="muted">—</span>}</td>
              <td>{u.ghostMode ? "👻" : "—"}</td>
              <td>{new Date(u.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
