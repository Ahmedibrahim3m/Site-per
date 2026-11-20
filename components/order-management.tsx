"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ExternalLink, FileText, Filter, RefreshCcw, Search, ShieldCheck, Truck } from "lucide-react";
import { apiJson, jsonRequest } from "@/lib/client-api";

type Carrier = { id: string; name: string; contactPhone: string; website: string; trackingUrl: string; notes: string; active: boolean; requiresTracking: boolean };
type Event = { id: string; eventType: string; fromValue: string | null; toValue: string | null; note: string; actorLabel: string; createdAt: string };
type Proof = { id: string; mimeType: string; fileSize: number; uploadedAt: string; verifiedAt: string | null; verificationNote: string | null };
type Order = {
  id: string; reference: string; createdAt: string; customerName: string; phone: string; governorate: string; area: string; address: string; notes: string | null;
  paymentMethod: "COD" | "WALLET" | "INSTAPAY"; paymentStatus: string; status: string; shippingStatus: string; paymentReference: string | null;
  courierId: string | null; courierName: string | null; trackingNumber: string | null; subtotal: number; discount: number; shipping: number; total: number;
  user: { id: string; name: string; email: string | null; username: string }; courier: Carrier | null; paymentProof: Proof | null; events: Event[];
  items: { id: string; quantity: number; unitPrice: number; product: { name: string; imageUrl: string; size: string } }[];
};
const orderStatuses = ["PENDING", "CONFIRMED", "PREPARING", "CANCELLED"];
const shippingStatuses = ["NOT_SHIPPED", "SHIPPED", "IN_TRANSIT", "DELIVERED", "FAILED", "RETURNED"];
const paymentStatuses = ["PENDING", "PROOF_SUBMITTED", "AWAITING_COLLECTION", "CONFIRMED", "FAILED", "REFUNDED"];
const money = (value: number) => `${Number(value || 0).toLocaleString("en-EG")} EGP`;
const fmtDate = (value: string) => new Date(value).toLocaleString("en-EG", { dateStyle: "medium", timeStyle: "short" });
const paymentLabel = (value: string) => value === "COD" ? "CASH ON DELIVERY" : value === "WALLET" ? "ELECTRONIC WALLET" : value === "INSTAPAY" ? "INSTAPAY" : value;

