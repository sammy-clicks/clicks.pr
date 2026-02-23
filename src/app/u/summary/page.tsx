"use client";
import { useEffect, useState, useCallback } from "react";
import { Nav } from "@/components/Nav";

function fmtTime(d: string | Date) {
  return new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

// Returns ms until a given UTC date
function msUntil(d: Date) {
  return Math.max(0, d.getTime() - Date.now());
}

function formatCountdown(ms: number) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Check if current time is between 2:00am and 4:00am PR (UTC-4)
function isNightPopupTime() {
  const prMs = Date.now() - 4 * 60 * 60 * 1000;
  const h = new Date(prMs).getUTCHours();
  return h >= 2 && h < 4;
}

export default function Summary() {
  const [data, setData]           = useState<any>(null);
  const [error, setError]         = useState("");
  const [countdown, setCountdown] = useState("");
  const [popupOpen, setPopupOpen] = useState(false);
  const [buddy, setBuddy]         = useState<any>(null); // detail view for a friend
  const [buddySection, setBuddySection] = useState<"venues" | "orders" | null>(null);

  const load = useCallback(() => {
    fetch("/api/night-summary")
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setData(d);
        // Auto-show popup between 2am and 4am PR if not dismissed this session
        if (isNightPopupTime() && !sessionStorage.getItem("summary_popup_dismissed")) {
          setPopupOpen(true);
        }
      })
      .catch(() => setError("Failed to load."));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Countdown timer
  useEffect(() => {
    if (!data?.resetAt) return;
    const tick = () => setCountdown(formatCountdown(msUntil(new Date(data.resetAt))));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [data?.resetAt]);

  if (error) return <div className="container"><Nav role="u" /><p style={{ color: "#f66" }}>{error}</p></div>;
  if (!data)  return <div className="container"><Nav role="u" /><p className="muted">Loading...</p></div>;

  // Ghost mode: nothing social shown
  const ghostMode = data.me?.ghostMode;

  // Buddy detail modal
  if (buddy && buddySection) {
    return (
      <div className="container">
        <Nav role="u" />
        <div className="header" style={{ marginBottom: 8 }}>
          <button className="btn sm secondary" onClick={() => { setBuddy(null); setBuddySection(null); }}>{"<"} Back</button>
          <h3 style={{ margin: 0 }}>@{buddy.username}</h3>
        </div>

        {buddy.ghostMode ? (
          <p className="muted">This user is in ghost mode tonight.</p>
        ) : buddySection === "venues" ? (
          <>
            <h4 style={{ marginBottom: 10 }}>Venues visited</h4>
            {buddy.venuesVisited.length === 0
              ? <p className="muted">No venues visited yet tonight.</p>
              : buddy.venuesVisited.map((v: any, i: number) => (
                <div key={i} className="card" style={{ padding: "10px 14px", marginBottom: 8 }}>
                  <strong>{v.venueName}</strong>
                </div>
              ))
            }
          </>
        ) : (
          <>
            <h4 style={{ marginBottom: 10 }}>Orders tonight</h4>
            {buddy.orders.length === 0
              ? <p className="muted">No orders placed yet tonight.</p>
              : buddy.orders.map((o: any, i: number) => (
                <div key={i} className="card" style={{ padding: "10px 14px", marginBottom: 8 }}>
                  <strong>{o.venueName}</strong>
                  <div style={{ marginTop: 6 }}>
                    {o.items.map((it: any, j: number) => (
                      <div key={j} className="muted" style={{ fontSize: 13 }}>
                        {it.qty}x {it.name}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            }
          </>
        )}
      </div>
    );
  }

  const hasFriends = data.friends && data.friends.length > 0;

  return (
    <div className="container">
      {/* 2AM Popup */}
      {popupOpen && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 999, padding: 20,
        }}>
          <div className="card" style={{ maxWidth: 380, width: "100%", padding: 28, textAlign: "center" }}>
            <h3 style={{ marginBottom: 8 }}>Hey {data.me.firstName},</h3>
            <p style={{ marginBottom: 18, opacity: 0.8 }}>Here is your Clicks nightlife summary.</p>

            <div className="row" style={{ gap: 10, marginBottom: 20, justifyContent: "center", flexWrap: "wrap" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{data.checkins.length}</div>
                <div className="muted" style={{ fontSize: 12 }}>Venues</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{data.orders.length}</div>
                <div className="muted" style={{ fontSize: 12 }}>Orders</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{data.clicks}</div>
                <div className="muted" style={{ fontSize: 12 }}>Clicks</div>
              </div>
            </div>

            {data.orderRankAmongFriends === 1 && data.orders.length > 0 && (
              <div className="badge active" style={{ marginBottom: 16, display: "inline-block" }}>
                #1 on orders among your friends tonight
              </div>
            )}

            <button className="btn" style={{ width: "100%", marginBottom: 10 }}
              onClick={() => { setPopupOpen(false); sessionStorage.setItem("summary_popup_dismissed", "1"); }}>
              View more statistics
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

      {/* Personal stats */}
      <div className="row" style={{ marginBottom: 20, flexWrap: "wrap" }}>
        <div className="card" style={{ flex: "1 1 130px", textAlign: "center" }}>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{data.checkins.length}</div>
          <div className="muted" style={{ fontSize: 12 }}>Venues visited</div>
        </div>
        <div className="card" style={{ flex: "1 1 130px", textAlign: "center" }}>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{data.orders.length}</div>
          <div className="muted" style={{ fontSize: 12 }}>Orders placed</div>
          {data.orderRankAmongFriends > 0 && (
            <div className="muted" style={{ fontSize: 11, marginTop: 3 }}>
              #{data.orderRankAmongFriends} among friends
            </div>
          )}
        </div>
        <div className="card" style={{ flex: "1 1 130px", textAlign: "center" }}>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{data.clicks}</div>
          <div className="muted" style={{ fontSize: 12 }}>Clicks tonight</div>
        </div>
        <div className="card" style={{ flex: "1 1 130px", textAlign: "center" }}>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{fmt(data.totalSpentCents)}</div>
          <div className="muted" style={{ fontSize: 12 }}>Tonight spending</div>
          <div className="muted" style={{ fontSize: 10, marginTop: 2 }}>Only visible to you</div>
        </div>
      </div>

      {/* Ghost mode notice */}
      {ghostMode && (
        <div className="card" style={{ padding: "14px 16px", marginBottom: 20, borderColor: "rgba(255,200,100,0.3)", textAlign: "center" }}>
          <strong style={{ fontSize: 14 }}>You are in ghost mode.</strong>
          <p className="muted" style={{ marginTop: 6, fontSize: 13 }}>
            Social stats and friend activity are hidden while ghost mode is active.
            Disable it in Settings to see your friends&apos; activity.
          </p>
          <a href="/u/settings"><button className="btn sm secondary" style={{ marginTop: 10 }}>Go to Settings</button></a>
        </div>
      )}

      {/* Friends sections — hidden when user is in ghost mode */}
      {!ghostMode && hasFriends && (
        <>
          {/* Venues visited */}
          <h3 style={{ marginTop: 8, marginBottom: 10 }}>Venues visited</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {data.friends.map((f: any) => (
              <div key={f.friendId} className="card" style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <strong>@{f.username}</strong>
                  {f.ghostMode
                    ? <span className="muted" style={{ marginLeft: 8, fontSize: 12 }}>in ghost mode</span>
                    : <span className="muted" style={{ marginLeft: 8, fontSize: 12 }}>
                        {f.venuesVisited.length === 0 ? "No venues yet" :
                          f.venuesVisited.slice(0, 2).map((v: any) => v.venueName).join(", ")
                          + (f.venuesVisited.length > 2 ? ` +${f.venuesVisited.length - 2}` : "")}
                      </span>
                  }
                </div>
                {!f.ghostMode && f.venuesVisited.length > 0 && (
                  <button className="btn sm secondary" style={{ fontSize: 11 }}
                    onClick={() => { setBuddy(f); setBuddySection("venues"); }}>
                    Details
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Orders placed */}
          <h3 style={{ marginBottom: 10 }}>Orders placed</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {data.friends.map((f: any) => (
              <div key={f.friendId} className="card" style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <strong>@{f.username}</strong>
                  {f.ghostMode
                    ? <span className="muted" style={{ marginLeft: 8, fontSize: 12 }}>in ghost mode</span>
                    : <span className="muted" style={{ marginLeft: 8, fontSize: 12 }}>
                        {f.ordersCount} order{f.ordersCount !== 1 ? "s" : ""}
                      </span>
                  }
                </div>
                {!f.ghostMode && f.ordersCount > 0 && (
                  <button className="btn sm secondary" style={{ fontSize: 11 }}
                    onClick={() => { setBuddy(f); setBuddySection("orders"); }}>
                    Details
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Clicks tonight */}
          <h3 style={{ marginBottom: 10 }}>Clicks tonight</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {data.friends.map((f: any) => (
              <div key={f.friendId} className="card" style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <strong style={{ flex: 1 }}>@{f.username}</strong>
                <span className="muted" style={{ fontSize: 13 }}>
                  {f.ghostMode ? "ghost mode" : `${f.clicksCount} click${f.clicksCount !== 1 ? "s" : ""}`}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {!ghostMode && !hasFriends && (
        <p className="muted">Add friends on the Buddies page to see their activity here.</p>
      )}

      {/* Own checkins / orders */}
      {data.checkins.length > 0 && (
        <>
          <h3 style={{ marginBottom: 10 }}>Your venues tonight</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {data.checkins.map((c: any) => (
              <div key={c.id} className="card" style={{ padding: "10px 14px" }}>
                <strong>{c.venueName}</strong>
                <p className="muted" style={{ fontSize: 12, margin: "4px 0 0" }}>
                  {c.venueType} - In {fmtTime(c.startAt)}{c.endAt ? ` - Out ${fmtTime(c.endAt)}` : " - Active"}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      {data.checkins.length === 0 && data.orders.length === 0 && (
        <p className="muted" style={{ marginTop: 20 }}>No activity recorded yet tonight. Go check in at a venue!</p>
      )}
    </div>
  );
}
