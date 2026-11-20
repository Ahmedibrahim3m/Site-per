/** Always checks the response type before JSON parsing, even if Next.js returns an HTML error page. */
export async function apiJson<T>(url:string,init?:RequestInit):Promise<T>{
 let response:Response;
 try{response=await fetch(url,{cache:"no-store",credentials:"same-origin",...init});}
 catch{throw new Error("Cannot connect to the server. Check that Start.bat is running.");}
 const type=response.headers.get("content-type")||"";
 if(!type.includes("application/json")){
   throw new Error(`Server returned a webpage instead of JSON (${response.status}). Run Setup.bat, restart Start.bat, and check the terminal for route errors.`);
 }
 let result:any;
 try{result=await response.json();}catch{throw new Error("The server returned an invalid response. Check the terminal.");}
 if(!response.ok)throw new Error(typeof result?.error==="string"?result.error:`Request failed (${response.status})`);
 return result as T;
}
export const jsonRequest=(method:"POST"|"PATCH"|"DELETE",data?:unknown):RequestInit=>({method,headers:{"Content-Type":"application/json"},body:data===undefined?undefined:JSON.stringify(data)});
