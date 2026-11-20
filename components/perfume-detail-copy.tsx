"use client";
import AddToBag from "@/components/add-to-bag";
import {useLanguage} from "@/components/language-provider";
import {merchantText} from "@/lib/i18n";
type PerfumeInfo={id:string;name:string;nameAr:string|null;description:string;descriptionAr:string|null;notes:string;notesAr:string|null;topNotes:string;topNotesAr:string|null;heartNotes:string;heartNotesAr:string|null;baseNotes:string;baseNotesAr:string|null;price:number;stock:number;size:string;concentration:string;collectionName:string;collectionNameAr:string|null;customNotes:{label:string;value:string;labelAr?:string;valueAr?:string}[]};
export default function PerfumeDetailCopy({product:p}:{product:PerfumeInfo}){
 const {locale,t,money}=useLanguage();const text=(en:string,ar?:string|null)=>merchantText(locale,en,ar);
 return <div className="perfume-detail-copy">
  <p className="eyebrow">{text(p.collectionName,p.collectionNameAr)} · {p.concentration}</p>
  <h1>{text(p.name,p.nameAr)}</h1><p className="detail-intro">{text(p.description,p.descriptionAr)}</p>
  <h2 className="noire-bidi-number">{money(p.price)}</h2>
  <p>{p.size} · {p.stock>0?`${p.stock} ${t("in stock")}`:t("Out of stock")}</p>
  <AddToBag productId={p.id} disabled={p.stock<=0}/>
  <div className="fragrance-pyramid"><h3>{t("The scent story")}</h3><p>{text(p.notes,p.notesAr)}</p>
   {([["TOP NOTES",p.topNotes,p.topNotesAr],["HEART NOTES",p.heartNotes,p.heartNotesAr],["BASE NOTES",p.baseNotes,p.baseNotesAr]] as [string,string,string|null][]).map(([name,value,valueAr])=><div key={name}><span>{t(name||"")}</span><p>{text(value||t("Details coming soon"),valueAr)}</p></div>)}
   {p.customNotes.map((note,index)=><div key={`${note.label}-${index}`}><span>{text(note.label,note.labelAr)}</span><p>{text(note.value,note.valueAr)}</p></div>)}
  </div>
 </div>;
}
