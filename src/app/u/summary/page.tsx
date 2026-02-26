"use client";
import { useEffect, useState, useCallback } from "react";
import { Nav } from "@/components/Nav";

function fmtTime(d: string | Date) {
  return new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}
function fmt(cents: number) { return `$${(cents / 100).toFixed(2)}`; }
function msUntil(d: Date) { return Math.max(0, d.getTime() - Date.now()); }
function formatCountdown(ms: number) {
  const total = Math.floor(ms / 1000);
  return `${String(Math.floor(total / 3600)).padStart(2, "0")}:${String(Math.floor((total % 3600) / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
function isNightPopupTime() {
  const h = new Date(Date.now() - 4 * 60 * 60 * 1000).getUTCHours();
  return h >= 2 && h < 4;
}

function FriendSheet({ friend, onClose }: { friend: any; onClose: () => void }) {
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 2000 }} />
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 2001,
        background: "var(--surface)", borderRadius: "20px 20px 0 0",
        padding: "24px 20px 40px", maxHeight: "78vh", overflowY: "auto",
        boxShadow: "0 -8px 48px rgba(0,0,0,0.5)",
      }}>
        {/* drag handle */}
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)", margin: "0 auto 20px" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          {friend.avatarUrl
            ? <img src={friend.avatarUrl} alt={friend.username}
                style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(139,92,246,0.5)", flexShrink: 0 }} />
            : <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(139,92,246,0.15)", border: "2px solid rgba(139,92,246,0.4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 800, fontSize: 20, color: "#8b5cf6" }}>
                {(friend.username?.[0] ?? "?").toUpperCase()}
              </div>
          }
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 17 }}>@{friend.username}</div>
            {friend.ghostMode && <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>👻 In ghost mode tonight</div>}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted-text)", fontSize: 22, cursor: "pointer", padding: 4 }}>✕</button>
        </div>

        {friend.ghostMode ? (
          <p className="muted" style={{ textAlign: "center", paddingBottom: 12 }}>Activity hidden — ghost mode on.</p>
        ) : (
          <>
            {friend.venuesVisited.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-text)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Venues Tonight</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {friend.venuesVisited.map((v: any, i: number) => (
                    <div key={i} style={{ padding: "10px 14px", borderRadius: 10, background: "var(--bg, #080c12)", border: "1px solid var(--border)", fontSize: 13, fontWeight: 600 }}>
                      📍 {v.venueName}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {friend.orders.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-text)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Orders Tonight</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {friend.orders.map((o: any, i: number) => (
                    <div key={i} style={{ padding: "10px 14px", borderRadius: 10, background: "var(--bg, #080c12)", border: "1px solid var(--border)" }}>
                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 5 }}>🍹 {o.venueName}</div>
                      {o.items.map((it: any, j: number) => (
                        <div key={j} className="muted" style={{ fontSize: 12 }}>{it.qty}× {it.name}</div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {friend.venuesVisited.length === 0 && friend.orders.length === 0 && (
              <p className="muted" style={{ textAlign: "center" }}>No activity yet tonight.</p>
            )}
          </>
        )}
      </div>
    </>
  );
}

export default function Summary() {
  const [data, setData]           = useState<any>(null);
  const [error, setError]         = useState("");
  const [countdown, setCountdown] = useState("");
  const [popupOpen, setPopupOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);

  const load = useCallback(() => {
    fetch("/api/night-summary")
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setData(d);
        if (isNightPopupTime() && !sessionStorage.getItem("summary_popup_dismissed")) {
          setPopupOpen(true);
        }
      })
      .catch(() => setError("Failed to load."));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!data?.resetAt) return;
    const tick = () => setCountdown(formatCountdown(msUntil(new Date(data.resetAt))));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [data?.resetAt]);

  if (error) return <div className="container"><Nav role="u" /><p style={{ color: "#f66" }}>{error}</p></div>;
  if (!data)  return <div className="container"><Nav role="u" /><p className="muted">Loading...</p></div>;

  const ghostMode = data.me?.ghostMode;
  const hasFriends = data.friends && data.friends.length > 0;
  const visibleFriends = hasFriends ? data.friends.filter((f: any) => !f.ghostMode) : [];
  const ghostFriends   = hasFriends ? data.friends.filter((f: any) => f.ghostMode)  : [];

  return (
    <div className="container" style={{ paddingBottom: 40 }}>
      {/* 2AM Popup */}
      {popupOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 20 }}>
          <div className="card" style={{ maxWidth: 360, width: "100%", padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🌙</div>
            <h3 style={{ marginBottom: 6 }}>Hey {data.me?.firstName},</h3>
            <p style={{ marginBottom: 20, opacity: 0.75, fontSize: 14 }}>Here's your Clicks night summary.</p>
            <div style={{ display: "flex", justifyContent: "center", gap: 20, marginBottom: 20 }}>
              {[
                { v: data.distinctVenueCount, l: "Venues" },
                { v: data.orders.length,       l: "Orders" },
                { v: data.clicks,               l: "Clicks" },
              ].map(s => (
                <div key={s.l} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 30, fontWeight: 800 }}>{s.v}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{s.l}</div>
                </div>
              ))}
            </div>
            {data.orderRankAmongFriends === 1 && data.orders.length > 0 && (
              <div className="badge active" style={{ marginBottom: 14, display: "inline-block" }}>#1 orders among friends tonight 🏆</div>
            )}
            <button className="btn" style={{ width: "100%", marginBottom: 8 }}
              onClick={() => { setPopupOpen(false); sessionStorage.setItem("summary_popup_dismissed", "1"); }}>
              View full summary
            </button>
            <button className="btn secondary" style={{ width: "100%" }}
              onClick={() => { setPopupOpen(false); sessionStorage.setItem("summary_popup_dismissed", "1"); }}>
              Close
            </button>
          </div>
        </div>
      )}

      <div className="header">
        <h2>Night Summary</h2>
        <div style={{ textAlign: "right" }}>
          <div className="badge">Since {fmtTime(data.nightStart)}</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            Resets in {countdown || "..."}
          </div>
        </div>
      </div>
      <Nav role="u" />

      {/* ── Personal hero stats ── */}
      <div style={{
        borderRadius: 20, marginBottom: 20, overflow: "hidden",
        background: "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(8,218,244,0.06))",
        border: "1px solid rgba(139,92,246,0.25)",
      }}>
        <div style={{ padding: "18px 20px 14px" }}>
          <div style={{ display: "flex", gap: 0, textAlign: "center" }}>
            {[
              { value: data.distinctVenueCount, label: "Venues", color: "#8b5cf6" },
              { value: data.orders.length,       label: "Orders",  color: "#22c55e" },
              { value: data.clicks,               label: "Clicks",  color: "#08daf4" },
            ].map((s, i, arr) => (
              <div key={s.label} style={{ flex: 1, borderRight: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none", paddingBottom: 4 }}>
                <div style={{ fontSize: 30, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{s.label}</div>
                {s.label === "Orders" && data.orderRankAmongFriends > 0 && (
                  <div className="muted" style={{ fontSize: 10, marginTop: 2 }}>#{data.orderRankAmongFriends} in friends</div>
                )}
              </div>
            ))}
          </div>
        </div>
        {/* Spending — private */}
        <div style={{ padding: "10px 20px 14px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="muted" style={{ fontSize: 13 }}>Tonight spending</span>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontWeight: 800, fontSize: 16, color: "#f59e0b" }}>{fmt(data.totalSpentCents)}</span>
            <div className="muted" style={{ fontSize: 10, marginTop: 1 }}>Private — only visible to you</div>
          </div>
        </div>
      </div>

      {/* Ghost mode notice */}
      {ghostMode && (
        <div style={{ padding: "14px 16px", borderRadius: 14, marginBottom: 20, background: "rgba(255,200,100,0.06)", border: "1px solid rgba(255,200,100,0.2)", textAlign: "center" }}>
          <strong style={{ fontSize: 14 }}>You&apos;re in ghost mode.</strong>
          <p className="muted" style={{ marginTop: 6, fontSize: 13, marginBottom: 10 }}>
            Friend activity is hidden while ghost mode is on. Disable it in Settings.
          </p>
          <a href="/u/settings"><button className="btn sm secondary">Go to Settings</button></a>
        </div>
      )}

      {/* ── Friends activity ── */}
      {!ghostMode && hasFriends && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 800 }}>
            Friends Tonight
            <span className="muted" style={{ fontWeight: 400, fontSize: 13, marginLeft: 8 }}>
              {visibleFriends.length} active{ghostFriends.length > 0 ? `, ${ghostFriends.length} ghost` : ""}
            </span>
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.friends.map((f: any) => {
              const isGhost = f.ghostMode;
              return (
                <div key={f.friendId}
                  onClick={() => !isGhost && setSelectedFriend(f)}
                  style={{
                    borderRadius: 14, background: "var(--surface)", border: "1px solid var(--border)",
                    padding: "12px 14px", display: "flex", alignItems: "center", gap: 12,
                    cursor: isGhost ? "default" : "pointer", opacity: isGhost ? 0.55 : 1,
                    transition: "border-color 0.15s",
                  }}
                  onMouseEnter={e => { if (!isGhost) e.currentTarget.style.borderColor = "rgba(139,92,246,0.4)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
                >
                  {/* Avatar */}
                  {f.avatarUrl
                    ? <img src={f.avatarUrl} alt={f.username}
                        style={{ width: 42, height: 42, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid rgba(139,92,246,0.35)" }} />
                    : <div style={{ width: 42, height: 42, borderRadius: "50%", background: "rgba(139,92,246,0.12)", border: "2px solid rgba(139,92,246,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 800, fontSize: 16, color: "#8b5cf6" }}>
                        {(f.username?.[0] ?? "?").toUpperCase()}
                      </div>
                  }

                  {/* Name */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>@{f.username}</div>
                    {isGhost
                      ? <div className="muted" style={{ fontSize: 11, marginTop: 1 }}>👻 ghost mode</div>
                      : <div style={{ display: "flex", gap: 10, marginTop: 3, flexWrap: "wrap" }}>
                          <span className="muted" style={{ fontSize: 11 }}>📍 {f.venuesVisited.length} venue{f.venuesVisited.length !== 1 ? "s" : ""}</span>
                          <span className="muted" style={{ fontSize: 11 }}>🍹 {f.ordersCount} order{f.ordersCount !== 1 ? "s" : ""}</span>
                          <span className="muted" style={{ fontSize: 11 }}>🖱️ {f.clicksCount} click{f.clicksCount !== 1 ? "s" : ""}</span>
                        </div>
                    }
                  </div>

                  {!isGhost && (f.venuesVisited.length > 0 || f.ordersCount > 0) && (
                    <span style={{ color: "var(--muted-text)", fontSize: 16 }}>›</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!ghostMode && !hasFriends && (
        <div style={{ padding: "20px 16px", borderRadius: 14, marginBottom: 20, textAlign: "center", background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
          <p className="muted" style={{ marginBottom: 12, fontSize: 14 }}>Add buddies to see their activity here.</p>
          <a href="/u/buddies"><button className="btn sm" style={{ fontWeight: 700 }}>Find Friends</button></a>
        </div>
      )}

      {/* ── My venues tonight ── */}
      {data.checkins.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 800 }}>My Venues Tonight</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.checkins.map((c: any) => (
              <div key={c.id} style={{ borderRadius: 14, background: "var(--surface)", border: "1px solid var(--border)", padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(8,218,244,0.1)", border: "1px solid rgba(8,218,244,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 18 }}>
                  📍
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{c.venueName}</div>
                  <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                    {c.venueType} · In {fmtTime(c.startAt)}{c.endAt ? ` · Out ${fmtTime(c.endAt)}` : " · Active now"}
                  </div>
                </div>
                {!c.endAt && (
                  <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e", fontWeight: 700 }}>Active</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.checkins.length === 0 && data.orders.length === 0 && !ghostMode && (
        <div style={{ textAlign: "center", padding: "32px 16px" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🌃</div>
          <p className="muted" style={{ marginBottom: 16 }}>No activity yet tonight. Head out and check in!</p>
          <a href="/u/zones"><button className="btn" style={{ fontWeight: 700, padding: "10px 24px" }}>Find a Venue</button></a>
        </div>
      )}

      {/* Friend detail bottom sheet */}
      {selectedFriend && (
        <FriendSheet friend={selectedFriend} onClose={() => setSelectedFriend(null)} />
      )}
    </div>
  );
}
