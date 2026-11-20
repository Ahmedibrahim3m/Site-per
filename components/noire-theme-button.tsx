"use client";
import {Moon,Sun} from "lucide-react";
import {useLanguage} from "@/components/language-provider";
/** One source for the rounded light/dark button across NOIRÉ surfaces. */
export default function NoireThemeButton({className=""}:{className?:string}){
 const {t}=useLanguage();
 function toggle(){
  const next=document.documentElement.dataset.theme==="dark"?"light":"dark";
  document.documentElement.dataset.theme=next;
  try{localStorage.setItem("noire-theme",next);}catch{}
  window.dispatchEvent(new CustomEvent("noire-theme-change",{detail:next}));
 }
 return <button type="button" className={`noire-control noire-control-circle noire-theme-control ${className}`} onClick={toggle}
  aria-label={t("Toggle light and dark mode")} title={t("Toggle light and dark mode")}>
  <Sun className="noire-sun-icon" size={19} aria-hidden="true"/>
  <Moon className="noire-moon-icon" size={19} aria-hidden="true"/>
 </button>;
}
