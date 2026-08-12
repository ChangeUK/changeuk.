(() => {
const $=id=>document.getElementById(id);
const cfg=window.CHANGE_UK_CONFIG||{};
const configured=cfg.SUPABASE_URL&&!cfg.SUPABASE_URL.includes("PASTE_")&&cfg.SUPABASE_ANON_KEY&&!cfg.SUPABASE_ANON_KEY.includes("PASTE_");
const sb=configured&&window.supabase?window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY):null;
const esc=(s="")=>String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const fallback="person-placeholder.svg";
async function sha256(text){const data=new TextEncoder().encode(text);const buf=await crypto.subtle.digest("SHA-256",data);return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,"0")).join("")}
function status(el,text,ok=false){el.textContent=text;el.className="form-msg "+(ok?"ok":"bad")}
function activate(id){document.querySelectorAll(".tab[data-tab]").forEach(x=>x.classList.toggle("active",x.dataset.tab===id));document.querySelectorAll(".admin-panel").forEach(x=>x.classList.toggle("active",x.id===id))}
document.querySelectorAll(".tab[data-tab]").forEach(b=>b.onclick=()=>activate(b.dataset.tab));
document.querySelectorAll("[data-jump]").forEach(b=>b.onclick=()=>activate(b.dataset.jump));

async function isAdmin(){
 if(!sb)return false;
 const {data:{user}}=await sb.auth.getUser();if(!user)return false;
 const {data}=await sb.from("admin_profiles").select("user_id").eq("user_id",user.id).maybeSingle();
 return !!data;
}
async function showLoginOrAdmin(){
 if(await isAdmin()){$("login-view").classList.add("hidden");$("admin-view").classList.remove("hidden");loadAll()}
 else{$("login-view").classList.remove("hidden");$("admin-view").classList.add("hidden")}
}
$("code-form").addEventListener("submit",async e=>{
 e.preventDefault();const hash=await sha256($("access-code").value.trim());
 if(hash!==window.CHANGEUK_ACCESS_HASH){status($("code-msg"),"Incorrect access code.");return}
 sessionStorage.setItem("changeuk_gate","1");$("code-view").classList.add("hidden");showLoginOrAdmin();
});
if(sessionStorage.getItem("changeuk_gate")==="1"){$("code-view").classList.add("hidden");showLoginOrAdmin()}
$("login-form").addEventListener("submit",async e=>{
 e.preventDefault();if(!sb){status($("login-msg"),"Connect Supabase in config.js first.");return}
 const {error}=await sb.auth.signInWithPassword({email:$("login-email").value,password:$("login-password").value});
 if(error){status($("login-msg"),error.message);return}
 if(!(await isAdmin())){await sb.auth.signOut();status($("login-msg"),"This account is not authorised for the Control Room.");return}
 $("login-view").classList.add("hidden");$("admin-view").classList.remove("hidden");loadAll();
});
$("logout-btn").onclick=async()=>{if(sb)await sb.auth.signOut();sessionStorage.removeItem("changeuk_gate");location.reload()};

async function upload(file,folder){
 if(!file)return null;
 const safe=(Date.now()+"-"+file.name).replace(/[^a-zA-Z0-9._-]/g,"_"),path=`${folder}/${safe}`;
 const {error}=await sb.storage.from("party-images").upload(path,file,{upsert:false});if(error)throw error;
 return sb.storage.from("party-images").getPublicUrl(path).data.publicUrl;
}

async function loadDashboard(){
 const {data:s}=await sb.from("party_stats").select("*").eq("id",1).maybeSingle();
 const stats=s||{mps:0,councillors:0,helpers:0,members:0};
 ["mps","councillors","helpers","members"].forEach(k=>{const a=$("dash-"+k),b=$("edit-"+k);if(a)a.textContent=stats[k]||0;if(b)b.value=stats[k]||0});
}
async function loadPeople(){
 const {data:rows=[]}=await sb.from("people").select("*").order("created_at",{ascending:false});
 const box=$("admin-people-list");
 box.innerHTML=rows.length?rows.map(p=>`<div class="admin-row"><img src="${esc(p.image_url||fallback)}" onerror="this.src='${fallback}'"><div><strong>${esc(p.name)}</strong><small>${esc(p.role)}${p.area?" • "+esc(p.area):""}</small></div><div class="row-actions"><button class="edit-btn" data-person-edit="${p.id}">Edit</button><button class="delete-btn" data-person-delete="${p.id}">Delete</button></div></div>`).join(""):"<p>No people added.</p>";
 box.querySelectorAll("[data-person-delete]").forEach(b=>b.onclick=async()=>{await sb.from("people").delete().eq("id",b.dataset.personDelete);loadPeople();loadDashboard()});
 box.querySelectorAll("[data-person-edit]").forEach(b=>b.onclick=()=>{const p=rows.find(x=>x.id===b.dataset.personEdit);$("person-id").value=p.id;$("person-name").value=p.name||"";$("person-role").value=p.role||"mp";$("person-area").value=p.area||"";$("person-title").value=p.title||"";$("person-bio").value=p.bio||"";window.scrollTo({top:0,behavior:"smooth"})});
}
function clearPerson(){$("person-id").value="";$("person-form").reset()}
$("person-cancel").onclick=clearPerson;
$("person-form").addEventListener("submit",async e=>{
 e.preventDefault();const m=$("person-msg");try{
  const id=$("person-id").value;let image=null;const file=$("person-file").files[0];if(file)image=await upload(file,"people");
  const row={name:$("person-name").value.trim(),role:$("person-role").value,area:$("person-area").value.trim(),title:$("person-title").value.trim(),bio:$("person-bio").value.trim()};
  if(image)row.image_url=image;
  const q=id?sb.from("people").update(row).eq("id",id):sb.from("people").insert(row);const {error}=await q;if(error)throw error;
  clearPerson();status(m,"Person saved.",true);loadPeople();
 }catch(err){status(m,err.message||"Could not save person.")}
});

