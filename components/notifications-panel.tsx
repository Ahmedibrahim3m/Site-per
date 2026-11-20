"use client";
import { useEffect, useState } from "react";
import { Bell, CheckCheck, ChevronRight, X } from "lucide-react";
import { apiJson, jsonRequest } from "@/lib/client-api";

type Notice = { id: string; title: string; message: string; kind: string; readAt: string | null; createdAt: string; order: { reference: string } | null };
export default function NotificationsPanel({ compact = false }: { compact?: boolean }) {
  const [items, setItems] = useState<Notice[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const unread = items.filter(item => !item.readAt).length;
  async function load() {
    try { const result = await apiJson<{ notifications: Notice[] }>("/api/notifications"); setItems(result.notifications); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Notifications unavailable"); }
  }
  useEffect(() => { void load(); }, []);
  async function markAll() {
    try { await apiJson("/api/notifications", jsonRequest("PATCH", { markAll: true })); setItems(old => old.map(item => ({ ...item, readAt: item.readAt || new Date().toISOString() }))); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not update notifications"); }
  }
  async function markOne(item: Notice) {
    if (!item.readAt) {
      try { await apiJson("/api/notifications", jsonRequest("PATCH", { id: item.id })); setItems(old => old.map(x => x.id === item.id ? { ...x, readAt: new Date().toISOString() } : x)); }
      catch { /* Keep the notification visible if marking read fails. */ }
    }
    if (item.order?.reference) window.location.assign(`/order/${encodeURIComponent(item.order.reference)}`);
  }
  return <div className={`notification-center ${compact ? "compact" : ""}`}>
    <button type="button" className="icon-button notification-trigger noire-control noire-control-circle" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} aria-expanded={open} onClick={() => { setOpen(value => !value); if (!open) void load(); }}>
      <Bell size={18}/>{unread > 0 && <span className="notification-count">{unread > 9 ? "9+" : unread}</span>}
    </button>
    {open && <div className="notification-popover" role="dialog" aria-label="Notifications">
      <header><div><strong>Notifications</strong><small>{unread} unread</small></div><div className="notification-actions">{unread > 0 && <button type="button" onClick={() => void markAll()} aria-label="Mark all as read"><CheckCheck size={16}/></button>}<button type="button" onClick={() => setOpen(false)} aria-label="Close notifications"><X size={16}/></button></div></header>
      {error && <p className="error">{error}</p>}<button type="button" className="notification-open-center" onClick={()=>{window.dispatchEvent(new CustomEvent("noire-admin-tab",{detail:"notifications"}));setOpen(false);}}>OPEN NOTIFICATION CENTER →</button>
      <div className="notification-list">{items.map(item => <button type="button" className={`notification-item ${item.readAt ? "read" : "unread"}`} key={item.id} onClick={() => void markOne(item)}>
        <span className="notification-dot"/><span className="notification-copy"><strong>{item.title}</strong><small>{item.message}</small><time>{new Date(item.createdAt).toLocaleString("en-EG", { dateStyle: "medium", timeStyle: "short" })}</time></span><ChevronRight size={15}/>
      </button>)}{!items.length && !error && <p className="notification-empty">You're all caught up.</p>}</div>
    </div>}
  </div>;
}
