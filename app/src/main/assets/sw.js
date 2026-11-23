const V='pdv-v16',APP=['./','index.html','config.js','sync.js','app.js','boot.js','manifest.webmanifest','icon-maskable-512.png','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(APP)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener('fetch',e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=='GET')return;
  const own=u.origin===location.origin,cdn=/(^|\.)(jsdelivr\.net|googleapis\.com|gstatic\.com)$/.test(u.hostname);
  if(!own&&!cdn)return; // API do Supabase passa direto
  if(own&&/^\/(sb|auth|rest|realtime)\//.test(u.pathname))return; // proxy na mesma origem nunca é cacheado
  const store=res=>{const c=res.clone();caches.open(V).then(x=>x.put(r,c));return res};
  if(own)e.respondWith(fetch(r).then(store).catch(()=>caches.match(r).then(h=>h||caches.match('index.html'))));
  else e.respondWith(caches.match(r).then(h=>h||fetch(r).then(store)));
});
