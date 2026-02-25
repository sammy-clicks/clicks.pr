"use client";
import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";

const PODIUM_COLORS = ["#f59e0b", "#94a3b8", "#cd7c54"];
const PODIUM_LABELS = ["1st", "2nd", "3rd"];

function UserProfileModal({ user, currentUserId, onClose }: { user: any; currentUserId: string; onClose: () => void }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function addBuddy() {
    setStatus("sending");
    const r = await fetch("/api/buddies", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: user.username }),
    });
    setStatus(r.ok ? "sent" : "error");
  }

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 2000 }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 2001, background: "var(--surface)", borderRadius: 20, padding: "28px 28px 24px", width: "min(360px, calc(100vw - 32px))", boxShadow: "0 20px 60px rgba(0,0,0,0.6)", textAlign: "center" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 14, right: 16, background: "none", border: "none", color: "var(--muted-text)", fontSize: 20, cursor: "pointer" }}>✕</button>
        {user.avatarUrl
          ? <img src={user.avatarUrl} alt={user.username} style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "3px solid rgba(139,92,246,0.5)", marginBottom: 12 }} />
          : <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(139,92,246,0.15)", border: "3px solid rgba(139,92,246,0.5)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontWeight: 800, fontSize: 26, color: "#8b5cf6" }}>
              {(user.username?.[0] ?? "?").toUpperCase()}
            </div>
        }
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>@{user.username}</div>
        <div style={{ color: "#8b5cf6", fontWeight: 700, fontSize: 15, marginBottom: 16 }}>{user.clicks} clicks this week</div>
        {user.id !== currentUserId && (
          status === "sent"
            ? <div style={{ color: "#22c55e", fontWeight: 700, fontSize: 14 }}>Buddy request sent!</div>
            : status === "error"
            ? <div style={{ color: "#f87171", fontSize: 13 }}>Could not send request.</div>
            : <button className="btn" style={{ background: "#8b5cf6", width: "100%", fontWeight: 700 }} onClick={addBuddy} disabled={status === "sending"}>
                {status === "sending" ? "Sending…" : "Add Buddy"}
              </button>
        )}
      </div>
    </>
  );
}

