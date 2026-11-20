/** Read persisted JSON image arrays without fabricating product views. */
export function galleryUrls(primary:string,stored?:string|null):string[]{
 let candidates:string[]=[];
 try{const value=JSON.parse(stored||"[]");if(Array.isArray(value))candidates=value.filter((v):v is string=>typeof v==="string");}catch{}
 return [...new Set([primary,...candidates].filter(Boolean))].slice(0,9);
}
