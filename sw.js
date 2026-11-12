const C="edsp-v2";
const CDN="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.0/dist/umd/supabase.js";
const FILES=["./","index.html","demo.html","config.js","manifest.webmanifest","icon-192.png","icon-512.png",CDN];
self.addEventListener("install",e=>{
 e.waitUntil(caches.open(C).then(c=>Promise.all(FILES.map(f=>c.add(f).catch(()=>{})))));
 self.skipWaiting();
});
self.addEventListener("activate",e=>{
 e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))));
 self.clients.claim();
});
self.addEventListener("fetch",e=>{
 const r=e.request,u=new URL(r.url);
 if(r.method!=="GET"||u.hostname.endsWith(".supabase.co"))return;   // les données ne sont jamais mises en cache ici
 if(u.origin===location.origin){                                    // fichiers de l'application : réseau d'abord
  e.respondWith(fetch(r).then(res=>{const cp=res.clone();caches.open(C).then(c=>c.put(r,cp));return res})
   .catch(()=>caches.match(r).then(m=>m||caches.match("index.html"))));
 }else{                                                              // bibliothèque externe : cache d'abord
  e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{const cp=res.clone();caches.open(C).then(c=>c.put(r,cp));return res})));
 }
});