export default function Leaderboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [tab, setTab] = useState<"clickers" | "spenders">("clickers");

  async function load() {
    setLoading(true);
    const r = await fetch("/api/leaderboard");
    const j = await r.json();
    setData(j);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="container">
      <div className="header">
        <h2>Leaderboard</h2>
        <button className="btn secondary" onClick={load} disabled={loading}>Refresh</button>
      </div>
      <Nav role="u" />

      {loading && !data && <p className="muted">Loading…</p>}

      {data && (
        <>
          {/* ── Top Zones ── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Live — Top Zones by Crowd</h3>
          </div>

          {(!data.topZones || data.topZones.length === 0)
            ? <p className="muted" style={{ marginBottom: 20 }}>No active crowds yet tonight.</p>
            : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
                {data.topZones.map((z: any, i: number) => {
                  const maxCrowd = data.topZones[0]?.crowd || 1;
                  const pct = Math.max(5, Math.round((z.crowd / maxCrowd) * 100));
                  return (
                    <div key={z.id} style={{ borderRadius: 14, background: "var(--surface)", border: "1px solid var(--border)", overflow: "hidden", display: "flex", alignItems: "center" }}>
                      {/* Left accent */}
                      <div style={{ width: 4, alignSelf: "stretch", background: i === 0 ? "#f59e0b" : i === 1 ? "#94a3b8" : "rgba(139,92,246,0.4)", flexShrink: 0 }} />
                      {/* Zone image */}
                      {z.imageUrl
                        ? <img src={z.imageUrl} alt={z.name} style={{ width: 60, height: 60, objectFit: "cover", flexShrink: 0, margin: "0 0 0 10px", borderRadius: 8 }} />
                        : <div style={{ width: 60, height: 60, background: "rgba(139,92,246,0.1)", flexShrink: 0, margin: "0 0 0 10px", borderRadius: 8 }} />
                      }
                      <div style={{ flex: 1, padding: "10px 14px", minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
                          <span style={{ fontWeight: 800, fontSize: 15 }}>#{i + 1} {z.name}</span>
                          {z.venueCount > 0 && <span className="muted" style={{ fontSize: 11 }}>{z.venueCount} venue{z.venueCount !== 1 ? "s" : ""}</span>}
                        </div>
                        {/* Crowd bar */}
                        <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.08)", overflow: "hidden", marginBottom: 4 }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: i === 0 ? "#f59e0b" : "#8b5cf6", borderRadius: 3, transition: "width 0.4s" }} />
                        </div>
                        <div className="muted" style={{ fontSize: 11 }}>{z.crowd} active inside</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          }

          {/* ── Top Clickers / Top Spenders tabs ── */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button
              onClick={() => setTab("clickers")}
              className={tab === "clickers" ? "btn" : "btn secondary"}
              style={{ flex: 1, fontSize: 13 }}
            >
              Top Clickers
            </button>
            <button
              onClick={() => setTab("spenders")}
              className={tab === "spenders" ? "btn" : "btn secondary"}
              style={{ flex: 1, fontSize: 13 }}
            >
              Top Spenders
            </button>
          </div>

          {tab === "clickers" && (
            <>
              <p className="muted" style={{ marginBottom: 14, fontSize: 12 }}>Ghost-mode users are hidden. Tap a player to view their profile.</p>
              {(!data.topClickers || data.topClickers.length === 0)
                ? <p className="muted">No clicks recorded yet this week.</p>
                : (
                  <>
                    {data.topClickers.length >= 3 && (
                      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "flex-end" }}>
                        {[1, 0, 2].map(idx => {
                          const u = data.topClickers[idx];
                          if (!u) return null;
                          const isFirst = idx === 0;
                          return (
                            <div key={u.id} onClick={() => setSelectedUser(u)}
                              style={{ flex: 1, borderRadius: 14, background: "var(--surface)", border: `1.5px solid ${PODIUM_COLORS[idx]}40`, padding: isFirst ? "16px 8px" : "12px 8px", textAlign: "center", cursor: "pointer", transition: "border-color 0.15s" }}
                              onMouseEnter={e => (e.currentTarget.style.borderColor = PODIUM_COLORS[idx])}
                              onMouseLeave={e => (e.currentTarget.style.borderColor = `${PODIUM_COLORS[idx]}40`)}
                            >
                              <div style={{ fontSize: isFirst ? 14 : 12, fontWeight: 800, color: PODIUM_COLORS[idx], marginBottom: 6 }}>{PODIUM_LABELS[idx]}</div>
                              {u.avatarUrl
                                ? <img src={u.avatarUrl} alt={u.username} style={{ width: isFirst ? 52 : 42, height: isFirst ? 52 : 42, borderRadius: "50%", objectFit: "cover", border: `2px solid ${PODIUM_COLORS[idx]}`, margin: "0 auto 6px" }} />
                                : <div style={{ width: isFirst ? 52 : 42, height: isFirst ? 52 : 42, borderRadius: "50%", background: `${PODIUM_COLORS[idx]}22`, border: `2px solid ${PODIUM_COLORS[idx]}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px", fontWeight: 800, fontSize: isFirst ? 20 : 16, color: PODIUM_COLORS[idx] }}>
                                    {(u.username?.[0] ?? "?").toUpperCase()}
                                  </div>
                              }
                              <div style={{ fontWeight: 700, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>@{u.username}</div>
                              <div style={{ color: PODIUM_COLORS[idx], fontWeight: 800, fontSize: isFirst ? 15 : 13, marginTop: 3 }}>{u.clicks}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {data.topClickers.slice(3).map((u: any) => (
                        <div key={u.id} onClick={() => setSelectedUser(u)}
                          style={{ borderRadius: 12, background: "var(--surface)", border: "1px solid var(--border)", padding: "10px 14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", transition: "border-color 0.15s" }}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(139,92,246,0.4)")}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
                        >
                          <span className="muted" style={{ fontSize: 13, fontWeight: 700, minWidth: 24, textAlign: "center" }}>#{u.rank}</span>
                          {u.avatarUrl
                            ? <img src={u.avatarUrl} alt={u.username} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid rgba(139,92,246,0.3)" }} />
                            : <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(139,92,246,0.12)", border: "2px solid rgba(139,92,246,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 700, fontSize: 14, color: "#8b5cf6" }}>
                                {(u.username?.[0] ?? "?").toUpperCase()}
                              </div>
                          }
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>@{u.username}</div>
                          </div>
                          <div style={{ fontWeight: 800, fontSize: 15, color: "#8b5cf6" }}>{u.clicks}</div>
                          <span style={{ color: "var(--muted-text)", fontSize: 14 }}>›</span>
                        </div>
                      ))}
                    </div>
                  </>
                )
              }
            </>
          )}

          {tab === "spenders" && (
            <>
              <p className="muted" style={{ marginBottom: 14, fontSize: 12 }}>Top spenders on completed orders this week. Ghost-mode users are hidden.</p>
              {(!data.topSpenders || data.topSpenders.length === 0)
                ? <p className="muted">No completed orders this week.</p>
                : (
                  <>
                    {data.topSpenders.length >= 3 && (
                      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "flex-end" }}>
                        {[1, 0, 2].map(idx => {
                          const u = data.topSpenders[idx];
                          if (!u) return null;
                          const isFirst = idx === 0;
                          return (
                            <div key={u.id}
                              style={{ flex: 1, borderRadius: 14, background: "var(--surface)", border: `1.5px solid ${PODIUM_COLORS[idx]}40`, padding: isFirst ? "16px 8px" : "12px 8px", textAlign: "center" }}
                            >
                              <div style={{ fontSize: isFirst ? 14 : 12, fontWeight: 800, color: PODIUM_COLORS[idx], marginBottom: 6 }}>{PODIUM_LABELS[idx]}</div>
                              {u.avatarUrl
                                ? <img src={u.avatarUrl} alt={u.username} style={{ width: isFirst ? 52 : 42, height: isFirst ? 52 : 42, borderRadius: "50%", objectFit: "cover", border: `2px solid ${PODIUM_COLORS[idx]}`, margin: "0 auto 6px" }} />
                                : <div style={{ width: isFirst ? 52 : 42, height: isFirst ? 52 : 42, borderRadius: "50%", background: `${PODIUM_COLORS[idx]}22`, border: `2px solid ${PODIUM_COLORS[idx]}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px", fontWeight: 800, fontSize: isFirst ? 20 : 16, color: PODIUM_COLORS[idx] }}>
                                    {(u.username?.[0] ?? "?").toUpperCase()}
                                  </div>
                              }
                              <div style={{ fontWeight: 700, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>@{u.username}</div>
                              <div style={{ color: PODIUM_COLORS[idx], fontWeight: 800, fontSize: isFirst ? 15 : 13, marginTop: 3 }}>${(u.totalCents / 100).toFixed(2)}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {data.topSpenders.slice(3).map((u: any) => (
                        <div key={u.id}
                          style={{ borderRadius: 12, background: "var(--surface)", border: "1px solid var(--border)", padding: "10px 14px", display: "flex", alignItems: "center", gap: 12 }}
                        >
                          <span className="muted" style={{ fontSize: 13, fontWeight: 700, minWidth: 24, textAlign: "center" }}>#{u.rank}</span>
                          {u.avatarUrl
                            ? <img src={u.avatarUrl} alt={u.username} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid rgba(245,158,11,0.3)" }} />
                            : <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(245,158,11,0.12)", border: "2px solid rgba(245,158,11,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 700, fontSize: 14, color: "#f59e0b" }}>
                                {(u.username?.[0] ?? "?").toUpperCase()}
                              </div>
                          }
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>@{u.username}</div>
                          </div>
                          <div style={{ fontWeight: 800, fontSize: 15, color: "#f59e0b" }}>${(u.totalCents / 100).toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )
              }
            </>
          )}
        </>
      )}

      {selectedUser && (
        <UserProfileModal
          user={selectedUser}
          currentUserId={data?.currentUserId ?? ""}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
}
