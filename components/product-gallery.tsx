"use client";
import {useEffect,useState} from "react";
import {ChevronLeft,ChevronRight,Expand,X,ZoomIn} from "lucide-react";

/** Photographs must be supplied by merchant; no synthetic angles or mislabeled bottles. */
export default function ProductGallery({images,productName,featured=false}:{images:string[];productName:string;featured?:boolean}){
 const [index,setIndex]=useState(0),[full,setFull]=useState(false);
 const list=images.length?images:["/brand/photo-placeholder.svg"];
 const current=list[Math.min(index,list.length-1)];
 function go(delta:number){setIndex(i=>(i+delta+list.length)%list.length)}
 useEffect(()=>{
  if(!full)return;
  const handler=(e:KeyboardEvent)=>{if(e.key==="Escape")setFull(false);if(e.key==="ArrowLeft")go(-1);if(e.key==="ArrowRight")go(1)};
  window.addEventListener("keydown",handler);
  const old=document.body.style.overflow;document.body.style.overflow="hidden";
  return ()=>{window.removeEventListener("keydown",handler);document.body.style.overflow=old};
 },[full,list.length]);
 return <div className={`noire-gallery ${featured?"featured-gallery":""}`} aria-label={`${productName} product gallery`}>
  <div className="gallery-stage"><img key={current} className="gallery-photo" src={current} alt={`${productName}, photograph ${index+1} of ${list.length}`} decoding="async" fetchPriority="high"/><div className="gallery-stage-shine" aria-hidden="true"/><button type="button" className="gallery-expand" onClick={()=>setFull(true)} aria-label="View perfume image fullscreen"><Expand size={17}/> <span>VIEW FULLSCREEN</span></button>{list.length>1&&<div className="gallery-counter">{String(index+1).padStart(2,"0")} / {String(list.length).padStart(2,"0")}</div>}</div>
  {list.length>1&&<div className="gallery-thumbnails" aria-label="Select a product photo">{list.map((src,i)=><button key={`${src}-${i}`} aria-label={`View photo ${i+1}`} aria-pressed={index===i} className={i===index?"selected":""} onClick={()=>setIndex(i)}><img loading="lazy" src={src} alt=""/></button>)}</div>}
  <p className="gallery-tip"><ZoomIn size={13}/> Hover to explore · Tap for a closer look</p>
  {full&&<div className="gallery-lightbox" role="dialog" aria-modal="true" aria-label={`${productName} image viewer`} onMouseDown={e=>{if(e.target===e.currentTarget)setFull(false)}}><button className="lightbox-close" onClick={()=>setFull(false)} aria-label="Close fullscreen image"><X/></button><div className="lightbox-photo"><img src={current} alt={`${productName} full size photograph`}/></div>{list.length>1&&<><button className="lightbox-prev" aria-label="Previous photo" onClick={()=>go(-1)}><ChevronLeft/></button><button className="lightbox-next" aria-label="Next photo" onClick={()=>go(1)}><ChevronRight/></button></>}<span className="lightbox-count">{index+1} / {list.length}</span></div>}
 </div>;
}
