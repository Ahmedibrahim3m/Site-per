"use client";
import {useState,type FormEvent} from "react";
import {apiJson,jsonRequest} from "@/lib/client-api";
export default function PaymentReference({reference,initial=""}:{reference:string;initial?:string}){
 const [value,setValue]=useState(initial),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false);
 async function submit(e:FormEvent){e.preventDefault();setBusy(true);setNotice("");try{await apiJson(`/api/orders/${encodeURIComponent(reference)}/payment-reference`,jsonRequest("PATCH",{paymentReference:value}));setNotice("Reference saved. Your transfer is still awaiting manual confirmation.");}catch(err){setNotice(err instanceof Error?err.message:"Could not save reference");}finally{setBusy(false)}}
 return <form onSubmit={submit} className="reference-form"><label>Transfer reference / transaction ID<input required minLength={5} maxLength={90} value={value} onChange={e=>setValue(e.target.value)} placeholder="Your transaction ID"/></label><button className="btn btn-outline" type="submit" disabled={busy}>{busy?"SAVING…":"SUBMIT TRANSFER REFERENCE"}</button>{notice&&<p role="status">{notice}</p>}<small>Submitting a reference does not mark the payment as received. NOIRÉ verifies funds manually.</small></form>;
}
