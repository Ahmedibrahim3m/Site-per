"use client";
import { useEffect, useState, type FormEvent } from "react";
import { Check, Pencil, Plus, RefreshCcw, Truck, X, Search, MapPin, Link2, ExternalLink } from "lucide-react";
import { apiJson, jsonRequest } from "@/lib/client-api";

type Carrier = { id: string; name: string; contactPhone: string; website: string; trackingUrl: string; notes: string; active: boolean; requiresTracking: boolean; coverageZoneCodes:string; };
type Draft = Omit<Carrier, "id" | "coverageZoneCodes"> & {coverageZones:string[]};
const empty: Draft = { name: "", contactPhone: "", website: "", trackingUrl: "", notes: "", active: true, requiresTracking: true, coverageZones:[] };
export default function ShippingCompaniesManager() {
  const [items, setItems] = useState<Carrier[]>([]);
  const [draft, setDraft] = useState<Draft>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editorOpen,setEditorOpen]=useState(false),[search,setSearch]=useState(""),[statusFilter,setStatusFilter]=useState("all");
  const [zones,setZones]=useState<{code:string;name:string}[]>([]);
  async function load() {
    setLoading(true); setError("");
    try { const result = await apiJson<{ carriers: Carrier[] }>("/api/admin/carriers"); setItems(result.carriers); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load shipping companies"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); apiJson<{zones:{code:string;name:string}[]}>("/api/admin/shipping").then(r=>setZones(r.zones)).catch(()=>{}); }, []);
  const visibleItems=items.filter(item=>`${item.name} ${item.contactPhone} ${item.website}`.toLowerCase().includes(search.toLowerCase())&&(statusFilter==="all"||(statusFilter==="active"?item.active:!item.active)));
  const trackingPreview=draft.trackingUrl.includes("{trackingNumber}")?draft.trackingUrl.replaceAll("{trackingNumber}","EXAMPLE123"):"";
  const isPreviewValid=(()=>{try{const url=new URL(trackingPreview);return url.protocol==="https:"&&Boolean(url.host);}catch{return false;}})();
  function edit(item: Carrier) { setEditing(item.id); let coverageZones:string[]=[];try{const parsed=JSON.parse(item.coverageZoneCodes||"[]");if(Array.isArray(parsed))coverageZones=parsed;}catch{} setDraft({ name: item.name, contactPhone: item.contactPhone, website: item.website, trackingUrl: item.trackingUrl, notes: item.notes, active: item.active, requiresTracking: item.requiresTracking, coverageZones });setEditorOpen(true); }
  function reset() { setEditing(null); setDraft(empty);setEditorOpen(false); }
  async function save(event: FormEvent) {
    event.preventDefault(); if(draft.trackingUrl&&!isPreviewValid){setError("Tracking template must be HTTPS and include {trackingNumber}.");return;} setBusy(true); setError(""); setNotice("");
    try {
      await apiJson(editing ? `/api/admin/carriers/${editing}` : "/api/admin/carriers", jsonRequest(editing ? "PATCH" : "POST", draft));
      setNotice(editing ? "Shipping company updated." : "Shipping company added."); reset(); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save shipping company"); }
    finally { setBusy(false); }
  }
  async function toggle(item: Carrier) {
    setBusy(true); setError(""); setNotice("");
    try {
      await apiJson(`/api/admin/carriers/${item.id}`, jsonRequest("PATCH", { ...item, active: !item.active, coverageZones: (() => { try { return JSON.parse(item.coverageZoneCodes || "[]"); } catch { return []; } })() }));
      setNotice(`${item.name} ${item.active ? "deactivated" : "activated"}.`); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update company"); }
    finally { setBusy(false); }
  }
  return <section className="shipping-companies-manager">
    <div className="admin-section-head"><div><p className="eyebrow">NOIRÉ DELIVERY NETWORK</p><h2>Shipping companies</h2><p>Maintain the couriers NOIRÉ works with. Active companies appear in the order-management selector.</p></div><button className="btn btn-outline" onClick={() => void load()} disabled={loading}><RefreshCcw size={15}/> REFRESH</button></div>
    {error && <p className="admin-alert" role="alert">{error}</p>}{notice && <p className="admin-notice" role="status"><Check size={16}/>{notice}</p>}
    <div className="smart-stats compact">{[{t:"TOTAL COMPANIES",v:items.length},{t:"ACTIVE COMPANIES",v:items.filter(x=>x.active).length},{t:"INACTIVE COMPANIES",v:items.filter(x=>!x.active).length},{t:"WITH TRACKING",v:items.filter(x=>Boolean(x.trackingUrl)).length}].map(x=><div className="smart-stat" key={x.t}><span>{x.t}</span><strong>{x.v}</strong></div>)}</div>
    <div className="smart-filter-row"><div className="smart-search-wrap"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find shipping partner…" aria-label="Search shipping companies"/></div><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} aria-label="Shipping company status"><option value="all">All companies</option><option value="active">Active</option><option value="inactive">Inactive</option></select><button className="btn btn-dark" type="button" onClick={()=>{setDraft(empty);setEditing(null);setEditorOpen(true);}}><Plus size={17}/> ADD COMPANY</button></div>
    {editorOpen&&<div className="editor-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)reset();}}><section className="admin-editor carrier-editor-panel" role="dialog" aria-modal="true" aria-label="Shipping company editor"><header><h2>{editing?"Edit shipping company":"Add shipping company"}</h2><button className="icon-button" aria-label="Close editor" onClick={reset}><X size={20}/></button></header><form className="carrier-editor" onSubmit={save}><div className="admin-card-head"><h3>{editing ? "Edit shipping company" : "Add shipping company"}</h3>{editing && <button type="button" className="subtle-link" onClick={reset}><X size={14}/> Cancel edit</button>}</div>
      <div className="admin-form-grid"><label>Company name<input required minLength={2} maxLength={100} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Shipping company name"/></label><label>Contact phone (optional)<input maxLength={25} value={draft.contactPhone} onChange={e => setDraft({ ...draft, contactPhone: e.target.value })} placeholder="Company support number"/></label><label>Company website (HTTPS)<input type="url" value={draft.website} onChange={e => setDraft({ ...draft, website: e.target.value })} placeholder="https://company.example"/></label><label>Tracking URL template (HTTPS)<input type="url" value={draft.trackingUrl} onChange={e => setDraft({ ...draft, trackingUrl: e.target.value })} placeholder="https://.../track/{trackingNumber}"/><small>Use <code>{"{trackingNumber}"}</code> where the tracking code should be inserted.</small></label><label className="span-all">Internal notes<textarea rows={2} maxLength={500} value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} placeholder="Coverage, account notes or operating details"/></label><label className="inline-check"><input type="checkbox" checked={draft.requiresTracking} onChange={e => setDraft({ ...draft, requiresTracking: e.target.checked })}/> Tracking number required before dispatch</label><label className="inline-check"><input type="checkbox" checked={draft.active} onChange={e => setDraft({ ...draft, active: e.target.checked })}/> Active and available for orders</label></div>
      <button className="btn btn-dark" type="submit" disabled={busy}><Plus size={15}/>{busy ? "SAVING…" : editing ? "SAVE COMPANY" : "ADD SHIPPING COMPANY"}</button>
    <fieldset className="carrier-coverage"><legend><MapPin size={15}/> Covered shipping zones</legend><p className="muted">Select real governorates covered by this company. Customer shipping prices stay unchanged.</p><div>{zones.map(z=><label key={z.code}><input type="checkbox" checked={draft.coverageZones.includes(z.code)} onChange={e=>setDraft(old=>({...old,coverageZones:e.target.checked?[...old.coverageZones,z.code]:old.coverageZones.filter(c=>c!==z.code)}))}/>{z.name}</label>)}</div></fieldset>
    {draft.trackingUrl&&<p className="muted"><Link2 size={15}/> Tracking link preview: {isPreviewValid?<a href={trackingPreview} target="_blank" rel="noopener noreferrer">{trackingPreview.slice(0,100)} <ExternalLink size={13}/></a>:"Enter an HTTPS URL with {trackingNumber}."} <small>(Preview only; not a live courier API.)</small></p>}
    </form></section></div>}
    <div className="carrier-list">{visibleItems.map(item => <article className="admin-card carrier-card" key={item.id}><div className="carrier-icon"><Truck size={21}/></div><div className="carrier-main"><div className="carrier-title"><h3>{item.name}</h3><span className={`status-pill ${item.active ? "live" : "hidden"}`}>{item.active ? "ACTIVE" : "INACTIVE"}</span></div><p>{item.contactPhone || "No contact phone"}</p>{item.website && <a href={item.website} target="_blank" rel="noreferrer">Company website ↗</a>}<small>{item.requiresTracking ? "Tracking number required" : "Tracking number optional"}{item.trackingUrl ? " · Tracking link configured" : " · No tracking link"}</small>{item.coverageZoneCodes&&<small>Coverage: {(()=>{try{return (JSON.parse(item.coverageZoneCodes) as string[]).length}catch{return 0}})()} zones</small>}{item.notes && <small>Internal note: {item.notes}</small>}</div><div className="carrier-actions"><button className="btn btn-outline" onClick={() => edit(item)} disabled={busy}><Pencil size={14}/> EDIT</button><button className={`toggle-customer ${item.active ? "enabled" : "disabled"}`} onClick={() => void toggle(item)} disabled={busy}>{item.active ? "Deactivate" : "Activate"}</button></div></article>)}{!loading && !items.length && <div className="admin-card order-empty"><Truck size={24}/><h3>No shipping companies yet</h3><p>Add the companies you actually work with. We have not inserted sample providers.</p></div>}{!loading&&items.length>0&&visibleItems.length===0&&<p className="muted">No matching shipping companies.</p>}{loading && <p className="muted">Loading shipping companies…</p>}</div>
  </section>;
}