async function loadPolicies(){
 const {data:rows=[]}=await sb.from("policies").select("*").order("sort_order",{ascending:true});
 const box=$("admin-policy-list");
 box.innerHTML=rows.length?rows.map(p=>`<div class="admin-row"><div class="policy-mini-icon">${esc(p.icon||"●")}</div><div><strong>${esc(p.title)}</strong><small>${esc(p.category)} • order ${p.sort_order} • ${p.published?"Published":"Draft"}</small></div><div class="row-actions"><button class="edit-btn" data-policy-edit="${p.id}">Edit</button><button class="delete-btn" data-policy-delete="${p.id}">Delete</button></div></div>`).join(""):"<p>No policies added.</p>";
 box.querySelectorAll("[data-policy-delete]").forEach(b=>b.onclick=async()=>{await sb.from("policies").delete().eq("id",b.dataset.policyDelete);loadPolicies()});
 box.querySelectorAll("[data-policy-edit]").forEach(b=>b.onclick=()=>{const p=rows.find(x=>x.id===b.dataset.policyEdit);$("policy-id").value=p.id;$("policy-title").value=p.title||"";$("policy-category").value=p.category||"";$("policy-icon").value=p.icon||"●";$("policy-order").value=p.sort_order||0;$("policy-summary").value=p.summary||"";$("policy-bullets").value=Array.isArray(p.bullet_points)?p.bullet_points.join("\n"):"";$("policy-detail").value=p.detail||"";$("policy-published").checked=!!p.published;window.scrollTo({top:0,behavior:"smooth"})});
}
function clearPolicy(){$("policy-id").value="";$("policy-form").reset();$("policy-icon").value="●";$("policy-order").value=0;$("policy-published").checked=true}
$("policy-cancel").onclick=clearPolicy;
$("policy-form").addEventListener("submit",async e=>{
 e.preventDefault();const m=$("policy-msg");const id=$("policy-id").value;
 const bullets=$("policy-bullets").value.split("\n").map(x=>x.trim()).filter(Boolean);
 const row={title:$("policy-title").value.trim(),category:$("policy-category").value.trim(),icon:$("policy-icon").value.trim()||"●",sort_order:+$("policy-order").value||0,summary:$("policy-summary").value.trim(),bullet_points:bullets,detail:$("policy-detail").value.trim(),published:$("policy-published").checked,updated_at:new Date().toISOString()};
 const q=id?sb.from("policies").update(row).eq("id",id):sb.from("policies").insert(row);const {error}=await q;if(error){status(m,error.message);return}
 clearPolicy();status(m,"Policy saved.",true);loadPolicies();
});

async function loadNews(){
 const {data:rows=[]}=await sb.from("news").select("*").order("created_at",{ascending:false});
 const box=$("admin-news-list");
 box.innerHTML=rows.length?rows.map(n=>`<div class="admin-row"><img src="${esc(n.image_url||"news-placeholder.svg")}" onerror="this.src='news-placeholder.svg'"><div><strong>${esc(n.title)}</strong><small>${esc(n.category||"PARTY NEWS")} • ${n.published?"Published":"Draft"}</small></div><div class="row-actions"><button class="edit-btn" data-news-edit="${n.id}">Edit</button><button class="delete-btn" data-news-delete="${n.id}">Delete</button></div></div>`).join(""):"<p>No stories published.</p>";
 box.querySelectorAll("[data-news-delete]").forEach(b=>b.onclick=async()=>{await sb.from("news").delete().eq("id",b.dataset.newsDelete);loadNews()});
 box.querySelectorAll("[data-news-edit]").forEach(b=>b.onclick=()=>{const n=rows.find(x=>x.id===b.dataset.newsEdit);$("news-id").value=n.id;$("news-title").value=n.title||"";$("news-category").value=n.category||"PARTY NEWS";$("news-summary").value=n.summary||"";$("news-body").value=n.body||"";$("news-published").checked=!!n.published;window.scrollTo({top:0,behavior:"smooth"})});
}
function clearNews(){$("news-id").value="";$("news-form").reset();$("news-category").value="PARTY NEWS";$("news-published").checked=true}
$("news-cancel").onclick=clearNews;
$("news-form").addEventListener("submit",async e=>{
 e.preventDefault();const m=$("news-msg");try{
  const id=$("news-id").value;let image=null;const file=$("news-file").files[0];if(file)image=await upload(file,"news");
  const row={title:$("news-title").value.trim(),category:$("news-category").value.trim(),summary:$("news-summary").value.trim(),body:$("news-body").value.trim(),published:$("news-published").checked};if(image)row.image_url=image;
  const q=id?sb.from("news").update(row).eq("id",id):sb.from("news").insert(row);const {error}=await q;if(error)throw error;
  clearNews();status(m,"Story saved.",true);loadNews();
 }catch(err){status(m,err.message||"Could not save story.")}
});

$("stats-form").addEventListener("submit",async e=>{
 e.preventDefault();const row={id:1,mps:+$("edit-mps").value||0,councillors:+$("edit-councillors").value||0,helpers:+$("edit-helpers").value||0,members:+$("edit-members").value||0,updated_at:new Date().toISOString()};
 const {error}=await sb.from("party_stats").upsert(row);status($("stats-msg"),error?error.message:"Statistics saved.",!error);if(!error)loadDashboard();
});

function loadAll(){loadDashboard();loadPeople();loadPolicies();loadNews()}
})();