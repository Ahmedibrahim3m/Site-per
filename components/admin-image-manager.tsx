"use client";
import { useState, type ChangeEvent } from "react";
import { ImagePlus, Link2, LoaderCircle, Trash2, Upload } from "lucide-react";

const MAX_BYTES = 3 * 1024 * 1024;
type UploadFn = (file: File) => Promise<string>;
function ratioValue(value: string) {
  const [width, height] = value.split(":").map(Number);
  return width > 0 && height > 0 ? width / height : 1;
}
function isValidExternalImage(value: string) {
  if (!value) return true;
  if (value.startsWith("/api/media/") || value.startsWith("/uploads/")) return true;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}

export function AdminImageField({ title, value, onChange, onUpload, purpose, dimensions, ratio, fit = "cover", maxMb = 3, inputId, fieldError }: {
  title: string; value: string; onChange: (value: string) => void; onUpload: UploadFn;
  purpose: string; dimensions: string; ratio: string; fit?: "cover" | "contain"; maxMb?: number; inputId?: string; fieldError?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [ratioWarning, setRatioWarning] = useState(false);
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) { setError("Use a PNG, JPG or WebP image."); return; }
    if (file.size > maxMb * 1024 * 1024) { setError(`Image exceeds the ${maxMb} MB limit for this image area.`); return; }
    setUploading(true);
    try { onChange(await onUpload(file)); setRatioWarning(false); }
    catch (e) { setError(e instanceof Error ? e.message : "Image upload failed"); }
    finally { setUploading(false); }
  }
  return <section className={`admin-image-field span-all ${fieldError ? "is-invalid" : ""}`}>
    <div className="admin-image-field-head"><div><strong>{title}</strong><small>{purpose}</small></div><span className="image-spec-badge">{ratio} · {dimensions}</span></div>
    <div className="admin-image-guidance"><span>Recommended: {dimensions} px</span><span>Aspect ratio: {ratio}</span><span>PNG / JPG / WebP</span><span>Max upload: {maxMb} MB</span></div>
    <label className="admin-image-url"><Link2 size={15}/><input id={inputId} type="text" aria-invalid={!!fieldError} aria-describedby={fieldError && inputId ? `${inputId}-error` : undefined} value={value} onChange={e => onChange(e.target.value)} placeholder="Paste an HTTPS image URL — or upload from your device"/><small>URL</small></label>
    <label className="upload-label admin-image-upload"><Upload size={17}/>{uploading ? "UPLOADING IMAGE…" : "UPLOAD IMAGE FROM DEVICE"}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} disabled={uploading}/>{uploading && <LoaderCircle size={15}/>}</label>
    {value && <div className="admin-image-preview-wrap"><div className={`admin-image-preview ${fit}`}><img src={value} alt={`${title} preview`} onLoad={event => { const image = event.currentTarget; const actual = image.naturalWidth / image.naturalHeight; const target = ratioValue(ratio); setRatioWarning(Math.abs(actual - target) / target > .2); }} onError={() => setError("The image URL could not be loaded. Check the link or upload the file instead.")}/></div><div className="admin-image-preview-controls"><button type="button" className="subtle-link" onClick={() => { onChange(""); setRatioWarning(false); setError(""); }}><Trash2 size={14}/> Remove image</button></div>{ratioWarning && <p className="image-ratio-warning">Image ratio differs from the recommended {ratio}. Review the preview and adjust the source image if the crop hides important content. The image is not rejected.</p>}</div>}
    {fieldError && <p className="settings-field-error" id={inputId ? `${inputId}-error` : undefined}>{fieldError}</p>}
    {error && <p className="error" role="alert">{error}</p>}
  </section>;
}

export function AdminImageGalleryField({ value, onChange, onUpload, maxImages = 8 }: { value: string; onChange: (value: string) => void; onUpload: UploadFn; maxImages?: number }) {
  const [urlDraft, setUrlDraft] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const images = value.split(/\r?\n/).map(item => item.trim()).filter(Boolean).slice(0, maxImages);
  function commit(next: string[]) { onChange(next.slice(0, maxImages).join("\n")); }
  function addUrl() {
    const url = urlDraft.trim();
    if (!url || !isValidExternalImage(url)) { setError("Enter a valid HTTPS image URL or uploaded image path."); return; }
    if (images.length >= maxImages) { setError(`Gallery is limited to ${maxImages} images.`); return; }
    if (images.includes(url)) { setError("This image is already in the gallery."); return; }
    commit([...images, url]); setUrlDraft(""); setError("");
  }
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) { setError("Use a PNG, JPG or WebP image."); return; }
    if (file.size > MAX_BYTES) { setError("Image exceeds the 3 MB upload limit."); return; }
    if (images.length >= maxImages) { setError(`Gallery is limited to ${maxImages} images.`); return; }
    setUploading(true); setError("");
    try { const url = await onUpload(file); commit([...images, url]); }
    catch (e) { setError(e instanceof Error ? e.message : "Image upload failed"); }
    finally { setUploading(false); }
  }
  function move(from: number, to: number) { if (from === to) return; const next = [...images]; const [item] = next.splice(from, 1); next.splice(to, 0, item); commit(next); }
  return <section className="admin-image-gallery-field span-all">
    <div className="admin-image-field-head"><div><strong>Product gallery</strong><small>Additional authentic photos of this exact bottle. Drag to reorder; the main product image remains first.</small></div><span className="image-spec-badge">4:5 · 1200 × 1500 px</span></div>
    <div className="admin-image-guidance"><span>Recommended: 1200 × 1500 px</span><span>4:5 portrait</span><span>PNG / JPG / WebP</span><span>Max 3 MB each</span><span>{images.length} / {maxImages} images</span></div>
    <div className="gallery-url-entry"><input type="url" value={urlDraft} onChange={e => setUrlDraft(e.target.value)} placeholder="Add a secondary image HTTPS URL"/><button type="button" className="btn btn-outline" onClick={addUrl}>ADD URL</button></div>
    <label className="upload-label admin-image-upload"><ImagePlus size={17}/>{uploading ? "UPLOADING…" : "UPLOAD ADDITIONAL GALLERY IMAGE"}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} disabled={uploading || images.length >= maxImages}/></label>
    <div className="admin-gallery-grid">{images.map((url, index) => <div className="admin-gallery-tile" key={`${url}-${index}`} draggable onDragStart={() => setDragIndex(index)} onDragOver={event => event.preventDefault()} onDrop={() => { if (dragIndex !== null) move(dragIndex, index); setDragIndex(null); }} onDragEnd={() => setDragIndex(null)}><span className="gallery-tile-index">{index + 1}</span><img src={url} alt={`Gallery image ${index + 1}`} onError={() => setError(`Gallery image ${index + 1} could not be loaded.`)}/><div><button type="button" onClick={() => move(index, Math.max(0, index - 1))} disabled={index === 0}>←</button><button type="button" onClick={() => move(index, Math.min(images.length - 1, index + 1))} disabled={index === images.length - 1}>→</button><button type="button" onClick={() => commit(images.filter((_, i) => i !== index))} aria-label={`Remove gallery image ${index + 1}`}><Trash2 size={13}/></button></div></div>)}</div>
    {error && <p className="error" role="alert">{error}</p>}
  </section>;
}
