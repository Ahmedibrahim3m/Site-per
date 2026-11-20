"use client";
import Link from "next/link";
import Image from "next/image";
import {ArrowUpRight, Instagram, Facebook, Music2} from "lucide-react";
import WhatsAppLogo from "@/components/whatsapp-logo";
import {useLanguage} from "@/components/language-provider";

/** NOIRÉ remains the primary brand. ARVELL credit is intentionally understated. */
export default function LuxuryFooter({whatsappNumber="",instagramUrl="",facebookUrl="",tiktokUrl=""}:{whatsappNumber?:string|null;instagramUrl?:string|null;facebookUrl?:string|null;tiktokUrl?:string|null}){
 const {t}=useLanguage();
 const waDigits=(whatsappNumber||"").replace(/\D/g,"");
 const waUrl=waDigits?`https://wa.me/${waDigits}?text=${encodeURIComponent("Hello NOIRÉ, I'd like to ask about your fragrances.")}`:"";
 const instagram=/^https:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9_.-]+\/?(?:\?.*)?$/i.test(instagramUrl||"")?instagramUrl:"";
 const safeSocial=(raw:string,domain:string)=>{try{const u=new URL(raw);return u.protocol==="https:"&&[domain,`www.${domain}`].includes(u.hostname.toLowerCase())&&u.pathname.length>1?u.href:"";}catch{return "";}};
 const facebook=safeSocial(facebookUrl||"","facebook.com"),tiktok=safeSocial(tiktokUrl||"","tiktok.com");
 const portfolio=(process.env.NEXT_PUBLIC_ARVELL_PORTFOLIO_URL||"").trim();
 const portfolioUrl=/^https:\/\//i.test(portfolio)?portfolio:"";
 const credit=<span className="arvell-signature"><span>@powered by <strong>ARVELL</strong></span><Image src="/brand/arvell-mark.png" alt="ARVELL icon" width={20} height={20} unoptimized/></span>;
 return <footer className="noire-lux-footer">
   <div className="footer-invitation"><p className="eyebrow">{t("THE ART OF FRAGRANCE")}</p><h2>{t("Every scent tells")} <em>{t("a story.")}</em></h2><p>{t("Discover the scent that feels like yours.")}</p><Link href="/#shop" className="footer-discover">{t("EXPLORE FRAGRANCES")} <ArrowUpRight size={16}/></Link></div>
   <div className="footer-columns"><div className="footer-identity"><Link className="brand footer-brand" href="/">NOIR<span>É</span><small>PARFUMS</small></Link><p>{t("Made to leave an impression.")}</p></div>
    <nav aria-label="Footer navigation"><b>{t("EXPLORE")}</b><Link href="/#collections">{t("Collections")}</Link><Link href="/#shop">{t("All fragrances")}</Link><Link href="/story">{t("Our story")}</Link><Link href="/policies">{t("Shipping, returns & privacy")}</Link></nav>
    <div className="footer-connect"><b>{t("CONNECT")}</b><div className="footer-socials">{waUrl&&<a href={waUrl} target="_blank" rel="noopener noreferrer" aria-label="Chat with NOIRÉ on WhatsApp"><WhatsAppLogo size={18}/></a>}{instagram&&<a href={instagram} target="_blank" rel="noopener noreferrer" aria-label="NOIRÉ on Instagram"><Instagram size={18}/></a>}{facebook&&<a href={facebook} target="_blank" rel="noopener noreferrer" aria-label="NOIRÉ on Facebook"><Facebook size={18}/></a>}{tiktok&&<a href={tiktok} target="_blank" rel="noopener noreferrer" aria-label="NOIRÉ on TikTok"><Music2 size={18}/></a>}</div><p>{t("Here to help you find your signature scent.")}</p></div>
   </div>
   <div className="footer-bottom"><small>© {new Date().getFullYear()} NOIRÉ PARFUMS. {t("ALL RIGHTS RESERVED.")}</small>{portfolioUrl?<a href={portfolioUrl} rel="noopener noreferrer" target="_blank" aria-label="Visit the ARVELL portfolio">{credit}</a>:credit}</div>
  </footer>;
}
