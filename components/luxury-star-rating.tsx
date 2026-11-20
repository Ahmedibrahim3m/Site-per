"use client";
import {useState} from "react";
import {Star} from "lucide-react";
const descriptions=["Select a rating","Poor","Fair","Good","Very good","Excellent"];
export default function LuxuryStarRating({value,onChange}:{value:number;onChange:(v:number)=>void}){
 const [hovered,setHovered]=useState(0);
 return <div className="luxury-rating-control"><div className="luxury-star-row" role="radiogroup" aria-label="Choose your rating">
  {[1,2,3,4,5].map(n=><button type="button" key={n} role="radio" aria-checked={value===n} aria-label={`${n} star${n>1?"s":""}: ${descriptions[n]}`} tabIndex={value===n||(!value&&n===1)?0:-1} onKeyDown={e=>{let next=n;if(e.key==="ArrowRight")next=Math.min(5,n+1);else if(e.key==="ArrowLeft")next=Math.max(1,n-1);else if(e.key==="Home")next=1;else if(e.key==="End")next=5;else return;e.preventDefault();onChange(next);const buttons=e.currentTarget.parentElement?.querySelectorAll("button");buttons?.[next-1]?.focus();}} onMouseEnter={()=>setHovered(n)} onMouseLeave={()=>setHovered(0)} onFocus={()=>setHovered(n)} onBlur={()=>setHovered(0)} onClick={()=>onChange(n)} className={n<=(hovered||value)?"lit":""}><Star size={30} strokeWidth={1.35} fill={n<=(hovered||value)?"currentColor":"none"}/></button>)}
  </div><span className="rating-word" aria-live="polite">{descriptions[hovered||value]}</span></div>;
}
