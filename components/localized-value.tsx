"use client";
import {useLanguage} from "@/components/language-provider";
import {merchantText,governorateName} from "@/lib/i18n";
export function LocalizedValue({english,arabic}:{english:string;arabic?:string|null}){const {locale,t}=useLanguage();return <>{arabic?merchantText(locale,english,arabic):t(english)}</>;}
export function LocalizedPrice({value}:{value:number}){const {money}=useLanguage();return <span className="noire-bidi-number">{money(value)}</span>;}
export function LocalizedDate({iso}:{iso:string}){const {locale}=useLanguage();return <time dateTime={iso}>{new Date(iso).toLocaleString(locale==="ar"?"ar-EG":"en-EG",{dateStyle:"medium",timeStyle:"short"})}</time>;}

export function LocalizedGovernorate({name}:{name:string}){const {locale}=useLanguage();return <>{governorateName(locale,name)}</>;}
