"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {ArrowLeft,ShoppingBag} from "lucide-react";
import NoireThemeButton from "@/components/noire-theme-button";
import {LanguageSwitch,useLanguage} from "@/components/language-provider";

/** Compact header for internal storefront routes. Never replaces the NOIRÉ identity. */
export default function SmartHeader({backHref="/#shop",backLabel="Back to fragrances"}:{backHref?:string;backLabel?:string}){
 const {t}=useLanguage();
 const [scrolled,setScrolled]=useState(false);
 useEffect(()=>{
   const update=()=>setScrolled(window.scrollY>80);
   update();window.addEventListener("scroll",update,{passive:true});
   return ()=>window.removeEventListener("scroll",update);
 },[]);
 return <header className={`content-head noire-smart-header ${scrolled?"is-compact":""}`}>
  <Link className="smart-back" href={backHref}><ArrowLeft size={16}/><span>{t(backLabel)}</span></Link>
  <Link className="brand smart-brand" href="/" aria-label="NOIRÉ homepage">NOIR<span>É</span><small>PARFUMS</small></Link>
  <div className="smart-actions"><LanguageSwitch compact/><NoireThemeButton/><Link href="/?bag=1" className="smart-action noire-control noire-control-circle" aria-label={t("Open shopping bag")}><ShoppingBag size={18}/></Link></div>
 </header>;
}
