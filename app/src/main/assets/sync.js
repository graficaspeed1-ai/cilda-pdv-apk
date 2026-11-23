/* Sincronização com Supabase para o PDV CILDA BIJU.
   - Cliente próprio (fetch + WebSocket): não depende de CDN externo.
   - Failover automático: tenta o endereço direto e, se não resolver (DNS/bloqueio de operadora),
     tenta os proxies listados em PDV_CONFIG.proxies.
   - Tempo real via Realtime + polling de segurança quando o Realtime não conecta.
   Sem config.js preenchido, o PDV roda 100% local. */
(function(){
  const C=window.PDV_CONFIG||{};
  if(!C.url||!C.key||C.url.includes('SEU-PROJETO'))return;
  const norm=b=>{try{return new URL(b,location.href).href.replace(/\/+$/,'')}catch(e){return null}};
  const DIRECT=norm(C.url);
  const BASES=[DIRECT].concat((C.proxies||[]).map(norm)).filter(Boolean);
  const POLL=C.pollMs||20000;
  const OFF='Sem conexão. Os dados ficam salvos neste aparelho.';
  const NETERR='Não foi possível alcançar o servidor. Verifique a internet ou toque em "Testar conexão".';
  let base=BASES[0],sess=null,user=null,store=null,rev=0,timer=null,msg='Aguardando entrar.',dirty=false,pulling=false;
  let sock=null,rtok=false,hb=null,rtTimer=null,rtTopic='',rtTry=0,hbRef=0,tick=0,refreshing=null;
  try{const b=localStorage.getItem('pdvbase');if(b&&BASES.includes(b))base=b}catch(e){}
  const $$=id=>document.getElementById(id);
  const say=t=>{msg=t;const e=$$('sstat');if(e)e.textContent=t};
  const local=()=>{try{localStorage.setItem('pdv',JSON.stringify({P,stock,sales,closes,pin,users,fees,cats:catsL}))}catch(e){}};
  const snap=()=>({P,stock,sales,closes,users,fees,cats:catsL});

  /* ---------- sessão ---------- */
  function loadSess(){try{sess=JSON.parse(localStorage.getItem('pdvsess')||'null')}catch(e){sess=null}user=sess&&sess.user||null}
  function saveSess(s){sess=s;user=s?s.user:null;try{s?localStorage.setItem('pdvsess',JSON.stringify(s)):localStorage.removeItem('pdvsess')}catch(e){}}

  /* ---------- rede com failover ---------- */
  async function net(path,opt,ms){
    const order=[base].concat(BASES.filter(b=>b!==base));
    let last;
    for(const b of order){
      const c=new AbortController(),t=setTimeout(()=>c.abort(),ms||12000);
      try{
        const r=await fetch(b+path,Object.assign({},opt||{},{signal:c.signal}));
        clearTimeout(t);
        if(b!==base){base=b;try{localStorage.setItem('pdvbase',b)}catch(e){}if(sock){closeRt();setTimeout(rt,300)}}
        return r;
      }catch(e){clearTimeout(t);last=e}
    }
    throw last||new Error('net');
  }
  async function auth(grant,body){
    const r=await net('/auth/v1/token?grant_type='+grant,{method:'POST',headers:{apikey:C.key,'Content-Type':'application/json'},body:JSON.stringify(body)});
    const j=await r.json().catch(()=>({}));
    if(!r.ok||!j.access_token)return{error:{status:r.status,message:j.error_description||j.msg||j.message||''}};
    return{session:{access_token:j.access_token,refresh_token:j.refresh_token,expires_at:j.expires_at||Math.floor(Date.now()/1000)+(j.expires_in||3600),user:{id:j.user.id,email:j.user.email}}};
  }
  async function token(force){
    if(!sess)return null;
    try{const o=JSON.parse(localStorage.getItem('pdvsess')||'null');if(o&&o.expires_at>sess.expires_at)sess=o}catch(e){}
    if(!force&&sess.expires_at-Date.now()/1000>60)return sess.access_token;
    if(!refreshing)refreshing=(async()=>{
      try{
        const r=await auth('refresh_token',{refresh_token:sess.refresh_token});
        if(r.error){if([400,401,403].includes(r.error.status))expire();return null}
        saveSess(r.session);
        if(rtok)sendRt('access_token',{access_token:sess.access_token});
        return sess.access_token;
      }catch(e){return null}finally{refreshing=null}
    })();
    const t=await refreshing;
    return t||(sess&&sess.expires_at>Date.now()/1000?sess.access_token:null);
  }
  function expire(){closeRt();saveSess(null);store=null;say('Sessão expirada. Entre na conta novamente.')}
  async function rest(method,path,body,prefer,retry){
    const t=await token(retry);
    if(!t)return{error:{auth:true,message:'sem sessão'}};
    const h={apikey:C.key,Authorization:'Bearer '+t};
    if(body!==undefined)h['Content-Type']='application/json';
    if(prefer)h.Prefer=prefer;
    let r;
    try{r=await net('/rest/v1/'+path,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body)})}
    catch(e){return{error:{net:true,message:String(e&&e.message||e)}}}
    const txt=await r.text();let j=null;try{j=txt?JSON.parse(txt):null}catch(e){}
    if(r.status===401&&!retry)return rest(method,path,body,prefer,true);
    if(!r.ok)return{error:{status:r.status,code:j&&j.code,message:(j&&(j.message||j.hint))||txt}};
    return{data:j};
  }
  const fail=e=>say(e.net?OFF:e.auth?'Sessão expirada. Entre na conta novamente.':'Não foi possível sincronizar agora.');

  /* ---------- pull / push ---------- */
  async function start(){
    loadSess();
    if(user){say('Conectando...');await pull();rt()}
  }
  async function pull(){
    if(pulling||!user)return false;
    pulling=true;
    try{
      const pr=await rest('GET','profiles?select=store_id&user_id=eq.'+user.id+'&limit=1');
      if(pr.error){fail(pr.error);return false}
      if(!pr.data||!pr.data.length){say('Conta sem loja vinculada. Veja o README.');return false}
      store=pr.data[0].store_id;
      // dados deste aparelho pertencem a uma loja só: ao entrar em outra conta, nada é misturado
      const last=localStorage.getItem('pdvstore');
      if(last&&last!==store){localStorage.removeItem('pdv');localStorage.setItem('pdvstore',store);location.reload();return false}
      if(!last)localStorage.setItem('pdvstore',store);
      const r=await rest('GET','snapshots?select=data,rev&store_id=eq.'+store+'&limit=1');
      if(r.error){fail(r.error);return false}
      if(!r.data||!r.data.length){
        const i=await rest('POST','snapshots',{store_id:store,data:snap(),rev:1},'return=minimal');
        rev=1;say(i.error?'Peça a um administrador para entrar primeiro e criar os dados da loja.':'Primeira sincronização feita.');return true;
      }
      const d=r.data[0].data||{},mine=sales.filter(s=>!(d.sales||[]).some(x=>x.t===s.t));
      P=d.P||P;stock=d.stock||stock;sales=d.sales||[];closes=d.closes||[];rev=r.data[0].rev;
      if(d.users&&d.users.length)users=d.users;
      if(d.fees)fees=d.fees;
      if(d.cats)catsL=d.cats;
      if(cur){cur=users.find(u=>u.id===cur.id)||null;if(!cur){adm=false;lv()}else adm=cur.role==='admin'||adm}
      // vendas feitas offline neste aparelho não se perdem: entram de novo e baixam o estoque
      mine.forEach(s=>{sales.push(s);(s.it||[]).forEach(([id,v,n])=>{const k=id+'|'+v;if(k in stock)stock[k]-=n})});
      cart=cart.filter(i=>P.some(p=>p.id===i.id&&i.v in p.v));
      local();renderAll();say('Sincronizado.');dirty=false;
      if(mine.length)push();
      return true;
    }finally{pulling=false}
  }
  function push(){
    if(!user||!store)return;
    clearTimeout(timer);dirty=true;
    timer=setTimeout(doPush,1200);
  }
  async function doPush(){
    timer=null;
    if(!user||!store)return;
    if(pulling){timer=setTimeout(doPush,1000);return}
    const r=await rest('PATCH','snapshots?store_id=eq.'+store+'&rev=eq.'+rev+'&select=rev',{data:snap(),rev:rev+1,updated_at:new Date().toISOString()},'return=representation');
    if(r.error){
      const c=r.error.code;
      if(c==='42501'||c==='23514'){toast('O servidor não aceitou essa alteração. Peça a um administrador.');await pull();return}
      if(c==='40001'){await pull();return}
      if(r.error.auth){say('Sessão expirada. Entre na conta novamente.');return}
      say(r.error.net?OFF:'Não foi possível enviar agora. Tentando de novo...');
      timer=setTimeout(doPush,15000); // tenta de novo sozinho
      return;
    }
    if(!r.data||!r.data.length){toast('Outro aparelho atualizou os dados. Sincronizando.');await pull();return}
    rev=r.data[0].rev;dirty=false;say('Sincronizado.');
  }
  async function poll(){
    if(!user||!store||pulling||!navigator.onLine)return;
    if(dirty){if(!timer)push();return}
    const r=await rest('GET','snapshots?select=rev&store_id=eq.'+store+'&limit=1');
    if(r.error){if(r.error.net)say(OFF);return}
    if(r.data&&r.data[0]&&Number(r.data[0].rev)>rev){say('Atualização recebida de outro dispositivo...');pull()}
    else if(msg===OFF)say('Sincronizado.');
  }

  /* ---------- tempo real (Realtime / Phoenix) ---------- */
  function sendRt(event,payload,ref){
    if(sock&&sock.readyState===1)sock.send(JSON.stringify({topic:rtTopic,event,payload,ref:ref||String(++hbRef),join_ref:'1'}));
  }
  function closeRt(){
    rtok=false;clearInterval(hb);clearTimeout(rtTimer);
    if(sock){const s=sock;sock=null;try{s.close()}catch(e){}}
  }
  function rtRetry(){clearTimeout(rtTimer);if(!user)return;rtTimer=setTimeout(rt,Math.min(60000,3000*Math.pow(2,rtTry++)))}
  function rt(){
    if(!user||!store||!window.WebSocket)return;
    if(sock&&sock.readyState<2)return;
    clearTimeout(rtTimer);
    let s;
    try{s=new WebSocket(base.replace(/^http/,'ws')+'/realtime/v1/websocket?apikey='+encodeURIComponent(C.key)+'&vsn=1.0.0')}catch(e){rtRetry();return}
    sock=s;rtTopic='realtime:pdv-snapshots-'+store;
    s.onopen=async()=>{
      const t=await token()||'';
      if(sock!==s)return;
      sendRt('phx_join',{config:{broadcast:{ack:false,self:false},presence:{key:''},postgres_changes:[{event:'UPDATE',schema:'public',table:'snapshots',filter:'store_id=eq.'+store}],private:false},access_token:t},'1');
      clearInterval(hb);
      hb=setInterval(()=>{if(s.readyState===1)s.send(JSON.stringify({topic:'phoenix',event:'heartbeat',payload:{},ref:String(++hbRef)}))},25000);
    };
    s.onmessage=e=>{
      let m;try{m=JSON.parse(e.data)}catch(x){return}
      if(m.topic!==rtTopic)return;
      if(m.event==='phx_reply'){rtok=!!(m.payload&&m.payload.status==='ok');if(rtok)rtTry=0}
      else if(m.event==='phx_error'||m.event==='phx_close')rtok=false;
      else if(m.event==='postgres_changes'){
        const rec=m.payload&&m.payload.data&&m.payload.data.record;
        if(rec&&Number(rec.rev)>rev&&!dirty&&!pulling){say('Atualização recebida de outro dispositivo...');pull()}
      }
    };
    s.onclose=()=>{if(sock===s){rtok=false;clearInterval(hb);sock=null;rtRetry()}};
    s.onerror=()=>{try{s.close()}catch(e){}};
  }

  /* ---------- diagnóstico ---------- */
  async function testConn(){
    say('Testando...');
    const out=[];
    for(const b of BASES){
      const c=new AbortController(),t=setTimeout(()=>c.abort(),8000),nm=b===DIRECT?'Direto':'Proxy';
      try{const r=await fetch(b+'/auth/v1/health',{headers:{apikey:C.key},signal:c.signal});out.push(nm+': '+(r.ok?'OK':'erro '+r.status))}
      catch(e){out.push(nm+': sem acesso')}
      clearTimeout(t);
    }
    if(BASES.length===1)out.push('Proxy: não configurado');
    out.push(rtok?'Tempo real: ativo':'Tempo real: inativo (usa verificação periódica)');
    say(out.join(' · '));
  }

  /* ---------- painel ---------- */
  function panel(){
    const B=$$('box');B.className='box';
    B.innerHTML=user
      ?`<b>Conta</b><div class="mute">${user.email}</div><div class="mute" id="sstat">${msg}</div><button class="go" id="sy-now">Sincronizar agora</button><button class="chip" id="sy-test">Testar conexão</button><button class="chip" id="sy-out">Sair da conta</button><button class="chip" data-a="close">Fechar</button>`
      :`<b>Entrar na conta da loja</b><input id="sy-e" type="email" placeholder="E-mail" autocomplete="username"><input id="sy-p" type="password" placeholder="Senha" autocomplete="current-password"><div class="mute" id="sstat"></div><button class="go" id="sy-in">Entrar</button><button class="chip" id="sy-test">Testar conexão</button><button class="chip" data-a="close">Cancelar</button>`;
    $$('modal').classList.add('on');
    const on=(id,f)=>{const e=$$(id);if(e)e.onclick=f};
    on('sy-test',testConn);
    on('sy-in',async()=>{
      const e=$$('sy-e').value.trim(),p=$$('sy-p').value;
      if(!e||!p){say('Informe e-mail e senha.');return}
      say('Entrando...');
      let r;
      try{r=await auth('password',{email:e,password:p})}catch(x){say(NETERR);return}
      if(r.error){
        const m=(r.error.message||'').toLowerCase();
        say(m.includes('confirm')?'E-mail ainda não confirmado.':r.error.status===400||r.error.status===401?'E-mail ou senha incorretos.':'Erro do servidor ('+r.error.status+'). Tente de novo.');
        return;
      }
      saveSess(r.session);await pull();rt();panel();
    });
    on('sy-now',async()=>{say('Sincronizando...');await pull();rt();if(!dirty)await poll()});
    on('sy-out',async()=>{
      if(dirty){say('Há vendas ainda não enviadas. Conecte-se e sincronize antes de sair.');return}
      try{const t=sess&&sess.access_token;if(t)await net('/auth/v1/logout',{method:'POST',headers:{apikey:C.key,Authorization:'Bearer '+t}},4000)}catch(e){}
      closeRt();saveSess(null);
      try{localStorage.removeItem('pdv');localStorage.removeItem('pdvstore')}catch(e){}
      location.reload();
    });
  }

  window.pdvSync={push,panel};
  window.addEventListener('online',()=>{if(dirty)push();else{poll();rt()}});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){if(dirty)push();else poll();rt()}});
  setInterval(()=>{tick++;if(!rtok||tick%6===0)poll();if(user&&store&&!sock)rt()},POLL);
  start();
})();
