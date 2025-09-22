const CACHE='onirim-v23';
const ASSETS=['./','./index.html','./style.css','./app.js','./manifest.json','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>k===CACHE?null:caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method==='GET'&&ASSETS.some(u=>r.url.includes(u.replace('./','')))){e.respondWith(caches.match(r).then(x=>x||fetch(r)));return;}
e.respondWith(fetch(r).then(resp=>{const copy=resp.clone();caches.open(CACHE).then(c=>c.put(r,copy));return resp;}).catch(()=>caches.match(r)));});