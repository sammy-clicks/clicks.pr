"use client";
import { useEffect, useRef, useState } from "react";
import { Nav } from "@/components/Nav";

type Zone = {
  id: string; name: string; isEnabled: boolean; disabledReason?: string;
  imageUrl?: string | null;
  venues: { id: string; name: string }[];
  _count: { venues: number };
};

function DeleteModal({ zone, onCancel, onDeleted }: { zone: Zone; onCancel: () => void; onDeleted: () => void }) {
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const required = `CONFIRM delete ${zone.name}`;

  async function doDelete() {
    setErr("");
    const r = await fetch(`/api/admin/zones?id=${zone.id}`, { method: "DELETE" });
    const j = await r.json();
    if (!r.ok) { setErr(j.error + (j.venues ? `: ${j.venues.join(", ")}` : "")); return; }
    onDeleted();
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16,
    }}>
      <div style={{ background: "var(--surface,#1a1a2e)", borderRadius: 14, padding: 28, maxWidth: 460, width: "100%" }}>
        <h3 style={{ margin: "0 0 8px", color: "#f66" }}>Delete zone "{zone.name}"?</h3>
        {zone.venues.length > 0 ? (
          <>
            <p className="muted">This zone contains <strong>{zone.venues.length}</strong> venue(s). Move them to another zone before deleting:</p>
            <ul style={{ margin: "8px 0 16px", paddingLeft: 20 }}>
              {zone.venues.map(v => <li key={v.id} className="muted">{v.name}</li>)}
            </ul>
          </>
        ) : (
          <p className="muted" style={{ marginBottom: 16 }}>This zone is empty. This action is permanent.</p>
        )}
        <p className="muted" style={{ fontSize: 13 }}>Type <strong>{required}</strong> to confirm:</p>
        <input value={confirm} onChange={e => setConfirm(e.target.value)} style={{ marginTop: 6 }} autoFocus />
        {err && <p style={{ color: "#f66", fontSize: 13, marginTop: 6 }}>{err}</p>}
        <div className="row" style={{ marginTop: 14, gap: 8 }}>
          <button
            className="btn"
            style={{ background: "#c0392b" }}
            onClick={doDelete}
            disabled={confirm !== required}
          >Delete</button>
          <button className="btn secondary" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function ZonesAdmin() {
  const [data, setData] = useState<{ items: Zone[] } | null>(null);
  const [newName, setNewName] = useState("");
  const [newImage, setNewImage] = useState("");
  const [reason, setReason] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editImage, setEditImage] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Zone | null>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const editImgRef = useRef<HTMLInputElement>(null);

  async function load() {
    const r = await fetch("/api/admin/zones");
    setData(await r.json());
  }
  useEffect(() => { load(); }, []);

  function pickImage(file: File, onDone: (url: string) => void) {
    const reader = new FileReader();
    reader.onload = ev => {
      const src = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const MAX = 800;
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width  = Math.round(img.width  * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        onDone(canvas.toDataURL("image/jpeg", 0.80));
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }

  async function create() {
    if (!newName.trim()) return;
    setCreating(true); setMsg("");
    const r = await fetch("/api/admin/zones", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), imageUrl: newImage || undefined }),
    });
    const j = await r.json();
    setCreating(false);
    if (!r.ok) { setMsg(j.error || "Failed"); return; }
    setNewName(""); setNewImage(""); await load();
  }

  async function toggle(id: string, isEnabled: boolean, disabledReason?: string) {
    await fetch("/api/admin/zones", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, isEnabled, disabledReason }),
    });
    await load();
  }

  async function rename(id: string) {
    if (!editName.trim()) return;
    setMsg("");
    const r = await fetch("/api/admin/zones", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, name: editName.trim(), imageUrl: editImage || null }),
    });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error || "Failed"); return; }
    setEditingId(null); setEditName(""); setEditImage(""); await load();
  }

  function startEdit(z: Zone) { setEditingId(z.id); setEditName(z.name); setEditImage(z.imageUrl || ""); }

  if (!data) return <div className="container"><Nav role="admin" /><p className="muted">Loading…</p></div>;

  const enabled = data.items.filter(z => z.isEnabled);
  const disabled = data.items.filter(z => !z.isEnabled);

  return (
    <div className="container">
      {deleteTarget && (
        <DeleteModal
          zone={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onDeleted={() => { setDeleteTarget(null); load(); }}
        />
      )}

      <h2>Zones ({data.items.length})</h2>
      <Nav role="admin" />

      {/* Create zone */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 12px" }}>Add new zone</h3>
        <div className="row" style={{ alignItems: "flex-end", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label>Zone name</label>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && create()}
              placeholder="e.g. Santurce Arts District"
            />
          </div>
          <button className="btn" onClick={create} disabled={creating || !newName.trim()}>
            {creating ? "Creating..." : "Create zone"}
          </button>
        </div>
        {/* Zone photo */}
        <div style={{ marginTop: 12 }}>
          <label style={{ marginTop: 0 }}>Zone photo (optional)</label>
          {newImage ? (
            <div style={{ position: "relative", marginBottom: 8, display: "inline-block" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={newImage} alt="" style={{ width: "100%", maxWidth: 320, height: 120, objectFit: "cover", borderRadius: 10 }} />
              <button onClick={() => setNewImage("")} style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.6)", border: "none", borderRadius: 6, color: "#fff", fontSize: 12, padding: "3px 8px", cursor: "pointer" }}>Remove</button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn sm secondary" onClick={() => { imgRef.current?.setAttribute("capture","environment"); imgRef.current?.click(); }}>Take Photo</button>
              <button className="btn sm secondary" onClick={() => { imgRef.current?.removeAttribute("capture"); imgRef.current?.click(); }}>Upload Photo</button>
            </div>
          )}
          <input ref={imgRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) pickImage(f, setNewImage); e.target.value = ""; }} />
        </div>
        {msg && <p className="muted" style={{ color: "var(--error,#f66)", marginTop: 6 }}>{msg}</p>}
      </div>

      {/* Enabled zones */}
      <h3>Enabled ({enabled.length})</h3>
      <table>
        <thead><tr><th>Zone</th><th>Venues</th><th>Action</th><th>Disable reason</th></tr></thead>
        <tbody>
          {enabled.map(z => (
            <tr key={z.id}>
              <td>
                {editingId === z.id ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div className="row" style={{ gap: 6 }}>
                      <input value={editName} onChange={e => setEditName(e.target.value)} style={{ flex: 1, minWidth: 160 }}
                        onKeyDown={e => e.key === "Enter" && rename(z.id)} autoFocus />
                      <button className="btn sm" onClick={() => rename(z.id)}>Save</button>
                      <button className="btn sm secondary" onClick={() => setEditingId(null)}>&#x2715;</button>
                    </div>
                    {editImage ? (
                      <div style={{ position: "relative", display: "inline-block" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={editImage} alt="" style={{ width: 160, height: 70, objectFit: "cover", borderRadius: 8 }} />
                        <button onClick={() => setEditImage("")} style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.6)", border: "none", borderRadius: 4, color: "#fff", fontSize: 11, padding: "2px 6px", cursor: "pointer" }}>Remove</button>
                      </div>
                    ) : (
                      <button className="btn sm secondary" style={{ width: "fit-content" }}
                        onClick={() => { editImgRef.current?.removeAttribute("capture"); editImgRef.current?.click(); }}>
                        Add Photo
                      </button>
                    )}
                    <input ref={editImgRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) pickImage(f, setEditImage); e.target.value = ""; }} />
                  </div>
                ) : (
                  <div className="row" style={{ gap: 8, alignItems: "center" }}>
                    {z.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={z.imageUrl} alt="" style={{ width: 44, height: 30, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />
                    )}
                    <strong>{z.name}</strong>
                    <button className="btn sm secondary" style={{ padding: "2px 8px", fontSize: 11 }} onClick={() => startEdit(z)}>Edit</button>
                    <button className="btn sm" style={{ padding: "2px 8px", fontSize: 11, background: "#c0392b" }} onClick={() => setDeleteTarget(z)}>Delete</button>
                  </div>
                )}
              </td>
              <td>{z._count?.venues ?? "—"}</td>
              <td>
                <button className="btn secondary" onClick={() => toggle(z.id, false, reason[z.id] || undefined)}>Disable</button>
              </td>
              <td>
                <input
                  value={reason[z.id] ?? ""}
                  onChange={e => setReason(r => ({ ...r, [z.id]: e.target.value }))}
                  placeholder="Optional reason"
                  style={{ minWidth: 200 }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Disabled zones */}
      {disabled.length > 0 && (
        <>
          <h3 style={{ marginTop: 24 }}>Disabled ({disabled.length})</h3>
          <table>
            <thead><tr><th>Zone</th><th>Venues</th><th>Reason</th><th>Action</th></tr></thead>
            <tbody>
              {disabled.map(z => (
                <tr key={z.id}>
                  <td>
                    {editingId === z.id ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div className="row" style={{ gap: 6 }}>
                          <input value={editName} onChange={e => setEditName(e.target.value)} style={{ flex: 1, minWidth: 160 }}
                            onKeyDown={e => e.key === "Enter" && rename(z.id)} autoFocus />
                          <button className="btn sm" onClick={() => rename(z.id)}>Save</button>
                          <button className="btn sm secondary" onClick={() => setEditingId(null)}>&#x2715;</button>
                        </div>
                        {editImage ? (
                          <div style={{ position: "relative", display: "inline-block" }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={editImage} alt="" style={{ width: 160, height: 70, objectFit: "cover", borderRadius: 8 }} />
                            <button onClick={() => setEditImage("")} style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.6)", border: "none", borderRadius: 4, color: "#fff", fontSize: 11, padding: "2px 6px", cursor: "pointer" }}>Remove</button>
                          </div>
                        ) : (
                          <button className="btn sm secondary" style={{ width: "fit-content" }}
                            onClick={() => { editImgRef.current?.removeAttribute("capture"); editImgRef.current?.click(); }}>
                            Add Photo
                          </button>
                        )}
                        <input ref={editImgRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) pickImage(f, setEditImage); e.target.value = ""; }} />
                      </div>
                    ) : (
                      <div className="row" style={{ gap: 8, alignItems: "center" }}>
                        {z.imageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={z.imageUrl} alt="" style={{ width: 44, height: 30, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />
                        )}
                        {z.name}
                        <button className="btn sm secondary" style={{ padding: "2px 8px", fontSize: 11 }} onClick={() => startEdit(z)}>Edit</button>
                        <button className="btn sm" style={{ padding: "2px 8px", fontSize: 11, background: "#c0392b" }} onClick={() => setDeleteTarget(z)}>Delete</button>
                      </div>
                    )}
                  </td>
                  <td>{z._count?.venues ?? "—"}</td>
                  <td className="muted">{z.disabledReason || "—"}</td>
                  <td><button className="btn" onClick={() => toggle(z.id, true)}>Enable</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
