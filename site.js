(() => {
const $=id=>document.getElementById(id);
const cfg=window.CHANGE_UK_CONFIG||{};
const configured=cfg.SUPABASE_URL&&!cfg.SUPABASE_URL.includes("PASTE_")&&cfg.SUPABASE_ANON_KEY&&!cfg.SUPABASE_ANON_KEY.includes("PASTE_");
const sb=configured&&window.supabase?window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY):null;
const fallback="person-placeholder.svg";
const esc=(s="")=>String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
document.querySelectorAll("#year").forEach(x=>x.textContent=new Date().getFullYear());

document.querySelectorAll(".nav-toggle").forEach(btn=>btn.addEventListener("click",()=>document.querySelector(".site-header nav")?.classList.toggle("open")));

const savedTheme=localStorage.getItem("changeuk_theme");
if(savedTheme==="dark")document.body.classList.add("dark");
const themeBtn=$("theme-toggle");
if(themeBtn)themeBtn.addEventListener("click",()=>{document.body.classList.toggle("dark");localStorage.setItem("changeuk_theme",document.body.classList.contains("dark")?"dark":"light")});

const revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add("visible");revealObserver.unobserve(entry.target)}}),{threshold:.12});
document.querySelectorAll(".reveal").forEach(el=>revealObserver.observe(el));

document.querySelectorAll(".magnetic").forEach(btn=>{
 btn.addEventListener("mousemove",e=>{const r=btn.getBoundingClientRect();btn.style.transform=`translate(${(e.clientX-r.left-r.width/2)*.05}px,${(e.clientY-r.top-r.height/2)*.08}px)`});
 btn.addEventListener("mouseleave",()=>btn.style.transform="");
});
const topBtn=$("back-to-top");if(topBtn){window.addEventListener("scroll",()=>topBtn.classList.toggle("show",window.scrollY>500));topBtn.onclick=()=>window.scrollTo({top:0,behavior:"smooth"})}

async function renderStats(){
 let s={mps:0,councillors:0,helpers:0,members:0};
 if(sb){const {data}=await sb.from("party_stats").select("*").eq("id",1).maybeSingle();if(data)s=data}
 ["mps","councillors","helpers","members"].forEach(k=>{const el=$("stat-"+k);if(el)el.textContent=(s[k]??0).toLocaleString()});
}

async function renderPeople(){
 if(!sb)return;
 const {data:all=[]}=await sb.from("people").select("*").order("created_at",{ascending:false});
 const map={mp:"mp-grid",councillor:"councillor-grid",helper:"helper-grid"};
 for(const [role,id] of Object.entries(map)){
  const grid=$(id);if(!grid)continue;
  const rows=all.filter(p=>p.role===role);
  grid.innerHTML=rows.length?rows.map(p=>`<article class="person-card reveal visible"><div class="person-photo"><img src="${esc(p.image_url||fallback)}" alt="${esc(p.name)}" onerror="this.src='${fallback}'"></div><div class="person-info"><div class="role">${esc(p.title||role.toUpperCase())}</div><h3>${esc(p.name)}</h3>${p.area?`<div class="area">${esc(p.area)}</div>`:""}${p.bio?`<p>${esc(p.bio)}</p>`:""}</div></article>`).join(""):`<div class="empty-state">No ${role==="mp"?"MPs":role==="councillor"?"councillors":"helpers"} added yet.</div>`;
 }
}

async function renderNews(){
 const grid=$("news-grid");if(!grid||!sb)return;
 const {data:rows=[]}=await sb.from("news").select("*").eq("published",true).order("created_at",{ascending:false}).limit(6);
 if(!rows.length)return;
 grid.innerHTML=rows.map(n=>`<article class="card reveal visible"><div class="news-image"><img src="${esc(n.image_url||"news-placeholder.svg")}" alt="" onerror="this.src='news-placeholder.svg'"></div><small>${esc(n.category||"PARTY NEWS")}</small><h3>${esc(n.title)}</h3><p>${esc(n.summary||"")}</p></article>`).join("");
}

async function renderPolicies(){
 const grid=$("policy-grid"),filter=$("policy-filter");if(!grid)return;
 if(!sb){grid.innerHTML='<div class="empty-state">Connect Supabase to load policies.</div>';return}
 const {data:rows=[],error}=await sb.from("policies").select("*").eq("published",true).order("sort_order",{ascending:true}).order("created_at",{ascending:true});
 if(error){grid.innerHTML='<div class="empty-state">Policies could not be loaded.</div>';return}
 const cats=[...new Set(rows.map(r=>r.category).filter(Boolean))];
 if(filter)filter.innerHTML='<button class="filter-btn active" data-filter="all">All</button>'+cats.map(c=>`<button class="filter-btn" data-filter="${esc(c)}">${esc(c)}</button>`).join("");
 grid.innerHTML=rows.length?rows.map(p=>{
   const bullets=Array.isArray(p.bullet_points)?p.bullet_points:[];
   return `<article class="card policy-card reveal visible" data-category="${esc(p.category)}"><div class="icon">${esc(p.icon||"●")}</div><h3>${esc(p.title)}</h3><p>${esc(p.summary)}</p>${bullets.length?`<ul>${bullets.map(b=>`<li>${esc(b)}</li>`).join("")}</ul>`:""}<button class="policy-more">Full details</button><div class="policy-extra">${esc(p.detail||"Further details will be published here.")}</div></article>`;
 }).join(""):'<div class="empty-state">No policies published yet.</div>';
 document.querySelectorAll(".filter-btn").forEach(btn=>btn.addEventListener("click",()=>{
  document.querySelectorAll(".filter-btn").forEach(b=>b.classList.remove("active"));btn.classList.add("active");
  const f=btn.dataset.filter;document.querySelectorAll(".policy-card").forEach(card=>card.style.display=(f==="all"||card.dataset.category===f)?"block":"none");
 }));
 document.querySelectorAll(".policy-more").forEach(btn=>btn.addEventListener("click",()=>{const card=btn.closest(".policy-card");card.classList.toggle("open");btn.textContent=card.classList.contains("open")?"Show less":"Full details"}));
}

const counterObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)return;const el=entry.target,target=Number(el.dataset.counter)||0,start=performance.now(),duration=1200;const tick=now=>{const p=Math.min((now-start)/duration,1);el.textContent=Math.floor(target*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(tick)};requestAnimationFrame(tick);counterObserver.unobserve(el)}),{threshold:.5});
document.querySelectorAll("[data-counter]").forEach(el=>counterObserver.observe(el));

const interest=$("interest-form");
if(interest)interest.addEventListener("submit",async e=>{
 e.preventDefault();const msg=$("interest-msg");
 if(!sb){msg.textContent="Connect Supabase before using this form.";return}
 const {error}=await sb.from("interest_forms").insert({name:$("interest-name").value,email:$("interest-email").value,interest_type:$("interest-type").value});
 msg.textContent=error?"Could not submit. Please try again.":"Thanks — your interest has been recorded.";
 if(!error)interest.reset();
});

renderStats();renderPeople();renderNews();renderPolicies();
})();