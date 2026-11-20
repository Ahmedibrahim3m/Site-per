/* NOIRÉ PWA: no caching of protected pages, API responses, receipts or customer data. */
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{
 let data={title:'NOIRÉ Admin',body:'A new store update is available.',url:'/admin?tab=notifications'};
 try{if(event.data)data={...data,...event.data.json()}}catch{}
 const target=typeof data.url==='string'&&data.url.startsWith('/admin')?data.url:'/admin?tab=notifications';
 event.waitUntil(self.registration.showNotification(data.title,{body:data.body,icon:'/icons/noire-192.png',badge:'/icons/noire-192.png',tag:`noire-${data.kind||'notice'}-${Date.now()}`,data:{url:target}}));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();const target=new URL(event.notification.data?.url||'/admin?tab=notifications',self.location.origin).href;
 event.waitUntil((async()=>{const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});const same=windows.find(c=>c.url.startsWith(self.location.origin));if(same){await same.focus();same.navigate(target);return;}await self.clients.openWindow(target);})());
});
