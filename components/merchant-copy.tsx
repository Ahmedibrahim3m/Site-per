"use client";
import {useLanguage} from "@/components/language-provider";
import {merchantText} from "@/lib/i18n";
/** Only displays a merchant-supplied Arabic translation. No legal or product text is fabricated. */
export default function MerchantCopy({english,arabic}:{english:string;arabic?:string|null}){
 const {locale}=useLanguage();return <span dir={locale==="ar"&&arabic?.trim()?"rtl":"auto"}>{merchantText(locale,english,arabic)}</span>;
}
