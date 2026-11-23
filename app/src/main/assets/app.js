const $=s=>document.querySelector(s);
const brl=n=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
let P=[
{id:1,sku:'PIR001',n:'Piranha de cabelo',c:'Cabelo',p:4,w:2.5,k:[3,10],v:{Preto:30,Dourado:24,Rosa:18}},
{id:2,sku:'LAC001',n:'Laço de cetim',c:'Cabelo',p:8.9,w:5.5,v:{Vermelho:12,Preto:15,Branco:9,Rosa:3}},
{id:3,sku:'SCR001',n:'Xuxinha de veludo',c:'Cabelo',p:7.5,w:4.5,k:[2,13],v:{Vinho:14,Preto:20,Nude:11}},
{id:4,sku:'PRE001',n:'Presilha bico de pato',c:'Cabelo',p:5,w:3,k:[3,12],v:{Dourado:25,Prateado:22}},
{id:5,sku:'TIA001',n:'Tiara de pérolas',c:'Cabelo',p:16.9,w:10,v:{Branca:8,Preta:6}},
{id:6,sku:'PRG001',n:'Pregadeira de pérola',c:'Pregadeiras',p:14.9,w:9,v:{Dourado:10,Prateado:7}},
{id:7,sku:'PRG002',n:'Pregadeira de flor',c:'Pregadeiras',p:12.9,w:7.5,v:{Única:16}},
{id:8,sku:'BRI001',n:'Brinco argola',c:'Brincos',p:19.9,w:12,v:{P:14,M:12,G:2}},
{id:9,sku:'BRI002',n:'Brinco de pérola',c:'Brincos',p:11.9,w:7,k:[2,20],v:{Dourado:18,Prateado:15}},
{id:10,sku:'COL001',n:'Colar choker',c:'Colares',p:24.9,w:15,v:{Dourado:9,Prateado:11}},
{id:11,sku:'PUL001',n:'Pulseira elástica',c:'Pulseiras',p:6,w:3.5,k:[3,15],v:{Colorida:40,Neutra:35}},
{id:12,sku:'ANE001',n:'Anel ajustável',c:'Anéis',p:12.9,w:8,v:{Dourado:20,Prateado:18}}
];
const CATS=()=>['Todos',...new Set([...catsL,...P.map(p=>p.c)].filter(c=>P.some(p=>p.c===c)))];
const hp=s=>{let h=5381;for(const c of 'pdv:'+s)h=((h<<5)+h+c.charCodeAt(0))>>>0;return h.toString(36)};
let users=[],cur=null,editUid=0,authBy='',pend=null,fees=[],opSel=0,inst=1,editFid=0,imgData='',catsL=[],editCi=-1,view='home';
let stock={},sales=[],closes=[],cart=[],cat='Todos',pay='Pix',q='',adm=false,pin='1234',editId=0,stopf=null,camOn=0;
try{const d=JSON.parse(localStorage.getItem('pdv')||'null');if(d){if(d.P)P=d.P;stock=d.stock||{};sales=d.sales||[];closes=d.closes||[];pin=d.pin||pin;users=d.users||[];fees=d.fees||[];catsL=d.cats||[]}}catch(e){}
if(!users.length)users=[{id:1,name:'Administrador',role:'admin',pin:hp(pin),perm:{}}];
if(!catsL.length)catsL=[...new Set(P.map(p=>p.c))];
P.forEach(p=>Object.keys(p.v).forEach(v=>{if(!((p.id+'|'+v) in stock))stock[p.id+'|'+v]=p.v[v]}));
const save=()=>{try{localStorage.setItem('pdv',JSON.stringify({P,stock,sales,closes,pin,users,fees,cats:catsL}))}catch(e){toast('Sem espaço para salvar neste aparelho. Remova fotos ou faça backup.')};if(window.pdvSync)pdvSync.push()};
const byId=id=>P.find(p=>p.id===id);
const ws=()=>$('#ws').checked;
const unit=p=>ws()&&p.w?p.w:p.p;
const tot=p=>Object.keys(p.v).reduce((a,v)=>a+stock[p.id+'|'+v],0);
const inCart=(id,v)=>{const i=cart.find(x=>x.id===id&&x.v===v);return i?i.q:0};
let tt;function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('on'),2200)}

function calc(){
  let sub=0,kit=0;const by={};
  cart.forEach(i=>{const p=byId(i.id);sub+=i.q*unit(p);by[i.id]=(by[i.id]||0)+i.q});
  if(!ws())Object.keys(by).forEach(id=>{const p=byId(+id);if(p.k){const [n,pr]=p.k,q=by[id];kit+=q*p.p-(Math.floor(q/n)*pr+(q%n)*p.p)}});
  const d=Math.min(100,Math.max(0,+$('#disc').value||0));
  const desc=(sub-kit)*d/100;
  return{sub,kit,desc,total:sub-kit-desc,n:cart.reduce((a,i)=>a+i.q,0)};
}

function renderHead(){
  const day=new Date().toDateString(),s=sales.filter(x=>x.day===day&&!x.closed);
  $('#stat').innerHTML=`${cur?`<b>${cur.name}</b> · `:''}Hoje: <b>${s.length}</b> ${s.length===1?'venda':'vendas'} · <b>${brl(s.reduce((a,x)=>a+x.total,0))}</b>`;
}
function renderCats(){
  $('#cats').innerHTML=CATS().map(c=>`<button class="chip" aria-pressed="${c===cat}" data-a="cat" data-v="${c}">${c}</button>`).join('');
}
function renderGrid(){
  const t=q.trim().toLowerCase();
  const L=P.filter(p=>(cat==='Todos'||p.c===cat)&&(!t||qw().every(w=>norm(p.n+' '+p.sku+' '+p.c+' '+Object.keys(p.v).join(' ')).includes(w))));
  $('#grid').innerHTML=L.length?L.map(p=>{
    const s=tot(p);
    return `<button class="card" data-a="pick" data-id="${p.id}" ${s<=0?'disabled':''}>
      ${p.img?`<img class="pimg" src="${p.img}" alt="">`:''}<span class="nm">${p.n}</span><span class="sku">${p.sku}</span>
      ${p.k&&!ws()?`<span class="tag">${p.k[0]} por ${brl(p.k[1])}</span>`:''}
      ${s<=0?'<span class="low">Sem estoque</span>':s<=6?`<span class="low">Restam ${s}</span>`:''}
      <span class="pr">${brl(unit(p))}</span></button>`}).join(''):'<div class="empty">Nenhum produto encontrado. Tente outro nome ou código.</div>';
}
function renderCart(){
  const c=calc();
  const fr=rateOf(),fee=fr?c.total*fr.r/100:0;
  $('#cardrow').innerHTML=(pay==='Débito'||pay==='Crédito')?(fees.length?`<div class="row"><span>Operadora</span><select id="opsel">${fees.map(o=>`<option value="${o.id}" ${o.id===fr.o.id?'selected':''}>${o.name}</option>`).join('')}</select></div>`+(pay==='Crédito'?`<div class="row"><span>Parcelas</span><select id="instsel">${[...Array(12)].map((_,i)=>`<option value="${i+1}" ${i+1===inst?'selected':''}>${i+1}x</option>`).join('')}</select></div>`:''):'<div class="mute">Cadastre a operadora da maquininha em Área administrativa &gt; Taxas.</div>'):'';
  $('#items').innerHTML=cart.length?cart.map((i,ix)=>{const p=byId(i.id);return `<div class="it">
    <div class="row"><span><b>${p.n}</b> <span class="mute">${i.v}</span></span><span>${brl(i.q*unit(p))}</span></div>
    <div class="row"><span class="qty"><button data-a="dec" data-i="${ix}" aria-label="Diminuir">−</button>${i.q}<button data-a="inc" data-i="${ix}" aria-label="Aumentar">+</button></span>
    <button class="chip" data-a="rm" data-i="${ix}">Remover</button></div></div>`}).join(''):'<div class="empty">Toque num produto ou digite o código e tecle Enter para começar a venda.</div>';
  $('#sum').innerHTML=`<div class="row mute"><span>Subtotal</span><span>${brl(c.sub)}</span></div>`+
    (c.kit>0?`<div class="row mute"><span>Desconto de kit</span><span>−${brl(c.kit)}</span></div>`:'')+
    (c.desc>0?`<div class="row mute"><span>Desconto</span><span>−${brl(c.desc)}</span></div>`:'')+
    `<div class="row"><span>Total</span><span class="tot">${brl(c.total)}</span></div>`+(fr?`<div class="row mute"><span>Taxa da maquininha (${fr.r}%)</span><span>−${brl(fee)}</span></div><div class="row"><span>Você recebe</span><b>${brl(c.total-fee)}</b></div>`:'');
  $('#pays').innerHTML=['Pix','Débito','Crédito','Dinheiro'].map(m=>`<button class="chip" aria-pressed="${m===pay}" data-a="pay" data-v="${m}">${{Pix:'💠',Débito:'💳',Crédito:'💳',Dinheiro:'💵'}[m]} ${m}</button>`).join('');
  $('#cashrow').hidden=pay!=='Dinheiro';
  const r=+$('#cash').value||0;
  $('#change').textContent=pay==='Dinheiro'&&r?(r>=c.total?`Troco: ${brl(r-c.total)}`:`Faltam ${brl(c.total-r)}`):'';
  $('#finish').disabled=!cart.length;$('#finish').textContent=cart.length?`Finalizar venda · ${brl(c.total)}`:'Adicione produtos para finalizar';
  $('#barn').textContent=c.n?`Carrinho · ${c.n} ${c.n===1?'item':'itens'}`:'Carrinho vazio';
  $('#bart').textContent=brl(c.total);
}
function renderAll(){renderHead();renderCats();renderGrid();renderCart();if(view==='home')renderHome()}

