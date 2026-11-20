"use client";
import {createContext,useCallback,useContext,useEffect,useMemo,useState,type ReactNode,type KeyboardEvent as ReactKeyboardEvent} from "react";
import {LOCALE_STORAGE_KEY,translate,moneyFor,type Locale} from "@/lib/i18n";
import {ChevronDown,Globe2,Check} from "lucide-react";
import {useRef} from "react";

type LanguageContextValue={locale:Locale;changeLanguage:(locale:Locale)=>void;t:(english:string)=>string;money:(value:number)=>string};
const LanguageContext=createContext<LanguageContextValue|null>(null);
export function LanguageProvider({children}:{children:ReactNode}){
 const [locale,setLocale]=useState<Locale>("en");
 useEffect(()=>{
  const initial=document.documentElement.lang==="ar"?"ar":"en";
  setLocale(initial);
  // Same-tab cross-component synchronization; never reload the page or clear the shopping state.
  const storage=(event:StorageEvent)=>{if(event.key===LOCALE_STORAGE_KEY){const next=event.newValue==="ar"?"ar":"en";document.documentElement.lang=next;document.documentElement.dir=next==="ar"?"rtl":"ltr";setLocale(next);}};
  window.addEventListener("storage",storage);return()=>window.removeEventListener("storage",storage);
 },[]);
 const changeLanguage=useCallback((next:Locale)=>{
  document.documentElement.lang=next;document.documentElement.dir=next==="ar"?"rtl":"ltr";
  setLocale(next);try{localStorage.setItem(LOCALE_STORAGE_KEY,next)}catch{}
 },[]);
 const value=useMemo(()=>({locale,changeLanguage,t:(english:string)=>translate(locale,english),money:(value:number)=>moneyFor(locale,value)}),[locale,changeLanguage]);
 return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
export function useLanguage(){const context=useContext(LanguageContext);if(!context)throw new Error("LanguageProvider is missing");return context;}
/** SSR-safe bilingual text: the pre-paint html.lang value selects the correct branch. */
export function Localized({en,ar}:{en:string;ar:string}){return <><span className="noire-en">{en}</span><span className="noire-ar">{ar}</span></>;}
/** Compact, accessible locale selector used by storefront, page headers and Admin. */
export function LanguageSwitch({compact=false}:{compact?:boolean}){
 const {locale,changeLanguage}=useLanguage();
 const [open,setOpen]=useState(false);
 const rootRef=useRef<HTMLDivElement>(null);
 const englishRef=useRef<HTMLButtonElement>(null);
 const arabicRef=useRef<HTMLButtonElement>(null);
 useEffect(()=>{
  if(!open)return;
  const closeOutside=(event:PointerEvent)=>{if(!rootRef.current?.contains(event.target as Node))setOpen(false);};
  const closeEscape=(event:KeyboardEvent)=>{if(event.key==="Escape"){setOpen(false);rootRef.current?.querySelector<HTMLButtonElement>(".noire-language-trigger")?.focus();}};
  document.addEventListener("pointerdown",closeOutside);
  document.addEventListener("keydown",closeEscape);
  return()=>{document.removeEventListener("pointerdown",closeOutside);document.removeEventListener("keydown",closeEscape);};
 },[open]);
 function choose(next:Locale){changeLanguage(next);setOpen(false);rootRef.current?.querySelector<HTMLButtonElement>(".noire-language-trigger")?.focus();}
 function keyDown(event:ReactKeyboardEvent<HTMLDivElement>){
  if((event.key==="ArrowDown"||event.key==="ArrowUp")&&!open){event.preventDefault();setOpen(true);requestAnimationFrame(()=>(locale==="en"?englishRef:arabicRef).current?.focus());}
  else if(open&&(event.key==="ArrowDown"||event.key==="ArrowUp")){event.preventDefault();(document.activeElement===englishRef.current?arabicRef:englishRef).current?.focus();}
 }
 return <div ref={rootRef} className={`noire-language-switch ${compact?"compact":""} ${open?"is-open":""}`} dir="ltr" onKeyDown={keyDown}>
   <button className="noire-language-trigger" type="button" aria-haspopup="menu" aria-expanded={open} aria-label={locale==="ar"?"اللغة: العربية، تغيير اللغة":"Language: English, change language"} onClick={()=>setOpen(prev=>!prev)}>
    <Globe2 className="noire-globe-icon" size={17} aria-hidden="true"/><span className="noire-language-code" aria-hidden="true"><span className="noire-lang-en">EN</span><span className="noire-lang-ar">AR</span></span><ChevronDown size={13} aria-hidden="true" className="noire-language-chevron"/>
   </button>
   {open&&<div className="noire-language-menu" role="menu" aria-label={locale==="ar"?"اختر اللغة":"Choose language"}>
    <button ref={englishRef} lang="en" type="button" role="menuitemradio" aria-checked={locale==="en"} onClick={()=>choose("en")}>English {locale==="en"&&<Check size={15} aria-hidden="true"/>}</button>
    <button ref={arabicRef} lang="ar" type="button" role="menuitemradio" aria-checked={locale==="ar"} onClick={()=>choose("ar")}>العربية {locale==="ar"&&<Check size={15} aria-hidden="true"/>}</button>
   </div>}
 </div>;
}