export default function OrderManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [orderFilter, setOrderFilter] = useState("ALL");
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [shippingFilter, setShippingFilter] = useState("ALL");
  const [areaFilter, setAreaFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detailsOpen,setDetailsOpen]=useState<string|null>(null),[advanced,setAdvanced]=useState(false),[preset,setPreset]=useState("all"),[page,setPage]=useState(0),[lastUpdated,setLastUpdated]=useState<string|null>(null);
  const [stats,setStats]=useState({totalCount:0,paymentReview:0,readyToShip:0,inTransit:0});
  const [verificationNotes, setVerificationNotes] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true); setError("");
    try {
      const [orderData, carrierData] = await Promise.all([
        apiJson<{ orders: Order[];stats:{totalCount:number;paymentReview:number;readyToShip:number;inTransit:number} }>("/api/admin/orders"),
        apiJson<{ carriers: Carrier[] }>("/api/admin/carriers"),
      ]);
      setOrders(orderData.orders); setStats(orderData.stats);setCarriers(carrierData.carriers);setLastUpdated(new Date().toISOString());
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load orders"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  function update(id: string, patch: Partial<Order>) {
    setOrders(current => current.map(order => order.id === id ? { ...order, ...patch } : order));
  }
  async function save(order: Order) {
    setBusyId(order.id); setError(""); setNotice("");
    try {
      await apiJson(`/api/admin/orders/${order.id}`, jsonRequest("PATCH", {
        status: order.status, paymentStatus: order.paymentStatus, shippingStatus: order.shippingStatus,
        courierId: order.courierId, trackingNumber: order.trackingNumber || "", paymentReference: order.paymentReference || "",
        verificationNote: verificationNotes[order.id] || "",
      }));
      setNotice(`Order ${order.reference} updated successfully.`);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save order changes"); }
    finally { setBusyId(null); }
  }

  const areas = useMemo(() => [...new Set(orders.map(order => order.area).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [orders]);
  const filtered = useMemo(() => orders.filter(order => {
    const text = `${order.reference} ${order.customerName} ${order.phone} ${order.governorate} ${order.area} ${order.address} ${order.paymentReference || ""} ${order.courierName || ""}`.toLowerCase();
    const date = new Date(order.createdAt);
    const presetMatch=preset==="all"||preset==="pending"&&order.status==="PENDING"||preset==="review"&&order.paymentStatus==="PROOF_SUBMITTED"||preset==="ship"&&order.status==="PREPARING"&&order.paymentStatus==="CONFIRMED"&&order.shippingStatus==="NOT_SHIPPED"||preset==="delivered"&&order.shippingStatus==="DELIVERED";
    return presetMatch && (!query || text.includes(query.toLowerCase())) && (orderFilter === "ALL" || order.status === orderFilter) &&
      (paymentFilter === "ALL" || order.paymentStatus === paymentFilter) && (shippingFilter === "ALL" || order.shippingStatus === shippingFilter) &&
      (areaFilter === "ALL" || order.area === areaFilter) && (!dateFrom || date >= new Date(`${dateFrom}T00:00:00`)) && (!dateTo || date <= new Date(`${dateTo}T23:59:59`));
  }), [orders, query, orderFilter, paymentFilter, shippingFilter, areaFilter, dateFrom, dateTo,preset]);

  const pages=Math.max(1,Math.ceil(filtered.length/10)),current=Math.min(page,pages-1),shown=filtered.slice(current*10,current*10+10);
  return <section className="order-management">
    <div className="admin-section-head"><div><h2>Orders & payments</h2><p>Review payment proof, manage order progress and assign a courier from your approved shipping companies.</p></div><div className="order-head-actions"><span className="eyebrow">{filtered.length} / {orders.length} ORDERS</span><button className="btn btn-outline" onClick={() => void load()} disabled={loading}><RefreshCcw size={15}/> REFRESH</button></div></div>
    <div className="smart-stats compact">{[{label:"TOTAL ORDERS",v:stats.totalCount},{label:"PAYMENT REVIEW",v:stats.paymentReview},{label:"READY TO SHIP",v:stats.readyToShip},{label:"IN TRANSIT",v:stats.inTransit}].map(x=><div className="smart-stat" key={x.label}><span>{x.label}</span><strong>{x.v}</strong></div>)}</div>
    <div className="order-presets" role="group" aria-label="Quick order filters">{[{k:"all",l:"All"},{k:"pending",l:"Pending"},{k:"review",l:"Payment Review"},{k:"ship",l:"To Ship"},{k:"delivered",l:"Delivered"}].map(x=><button type="button" key={x.k} className={preset===x.k?"selected":""} aria-pressed={preset===x.k} onClick={()=>{setPreset(x.k);setPage(0);}}>{x.l}</button>)}</div>
    {stats.paymentReview>0&&<div className="order-priority"><ShieldCheck size={20}/><span><strong>Payment Verification Priority</strong> · {stats.paymentReview} orders need manual receipt review.</span><button type="button" onClick={()=>{setPreset("review");setPage(0);}}>REVIEW PAYMENTS <ArrowUpRight size={15}/></button></div>}
    {lastUpdated&&<p className="muted">Last refreshed: {fmtDate(lastUpdated)}</p>}
    {error && <p className="admin-alert" role="alert">{error}</p>}{notice && <p className="admin-notice" role="status">{notice}</p>}
    <div className="order-filter-panel">
      <label className="order-search"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search order ID, customer, phone, area or transfer reference…"/></label>
      <button className="order-advanced-trigger" type="button" onClick={()=>setAdvanced(v=>!v)} aria-expanded={advanced}><Filter size={16}/> {advanced?"Hide advanced filters":"Advanced Filters"}</button>
      {advanced&&<div className="order-filter-grid">
        <label>ORDER STATUS<select value={orderFilter} onChange={e => setOrderFilter(e.target.value)}><option value="ALL">All order statuses</option>{orderStatuses.map(status => <option key={status}>{status}</option>)}</select></label>
        <label>PAYMENT STATUS<select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)}><option value="ALL">All payment statuses</option>{paymentStatuses.map(status => <option key={status}>{status}</option>)}</select></label>
        <label>SHIPPING STATUS<select value={shippingFilter} onChange={e => setShippingFilter(e.target.value)}><option value="ALL">All shipping statuses</option>{shippingStatuses.map(status => <option key={status}>{status}</option>)}</select></label>
        <label>AREA<select value={areaFilter} onChange={e => setAreaFilter(e.target.value)}><option value="ALL">All areas</option>{areas.map(area => <option key={area}>{area}</option>)}</select></label>
        <label>FROM DATE<input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}/></label>
        <label>TO DATE<input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}/></label>
      </div>}
      <button className="subtle-link" type="button" onClick={() => { setPreset("all");setPage(0);setQuery(""); setOrderFilter("ALL"); setPaymentFilter("ALL"); setShippingFilter("ALL"); setAreaFilter("ALL"); setDateFrom(""); setDateTo(""); }}><Filter size={14}/> Clear filters</button>
    </div>
    {loading && <p className="muted">Loading orders…</p>}
    {!loading && shown.map(order => {
      const isCod = order.paymentMethod === "COD";
      const carrier = carriers.find(item => item.id === order.courierId) || null;
      const trackUrl = (carrier?.trackingUrl || "").replace("{trackingNumber}", encodeURIComponent(order.trackingNumber || ""));
      return <article className="admin-order order-management-card" key={order.id}>
        <div className="admin-order-heading"><div><h3>{order.reference}</h3><p>{order.customerName} · {order.phone} · {fmtDate(order.createdAt)}</p></div><strong>{money(order.total)}</strong></div>
        <div className="order-summary-badges"><span className="status-pill">Order: {order.status.replaceAll("_"," ")}</span><span className="status-pill">Payment: {order.paymentStatus.replaceAll("_"," ")}</span><span className="status-pill">Shipping: {order.shippingStatus.replaceAll("_"," ")}</span><button type="button" className="btn btn-outline" onClick={()=>setDetailsOpen(detailsOpen===order.id?null:order.id)}>{detailsOpen===order.id?"CLOSE DETAILS":"VIEW / MANAGE DETAILS"} <ArrowUpRight size={15}/></button></div>
        {detailsOpen===order.id&&<><div className="order-customer-grid"><div><span className="order-meta-label">DELIVERY ADDRESS</span><p>{order.governorate} · {order.area} · {order.address}</p>{order.notes && <small>Notes: {order.notes}</small>}</div><div><span className="order-meta-label">CUSTOMER ACCOUNT</span><p>{order.user.name}</p><small>{order.user.email || order.user.username}</small></div></div>
        <div className="admin-order-items">{order.items.map(item => <span key={item.id}>{item.quantity} × {item.product.name} · {item.product.size} — {money(item.unitPrice * item.quantity)}</span>)}</div>
        <div className="order-financial-row"><span>Subtotal: {money(order.subtotal)}</span><span>Discount: −{money(order.discount)}</span><span>Shipping: {money(order.shipping)}</span><strong>Total: {money(order.total)}</strong></div>
        <section className="payment-review-panel"><div className="payment-review-head"><div><span className="order-meta-label">PAYMENT METHOD</span><strong>{paymentLabel(order.paymentMethod)}</strong><small>Payment status: {order.paymentStatus.replaceAll("_", " ")}</small></div><span className={`status-pill ${order.paymentStatus === "CONFIRMED" ? "live" : "hidden"}`}>{order.paymentStatus.replaceAll("_", " ")}</span></div>
          {isCod ? <p className="muted">Cash on delivery selected. No transfer receipt is required. Payment stays Awaiting Collection until the courier delivers and collects the amount.</p> : order.paymentProof ? <div className="proof-preview"><img src={`/api/admin/orders/${order.id}/payment-proof`} alt={`Payment receipt for ${order.reference}`} loading="lazy"/><div><strong>Transfer receipt uploaded</strong><small>{order.paymentProof.mimeType} · {(order.paymentProof.fileSize / 1024).toFixed(0)} KB · {fmtDate(order.paymentProof.uploadedAt)}</small>{order.paymentProof.verifiedAt ? <small className="proof-verified">Verified {fmtDate(order.paymentProof.verifiedAt)}</small> : <small>Awaiting manual verification</small>}<a href={`/api/admin/orders/${order.id}/payment-proof`} target="_blank" rel="noreferrer">OPEN FULL RECEIPT <ExternalLink size={13}/></a></div></div> : <p className="admin-alert">No payment receipt is attached to this legacy electronic-payment order.</p>}
          {order.paymentReference && <p className="order-transfer-ref">TRANSFER REFERENCE: <strong>{order.paymentReference}</strong></p>}
          {!isCod && <label className="verification-note">Verification note (optional)<input maxLength={300} value={verificationNotes[order.id] ?? order.paymentProof?.verificationNote ?? ""} onChange={e => setVerificationNotes(old => ({ ...old, [order.id]: e.target.value }))} placeholder="e.g. Transfer received and amount matched"/></label>}
        </section>
        <div className="admin-order-controls order-status-controls">
          <label>ORDER STATUS<select value={order.status} onChange={e => update(order.id, { status: e.target.value })} disabled={order.status === "CANCELLED"}>{orderStatuses.map(status => <option key={status}>{status}</option>)}</select></label>
          <label>PAYMENT STATUS<select value={order.paymentStatus} onChange={e => update(order.id, { paymentStatus: e.target.value })}>{(isCod ? ["AWAITING_COLLECTION", "CONFIRMED", "FAILED", "REFUNDED"] : ["PENDING", "PROOF_SUBMITTED", "CONFIRMED", "FAILED", "REFUNDED"]).map(status => <option key={status}>{status}</option>)}</select></label>
          <label>SHIPPING STATUS<select value={order.shippingStatus} onChange={e => update(order.id, { shippingStatus: e.target.value })}>{shippingStatuses.map(status => <option key={status}>{status}</option>)}</select></label>
          <label>SHIPPING COMPANY<select value={order.courierId || ""} onChange={e => update(order.id, { courierId: e.target.value || null })}><option value="">Select a company</option>{carriers.filter(item => item.active || item.id === order.courierId).map(item => <option key={item.id} value={item.id}>{item.name}{!item.active ? " (inactive · existing order)" : ""}</option>)}</select>{!carriers.some(item => item.active) && <small>No active companies. <button type="button" className="subtle-link" onClick={() => window.dispatchEvent(new CustomEvent("noire-admin-tab", { detail: "carriers" }))}>Add a shipping company</button>.</small>}</label>
          <label>TRACKING NUMBER<input maxLength={100} placeholder="Courier reference" value={order.trackingNumber || ""} onChange={e => update(order.id, { trackingNumber: e.target.value })}/></label>
          <label>TRANSFER REFERENCE<input maxLength={90} placeholder="Optional transaction ID" value={order.paymentReference || ""} onChange={e => update(order.id, { paymentReference: e.target.value })}/></label>
        </div>
        {trackUrl && order.trackingNumber && <a className="carrier-track-link" href={trackUrl} target="_blank" rel="noreferrer"><Truck size={15}/> TRACK WITH {carrier?.name.toUpperCase()} <ArrowUpRight size={14}/></a>}
        <div className="order-card-actions"><button className="btn btn-dark" disabled={busyId === order.id} onClick={() => void save(order)}>{busyId === order.id ? "SAVING…" : "SAVE CHANGES"}</button><Link className="btn btn-outline" href={`/order/${encodeURIComponent(order.reference)}/invoice`}><FileText size={15}/> VIEW / PRINT INVOICE</Link><button className="subtle-link" type="button" onClick={() => setExpanded(expanded === order.id ? null : order.id)}>{expanded === order.id ? "Hide activity" : `Activity timeline (${order.events.length})`}</button></div>
        {expanded === order.id && <div className="order-timeline"><h4>Order activity</h4>{order.events.map(event => <div className="timeline-entry" key={event.id}><span className="timeline-marker"/><div><strong>{event.eventType.replaceAll("_", " ")}</strong><p>{event.note}</p><small>{event.actorLabel} · {fmtDate(event.createdAt)}</small></div></div>)}{!order.events.length && <p className="muted">No activity recorded yet.</p>}</div>}</>}
      </article>;
    })}
    {!loading && !filtered.length && <div className="admin-card order-empty"><Search size={22}/><h3>{orders.length?"No matching orders":"No orders yet"}</h3><p>{orders.length?"Try changing the search or clearing filters.":"Customer orders will appear here after checkout."}</p></div>}
    {!loading&&filtered.length>0&&<div className="smart-pagination"><span>Showing {current*10+1}–{Math.min(filtered.length,(current+1)*10)} of {filtered.length} loaded orders</span><button type="button" disabled={current<=0} onClick={()=>setPage(v=>v-1)}>Previous</button><span>Page {current+1}/{pages}</span><button disabled={current>=pages-1} type="button" onClick={()=>setPage(v=>v+1)}>Next</button></div>}
  </section>;
}