function add(id,v){
  if(inCart(id,v)>=stock[id+'|'+v]){toast('Estoque insuficiente para esta variação.');return}
  const i=cart.find(x=>x.id===id&&x.v===v);i?i.q++:cart.push({id,v,q:1});
  closeModal();renderCart();renderGrid();
}
function pick(id){
  const p=byId(id),vs=Object.keys(p.v);
  if(vs.length===1){add(id,vs[0]);return}
  $('#box').className='box';$('#box').innerHTML=`<div class="row"><b>${p.n}</b><span class="mute">${brl(unit(p))}</span></div><div class="mute">Escolha a variação</div>`+
    vs.map(v=>{const s=stock[id+'|'+v]-inCart(id,v);return `<button class="v" data-a="var" data-id="${id}" data-v="${v}" ${s<=0?'disabled':''}><span>${v}</span><span class="mute">${s<=0?'Esgotado':s+' em estoque'}</span></button>`}).join('')+
    `<button class="chip" data-a="close">Cancelar</button>`;
  $('#modal').classList.add('on');
}
function closeModal(){if(stopf){const f=stopf;stopf=null;f()}$('#modal').classList.remove('on');if(cur&&cur.role!=='admin')adm=false;if(!cur)lv()}

function finish(){
  const c=calc();if(!cart.length)return;
  const fr=rateOf();
  if(c.desc>0&&!can('desc')&&!authBy){ask('Este desconto precisa de autorização',finish);return}
  if(pay==='Dinheiro'&&(+$('#cash').value||0)<c.total){toast('O valor recebido é menor que o total.');return}
  cart.forEach(i=>stock[i.id+'|'+i.v]-=i.q);
  const pv={};{const by={};cart.forEach(i=>by[i.id]=(by[i.id]||0)+i.q);const dk=Math.min(100,Math.max(0,+$('#disc').value||0));Object.keys(by).forEach(id=>{const p=byId(+id),q=by[id];let v=q*unit(p);if(!ws()&&p.k)v-=q*p.p-(Math.floor(q/p.k[0])*p.k[1]+(q%p.k[0])*p.p);pv[id]=+(v*(1-dk/100)).toFixed(2)})}
  sales.push({day:new Date().toDateString(),total:c.total,pay,n:c.n,t:Date.now(),by:cur?cur.name:'',au:authBy,pv,cost:+cart.reduce((a,i)=>a+i.q*(byId(i.id).cost||0),0).toFixed(2),fee:fr?+(c.total*fr.r/100).toFixed(2):0,op:fr?fr.o.name:'',parc:pay==='Crédito'?inst:0,it:cart.map(i=>[i.id,i.v,i.q])});
  save();toast(`Venda concluída · ${brl(c.total)} no ${pay}`);
  authBy='';cart=[];$('#disc').value=0;$('#cash').value='';
  $('#cart').classList.remove('open');renderAll();
}

