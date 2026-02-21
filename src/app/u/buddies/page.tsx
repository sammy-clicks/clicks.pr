"use client";
import { useEffect, useState, useRef } from "react";
import { Nav } from "@/components/Nav";

function Avatar({ username, avatarUrl, size = 36 }: { username: string; avatarUrl?: string | null; size?: number }) {
  return avatarUrl ? (
    <img src={avatarUrl} alt={username} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
  ) : (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: "#9b5de5",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 700, color: "#fff", flexShrink: 0,
    }}>{username ? username[0].toUpperCase() : "?"}</div>
  );
}

export default function Buddies() {
  const [data, setData] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function load() {
    const r = await fetch("/api/buddies");
    setData(await r.json());
  }
  useEffect(() => { load(); }, []);

  // Debounced username search
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const q = search.trim().replace(/^@/, "");
    if (q.length < 2) { setResults([]); return; }
    timerRef.current = setTimeout(async () => {
      const r = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
      const j = await r.json();
      setResults(j.users ?? []);
    }, 300);
  }, [search]);

  async function send(identifier: string, isEmail = false) {
    setMsg("");
    const r = await fetch("/api/buddies", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(isEmail ? { email: identifier } : { username: identifier }),
    });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error || "Failed"); return; }
    setMsg("Request sent!");
    setSearch(""); setResults([]);
    load();
  }

  async function respond(buddyId: string, action: "accept" | "block") {
    await fetch("/api/buddies", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ buddyId, action }),
    });
    load();
  }

  const existingIds = new Set([
    ...(data?.buddies?.map((b: any) => b.friendId) ?? []),
    ...(data?.requests?.map((r: any) => r.fromId) ?? []),
  ]);
  const isEmailSearch = search.includes("@") && !search.startsWith("@");

  return (
    <div className="container">
      <h2>Buddies</h2>
      <Nav role="u" />

      {/* Search */}
      <div className="card" style={{ marginBottom: 16 }}>
        <label>Search by @username or email</label>
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setMsg(""); }}
          placeholder="@username or email@example.com"
          style={{ marginTop: 6 }}
          autoCapitalize="none"
          autoCorrect="off"
        />
        {msg && (
          <p className="muted" style={{ marginTop: 6, color: msg === "Request sent!" ? "green" : "var(--error, #f66)" }}>{msg}</p>
        )}

        {results.length > 0 && (
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            {results.map(u => (
              <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar username={u.username} avatarUrl={u.avatarUrl} />
                <span style={{ flex: 1 }}>@{u.username}</span>
                {existingIds.has(u.id)
                  ? <span className="badge">Added</span>
                  : <button className="btn sm" onClick={() => send(u.username)}>Add</button>}
              </div>
            ))}
          </div>
        )}

        {/* Email fallback when no username results */}
        {isEmailSearch && results.length === 0 && search.length > 4 && (
          <button className="btn" style={{ marginTop: 10 }} onClick={() => send(search, true)}>
            Send request to {search}
          </button>
        )}
      </div>

      {/* Incoming requests */}
      {data?.requests?.length > 0 && (
        <>
          <h3>Incoming Requests</h3>
          <div className="row">
            {data.requests.map((r: any) => (
              <div key={r.buddyId} className="card" style={{ flex: "1 1 280px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <Avatar username={r.name} avatarUrl={r.avatarUrl} />
                  <strong>@{r.name}</strong>
                </div>
                <div className="row" style={{ marginTop: 4 }}>
                  <button className="btn sm" onClick={() => respond(r.buddyId, "accept")}>Accept</button>
                  <button className="btn sm secondary" onClick={() => respond(r.buddyId, "block")}>Decline</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Buddy list */}
      <h3>My Buddies {data ? `(${data.buddies.length})` : ""}</h3>
      {data?.buddies?.length === 0 && <p className="muted">No buddies yet. Search by @username above!</p>}
      <div className="row">
        {data?.buddies?.map((b: any) => (
          <div key={b.buddyId} className="card" style={{ flex: "1 1 240px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <Avatar username={b.name} avatarUrl={b.avatarUrl} size={40} />
              <div>
                <div><strong>@{b.name}</strong></div>
                {b.realName && <div className="muted" style={{ fontSize: 12 }}>{b.realName}</div>}
              </div>
            </div>
            {b.ghostMode && <p className="muted" style={{ margin: 0, fontSize: 12 }}>👻 Ghost mode</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
