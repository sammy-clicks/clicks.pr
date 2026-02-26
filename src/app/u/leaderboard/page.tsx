"use client";
import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";

const PODIUM_COLORS = ["#f59e0b", "#94a3b8", "#cd7c54"];
const PODIUM_LABELS = ["1st", "2nd", "3rd"];
const PERIODS = [
  { key: "24h",      label: "24h" },
  { key: "7d",       label: "7d" },
  { key: "30d",      label: "30d" },
  { key: "lifetime", label: "All Time" },
] as const;
type Period = typeof PERIODS[number]["key"];

function Avatar({ user, size = 40, color }: { user: any; size?: number; color?: string }) {
  const c = color ?? "#8b5cf6";
  return user.avatarUrl
    ? <img src={user.avatarUrl} alt={user.username}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover",
          border: `2px solid ${c}`, flexShrink: 0 }} />
    : <div style={{ width: size, height: size, borderRadius: "50%",
        background: `${c}22`, border: `2px solid ${c}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 800, fontSize: size * 0.4, color: c, flexShrink: 0 }}>
        {(user.username?.[0] ?? "?").toUpperCase()}
      </div>;
}

function AddBuddyBtn({ user, currentUserId }: { user: any; currentUserId: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  if (user.id === currentUserId) return null;
  if (status === "sent") return <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 700 }}>Request sent ✓</span>;
  if (status === "error") return <span style={{ fontSize: 11, color: "#f87171" }}>Failed</span>;
  return (
    <button
      disabled={status === "sending"}
      style={{ fontSize: 11, padding: "4px 12px", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.4)", color: "#c4b5fd", borderRadius: 8, cursor: "pointer" }}
      onClick={async e => {
        e.stopPropagation();
        setStatus("sending");
        const r = await fetch("/api/buddies", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ username: user.username }),
        });
        setStatus(r.ok ? "sent" : "error");
      }}>
      {status === "sending" ? "…" : "+ Buddy"}
    </button>
  );
}

export default function Leaderboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("7d");
  const [tab, setTab] = useState<"clickers" | "spenders">("clickers");

  async function load(p: Period = period) {
    setLoading(true);
    const r = await fetch(`/api/leaderboard?period=${p}`);
    const j = await r.json();
    setData(j);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function changePeriod(p: Period) {
    setPeriod(p);
    load(p);
  }

  const list = tab === "clickers" ? (data?.topClickers ?? []) : (data?.topSpenders ?? []);
  const currentUserId = data?.currentUserId ?? "";
  const periodLabel = PERIODS.find(p => p.key === period)?.label ?? "7d";

  return (
    <div className="container" style={{ paddingBottom: 40 }}>
      <div className="header">
        <h2>Leaderboard</h2>
        <button className="btn secondary" onClick={() => load()} disabled={loading} style={{ padding: "6px 10px" }}>↺</button>
      </div>
      <Nav role="u" />

      {/* ── Live Zones ── */}
      {data?.topZones?.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 800 }}>🔥 Live Right Now — Top Zones</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.topZones.map((z: any, i: number) => {
              const maxCrowd = data.topZones[0]?.crowd || 1;
              const pct = Math.max(5, Math.round((z.crowd / maxCrowd) * 100));
              const accent = i === 0 ? "#f59e0b" : i === 1 ? "#94a3b8" : "#8b5cf6";
              return (
                <div key={z.id} style={{ borderRadius: 14, background: "var(--surface)", border: "1px solid var(--border)", overflow: "hidden", display: "flex", alignItems: "center" }}>
                  <div style={{ width: 4, alignSelf: "stretch", background: accent, flexShrink: 0 }} />
                  {z.imageUrl
                    ? <img src={z.imageUrl} alt={z.name} style={{ width: 52, height: 52, objectFit: "cover", flexShrink: 0, margin: "0 0 0 10px", borderRadius: 8 }} />
                    : <div style={{ width: 52, height: 52, background: `${accent}18`, flexShrink: 0, margin: "0 0 0 10px", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>📍</div>
                  }
                  <div style={{ flex: 1, padding: "10px 14px", minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 5 }}>#{i + 1} {z.name}</div>
                    <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: accent, borderRadius: 3, transition: "width 0.4s" }} />
                    </div>
                    <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{z.crowd} active · {z.venueCount} venue{z.venueCount !== 1 ? "s" : ""}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Period Selector ── */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 4, width: "fit-content" }}>
        {PERIODS.map(p => (
          <button key={p.key}
            onClick={() => changePeriod(p.key)}
            disabled={loading}
            style={{
              padding: "6px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700,
              border: "none", cursor: "pointer",
              background: period === p.key ? "var(--accent)" : "transparent",
              color: period === p.key ? "#000" : "var(--muted-text)",
              transition: "background 0.15s, color 0.15s",
            }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* ── Tab switcher ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {(["clickers", "spenders"] as const).map(t => (
          <button key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: "10px 0", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer",
              border: "1.5px solid var(--border)",
              background: tab === t ? "var(--accent)" : "var(--surface)",
              color: tab === t ? "#000" : "var(--ink)",
              transition: "all 0.15s",
            }}>
            {t === "clickers" ? "🖱️ Top Clickers" : "💸 Top Spenders"}
          </button>
        ))}
      </div>

      {loading && !data && <p className="muted" style={{ textAlign: "center", padding: "40px 0" }}>Loading…</p>}
      {loading && data && <p className="muted" style={{ textAlign: "center", fontSize: 12, marginBottom: 12 }}>Updating…</p>}

      {data && (
        <>
          {/* Invitational CTA banner */}
          {list.length > 0 && (
            <div style={{
              padding: "14px 18px", borderRadius: 16, marginBottom: 20,
              background: "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(8,218,244,0.06))",
              border: "1px solid rgba(139,92,246,0.25)",
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
            }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 3 }}>
                  {tab === "clickers" ? "Can you reach #1?" : "Who's spending the most?"}
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {tab === "clickers"
                    ? `Top clicker hit ${list[0]?.clicks ?? 0} click${list[0]?.clicks !== 1 ? "s" : ""} in ${periodLabel}. Challenge your friends!`
                    : `Top spender dropped $${((list[0]?.totalCents ?? 0) / 100).toFixed(0)} in ${periodLabel}. Are you on the board?`}
                </div>
              </div>
              <a href="/u/zones" style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", textDecoration: "none", whiteSpace: "nowrap" }}>
                Go Out Tonight →
              </a>
            </div>
          )}

          {list.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 24px" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
              <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>No data yet for {periodLabel}</div>
              <p className="muted" style={{ marginBottom: 20 }}>
                Be the first! Head out, check in at a venue, and start{tab === "clickers" ? " clicking" : " spending"}.
              </p>
              <a href="/u/zones">
                <button className="btn" style={{ padding: "12px 28px", fontWeight: 700 }}>Find a Venue</button>
              </a>
            </div>
          ) : (
            <>
              {/* Podium — top 3 */}
              {list.length >= 2 && (
                <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "flex-end", padding: "0 4px" }}>
                  {[1, 0, 2].map(idx => {
                    const u = list[idx];
                    if (!u) return <div key={idx} style={{ flex: 1 }} />;
                    const isFirst = idx === 0;
                    const c = PODIUM_COLORS[idx];
                    const value = tab === "clickers"
                      ? `${u.clicks} clicks`
                      : `$${(u.totalCents / 100).toFixed(0)}`;
                    return (
                      <div key={u.id} style={{
                        flex: 1, borderRadius: 16,
                        background: isFirst
                          ? `linear-gradient(160deg, ${c}18, ${c}08)`
                          : "var(--surface)",
                        border: `1.5px solid ${c}${isFirst ? "60" : "30"}`,
                        padding: isFirst ? "20px 8px 16px" : "14px 8px 12px",
                        textAlign: "center",
                        boxShadow: isFirst ? `0 4px 24px ${c}20` : "none",
                      }}>
                        <div style={{ fontSize: isFirst ? 13 : 11, fontWeight: 800, color: c, marginBottom: 8 }}>
                          {PODIUM_LABELS[idx]}
                        </div>
                        <div style={{ display: "flex", justifyContent: "center", marginBottom: 8, position: "relative" }}>
                          <Avatar user={u} size={isFirst ? 56 : 44} color={c} />
                          {isFirst && <span style={{ position: "absolute", top: -10, right: "50%", transform: "translateX(50%)", fontSize: 18 }}>👑</span>}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 4 }}>@{u.username}</div>
                        <div style={{ color: c, fontWeight: 800, fontSize: isFirst ? 15 : 13 }}>{value}</div>
                        <div style={{ marginTop: 8 }}>
                          <AddBuddyBtn user={u} currentUserId={currentUserId} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Rank 4+ list */}
              {list.length > 3 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {list.slice(3).map((u: any, i: number) => {
                    const value = tab === "clickers"
                      ? `${u.clicks}`
                      : `$${(u.totalCents / 100).toFixed(2)}`;
                    const valueColor = tab === "clickers" ? "#8b5cf6" : "#f59e0b";
                    return (
                      <div key={u.id} style={{
                        borderRadius: 12, background: "var(--surface)", border: "1px solid var(--border)",
                        padding: "10px 14px", display: "flex", alignItems: "center", gap: 12,
                        transition: "border-color 0.15s",
                      }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(139,92,246,0.4)")}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
                      >
                        <span className="muted" style={{ fontSize: 14, fontWeight: 700, minWidth: 28, textAlign: "center" }}>#{i + 4}</span>
                        <Avatar user={u} size={36} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>@{u.username}</div>
                        </div>
                        <div style={{ fontWeight: 800, fontSize: 15, color: valueColor }}>{value}</div>
                        <AddBuddyBtn user={u} currentUserId={currentUserId} />
                      </div>
                    );
                  })}
                </div>
              )}

              <p className="muted" style={{ fontSize: 11, textAlign: "center", marginTop: 16 }}>
                Ghost-mode users are hidden · period: {periodLabel}
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
