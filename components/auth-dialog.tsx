"use client";
import { useState, type FormEvent } from "react";
import { ArrowRight, LockKeyhole, UserRound, X } from "lucide-react";
import { apiJson, jsonRequest } from "@/lib/client-api";
import {useLanguage} from "@/components/language-provider";
export type SessionUser={id:string;username:string;name:string;email:string|null;role:"USER"|"ADMIN"};
export type AuthMode="login"|"signup";
export default function AuthDialog({mode,onMode,onClose,onSuccess}:{mode:AuthMode;onMode:(v:AuthMode)=>void;onClose:()=>void;onSuccess:(u:SessionUser)=>void}){
 const {t}=useLanguage();
 const [name,setName]=useState(""),[email,setEmail]=useState(""),[identifier,setIdentifier]=useState(""),[password,setPassword]=useState(""),[loading,setLoading]=useState(false),[error,setError]=useState("");
 async function submit(e:FormEvent){
  e.preventDefault();setError("");setLoading(true);
  try{
   const url=mode==="signup"?"/api/auth/register":"/api/auth/login";
   const payload=mode==="signup"?{name,email,password}:{identifier,password};
   const result=await apiJson<{user:SessionUser}>(url,jsonRequest("POST",payload));
   onSuccess(result.user);
  }catch(e){setError(e instanceof Error?e.message:"Unable to sign in");}finally{setLoading(false);}
 }
 function switchMode(v:AuthMode){onMode(v);setError("");setPassword("");}
 return <div className="auth-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
  <section className="auth-panel" role="dialog" aria-modal="true" aria-label={t(mode==="login"?"Log in":"Create your account")}>
   <button className="icon-button auth-close" aria-label={t("Close checkout")} onClick={onClose}><X size={19}/></button>
   <div className="auth-icon"><UserRound size={24}/></div>
   <p className="eyebrow">{t("NOIRÉ PRIVATE CLIENTS")}</p>
   <h2>{t(mode==="login"?"Welcome back.":"Become a member.")}</h2>
   <p className="auth-subtitle">{t(mode==="login"?"Sign in to place orders and follow your purchases.":"Create your account to shop your favourite fragrances.")}</p>
   <form onSubmit={submit} className="auth-form">
    {mode==="signup"&&<label>{t("FULL NAME")}<input required minLength={2} maxLength={100} autoComplete="name" value={name} onChange={e=>setName(e.target.value)} placeholder={t("Your full name")}/></label>}
    <label>{t(mode==="login"?"EMAIL OR USERNAME":"EMAIL ADDRESS")}<input required autoComplete={mode==="login"?"username":"email"} type={mode==="signup"?"email":"text"} value={mode==="login"?identifier:email} onChange={e=>mode==="login"?setIdentifier(e.target.value):setEmail(e.target.value)} placeholder={mode==="login"?t("Email or username"):"name@example.com"}/></label>
    <label>{t("PASSWORD")}<input required type="password" autoComplete={mode==="login"?"current-password":"new-password"} minLength={mode==="signup"?8:1} value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••"/></label>
    {error&&<p className="auth-error" role="alert">{error}</p>}
    <button disabled={loading} className="btn btn-dark full" type="submit">{t(loading?"PLEASE WAIT…":mode==="login"?"LOG IN":"CREATE ACCOUNT")}<ArrowRight size={17}/></button>
   </form>
   <p className="auth-switch">{t(mode==="login"?"New to NOIRÉ?":"Already have an account?")} <button onClick={()=>switchMode(mode==="login"?"signup":"login")}>{t(mode==="login"?"Sign up":"Log in")}</button></p>
   <p className="auth-footnote"><LockKeyhole size={13}/> {t("Your account and order information stay private.")}</p>
  </section>
 </div>;
}