document.addEventListener('click',e=>{
  const b=e.target.closest('[data-a]');if(!b){if(e.target.id==='modal')closeModal();return}
  const a=b.dataset.a,i=+b.dataset.i;
  if(a==='cat'){cat=b.dataset.v;renderCats();renderGrid()}
  else if(a==='pick')pick(+b.dataset.id);
  else if(a==='var')add(+b.dataset.id,b.dataset.v);
  else if(a==='close')closeModal();
  else if(a==='inc'){const it=cart[i];if(it.q<stock[it.id+'|'+it.v])it.q++;else toast('Estoque insuficiente para esta variação.');renderCart()}
  else if(a==='dec'){cart[i].q--;if(cart[i].q<=0)cart.splice(i,1);renderCart();renderGrid()}
  else if(a==='rm'){cart.splice(i,1);renderCart();renderGrid()}
  else if(a==='clear'){cart=[];renderCart();renderGrid()}
  else if(a==='pay'){pay=b.dataset.v;renderCart()}
  else if(a==='finish')finish();
  else if(a==='toggle')$('#cart').classList.toggle('open');
  else if(a==='panel')panel(b.dataset.v);
  else if(a==='addp')saveP();
  else if(a==='rs'){const id=+b.dataset.id;Object.keys(byId(id).v).forEach(v=>stock[id+'|'+v]+=10);save();panel('prod');renderAll()}
  else if(a==='delp'){const id=+b.dataset.id;P=P.filter(p=>p.id!==id);cart=cart.filter(x=>x.id!==id);save();panel('prod');renderAll();toast('Produto removido.')}
  else if(a==='closeday')closeday();
  else if(a==='mklab')mklab();
  else if(a==='login'){if(locked())return;const a2=users.find(u=>u.role==='admin'&&u.pin===hp($('#pin').value));if(a2){okPin();adm=true;panel(b.dataset.v)}else failPin()}
  else if(a==='logout')closeModal();
  else if(a==='ed')edp(+b.dataset.id);
  else if(a==='void')voidSale(i);
  else if(a==='setpin'){const v=$('#np').value.trim();if(/^\d{4,8}$/.test(v)){if(users.some(u=>u!==cur&&u.pin===hp(v)))toast('Esse PIN já está em uso.');else{cur.pin=hp(v);save();toast('Seu PIN foi alterado.')}}else toast('Use de 4 a 8 números.')}
  else if(a==='imp')imp();
  else if(a==='cam')cam3();
  else if(a==='acct'){if(window.pdvSync)pdvSync.panel();else toast('Sincronização não configurada. Veja o README.')}
  else if(a==='mscan'){const c=($('#mq')||{value:''}).value.trim();if(c){closeModal();if(!scan(c))toast('Código não encontrado: '+c)}}
  else if(a==='usel')lv(+b.dataset.id);
  else if(a==='uback')lv();
  else if(a==='ulogin'){if(locked())return;const u=users.find(x=>x.id===+b.dataset.id);if(u&&hp($('#lp').value)===u.pin){cur=u;adm=u.role==='admin';closeModal();renderHead();go('home');okPin();toast('Olá, '+u.name+'.')}else failPin()}
  else if(a==='lock'){cur=null;adm=false;renderHead();lv()}
  else if(a==='aok'){if(locked())return;const a2=users.find(u=>u.role==='admin'&&u.pin===hp($('#ap').value));if(!a2){failPin();return}okPin();const f=pend;pend=null;authBy=a2.name;closeModal();if(f)f()}
  else if(a==='saveu')saveU();
  else if(a==='rmimg'){imgData='';prev()}
  else if(a==='savef')saveF();
  else if(a==='adm')panel(firstTab());
  else if(a==='mic')voice();
  else if(a==='go')go(b.dataset.v);
  else if(a==='savec')saveC();
  else if(a==='prt'){const ps=$('#ps');if(ps)ps.remove();document.body.classList.add('pr-rep');addEventListener('afterprint',()=>document.body.classList.remove('pr-rep'),{once:true});try{window.print()}catch(e){document.body.classList.remove('pr-rep');toast('Impressão indisponível aqui. Abra o PDV em uma aba própria.')}}
  else if(a==='edc')editC(i);
  else if(a==='delc')delC(i);
  else if(a==='edf')editF(+b.dataset.id);
  else if(a==='delf'){fees=fees.filter(o=>o.id!==+b.dataset.id);save();renderCart();panel('fee')}
  else if(a==='edu')editU(+b.dataset.id);
  else if(a==='delu')delU(+b.dataset.id);
  else if(a==='print'){try{window.print()}catch(e){toast('Impressão indisponível aqui. Abra o PDV em uma aba própria.')}}
});
$('#q').addEventListener('input',e=>{q=e.target.value;renderGrid()});
$('#q').addEventListener('keydown',e=>{
  if(e.key!=='Enter')return;
  const t=q.trim().toLowerCase();if(!t)return;if(scan(q)){q='';e.target.value='';renderGrid();return}
  const hit=P.find(p=>p.sku.toLowerCase()===t)||(P.filter(p=>p.n.toLowerCase().includes(t)).length===1?P.find(p=>p.n.toLowerCase().includes(t)):null);
  if(hit){pick(hit.id);q='';e.target.value='';renderGrid()}else toast('Código não encontrado.');
});
['#ws','#disc','#cash'].forEach(s=>$(s).addEventListener('input',()=>{renderCart();renderGrid()}));
document.addEventListener('keydown',e=>{
  if(e.key==='Escape')closeModal();
  if(e.key==='/'&&document.activeElement.tagName!=='INPUT'){e.preventDefault();$('#q').focus()}
  else if(e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)&&!$('#modal').classList.contains('on')){if(view!=='sell')go('sell');$('#q').focus()}
  if(e.key==='Enter'&&/^(pin|lp|ap)$/.test(e.target.id)){const g=$('#box .go');if(g)g.click()}
});
const esc=s=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const C128='212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 114131 311141 411131 211412 211214 211232 2331112'.split(' ');
function bars(s){s=s.replace(/[^\x20-\x7E]/g,'');
  const v=[104,...[...s].map(c=>c.charCodeAt(0)-32)];
  v.push(v.reduce((a,x,i)=>a+x*(i||1),0)%103,106);
  let x=10,r='';
  v.forEach(c=>[...C128[c]].forEach((w,i)=>{w=+w;if(i%2===0)r+=`<rect x="${x}" y="0" width="${w}" height="40"/>`;x+=w}));
  return `<svg viewBox="0 0 ${x+10} 40" width="100%" height="52" preserveAspectRatio="none" fill="#000">${r}</svg><div>${s}</div>`;
}
function panel(k){
  const B=$('#box');B.className='box wide';
  if(!can(PF[k])){B.innerHTML=`<b>Área administrativa</b><div class="mute">Esta área precisa da autorização de um administrador. Digite o PIN dele.</div><input id="pin" type="password" inputmode="numeric" placeholder="PIN"><button class="go" data-a="login" data-v="${k}">Entrar</button><button class="chip" data-a="close">Cancelar</button>`;$('#modal').classList.add('on');setTimeout(()=>{const x=$('#pin');if(x)x.focus()},50);return}
  const X='<button class="chip" data-a="close">Fechar</button>';
  if(k==='prod'){
    editId=0;imgData='';
    B.innerHTML=`<div class="row"><b>Produtos e estoque</b>${X}</div>
    <div class="grid2"><input id="f-n" placeholder="Nome"><select id="f-c"><option value="">Geral</option>${catsL.map(c=>`<option value="${c}">${c}</option>`).join('')}</select>
    <input id="f-p" type="number" step="0.01" placeholder="Preço de varejo"><input id="f-w" type="number" step="0.01" placeholder="Preço de atacado">
    <input id="f-v" placeholder="Variações: Dourado, Prateado"><input id="f-s" type="number" placeholder="Estoque por variação">
    <input id="f-k" placeholder="Kit (opcional): 3 por 10"><input id="f-b" placeholder="Códigos de barras, na ordem das variações (opcional)"></div>
    <div class="grid2"><input id="f-u" type="number" step="0.01" placeholder="Custo de compra por unidade (opcional)"></div>
    <label class="row"><span>Foto do produto</span><input id="f-i" type="file" accept="image/*"></label><div id="f-prev" class="mute"></div>
    <button class="go" data-a="addp" id="savep">Cadastrar produto</button>
    <table>${P.map(p=>`<tr><td>${p.n}<div class="sku">${p.sku} · ${brl(p.p)}</div></td><td>${tot(p)} un.</td><td><button class="chip" data-a="ed" data-id="${p.id}">Editar</button> <button class="chip" data-a="rs" data-id="${p.id}">+10</button> <button class="chip" data-a="delp" data-id="${p.id}">Remover</button></td></tr>`).join('')}</table>`;
  }else if(k==='cash'){
    const s=sales.filter(x=>!x.closed),by={},cnt={};let T=0,F=0;
    s.forEach(x=>{by[x.pay]=(by[x.pay]||0)+x.total;T+=x.total;F+=x.fee||0;(x.it||[]).forEach(([id,v,n])=>cnt[id]=(cnt[id]||0)+n)});
    const top=Object.entries(cnt).sort((a,b)=>b[1]-a[1]).slice(0,5),low=P.filter(p=>tot(p)<=6);
    B.innerHTML=`<div class="row"><b>Caixa e relatório</b>${X}</div>
    <div class="row"><span>Vendas em aberto</span><b>${s.length}</b></div>
    <div class="row"><span>Total</span><span class="tot">${brl(T)}</span></div>
    ${F>0?`<div class="row mute"><span>Taxas de cartão</span><span>−${brl(F)}</span></div><div class="row"><span>Líquido a receber</span><b>${brl(T-F)}</b></div>`:''}<div class="row mute"><span>Ticket médio</span><span>${brl(s.length?T/s.length:0)}</span></div>
    ${Object.keys(by).map(m=>`<div class="row"><span>${m}</span><span>${brl(by[m])}</span></div>`).join('')}
    <b>Mais vendidos</b>${top.length?top.map(([id,n])=>`<div class="row"><span>${byId(+id)?byId(+id).n:'Produto removido'}</span><span>${n} un.</span></div>`).join(''):'<div class="mute">Nenhuma venda em aberto.</div>'}
    <b>Repor estoque</b>${low.length?low.map(p=>`<div class="row"><span>${p.n}</span><span class="low">${tot(p)} un.</span></div>`).join(''):'<div class="mute">Nenhum produto com estoque baixo.</div>'}
    <button class="go" data-a="closeday">Fechar caixa</button>
    <b>Fechamentos anteriores</b>${closes.length?closes.slice(-5).reverse().map(c=>`<div class="row mute"><span>${new Date(c.t).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})} · ${c.n} vendas</span><span>${brl(c.total)}</span></div>`).join(''):'<div class="mute">Nenhum fechamento ainda.</div>'}`;
  }else if(k==='gra'){
    B.innerHTML=`<div class="row"><b>Gráficos</b>${X}</div>
    <div class="grid2"><label>Período<select id="g-p"><option value="7">Últimos 7 dias</option><option value="14">Últimos 14 dias</option><option value="30">Últimos 30 dias</option></select></label></div>
    <button class="go" data-a="prt">Imprimir gráficos</button><div id="rep"></div>`;
    renderGra();
  }else if(k==='ajuda'){
    B.innerHTML=`<div class="row"><b>Ajuda</b>${X}</div>
    <h3>Perguntas e respostas</h3>${FAQ.map(([q,a])=>`<details><summary>${q}</summary><p>${a}</p></details>`).join('')}
    <h3>Atalhos de teclado</h3><div class="mute">No Mac, use Option no lugar de Alt.</div><table>${KEYS.map(([a,d])=>`<tr><td><kbd>${a}</kbd></td><td>${d}</td></tr>`).join('')}</table>`;
  }else if(k==='rel'){
    const own=!can('admin'),names=[...new Set([...users.map(u=>u.name),...sales.map(s=>s.by).filter(Boolean)])];
    B.innerHTML=`<div class="row"><b>Relatórios</b>${X}</div>
    <div class="grid2"><label>Período<select id="r-p"><option value="hoje">Hoje</option><option value="ontem">Ontem</option><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="mes">Este mês</option><option value="tudo">Tudo</option><option value="per">Escolher datas</option></select></label>
    <label>Vendedor<select id="r-v">${own?`<option value="${cur.name}">${cur.name}</option>`:'<option value="">Todos</option>'+names.map(n=>`<option>${n}</option>`).join('')}</select></label></div>
    <div class="grid2" id="r-d" hidden><label>De<input id="r-a" type="date"></label><label>Até<input id="r-b" type="date"></label></div>
    <button class="go" data-a="prt">Imprimir relatório</button>
    <div id="rep"></div>`;
    renderRep();
  }else if(k==='cat'){
    editCi=-1;
    B.innerHTML=`<div class="row"><b>Categorias</b>${X}</div>
    <div class="row"><input id="c-n" placeholder="Nova categoria (ex.: Brincos)" style="flex:1"><button class="chip" data-a="savec" id="savec">Adicionar</button></div>
    <table>${catsL.length?catsL.map((c,i)=>`<tr><td>${c}<div class="sku">${P.filter(p=>p.c===c).length} produtos</div></td><td><button class="chip" data-a="edc" data-i="${i}">Renomear</button> <button class="chip" data-a="delc" data-i="${i}">Remover</button></td></tr>`).join(''):'<tr><td class="mute">Nenhuma categoria cadastrada.</td></tr>'}</table>`;
  }else if(k==='fee'){
    editFid=0;
    B.innerHTML=`<div class="row"><b>Taxas da maquininha</b>${X}</div>
    <div class="mute">Cadastre cada operadora com as taxas em %. O PDV calcula o desconto sozinho nas vendas no débito e no crédito.</div>
    <div class="grid2"><input id="o-n" placeholder="Operadora (ex.: Stone)"><input id="o-d" type="number" step="0.01" placeholder="Débito %"><input id="o-1" type="number" step="0.01" placeholder="Crédito à vista %"><input id="o-2" type="number" step="0.01" placeholder="Crédito 2 a 6x %"><input id="o-7" type="number" step="0.01" placeholder="Crédito 7 a 12x %"></div>
    <button class="go" data-a="savef" id="savef">Cadastrar operadora</button>
    <table>${fees.length?fees.map(o=>`<tr><td>${o.name}<div class="sku">Débito ${o.deb}% · Crédito 1x ${o.c1}% · 2 a 6x ${o.c26}% · 7 a 12x ${o.c712}%</div></td><td><button class="chip" data-a="edf" data-id="${o.id}">Editar</button> <button class="chip" data-a="delf" data-id="${o.id}">Remover</button></td></tr>`).join(''):'<tr><td class="mute">Nenhuma operadora cadastrada.</td></tr>'}</table>`;
  }else if(k==='usr'){
    editUid=0;
    B.innerHTML=`<div class="row"><b>Usuários</b>${X}</div>
    <div class="grid2"><input id="u-n" placeholder="Nome"><select id="u-r"><option value="vendedor">Vendedor</option><option value="admin">Administrador</option></select><input id="u-p" type="password" inputmode="numeric" placeholder="PIN (4 a 8 números)"></div>
    <div class="mute">Autorizações do vendedor. O administrador tem todas.</div>
    ${PL.map(([i,t])=>`<label class="row"><span><input type="checkbox" class="up" value="${i}"> ${t}</span></label>`).join('')}
    <button class="go" data-a="saveu" id="saveu">Cadastrar usuário</button>
    <table>${users.map(u=>`<tr><td>${u.name}<div class="sku">${u.role==='admin'?'Administrador':'Vendedor · '+(PL.filter(([i])=>u.perm&&u.perm[i]).map(x=>x[1]).join(', ')||'só vende')}</div></td><td><button class="chip" data-a="edu" data-id="${u.id}">Editar</button> <button class="chip" data-a="delu" data-id="${u.id}">Remover</button></td></tr>`).join('')}</table>`;
  }else if(k==='hist'){
    const L=sales.map((s,i)=>[s,i]).slice(-15).reverse();
    B.innerHTML=`<div class="row"><b>Últimas vendas</b>${X}</div><table>${L.length?L.map(([s,i])=>`<tr><td>${new Date(s.t).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}<div class="sku">${s.pay} · ${s.n} ${s.n===1?'item':'itens'}${s.closed?' · caixa fechado':''}</div></td><td>${brl(s.total)}</td><td><button class="chip" data-a="void" data-i="${i}">Estornar</button></td></tr>`).join(''):'<tr><td class="mute">Nenhuma venda registrada.</td></tr>'}</table>`;
  }else if(k==='cfg'){
    B.innerHTML=`<div class="row"><b>Ajustes</b>${X}</div>
    <b>Trocar meu PIN</b><div class="row"><input id="np" type="password" inputmode="numeric" placeholder="Novo PIN (4 a 8 números)"><button class="chip" data-a="setpin">Salvar PIN</button></div>
    <b>Backup</b><div class="mute">Copie o texto abaixo e guarde. Para restaurar ou levar os dados a outro aparelho, cole o texto aqui e restaure.</div>
    <textarea id="bk" rows="6">${esc(JSON.stringify({P,stock,sales,closes}))}</textarea><button class="go" data-a="imp">Restaurar a partir do texto</button>`;
  }else{
    B.innerHTML=`<div class="row"><b>Etiquetas com código de barras</b>${X}</div>
    <div class="mute">Marque os produtos. O código impresso é o código do produto, o mesmo que você digita na busca do PDV.</div>
    <b>Tamanho e modelo da etiqueta</b>
    <div class="grid2"><label>Modelo<select id="l-m"><option value="rolo">Rolo (uma etiqueta por vez)</option><option value="folha">Folha A4 (várias por página)</option></select></label>
    <label>Tamanho pronto<select id="l-pre"><option value="">Personalizado</option><option value="25x15">25 x 15 mm</option><option value="30x20">30 x 20 mm</option><option value="40x25">40 x 25 mm</option><option value="50x30">50 x 30 mm</option><option value="60x40">60 x 40 mm</option></select></label>
    <label>Largura (mm)<input id="l-w" type="number" min="15" max="210"></label><label>Altura (mm)<input id="l-h" type="number" min="10" max="297"></label>
    <label>Colunas (folha A4)<input id="l-c" type="number" min="1" max="8"></label><label>Fonte (pt)<input id="l-f" type="number" min="5" max="14"></label></div>
    <label class="row"><span><input type="checkbox" id="l-n"> Mostrar nome</span></label><label class="row"><span><input type="checkbox" id="l-p"> Mostrar preço</span></label>
    <b>Produtos</b>
    ${P.map(p=>`<label class="row"><span><input type="checkbox" class="lc" value="${p.id}"> ${p.n}</span><span class="mute">${p.sku}</span></label>`).join('')}
    <div class="row"><span>Etiquetas por variação</span><input type="number" id="lq" value="2" min="1" max="50" style="width:70px"></div>
    <button class="go" data-a="mklab">Gerar etiquetas</button><div id="sheet"></div><button class="go" data-a="print" id="pb" hidden>Imprimir</button>`;
  }
  B.insertAdjacentHTML('afterbegin',`<div class="nav">${[['prod','Produtos'],['lab','Etiquetas'],['cash','Caixa'],['rel','Relatórios'],['gra','Gráficos'],['hist','Vendas'],['usr','Usuários'],['cat','Categorias'],['fee','Taxas'],['cfg','Ajustes'],['ajuda','Ajuda']].filter(([i])=>can(PF[i])).map(([i,t])=>`<button class="chip" aria-pressed="${i===k}" data-a="panel" data-v="${i}">${t}</button>`).join('')}<button class="chip" data-a="logout">Fechar</button></div>`);
  if(k==='prod')prev();if(k==='lab')fillLab();
  $('#modal').classList.add('on');
}
function addp(){
  const g=i=>$('#f-'+i).value.trim(),n=esc(g('n')),pr=+g('p');
  if(!n||!(pr>0)){toast('Informe o nome e o preço de varejo.');return}
  const id=Math.max(0,...P.map(p=>p.id))+1,s=Math.max(0,+g('s')||0);
  const vs=g('v').split(',').map(x=>esc(x.trim())).filter(Boolean);
  const p={id,sku:(n.replace(/[^A-Za-z]/g,'').slice(0,3).toUpperCase()||'PRD')+String(id).padStart(3,'0'),n,c:esc(g('c'))||'Geral',p:pr,w:+g('w')||0,v:{}};
  (vs.length?vs:['Única']).forEach(v=>{p.v[v]=s;stock[id+'|'+v]=s});
  const k=g('k').match(/(\d+)\D+([\d.,]+)/);if(k)p.k=[+k[1],+k[2].replace(',','.')];
  P.push(p);save();toast(`Cadastrado: ${n} (${p.sku})`);panel('prod');renderAll();
}
function closeday(){
  const s=sales.filter(x=>!x.closed),by={};
  if(!s.length){toast('Não há vendas em aberto para fechar.');return}
  s.forEach(x=>by[x.pay]=(by[x.pay]||0)+x.total);
  closes.push({t:Date.now(),total:s.reduce((a,x)=>a+x.total,0),n:s.length,by});
  s.forEach(x=>x.closed=1);save();renderHead();toast('Caixa fechado.');panel('cash');
}
function mklab(){
  const ids=[...document.querySelectorAll('.lc:checked')].map(x=>+x.value),qn=Math.min(50,+$('#lq').value||1);
  if(!ids.length){toast('Marque ao menos um produto.');return}
  readLab();if(LS.m==='folha'&&LS.c*(LS.w+2)>194)toast('As colunas não cabem na largura da folha. Reduza as colunas ou a largura.');
  let h='';ids.forEach(id=>{const p=byId(id);Object.keys(p.v).forEach(v=>{for(let i=0;i<qn;i++)h+=`<div class="lab" style="width:${LS.w}mm;height:${LS.h}mm;font-size:${LS.f}pt">${LS.n?`<div>${p.n} · ${v}</div>`:''}${bars(bcOf(p,v))}${LS.p?`<b>${brl(p.p)}</b>`:''}</div>`})});
  $('#sheet').innerHTML=h;$('#pb').hidden=false;
  $('#sheet').style.gridTemplateColumns=LS.m==='folha'?`repeat(${LS.c},${LS.w}mm)`:`repeat(auto-fill,${LS.w}mm)`;
  let ps=$('#ps');if(!ps){ps=document.createElement('style');ps.id='ps';document.head.appendChild(ps)}
  ps.textContent=LS.m==='rolo'?`@page{size:${LS.w}mm ${LS.h}mm;margin:0}@media print{#sheet{display:block!important}.lab{break-after:page;border:0!important;margin:0}}`:`@page{size:A4;margin:8mm}@media print{#sheet{gap:2mm!important;justify-content:start}.lab{border:1px dashed #999}}`;
}
const bcOf=(p,v)=>(p.bc&&p.bc[v])||p.sku+'-'+(Object.keys(p.v).indexOf(v)+1);
const un=s=>s.replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
function findCode(c){c=c.trim().toLowerCase();for(const p of P)for(const v of Object.keys(p.v))if(bcOf(p,v).toLowerCase()===c)return[p,v];return null}
function scan(raw){if(view!=='sell')go('sell');
  let n=1,c=raw.trim();const m=c.match(/^(\d+)\*(.+)$/);if(m){n=+m[1];c=m[2]}
  const h=findCode(c);
  if(h){const [p,v]=h;let ok=0;
    for(let i=0;i<n;i++){if(inCart(p.id,v)>=stock[p.id+'|'+v]){toast(`Estoque insuficiente: ${p.n} · ${v}`);break}ok++;const it=cart.find(x=>x.id===p.id&&x.v===v);it?it.q++:cart.push({id:p.id,v,q:1})}
    if(ok){toast(`${p.n} · ${v} ×${ok}`);renderCart();renderGrid()}
    return true}
  const sk=P.find(p=>p.sku.toLowerCase()===c.toLowerCase());if(sk){pick(sk.id);return true}
  return false;
}
async function cam(){
  if(!('BarcodeDetector' in window)||!navigator.mediaDevices){toast('Câmera indisponível neste navegador. Use um leitor USB ou digite o código.');return}
  try{
    const st=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
    const v=document.createElement('video');v.srcObject=st;v.playsInline=true;await v.play();
    const B=$('#box');B.className='box';B.innerHTML='<b>Aponte para o código de barras</b>';B.appendChild(v);
    B.insertAdjacentHTML('beforeend','<button class="chip" data-a="close">Cancelar</button>');$('#modal').classList.add('on');
    const d=new BarcodeDetector();camOn=1;
    stopf=()=>{camOn=0;st.getTracks().forEach(t=>t.stop())};
    (async function loop(){if(!camOn)return;try{const r=await d.detect(v);if(r.length){closeModal();if(!scan(r[0].rawValue))toast('Código não encontrado.');return}}catch(e){}setTimeout(loop,250)})();
  }catch(e){toast('Não foi possível abrir a câmera.')}
}
function edp(id){
  panel('prod');const p=byId(id),set=(i,x)=>{$('#f-'+i).value=x};editId=id;
  set('n',un(p.n));set('c',un(p.c));set('p',p.p);set('w',p.w||'');set('v',Object.keys(p.v).join(', '));
  set('k',p.k?`${p.k[0]} por ${p.k[1]}`:'');set('b',Object.keys(p.v).map(v=>bcOf(p,v)).join(', '));
  set('u',p.cost||'');imgData=p.img||'';prev();$('#savep').textContent='Salvar alterações';toast(`Editando ${un(p.n)}. Deixe o estoque vazio para mantê-lo.`);
}
function saveP(){
  const g=i=>$('#f-'+i).value.trim(),n=esc(g('n')),pr=+g('p'),e=editId?byId(editId):null;
  if(!n||!(pr>0)){toast('Informe o nome e o preço de varejo.');return}
  const vs=g('v').split(',').map(x=>esc(x.trim())).filter(Boolean),names=vs.length?vs:['Única'];
  const bcs=g('b').split(',').map(x=>x.trim()),used=bcs.filter(Boolean),sv=g('s'),s=Math.max(0,+sv||0);
  const id=e?e.id:Math.max(0,...P.map(p=>p.id))+1;
  for(const c of used){const h=findCode(c);if(h&&h[0].id!==id){toast(`O código ${c} já pertence a ${h[0].n}.`);return}}
  if(new Set(used).size<used.length){toast('Há códigos repetidos na lista.');return}
  const p=e||{id,sku:(n.replace(/[^A-Za-z]/g,'').slice(0,3).toUpperCase()||'PRD')+String(id).padStart(3,'0')};
  Object.assign(p,{n,c:esc(g('c'))||'Geral',p:pr,w:+g('w')||0,cost:+g('u')||0});delete p.k;
  const k=g('k').match(/(\d+)\D+([\d.,]+)/);if(k)p.k=[+k[1],+k[2].replace(',','.')];
  const nv={};p.bc={};
  names.forEach((v,i)=>{const key=id+'|'+v;if(!(key in stock)||sv!=='')stock[key]=s;nv[v]=stock[key];if(bcs[i])p.bc[v]=bcs[i]});
  p.img=imgData;p.v=nv;if(!e)P.push(p);else cart=cart.filter(x=>x.id!==id);
  editId=0;save();toast(`${e?'Alterado':'Cadastrado'}: ${n} (${p.sku})`);panel('prod');renderAll();
}
function voidSale(i){
  const s=sales[i];if(!s)return;
  if(s.closed){toast('Venda de caixa já fechado não pode ser estornada.');return}
  (s.it||[]).forEach(([id,v,n])=>{if((id+'|'+v) in stock)stock[id+'|'+v]+=n});
  sales.splice(i,1);save();toast('Venda estornada e estoque devolvido.');panel('hist');renderAll();
}
function imp(){
  try{const d=JSON.parse($('#bk').value);if(!Array.isArray(d.P)||!d.stock)throw 0;
    P=d.P;stock=d.stock;sales=d.sales||[];closes=d.closes||[];cart=[];save();toast('Backup restaurado.');renderAll();panel('cfg')}
  catch(e){toast('Texto de backup inválido.')}
}
function loadZX(){return new Promise((ok,no)=>{if(window.ZXing)return ok();const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js';s.onload=ok;s.onerror=no;document.head.appendChild(s)})}
async function cam2(){
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){toast('Este navegador não libera a câmera aqui. Abra o PDV em uma aba própria, com https.');return}
  const B=$('#box');B.className='box';
  B.innerHTML='<b>Aponte para o código de barras</b><video id="cv" playsinline muted></video><div class="mute" id="cm">Abrindo a câmera...</div><button class="chip" data-a="close">Cancelar</button>';
  $('#modal').classList.add('on');
  const v=$('#cv');
  try{
    const st=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}}});
    v.srcObject=st;await v.play();
    let done=0;const fin=c=>{if(done)return;done=1;closeModal();if(!scan(c))toast('Código não encontrado: '+c)};
    if('BarcodeDetector' in window){
      const d=new BarcodeDetector();camOn=1;
      stopf=()=>{camOn=0;st.getTracks().forEach(t=>t.stop())};
      $('#cm').textContent='Câmera ativa. Aproxime o código.';
      (async function loop(){if(!camOn)return;try{const r=await d.detect(v);if(r.length)return fin(r[0].rawValue)}catch(e){}setTimeout(loop,250)})();
    }else{
      $('#cm').textContent='Carregando o leitor...';
      await loadZX();
      const rd=new ZXing.BrowserMultiFormatReader();
      stopf=()=>{try{rd.reset()}catch(e){}st.getTracks().forEach(t=>t.stop())};
      rd.decodeFromStream(st,v,r=>{if(r)fin(r.getText())});
      $('#cm').textContent='Câmera ativa. Aproxime o código.';
    }
  }catch(e){
    closeModal();
    const n=e&&e.name;
    toast(n==='NotAllowedError'?'Câmera bloqueada. Permita o acesso ou abra o PDV em uma aba própria.':n==='NotFoundError'?'Nenhuma câmera encontrada.':'Não foi possível abrir a câmera ('+(n||'erro')+').');
  }
}
const PF={prod:'produtos',lab:'produtos',cash:'caixa',hist:'estorno',usr:'admin',fee:'admin',cat:'produtos',rel:'relatorio',gra:'relatorio',cfg:'admin'};
const PL=[['desc','Dar desconto'],['estorno','Estornar vendas'],['caixa','Ver caixa e fechar caixa'],['relatorio','Ver relatórios (só as próprias vendas)'],['produtos','Cadastrar produtos e ajustar estoque']];
const can=p=>!p||!!(adm||(cur&&(cur.role==='admin'||(cur.perm&&cur.perm[p]))));
function lv(id){
  const B=$('#box');B.className='box';const u=id?users.find(x=>x.id===id):null;
  B.innerHTML=u?`<b>${u.name}</b><input id="lp" type="password" inputmode="numeric" placeholder="PIN"><button class="go" data-a="ulogin" data-id="${u.id}">Entrar</button><button class="chip" data-a="uback">Voltar</button>`
    :`${lg()}<b>Quem está vendendo?</b>${users.map(x=>`<button class="v" data-a="usel" data-id="${x.id}"><span>${x.name}</span><span class="mute">${x.role==='admin'?'Administrador':'Vendedor'}</span></button>`).join('')}`;
  $('#modal').classList.add('on');if(u)setTimeout(()=>{const x=$('#lp');if(x)x.focus()},50);
}
function ask(label,fn){
  pend=fn;const B=$('#box');B.className='box';
  B.innerHTML=`<b>Autorização necessária</b><div class="mute">${label}. Peça a um administrador para digitar o PIN.</div><input id="ap" type="password" inputmode="numeric" placeholder="PIN do administrador"><button class="go" data-a="aok">Autorizar</button><button class="chip" data-a="close">Cancelar</button>`;
  $('#modal').classList.add('on');setTimeout(()=>{const x=$('#ap');if(x)x.focus()},50);
}
function editU(id){
  panel('usr');const u=users.find(x=>x.id===id);editUid=id;
  $('#u-n').value=u.name;$('#u-r').value=u.role;
  document.querySelectorAll('.up').forEach(x=>x.checked=!!(u.perm&&u.perm[x.value]));
  $('#saveu').textContent='Salvar alterações';toast('Deixe o PIN vazio para mantê-lo.');
}
function saveU(){
  const n=esc($('#u-n').value.trim()),r=$('#u-r').value,p=$('#u-p').value.trim(),e=editUid?users.find(u=>u.id===editUid):null;
  if(!n){toast('Informe o nome.');return}
  if((!e||p)&&!/^\d{4,8}$/.test(p)){toast('O PIN deve ter de 4 a 8 números.');return}
  if(users.some(u=>u.name.toLowerCase()===n.toLowerCase()&&(!e||u.id!==e.id))){toast('Já existe um usuário com esse nome.');return}
  if(p&&users.some(u=>u.pin===hp(p)&&(!e||u.id!==e.id))){toast('Esse PIN já está em uso. Escolha outro.');return}
  if(e&&e.role==='admin'&&r!=='admin'&&users.filter(u=>u.role==='admin').length<2){toast('Mantenha ao menos um administrador.');return}
  const perm={};document.querySelectorAll('.up').forEach(x=>perm[x.value]=x.checked);
  const u=e||{id:Math.max(0,...users.map(x=>x.id))+1};
  Object.assign(u,{name:n,role:r,perm:r==='admin'?{}:perm});if(p)u.pin=hp(p);
  if(!e)users.push(u);
  if(cur&&cur.id===u.id)cur=u;
  editUid=0;save();toast(`${e?'Alterado':'Cadastrado'}: ${n}`);panel('usr');renderHead();
}
function delU(id){
  const u=users.find(x=>x.id===id);if(!u)return;
  if(cur&&cur.id===id){toast('Você não pode remover o usuário em uso.');return}
  if(u.role==='admin'&&users.filter(x=>x.role==='admin').length<2){toast('Mantenha ao menos um administrador.');return}
  users=users.filter(x=>x.id!==id);save();toast('Usuário removido.');panel('usr');
}
function rateOf(){
  const o=fees.find(x=>x.id===opSel)||fees[0];if(!o)return null;
  if(pay==='Débito')return{o,r:o.deb};
  if(pay==='Crédito')return{o,r:inst===1?o.c1:inst<=6?o.c26:o.c712};
  return null;
}
function prev(){const e=$('#f-prev');if(e)e.innerHTML=imgData?`<img class="pimg" style="width:96px" src="${imgData}" alt=""> <button class="chip" data-a="rmimg">Remover foto</button>`:'Sem foto.'}
document.addEventListener('change',e=>{
  const t=e.target;
  if(t.id==='opsel'){opSel=+t.value;renderCart()}
  else if(t.id==='instsel'){inst=+t.value;renderCart()}
  else if(/^r-[pvab]$/.test(t.id))renderRep();
  else if(t.id==='g-p')renderGra();
  else if(t.id==='l-pre'&&t.value){const [w,h]=t.value.split('x');$('#l-w').value=w;$('#l-h').value=h}
  else if(t.id==='f-i'&&t.files[0]){
    const r=new FileReader();
    r.onload=()=>{const im=new Image();im.onload=()=>{const k=Math.min(1,240/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);imgData=c.toDataURL('image/jpeg',.72);prev()};im.src=r.result};
    r.readAsDataURL(t.files[0]);
  }
});
function editF(id){
  panel('fee');const o=fees.find(x=>x.id===id);editFid=id;
  $('#o-n').value=un(o.name);$('#o-d').value=o.deb;$('#o-1').value=o.c1;$('#o-2').value=o.c26;$('#o-7').value=o.c712;
  $('#savef').textContent='Salvar alterações';
}
function saveF(){
  const n=esc($('#o-n').value.trim()),r=['o-d','o-1','o-2','o-7'].map(i=>+String($('#'+i).value).replace(',','.')||0);
  if(!n){toast('Informe o nome da operadora.');return}
  if(r.some(x=>x<0||x>100)){toast('As taxas devem ficar entre 0 e 100%.');return}
  const o=editFid?fees.find(x=>x.id===editFid):{id:Math.max(0,...fees.map(x=>x.id))+1};
  Object.assign(o,{name:n,deb:r[0],c1:r[1],c26:r[2],c712:r[3]});if(!editFid)fees.push(o);
  editFid=0;save();toast('Operadora salva.');renderCart();panel('fee');
}
async function cam3(){
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){toast('Este navegador não libera a câmera aqui. Abra o PDV em uma aba própria, com https.');return}
  const B=$('#box');B.className='box';
  B.innerHTML='<b>Aponte para o código de barras</b><video id="cv" playsinline muted></video><div class="mute" id="cm">Abrindo a câmera...</div><div class="row"><input id="mq" placeholder="Ou digite o código" style="flex:1"><button class="chip" data-a="mscan">Adicionar</button></div><button class="chip" data-a="close">Cancelar</button>';
  $('#modal').classList.add('on');
  const v=$('#cv'),say=t=>{const e=$('#cm');if(e)e.textContent=t};
  let done=0,rd=null,tm=0;
  const fin=c=>{if(done)return;done=1;closeModal();if(!scan(c))toast('Código não encontrado: '+c)};
  try{
    const st=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}});
    stopf=()=>{camOn=0;done=1;clearTimeout(tm);try{if(rd)rd.reset()}catch(e){}st.getTracks().forEach(t=>t.stop())};
    v.srcObject=st;await v.play();
    const tip='Segure a etiqueta reta, a uns 15 a 25 cm, bem iluminada e sem reflexo.';
    let native=false;
    if('BarcodeDetector' in window){try{native=(await BarcodeDetector.getSupportedFormats()).includes('code_128')}catch(e){}}
    if(native){
      const d=new BarcodeDetector({formats:['code_128','ean_13','ean_8','upc_a','upc_e','code_39']});camOn=1;say(tip);
      (async function loop(){if(!camOn)return;try{const r=await d.detect(v);if(r.length)return fin(r[0].rawValue)}catch(e){}setTimeout(loop,200)})();
    }else{
      say('Carregando o leitor...');
      try{await loadZX()}catch(e){closeModal();toast('Não foi possível carregar o leitor. Verifique a internet.');return}
      const Z=ZXing,F=Z.BarcodeFormat;
      const h=new Map([[Z.DecodeHintType.POSSIBLE_FORMATS,[F.CODE_128,F.EAN_13,F.EAN_8,F.UPC_A,F.CODE_39]],[Z.DecodeHintType.TRY_HARDER,true]]);
      rd=new Z.BrowserMultiFormatReader(h,150);
      rd.decodeFromStream(st,v,r=>{if(r)fin(r.getText())});
      say(tip);
    }
    tm=setTimeout(()=>say('Não leu? Aproxime ou afaste um pouco, evite reflexo, ou digite o código abaixo.'),8000);
  }catch(e){
    closeModal();
    const n=e&&e.name;
    toast(n==='NotAllowedError'?'Câmera bloqueada. Permita o acesso ou abra o PDV em uma aba própria.':n==='NotFoundError'?'Nenhuma câmera encontrada.':'Não foi possível abrir a câmera ('+(n||'erro')+').');
  }
}
let LS={m:'rolo',w:50,h:30,c:3,f:9,n:1,p:1};
try{Object.assign(LS,JSON.parse(localStorage.getItem('pdvlab')||'{}'))}catch(e){}
function fillLab(){
  $('#l-m').value=LS.m;$('#l-w').value=LS.w;$('#l-h').value=LS.h;$('#l-c').value=LS.c;$('#l-f').value=LS.f;
  $('#l-n').checked=!!LS.n;$('#l-p').checked=!!LS.p;
  const k=LS.w+'x'+LS.h;$('#l-pre').value=[...$('#l-pre').options].some(o=>o.value===k)?k:'';
}
function readLab(){
  const n=(i,d,lo,hi)=>Math.min(hi,Math.max(lo,+$('#'+i).value||d));
  LS={m:$('#l-m').value,w:n('l-w',50,15,210),h:n('l-h',30,10,297),c:n('l-c',3,1,8),f:n('l-f',9,5,14),n:$('#l-n').checked?1:0,p:$('#l-p').checked?1:0};
  try{localStorage.setItem('pdvlab',JSON.stringify(LS))}catch(e){}
}
const firstTab=()=>['prod','lab','cat','cash','rel','hist','usr','fee','cfg'].find(k=>can(PF[k]))||'prod';
function editC(i){panel('cat');editCi=i;$('#c-n').value=un(catsL[i]);$('#savec').textContent='Salvar';$('#c-n').focus()}
function saveC(){
  const n=esc($('#c-n').value.trim());
  if(!n){toast('Informe o nome da categoria.');return}
  if(catsL.some((c,i)=>c.toLowerCase()===n.toLowerCase()&&i!==editCi)){toast('Essa categoria já existe.');return}
  if(editCi>=0){const o=catsL[editCi];catsL[editCi]=n;P.forEach(p=>{if(p.c===o)p.c=n});if(cat===o)cat=n}else catsL.push(n);
  editCi=-1;save();toast('Categoria salva.');panel('cat');renderAll();
}
function delC(i){
  const c=catsL[i],n=P.filter(p=>p.c===c).length;
  if(n){toast(`Há ${n} produto(s) nesta categoria. Mude a categoria deles antes de remover.`);return}
  catsL.splice(i,1);save();toast('Categoria removida.');panel('cat');renderAll();
}
function renderRep(){
  const per=$('#r-p').value,own=!can('admin'),now=new Date(),D=864e5,d0=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime();
  $('#r-d').hidden=per!=='per';
  let a=0,b=Infinity;
  if(per==='hoje')a=d0;else if(per==='ontem'){a=d0-D;b=d0}else if(per==='7')a=d0-6*D;else if(per==='30')a=d0-29*D;
  else if(per==='mes')a=new Date(now.getFullYear(),now.getMonth(),1).getTime();
  else if(per==='per'){const f=$('#r-a').value,t=$('#r-b').value;a=f?new Date(f+'T00:00').getTime():0;b=t?new Date(t+'T23:59:59').getTime():Infinity}
  const vs=$('#r-v').value,S=sales.filter(s=>s.t>=a&&s.t<=b&&(!vs||s.by===vs)).sort((x,y)=>y.t-x.t);
  const sum=(r,f)=>r.reduce((x,y)=>x+f(y),0),fmt=t=>new Date(t).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});
  const grp=(r,k)=>Object.entries(r.reduce((m,s)=>{const g=k(s)||'Sem registro';(m[g]=m[g]||[]).push(s);return m},{})).sort((x,y)=>sum(y[1],s=>s.total)-sum(x[1],s=>s.total));
  const tbl=(h,r)=>r.length?`<table><tr>${h.map((x,i)=>`<th${i?' class="r"':''}>${x}</th>`).join('')}</tr>${r.map(c=>`<tr>${c.map((x,i)=>`<td${i?' class="r"':''}>${x}</td>`).join('')}</tr>`).join('')}</table>`:'<div class="mute">Sem dados no período.</div>';
  const T=sum(S,s=>s.total),F=sum(S,s=>s.fee||0),N=sum(S,s=>s.n),pm={};let est=0;
  S.forEach(s=>{(s.it||[]).forEach(([id,v,n])=>{const m=pm[id]=pm[id]||{q:0,r:0};m.q+=n;if(!s.pv){const p=byId(id);if(p){m.r+=n*p.p;est=1}}});if(s.pv)Object.keys(s.pv).forEach(id=>{const m=pm[id]=pm[id]||{q:0,r:0};m.r+=s.pv[id]})});
  const pr=Object.entries(pm).map(([id,m])=>{const p=byId(+id);return{n:p?p.n:'Produto removido',c:p?p.c:'Sem categoria',q:m.q,r:m.r}}).sort((x,y)=>y.q-x.q);
  const cm={};pr.forEach(x=>{const m=cm[x.c]=cm[x.c]||{q:0,r:0};m.q+=x.q;m.r+=x.r});
  const label=$('#r-p').selectedOptions[0].text+(per==='per'?` (${$('#r-a').value||'início'} a ${$('#r-b').value||'hoje'})`:'');
  const low=P.filter(p=>tot(p)<=6),cl=closes.filter(c=>c.t>=a&&c.t<=b);
  $('#rep').innerHTML=`${lg()}<div><b>Relatório de vendas</b></div><div class="mute">Período: ${label} · Vendedor: ${vs||'Todos'} · Gerado em ${fmt(Date.now())}</div>
  <h3>Resumo</h3>${tbl(['Indicador','Valor'],[['Vendas',S.length],['Itens vendidos',N],['Total vendido',brl(T)],['Taxas de cartão','−'+brl(F)],['Líquido a receber',brl(T-F)],...(P.some(p=>p.cost>0)?[['Custo dos produtos','−'+brl(sum(S,costOf))],['Lucro',brl(T-F-sum(S,costOf))]]:[]),['Ticket médio',brl(S.length?T/S.length:0)]])}
  ${vs?'':`<h3>Por vendedor</h3>${tbl(['Vendedor','Vendas','Total','Ticket médio'],grp(S,s=>s.by).map(([k,r])=>[k,r.length,brl(sum(r,s=>s.total)),brl(sum(r,s=>s.total)/r.length)]))}`}
  <h3>Por forma de pagamento</h3>${tbl(['Pagamento','Vendas','Total','Taxas'],grp(S,s=>s.pay).map(([k,r])=>[k,r.length,brl(sum(r,s=>s.total)),brl(sum(r,s=>s.fee||0))]))}
  <h3>Cartões por operadora</h3>${tbl(['Operadora','Vendas','Bruto','Taxas','Líquido'],grp(S.filter(s=>s.op),s=>s.op).map(([k,r])=>[k,r.length,brl(sum(r,s=>s.total)),brl(sum(r,s=>s.fee||0)),brl(sum(r,s=>s.total-(s.fee||0)))]))}
  <h3>Produtos mais vendidos</h3>${tbl(['Produto','Unidades','Receita'],pr.slice(0,15).map(x=>[x.n,x.q,brl(x.r)]))}
  <h3>Por categoria</h3>${tbl(['Categoria','Unidades','Receita'],Object.entries(cm).sort((x,y)=>y[1].r-x[1].r).map(([k,m])=>[k,m.q,brl(m.r)]))}
  ${est?'<div class="mute">Receita de vendas antigas estimada pelo preço atual de varejo.</div>':''}
  ${own?'':`<h3>Estoque</h3>${tbl(['Indicador','Valor'],[['Unidades em estoque',sum(P,p=>tot(p))],['Valor em estoque (varejo)',brl(sum(P,p=>tot(p)*p.p))]])}
  <h3>Repor estoque</h3>${tbl(['Produto','Unidades'],low.map(p=>[p.n,tot(p)]))}
  <h3>Fechamentos de caixa</h3>${tbl(['Data','Vendas','Total'],cl.map(c=>[fmt(c.t),c.n,brl(c.total)]))}`}
  <h3>Vendas detalhadas</h3>${tbl(['Data','Vendedor','Pagamento','Itens','Total','Obs.'],S.slice(0,150).map(s=>[fmt(s.t),s.by||'—',s.pay+(s.parc>1?` ${s.parc}x`:''),s.n,brl(s.total),s.au?'Autorizado: '+s.au:'']))}
  ${S.length>150?`<div class="mute">Mostrando as 150 vendas mais recentes de ${S.length}.</div>`:''}`;
}
const norm=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const qw=()=>norm(q).split(/\s+/).filter(Boolean);
const lg=()=>{const e=document.querySelector('header .logo');return e?e.outerHTML:''};
let rec=null;
function voice(){if(view!=='sell')go('sell');
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition,mic=$('#mic');
  if(!SR){toast('Este navegador não tem busca por voz. Use Chrome, Edge ou Safari.');return}
  if(rec){rec.stop();return}
  let txt='',err='';
  const r=rec=new SR();r.lang='pt-BR';r.interimResults=true;
  const off=()=>{rec=null;mic.textContent='🎤 Voz';mic.setAttribute('aria-pressed','false')};
  r.onresult=e=>{txt=[...e.results].map(x=>x[0].transcript).join(' ').trim();q=txt;$('#q').value=txt;renderGrid()};
  r.onerror=e=>{err=e.error;toast(err==='not-allowed'||err==='service-not-allowed'?'Microfone bloqueado. Permita o acesso ou abra o PDV em uma aba própria.':err==='no-speech'?'Não ouvi nada. Tente de novo.':'Não foi possível usar o microfone ('+err+').')};
  r.onend=()=>{off();if(!err&&txt)voiceDone(txt)};
  mic.textContent='🎙️ Ouvindo...';mic.setAttribute('aria-pressed','true');
  try{r.start()}catch(e){off();toast('Não foi possível iniciar o microfone.')}
}
function voiceDone(txt){
  const w=qw(),L=P.filter(p=>w.every(x=>norm(p.n+' '+p.sku+' '+p.c+' '+Object.keys(p.v).join(' ')).includes(x)));
  if(L.length===1){
    const p=L[0],vs=Object.keys(p.v).filter(v=>w.includes(norm(v)));
    q='';$('#q').value='';renderGrid();
    if(vs.length===1&&stock[p.id+'|'+vs[0]]-inCart(p.id,vs[0])>0){add(p.id,vs[0]);toast(`${p.n} · ${vs[0]} adicionado`)}else pick(p.id);
  }else if(!L.length)toast(`Nenhum produto encontrado para "${txt}".`);
  else toast(`${L.length} produtos para "${txt}". Toque no que deseja.`);
}
const HERO="data:image/webp;base64,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";
function go(v){
  view=v;
  $('#home').hidden=v!=='home';document.querySelector('main').hidden=v!=='sell';$('#bar').hidden=v!=='sell';
  $('#cart').classList.remove('open');
  $('#t-home').setAttribute('aria-current',v==='home'?'page':'false');$('#t-sell').setAttribute('aria-current',v==='sell'?'page':'false');
  if(v==='home')renderHome();else{renderGrid();renderCart();if(matchMedia('(pointer:fine)').matches)setTimeout(()=>$('#q').focus(),50)}
  window.scrollTo(0,0);
}
function renderHome(){
  const h=$('#home');if(!h)return;
  const day=new Date().toDateString(),S=sales.filter(s=>s.day===day&&(can('admin')||(cur&&s.by===cur.name)));
  const T=S.reduce((a,s)=>a+s.total,0),F=S.reduce((a,s)=>a+(s.fee||0),0);
  const low=P.filter(p=>tot(p)<=6).sort((a,b)=>tot(a)-tot(b)),cnt={};
  S.forEach(s=>(s.it||[]).forEach(([id,v,n])=>cnt[id]=(cnt[id]||0)+n));
  const top=Object.entries(cnt).sort((a,b)=>b[1]-a[1]).slice(0,5),hr=new Date().getHours(),gr=hr<12?'Bom dia':hr<18?'Boa tarde':'Boa noite';
  const kp=(t,v,x)=>`<div class="kpi"><div class="mute">${t}</div><div class="kv">${v}</div>${x?`<div class="mute">${x}</div>`:''}</div>`;
  const sc=[['prod','📦','Produtos'],['cat','🏷️','Categorias'],['lab','🔖','Etiquetas'],['cash','💰','Caixa'],['rel','📊','Relatórios'],['gra','📈','Gráficos'],['hist','🧾','Vendas'],['usr','👥','Usuários'],['fee','💳','Taxas'],['ajuda','❓','Ajuda']].filter(([k])=>can(PF[k]));
  const steps=[[P.length>0,'Cadastre seus produtos','prod'],[fees.length>0,'Cadastre a taxa da maquininha','fee'],[users.length>1,'Cadastre os vendedores','usr']];
  const todo=can('admin')&&steps.some(x=>!x[0]);
  h.innerHTML=`<div class="hero"><div><div class="mute">${gr}${cur?', '+cur.name:''}!</div><h2>O que você quer fazer agora?</h2>
  <div class="acts"><button class="go" data-a="go" data-v="sell">🛒 Nova venda</button><button class="chip" data-a="cam">📷 Ler código com a câmera</button><button class="chip" data-a="mic">🎤 Buscar por voz</button></div>
  <div class="mute" style="margin-top:10px">Dica: com um leitor de código de barras, é só ler o produto. Ele entra no carrinho sozinho.</div></div>
  <img class="hero-logo" src="${HERO}" alt="Cilda Biju"></div>
  <div class="kpis">${kp('Vendas hoje',S.length)}${kp('Total vendido',brl(T))}${kp('Ticket médio',brl(S.length?T/S.length:0))}${kp('Líquido após taxas',brl(T-F),F>0?'Taxas: '+brl(F):'')}${kp('Lucro hoje',P.some(p=>p.cost>0)?brl(S.reduce((a,s)=>a+profit(s),0)):'—',P.some(p=>p.cost>0)?'':'Cadastre o custo nos produtos')}</div>
  ${todo?`<div class="pnl"><b>Primeiros passos</b>${steps.map(([ok,t,k])=>`<div class="row"><span>${ok?'✅':'⬜'} ${t}</span>${ok?'':`<button class="chip" data-a="panel" data-v="${k}">Abrir</button>`}</div>`).join('')}</div>`:''}
  ${can('relatorio')?`<div class="pnl"><b>Vendas e lucro dos últimos 7 dias</b>${daily(sales.filter(s=>can('admin')||(cur&&s.by===cur.name)),7)}</div>`:''}
  <div class="cols">
  <div class="pnl"><b>Mais vendidos hoje</b>${top.length?top.map(([id,n])=>`<div class="row"><span>${byId(+id)?byId(+id).n:'Produto removido'}</span><span class="mute">${n} un.</span></div>`).join(''):'<div class="mute">Ainda sem vendas hoje.</div>'}</div>
  <div class="pnl"><b>Estoque baixo</b>${low.length?low.slice(0,6).map(p=>`<div class="row"><span>${p.n}</span><span class="low">${tot(p)} un.</span></div>`).join(''):'<div class="mute">Tudo em ordem.</div>'}</div>
  <div class="pnl"><b>Últimas vendas</b>${S.length?S.slice(-5).reverse().map(s=>`<div class="row"><span>${new Date(s.t).toLocaleTimeString('pt-BR',{timeStyle:'short'})} · ${s.pay}</span><span>${brl(s.total)}</span></div>`).join(''):'<div class="mute">Nenhuma venda ainda.</div>'}</div></div>
  ${sc.length?`<b>Atalhos</b><div class="short">${sc.map(([k,i,t])=>`<button class="sbtn" data-a="panel" data-v="${k}"><span>${i}</span>${t}</button>`).join('')}</div>`:''}`;
}
const costOf=s=>s.cost!=null?s.cost:(s.it||[]).reduce((a,[id,v,n])=>a+n*((byId(id)||{}).cost||0),0);
const profit=s=>s.total-(s.fee||0)-costOf(s);
function daily(S,days){
  const D=864e5,d0=new Date();d0.setHours(0,0,0,0);const rows=[],hc=P.some(p=>p.cost>0);
  for(let i=days-1;i>=0;i--){const t=d0.getTime()-i*D,a=S.filter(s=>s.t>=t&&s.t<t+D);rows.push({l:new Date(t).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}),r:a.reduce((x,s)=>x+s.total,0),p:a.reduce((x,s)=>x+profit(s),0)})}
  const mx=Math.max(1,...rows.map(x=>x.r)),W=600,H=200,bw=W/rows.length;
  const g=rows.map((x,i)=>{const h1=x.r/mx*(H-40),h2=Math.max(0,x.p)/mx*(H-40),bx=i*bw+bw*.12,w=bw*.34;
    return `<rect x="${bx}" y="${H-24-h1}" width="${w}" height="${h1}" rx="3" style="fill:var(--accent)"/><rect x="${bx+w+2}" y="${H-24-h2}" width="${w}" height="${h2}" rx="3" style="fill:var(--gold)"/><text x="${i*bw+bw/2}" y="${H-8}" text-anchor="middle" font-size="${days>14?9:11}" style="fill:var(--mute)">${days>14&&i%3?'':x.l}</text>`}).join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Faturamento e lucro por dia">${g}</svg><div class="mute"><span style="color:var(--accent)">■</span> Faturamento &nbsp; <span style="color:var(--gold)">■</span> ${hc?'Lucro':'Líquido após taxas (cadastre o custo para ver o lucro)'} · maior valor ${brl(mx)}</div>`;
}
const hbar=(rows,f)=>{const mx=Math.max(1,...rows.map(r=>r[1]));return rows.length?rows.map(([l,v])=>`<div class="hb"><span>${l}</span><svg width="100%" height="14"><rect width="${Math.max(2,v/mx*100)}%" height="14" rx="6" style="fill:var(--accent)"/></svg><b>${f(v)}</b></div>`).join(''):'<div class="mute">Sem dados no período.</div>'};
function renderGra(){
  const n=+$('#g-p').value,D=864e5,d0=new Date();d0.setHours(0,0,0,0);const a=d0.getTime()-(n-1)*D;
  const S=sales.filter(s=>s.t>=a&&(can('admin')||(cur&&s.by===cur.name)));
  const sum=f=>S.reduce((x,s)=>x+f(s),0),T=sum(s=>s.total),F=sum(s=>s.fee||0),C=sum(costOf),hc=P.some(p=>p.cost>0);
  const grp=k=>{const m={};S.forEach(s=>{const g=k(s)||'Sem registro';m[g]=(m[g]||0)+s.total});return Object.entries(m).sort((x,y)=>y[1]-x[1])};
  const pm={};S.forEach(s=>(s.it||[]).forEach(([id,v,q])=>pm[id]=(pm[id]||0)+q));
  const top=Object.entries(pm).sort((x,y)=>y[1]-x[1]).slice(0,6).map(([id,q])=>[byId(+id)?byId(+id).n:'Produto removido',q]);
  const kp=(t,v)=>`<div class="kpi"><div class="mute">${t}</div><div class="kv">${v}</div></div>`;
  $('#rep').innerHTML=`${lg()}<div><b>Gráficos de vendas</b> <span class="mute">· últimos ${n} dias</span></div>
  <div class="kpis">${kp('Faturamento',brl(T))}${kp('Taxas de cartão',brl(F))}${hc?kp('Custo dos produtos',brl(C))+kp('Lucro',brl(T-F-C))+kp('Margem',T?((T-F-C)/T*100).toFixed(1)+'%':'—'):kp('Líquido após taxas',brl(T-F))}</div>
  ${hc?'':'<div class="mute">Para ver lucro e margem, cadastre o custo de compra em Produtos.</div>'}
  <h3>Faturamento e lucro por dia</h3>${daily(S,n)}
  <h3>Por forma de pagamento</h3>${hbar(grp(s=>s.pay),brl)}
  <h3>Produtos mais vendidos (unidades)</h3>${hbar(top,v=>v+' un.')}
  ${can('admin')?`<h3>Por vendedor</h3>${hbar(grp(s=>s.by),brl)}`:''}`;
}
const FAQ=[
['Como faço uma venda?','Toque em <b>Vender</b>, escolha os produtos (ou leia o código de barras), confira o carrinho, escolha a forma de pagamento e toque em <b>Finalizar venda</b>.'],
['Como vender com o leitor de código de barras?','Com a tela Vender aberta, leia a etiqueta. O item entra no carrinho sozinho e cada nova leitura soma 1. Para várias unidades, digite na busca <kbd>5*CÓDIGO</kbd> e tecle Enter.'],
['Como usar a câmera ou a voz?','Toque em <b>Câmera</b> (F6) e mostre o código. Para voz, toque em <b>Voz</b> (F7) e diga, por exemplo, “laço de cetim rosa”. Os dois precisam de permissão do navegador e, às vezes, de endereço próprio com HTTPS.'],
['Como cadastro um produto?','Em <b>Gestão &gt; Produtos</b> informe nome, categoria, preços, variações (ex.: Dourado, Prateado), estoque por variação, kit, códigos de barras, custo e foto. Use <b>Editar</b> para alterar e <b>+10</b> para repor estoque.'],
['Para que serve o custo do produto?','Com o custo de compra cadastrado, os relatórios e gráficos mostram o <b>lucro</b> e a margem. Sem ele, mostram só o faturamento e o líquido após as taxas.'],
['Como cadastro categorias?','Em <b>Gestão &gt; Categorias</b>. Você pode renomear (os produtos acompanham) e só remove categorias sem produtos.'],
['Como imprimo as etiquetas?','Em <b>Gestão &gt; Etiquetas</b> escolha o tamanho (rolo ou folha A4), marque os produtos, toque em <b>Gerar etiquetas</b> e depois em <b>Imprimir</b>. Na impressão, use escala 100% e desligue cabeçalhos e rodapés.'],
['Como cadastro vendedores e autorizações?','Em <b>Gestão &gt; Usuários</b>. Escolha o perfil, defina um PIN e marque o que o vendedor pode fazer sozinho: dar desconto, estornar vendas, ver caixa, ver relatórios e cadastrar produtos.'],
['O que acontece quando falta autorização?','O PDV pede o PIN de um administrador. Ele libera a ação naquele momento, sem trocar de usuário.'],
['Como cadastro a taxa da maquininha?','Em <b>Gestão &gt; Taxas</b> cadastre a operadora com as taxas de débito e crédito. Na venda no cartão, o PDV mostra a taxa e quanto você recebe.'],
['Como fecho o caixa?','Em <b>Gestão &gt; Caixa</b>, confira os totais e toque em <b>Fechar caixa</b>. O fechamento fica no histórico e as vendas dele não podem mais ser estornadas.'],
['Como estorno uma venda?','Em <b>Gestão &gt; Vendas</b>, toque em <b>Estornar</b> na venda. O estoque volta. Vendas de um caixa já fechado não podem ser estornadas.'],
['Onde ficam meus dados? Como faço backup?','Ficam guardados neste aparelho, no navegador. Em <b>Gestão &gt; Ajustes</b> há um texto de backup para copiar e guardar e para restaurar em outro aparelho.'],
['Esqueci meu PIN. E agora?','Peça a um administrador para redefinir em <b>Usuários</b>. Se nenhum administrador lembrar o PIN, será preciso limpar os dados do navegador, o que apaga o que não tiver backup. Por isso, guarde o backup.']
];
const KEYS=[['F1 ou ?','Abrir a Ajuda'],['F2','Ir para Vender'],['F3 ou /','Buscar produto'],['F4','Ir para o Início'],['F6','Ler código com a câmera'],['F7','Buscar por voz'],['F8','Ligar ou desligar o preço de atacado'],['F9','Finalizar a venda'],['Alt + 1 a 4','Pix, Débito, Crédito, Dinheiro'],['Alt + P','Produtos'],['Alt + C','Caixa'],['Alt + R','Relatórios'],['Alt + G','Gráficos'],['Alt + H','Ajuda'],['Alt + L','Trocar usuário'],['Enter (na busca)','Adicionar pelo código digitado ou lido'],['5*CÓDIGO + Enter','Adicionar 5 unidades do produto'],['Esc','Fechar a janela aberta']];
document.addEventListener('keydown',e=>{
  if(!cur)return;
  const k=e.key,c=e.code,inp=/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName),modal=$('#modal').classList.contains('on');
  const run=f=>{e.preventDefault();f()},sell=()=>{if(view!=='sell')go('sell')};
  if(k==='F1'||(k==='?'&&!inp&&!modal))return run(()=>panel('ajuda'));
  if(modal&&!/^F\d+$/.test(k)&&!e.altKey)return;
  if(k==='F2')return run(sell);
  if(k==='F3')return run(()=>{sell();$('#q').focus()});
  if(k==='F4')return run(()=>go('home'));
  if(k==='F6')return run(()=>cam3());
  if(k==='F7')return run(()=>voice());
  if(k==='F8')return run(()=>{sell();const w=$('#ws');w.checked=!w.checked;renderCart();renderGrid();toast(w.checked?'Preço de atacado ligado.':'Preço de atacado desligado.')});
  if(k==='F9')return run(()=>{if(view==='sell')finish();else toast('Abra a tela Vender para finalizar.')});
  if(e.altKey&&!e.ctrlKey&&!e.metaKey){
    const m={Digit1:'Pix',Digit2:'Débito',Digit3:'Crédito',Digit4:'Dinheiro'};
    if(m[c])return run(()=>{pay=m[c];sell();renderCart()});
    const t={KeyP:'prod',KeyC:'cash',KeyR:'rel',KeyG:'gra',KeyH:'ajuda'}[c];
    if(t)return run(()=>panel(t));
    if(c==='KeyL')return run(()=>{cur=null;adm=false;renderHead();lv()});
  }
});
const LK={n:0,u:0};
try{Object.assign(LK,JSON.parse(localStorage.getItem('pdvlk')||'{}'))}catch(e){}
function locked(){const w=Math.ceil((LK.u-Date.now())/1000);if(w>0){toast(`Muitas tentativas. Aguarde ${w} s.`);return true}return false}
function failPin(){
  LK.n++;if(LK.n>=5)LK.u=Date.now()+Math.min(300,15*2**(LK.n-5))*1000;
  try{localStorage.setItem('pdvlk',JSON.stringify(LK))}catch(e){}
  toast(LK.n>=5?'Muitas tentativas. Aguarde um pouco para tentar de novo.':'PIN incorreto.');
}
function okPin(){LK.n=0;LK.u=0;try{localStorage.removeItem('pdvlk')}catch(e){}}
window.addEventListener('error',e=>{console.error('[erro]',e.message,e.filename,e.lineno);toast('Algo deu errado. Tente de novo.')});
window.addEventListener('unhandledrejection',e=>{console.error('[erro]',e.reason);toast('Algo deu errado. Tente de novo.')});
renderAll();go('home');lv();
