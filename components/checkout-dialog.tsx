"use client";
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { ArrowRight, Check, ImagePlus, X } from "lucide-react";
import { apiJson, jsonRequest } from "@/lib/client-api";
import WhatsAppLogo from "@/components/whatsapp-logo";
import {useLanguage} from "@/components/language-provider";
import {governorateName} from "@/lib/i18n";

export type CheckoutProduct = { id: string; name: string; price: number; imageUrl: string; size: string };
export type ShippingZone = { code: string; name: string; fee: number; codAvailable: boolean; etaDays: number };
export type CheckoutSettings = { walletNumber: string; instapayAddress: string; whatsappNumber: string; freeShippingThreshold: number };
type Line = { product: CheckoutProduct; quantity: number };
type Payment = "COD" | "WALLET" | "INSTAPAY";
type Quote = { subtotal: number; discount: number; shipping: number; total: number; code: string | null; zoneName: string; etaDays: number };
type Receipt = { reference: string; total: number; paymentStatus: string; status: string; shippingStatus: string };
const money = (n: number) => `${n.toLocaleString("en-EG")} EGP`;
const MAX_PROOF_BYTES = 5 * 1024 * 1024;

export default function CheckoutDialog({ lines, zones, settings, onClose, onPlaced }: { lines: Line[]; zones: ShippingZone[]; settings: CheckoutSettings; onClose: () => void; onPlaced: () => void }) {
  const {t,money:localMoney,locale}=useLanguage();
  const [form, setForm] = useState({ customerName: "", phone: "", governorate: "", area: "", address: "", notes: "" });
  const [payment, setPayment] = useState<Payment>("COD");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const zone = zones.find(item => item.code === form.governorate);
  const items = useMemo(() => lines.map(line => ({ productId: line.product.id, quantity: line.quantity })), [lines]);

  useEffect(() => {
    if (!proofFile) { setProofPreview(""); return; }
    const url = URL.createObjectURL(proofFile);
    setProofPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [proofFile]);

  useEffect(() => {
    if (!form.governorate || !items.length) { setQuote(null); return; }
    let mounted = true;
    setQuoting(true); setQuote(null); setError("");
    apiJson<Quote>("/api/checkout/quote", jsonRequest("POST", { items, governorate: form.governorate, paymentMethod: payment, couponCode: appliedCoupon }))
      .then(result => { if (mounted) setQuote(result); })
      .catch(e => { if (mounted) setError(e instanceof Error ? e.message : "Unable to calculate delivery"); })
      .finally(() => { if (mounted) setQuoting(false); });
    return () => { mounted = false; };
  }, [form.governorate, payment, appliedCoupon, items]);

  function applyCoupon() { setAppliedCoupon(couponCode.trim().toUpperCase()); }
  function choosePayment(next: Payment) { if (next !== payment) { setProofFile(null); setPaymentReference(""); } setPayment(next); }
  function chooseProof(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    setError("");
    if (!file) { setProofFile(null); return; }
    if (!(["image/png", "image/jpeg", "image/webp"].includes(file.type))) { setProofFile(null); setError("Upload a PNG, JPG or WebP image of your transfer receipt."); event.target.value = ""; return; }
    if (file.size > MAX_PROOF_BYTES) { setProofFile(null); setError("Payment receipt image must not exceed 5 MB."); event.target.value = ""; return; }
    setProofFile(file);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!quote) return;
    if (payment !== "COD" && !proofFile) { setError("Upload a clear image of your InstaPay or wallet transfer receipt before placing the order."); return; }
    setSubmitting(true); setError("");
    try {
      let paymentProofToken: string | undefined;
      if (payment !== "COD" && proofFile) {
        const upload = new FormData();
        upload.append("image", proofFile);
        const uploaded = await apiJson<{ uploadToken: string }>("/api/payment-proof", { method: "POST", body: upload });
        paymentProofToken = uploaded.uploadToken;
      }
      const data = await apiJson<Receipt>("/api/orders", jsonRequest("POST", {
        ...form, paymentMethod: payment, couponCode: appliedCoupon, items,
        paymentProofToken, paymentReference: paymentReference.trim(),
      }));
      setReceipt(data);
      onPlaced();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Order could not be placed");
    } finally { setSubmitting(false); }
  }

  const whatsapp = settings.whatsappNumber.replace(/\D/g, "");
  const waLink = whatsapp && receipt ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hello NOIRÉ, my order is ${receipt.reference}.`)}` : "";
  return <>
    <div className="backdrop" onClick={() => !submitting && onClose()}/>
    <div className="checkout" role="dialog" aria-modal="true" aria-label={t("Checkout")}>
      <button className="close" type="button" disabled={submitting} onClick={onClose} aria-label={t("Close checkout")}><X/></button>
      {receipt ? <div className="success">
        <Check size={42}/><p className="eyebrow">{t("ORDER REQUEST RECEIVED")}</p><h2>{t("Thank you for your order.")}</h2>
        <p>{t("Your reference is")} <strong>{receipt.reference}</strong>.</p><p>{t("Final total:")} <strong>{localMoney(receipt.total)}</strong></p>
        <p>{t(payment === "COD" ? "Your order is registered as Cash on Delivery. Pay the courier when your order arrives." : "Your transfer receipt has been received. Payment is still awaiting manual verification; the order will be confirmed after NOIRÉ checks that the funds reached the account.")}</p>
        {payment !== "COD" && <div className="paymentbox"><strong>{t("Transfer receipt submitted")}</strong><p>{t("Our team will review the uploaded image and verify the actual transfer. Uploading a receipt does not automatically confirm payment.")}</p>{paymentReference && <small>{t("Transaction reference:")} {paymentReference}</small>}</div>}
        <a className="btn btn-dark" href={`/order/${encodeURIComponent(receipt.reference)}`}>{t("VIEW ORDER TRACKING")} <ArrowRight size={16}/></a>
        {waLink && <a className="btn btn-outline" href={waLink} target="_blank" rel="noreferrer">{t("CONTACT ON WHATSAPP")} <WhatsAppLogo size={17}/></a>}
        <button className="btn btn-outline" onClick={onClose}>{t("CONTINUE SHOPPING")}</button>
      </div> : <>
        <p className="eyebrow">{t("YOUR NOIRÉ ORDER")}</p><h2>{t("Complete your order.")}</h2>
        <p className="checkoutintro">{t("Sign-in verified. Enter your delivery details and choose one of the available payment methods.")}</p>
        <form onSubmit={submit}>
          <label>{t("Full name")}<input required minLength={2} maxLength={120} value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })}/></label>
          <label>{t("Egyptian mobile number")}<input required type="tel" placeholder="01XXXXXXXXX" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}/></label>
          <label>{t("Delivery governorate")}<select required value={form.governorate} onChange={e => { const next = e.target.value; setForm({ ...form, governorate: next }); if (next && !zones.find(item => item.code === next)?.codAvailable && payment === "COD") setPayment(settings.walletNumber ? "WALLET" : "INSTAPAY"); }}><option value="">{t("Choose governorate")}</option>{zones.map(item => <option key={item.code} value={item.code}>{governorateName(locale,item.name)}</option>)}</select></label>
          <label>{t("Area / district")}<input required minLength={2} maxLength={120} value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} placeholder={t("District or city")}/></label>
          <label>{t("Full delivery address")}<textarea required minLength={8} maxLength={500} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder={t("Street, building, apartment, landmark")}/></label>
          <label>{t("Order notes (optional)")}<textarea maxLength={500} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}/></label>
          <fieldset><legend>{t("Payment method")}</legend>
            <label className="radio"><input type="radio" checked={payment === "COD"} disabled={!!zone && !zone.codAvailable} onChange={() => choosePayment("COD")}/> {t("Cash on delivery")} {zone && !zone.codAvailable ? t("— unavailable in this area") : ""}</label>
            <label className="radio"><input type="radio" checked={payment === "INSTAPAY"} disabled={!settings.instapayAddress} onChange={() => choosePayment("INSTAPAY")}/> InstaPay {!settings.instapayAddress ? t("— not configured") : ""}</label>
            <label className="radio"><input type="radio" checked={payment === "WALLET"} disabled={!settings.walletNumber} onChange={() => choosePayment("WALLET")}/> {t("Electronic wallet")} {!settings.walletNumber ? t("— not configured") : ""}</label>
          </fieldset>
          {payment !== "COD" && <div className="paymentbox payment-proof-box">
            <strong>{t(payment === "WALLET" ? "Electronic wallet transfer" : "InstaPay transfer")}</strong>
            <p>{payment === "WALLET" ? settings.walletNumber : settings.instapayAddress}</p>
            <small>{t("Transfer the exact order total, then upload a clear receipt image. The admin will verify the funds manually.")}</small>
            <label className="proof-upload-label"><ImagePlus size={17}/> {t("Upload transfer receipt")} <span>{t("Required · PNG / JPG / WebP · Max 5 MB")}</span><input type="file" accept="image/png,image/jpeg,image/webp" required onChange={chooseProof}/></label>
            {proofPreview && <div className="checkout-proof-preview"><img src={proofPreview} alt="Payment transfer receipt preview"/><div><strong>{proofFile?.name}</strong><small>{proofFile ? `${(proofFile.size / 1024).toFixed(0)} KB` : ""}</small><button type="button" className="subtle-link" onClick={() => setProofFile(null)}>{t("Remove image")}</button></div></div>}
            <label>{t("Transaction reference (optional)")}<input maxLength={90} value={paymentReference} onChange={e => setPaymentReference(e.target.value)} placeholder={t("Transfer ID / reference number")}/></label>
          </div>}
          <label>{t("Discount code (optional)")}<div className="coupon-entry"><input value={couponCode} maxLength={24} onChange={e => setCouponCode(e.target.value)} placeholder={t("YOUR CODE")}/><button type="button" onClick={applyCoupon}>{t("APPLY")}</button></div></label>
          {appliedCoupon && <button className="subtle-link" type="button" onClick={() => { setAppliedCoupon(""); setCouponCode(""); }}>{t("Remove coupon")} {appliedCoupon} ×</button>}
          {quote && <div className="quote-breakdown"><div><span>{t("Subtotal")}</span><strong>{localMoney(quote.subtotal)}</strong></div>{quote.discount > 0 && <div><span>{t("Discount")} {quote.code}</span><strong>−{localMoney(quote.discount)}</strong></div>}<div><span>{t("Shipping to")} {governorateName(locale,quote.zoneName)}</span><strong>{quote.shipping === 0 ? t("FREE") : localMoney(quote.shipping)}</strong></div><p>{t("Estimated courier window:")} {quote.etaDays} {t("days (indicative, subject to courier).")}</p><div className="checkouttotal"><span>{t("Grand total")}</span><strong>{localMoney(quote.total)}</strong></div></div>}
          {quoting && <p className="muted">{t("Calculating your order…")}</p>}{error && <p role="alert" className="error">{error}</p>}
          <button className="btn btn-dark full" type="submit" disabled={submitting || quoting || !quote}>{t(submitting ? "PLACING ORDER…" : "PLACE ORDER")} <ArrowRight size={16}/></button>
        </form>
      </>}
    </div>
  </>;
}
