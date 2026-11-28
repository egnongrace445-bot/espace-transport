if(window.top!==window.self){try{window.top.location=window.self.location}catch(e){document.documentElement.innerHTML=""}}
const $=id=>document.getElementById(id);
/* ===== ORGANISATION DE L'INTERFACE : règles à respecter pour tout ajout =====
 1. Niveau 1 : barre du bas (6 rubriques au plus). Niveau 2 : sections d'un écran. Niveau 3 : blocs repliables acc(). Niveau 4 : formulaires.
 2. Ce qui sert chaque jour est visible ; tout le reste est replié, avec un résumé d'une ligne à droite du titre.
 3. Une seule action principale par écran (bouton plein). Les actions secondaires ont un contour. Les actions rares ou destructives sont un lien discret (.lnk).
 4. Une alerte ouvre d'office le bloc concerné et affiche un badge.
 5. Listes longues : les 10 premiers éléments, puis « Voir les autres ».
 6. Les formulaires d'ajout sont repliés, sauf quand la liste est vide. */
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=n=>Math.round(+n||0).toLocaleString("fr-FR")+" FCFA";
const today=()=>new Date().toLocaleDateString("sv-SE");
const dl=d=>Math.round((new Date(d+"T00:00:00")-new Date(today()+"T00:00:00"))/864e5);
const RN={owner:"Propriétaire",fleet_manager:"Gestionnaire de flotte",accountant:"Comptable",technician:"Technicien",driver:"Chauffeur"};
const TN={vtc:"VTC",taxi:"Taxi",gbaka:"Gbaka",woro:"Wôrô-wôrô"};
const CAT={essence:"Essence",gasoil:"Gasoil",lavage:"Lavage",parking:"Parking",peage:"Péage",credit_telephonique:"Crédit téléphonique",pneu:"Pneu",reparation:"Réparation",gare_syndicat:"Gare ou syndicat",autre:"Autre dépense"};
const DOCT={assurance:"Assurance",visite_technique:"Visite technique",carte_grise:"Carte grise",autorisation_transport:"Autorisation de transport",autre:"Autre document"};
const CS={draft:["t-warn","Brouillon"],submitted:["t-warn","À valider"],validated:["t-ok","Validée"],returned:["t-bad","Renvoyée"]};
const MS={reported:["t-bad","Signalé"],planned:["t-warn","Planifié"],in_progress:["t-warn","En cours"],done:["t-ok","Terminé"],cancelled:["t-bad","Annulé"]};
const NEXT={reported:"planned",planned:"in_progress",in_progress:"done"},NEXTL={reported:"Planifier",planned:"Démarrer",in_progress:"Terminé"};
const tag=a=>`<span class="tag ${a[0]}">${a[1]}</span>`;
const sel=(id,o,v)=>`<select id="${id}">${o.map(x=>`<option value="${x[0]}"${x[0]===v?" selected":""}>${x[1]}</option>`).join("")}</select>`;
const card=(t,b)=>`<div class="card">${t?`<h3>${t}</h3>`:""}${b}</div>`;
const none=t=>`<p class="note" style="margin:0">${t}</p>`;
const uid=()=>crypto.randomUUID();
const OPEN=new Map();let fiTab=null;
const acc=(k,t,s,b,d)=>`<details class="acc" data-k="${esc(k)}"${(OPEN.has(k)?OPEN.get(k):d)?" open":""}><summary><span class="at">${t}</span><span class="sm2">${s||""}</span></summary><div class="acc-b">${b}</div></details>`;
const accCard=(k,t,s,d,b)=>`<div class="card tight">${acc(k,t,s,b,d)}</div>`;
document.addEventListener("toggle",e=>{const d=e.target;if(d&&d.dataset&&d.dataset.k)OPEN.set(d.dataset.k,d.open)},true);
const SMS=!!(window.TM_CONFIG&&TM_CONFIG.sms);
function pick(accept){return new Promise(res=>{const i=document.createElement("input");i.type="file";i.accept=accept||"image/*";i.onchange=()=>res(i.files[0]||null);i.click()})}
async function shrink(f){if(!/^image\//.test(f.type))return f;const b=await createImageBitmap(f),k=Math.min(1,1280/Math.max(b.width,b.height)),c=document.createElement("canvas");c.width=Math.round(b.width*k);c.height=Math.round(b.height*k);c.getContext("2d").drawImage(b,0,0,c.width,c.height);return await new Promise(r=>c.toBlob(r,"image/jpeg",0.72))}
async function upload(f,tt,tid,dt,extra){const b=await shrink(f),ext=b.type==="application/pdf"?"pdf":"jpg",path=bid+"/"+tt+"/"+uid()+"."+ext;
 const u=await sb.storage.from("justificatifs").upload(path,b,{contentType:b.type||"image/jpeg"});if(u.error)throw u.error;
 const r=await sb.from("documents").insert(Object.assign({business_id:bid,target_type:tt,target_id:tid,doc_type:dt,file_path:path,uploaded_by:user.id},extra||{}));if(r.error)throw r.error;return path}
async function openFile(path){const s=await sb.storage.from("justificatifs").createSignedUrl(path,600);if(s.error)throw s.error;window.open(s.data.signedUrl,"_blank","noopener,noreferrer")}

let sb=null,user=null,mems=[],bid=null,roles=[],P=new Set(),D={},tab=null,mode="in",busy=false,isPA=false,scr="home",rpP=7,recov=false,mfaStep=null,mfaEnr=null,phStep=0,phNum="",lastUn=-1,selDate=null,selDrv=null,suSp=new Set(),pendEm="",suGo=false,MYSP=[],MYCO="",cvId=null,CVM=[],UNR={},signupTried=false,SOL=[],DRL=[],MYL=null,selSol=null,MYR="",MYPH="",MYCODE="",MYST="offline",TST={};
const can=p=>P.has(p),isDrv=()=>roles.includes("driver");
const QK="tm-queue2",qraw=()=>{try{return JSON.parse(localStorage.getItem(QK)||"[]")}catch(e){return[]}};
/* file d'attente hors connexion : chaque saisie est rattachée à son auteur, un autre compte sur le même téléphone ne la voit ni ne l'envoie */
const qget=()=>qraw().filter(x=>!x.u||(user&&x.u===user.id)),qset=q=>{try{const me=user&&user.id;localStorage.setItem(QK,JSON.stringify(qraw().filter(x=>x.u&&x.u!==me).concat(q.map(x=>x.u?x:Object.assign({u:me},x)))))}catch(e){}};
function toast(m){const t=$("toast");t.textContent=m;t.hidden=false;clearTimeout(toast.h);toast.h=setTimeout(()=>t.hidden=true,3500)}
function msg(e){const m=(e&&e.message)||String(e);
 if(/Invalid login/i.test(m))return"E-mail ou mot de passe incorrect.";
 if(/already registered/i.test(m))return"Cette adresse e-mail a déjà un compte.";
 if(/Password should be/i.test(m))return"Mot de passe trop court (8 caractères minimum).";
 if(/rate limit/i.test(m))return"Trop d’essais. Réessaie dans quelques minutes.";
 if(/expired or is invalid|otp_expired|invalid.*token/i.test(m))return"Code incorrect ou expiré. Touche « Renvoyer le code ».";
 if(/duplicate key/i.test(m))return"Cet élément existe déjà.";
 if(/fetch|network/i.test(m))return"Pas de connexion internet.";
 if(/row-level security/i.test(m))return"Action non autorisée pour ton rôle.";
 return m}
async function flush(){const q=qget();if(!q.length||!navigator.onLine||!sb)return;let left=[];
 for(const t of ["shifts","trips","revenues","expenses"]){const rows=q.filter(x=>x.t===t).map(x=>x.row);if(!rows.length)continue;
  const r=await sb.from(t).upsert(rows,{onConflict:"id",ignoreDuplicates:true});if(r.error)left=left.concat(q.filter(x=>x.t===t))}
 const fu=q.filter(x=>x.fuel&&!left.includes(x)).map(x=>x.fuel);if(fu.length)await sb.from("fuel_logs").upsert(fu,{onConflict:"expense_id",ignoreDuplicates:true});
 qset(left);if(left.length<q.length){const dn=q.filter(x=>!left.includes(x));await sb.from("sync_log").upsert(dn.map(x=>({business_id:x.row.business_id,user_id:user.id,client_op_id:x.row.id,table_name:x.t,status:"applied"})),{onConflict:"client_op_id",ignoreDuplicates:true})}
 if(left.length<q.length)toast((q.length-left.length)+" saisie(s) envoyée(s).")}

async function mfaCheck(){try{const a=await sb.auth.mfa.getAuthenticatorAssuranceLevel();if(a.data&&a.data.nextLevel==="aal2"&&a.data.currentLevel!=="aal2"){const f=await sb.auth.mfa.listFactors(),t=(f.data&&f.data.totp||[])[0];if(t){mfaStep={factorId:t.id};view();return true}}}catch(e){}return false}

async function init(){
 $("splash").innerHTML='<img src="icon-512.png" alt="EDSP"><h2>EDSP – <span>ESPACE TRANSPORT</span></h2><p>TRANSPORT MANAGER</p>';
 $("hl").innerHTML='<img src="icon-192.png" alt="EDSP">';
 const t0=Date.now(),hide=()=>setTimeout(()=>$("splash").classList.add("off"),Math.max(0,1300-(Date.now()-t0)));
 if(!window.supabase||!window.TM_CONFIG){$("main").innerHTML=card("Connexion impossible",none("Internet est nécessaire au premier lancement."));hide();return}
 sb=supabase.createClient(TM_CONFIG.url,TM_CONFIG.key);
 sb.auth.onAuthStateChange((ev,ses)=>{if(ev==="SIGNED_IN"&&ses&&ses.user&&mode==="code"){user=ses.user;mode="in";setTimeout(()=>{load()},0)}if(ev==="SIGNED_OUT"){signupTried=false;curSp=null;try{sessionStorage.removeItem("tm-sp")}catch(x){}user=null;mems=[];bid=null;D={};setTimeout(view,0)}if(ev==="PASSWORD_RECOVERY"){recov=true;setTimeout(view,0)}});
 const r=await sb.auth.getSession();user=r.data.session?r.data.session.user:null;
 if(user&&await mfaCheck()){hide();return}
 await flush();await load();hide();
}

async function load(){
 if(!user){view();return}
 try{
  const m=await sb.from("business_memberships").select("id,business_id,role,status,business_accounts(name,code,verification_status,expense_auto_approve_limit,legal_form,registration_no)").eq("user_id",user.id).order("created_at");
  if(m.error)throw m.error;mems=m.data||[];
  {const md=user.user_metadata||{},sp=md.signup_spaces||(md.signup_role?[md.signup_role]:null);if(Array.isArray(sp)&&sp.length&&!signupTried){signupTried=true;
   try{const want=sp.includes("owner")?[]:sp.filter(x=>x==="user"||x==="driver"||x==="company").slice(0,1),upd={};if(want.length)upd.spaces=want;if(md.signup_company)upd.company_name=String(md.signup_company).slice(0,100);if(md.signup_phone&&okPhone(md.signup_phone))upd.phone=md.signup_phone;if(Object.keys(upd).length){const r0=await sb.from("profiles").update(upd).eq("id",user.id);if(r0.error)throw r0.error}
    if(sp.includes("owner")&&md.signup_biz&&!mems.some(x=>x.role==="owner")){const r=await sb.rpc("create_business",{p_name:md.signup_biz});if(r.error)throw r.error;toast("Espace propriétaire créé.")}}catch(e){toast(msg(e))}
   try{await sb.auth.updateUser({data:{signup_spaces:null,signup_role:null,signup_biz:null,signup_phone:null,signup_company:null}})}catch(x){}
   const m2=await sb.from("business_memberships").select("id,business_id,role,status,business_accounts(name,code,verification_status,expense_auto_approve_limit,legal_form,registration_no)").eq("user_id",user.id).order("created_at");if(!m2.error)mems=m2.data||[]}}
  const act=mems.filter(x=>x.status==="active"),sv=localStorage.getItem("tm-biz");
  bid=((act.find(x=>x.business_id===sv)||act[0])||{}).business_id||null;
  roles=act.filter(x=>x.business_id===bid).map(x=>x.role);P=new Set();D={};
  if(bid){const p=await sb.from("role_permissions").select("permission").in("role",roles);(p.data||[]).forEach(x=>P.add(x.permission));
   if(P.size)await loadStaff();if(isDrv())await loadDrv()}
  const pa=await sb.from("platform_admins").select("user_id").eq("user_id",user.id).maybeSingle();isPA=!!pa.data;
  if(isPA){const q=await Promise.all([sb.from("business_accounts").select("id,name,code,verification_status,suspended,created_at").order("created_at",{ascending:false}),sb.from("business_memberships").select("business_id,role,status")]);
   D.pb=q[0].data||[];D.pc={};(q[1].data||[]).forEach(x=>{const t=D.pc[x.business_id]=D.pc[x.business_id]||{n:0,p:0};if(x.status==="active")t.n++;else if(x.status==="pending")t.p++})}
  const nn=await sb.from("notifications").select("id,kind,title,body,created_at,read_at").order("created_at",{ascending:false}).limit(30);D.nt=nn.data||[];try{const mf=await sb.auth.mfa.listFactors();D.mf=(mf.data&&mf.data.totp)||[]}catch(e){D.mf=[]}
  const un=D.nt.filter(x=>!x.read_at).length;if(un>lastUn&&lastUn>=0&&"Notification" in window&&Notification.permission==="granted")try{new Notification("EDSP – ESPACE TRANSPORT",{body:D.nt.find(x=>!x.read_at).title,icon:"icon-192.png"})}catch(e){}lastUn=un;await loadSol();pickSpace();
  try{localStorage.setItem("tm-snap2",JSON.stringify({u:user.id,mems,bid,roles,P:[...P],D}))}catch(e){}
 }catch(e){try{const s=JSON.parse(localStorage.getItem("tm-snap2")||"null");if(s&&s.u===user.id){mems=s.mems;bid=s.bid;roles=s.roles;P=new Set(s.P);D=s.D}}catch(x){}toast(msg(e))}
 view();
}

async function loadSol(){try{const q=await Promise.all([sb.rpc("my_solicitations"),sb.rpc("list_visible_drivers"),sb.from("driver_listings").select("*").eq("user_id",user.id).maybeSingle(),sb.from("profiles").select("residence,spaces,phone,public_code,company_name").eq("id",user.id).maybeSingle(),sb.rpc("my_driver_status"),sb.rpc("unread_by_solicitation")]);SOL=q[0].data||[];DRL=q[1].data||[];MYL=q[2].data||null;MYR=(q[3].data&&q[3].data.residence)||"";MYSP=(q[3].data&&q[3].data.spaces)||[];MYPH=(q[3].data&&q[3].data.phone)||"";MYCO=(q[3].data&&q[3].data.company_name)||"";MYCODE=(q[3].data&&q[3].data.public_code)||"";MYST=(typeof q[4].data==="string"&&q[4].data)||"offline";UNR={};((q[5]&&q[5].data)||[]).forEach(x=>{UNR[x.solicitation_id]=x.n});TST={};if(bid&&can("member.read")){const t=await sb.rpc("team_driver_statuses",{p_business:bid});(t.data||[]).forEach(x=>{TST[x.user_id]=x.status})}}catch(e){}}
const acct=()=>((user&&user.user_metadata)||{}).account_type||"";
const SPN={user:"Particulier",driver:"Chauffeur",owner:"Propriétaire",company:"Entreprise"};
const spaceOn=k=>k==="company"?MYSP.includes("company"):k==="owner"?mems.some(m=>m.role!=="driver"&&m.status==="active"):k==="driver"?(MYSP.includes("driver")||acct()==="driver"||mems.some(m=>m.role==="driver"&&m.status==="active")):(MYSP.includes("user")||acct()==="user");
const pendIn=()=>(SOL||[]).filter(x=>x.direction==="in"&&x.status==="pending").length;
const PAL=[{n:"Bleu et vert",b:"#03326E",b2:"#01478D",s:"#97D010",o:"#0f1f00",e:"#228B33",h:"#c6ee74"},{n:"Orange",b:"#8a3b00",b2:"#b45309",s:"#f59e0b",o:"#1f1300",e:"#d97706",h:"#fde68a"},{n:"Violet",b:"#3b1d7a",b2:"#5b2fc4",s:"#a78bfa",o:"#1a0b3d",e:"#7c3aed",h:"#ddd6fe"},{n:"Turquoise",b:"#0b4f55",b2:"#0e7490",s:"#2dd4bf",o:"#022b2e",e:"#0d9488",h:"#99f6e4"},{n:"Rose",b:"#7a1d4a",b2:"#be185d",s:"#f472b6",o:"#3b0a22",e:"#db2777",h:"#fbcfe8"},{n:"Gris",b:"#27272a",b2:"#3f3f46",s:"#a1a1aa",o:"#18181b",e:"#52525b",h:"#e4e4e7"},
{n:"Bronze",b:"#5c3d1e",b2:"#8c5a2b",s:"#cd7f32",o:"#2a1602",e:"#a86a2a",h:"#f0c9a0"},
{n:"Marron",b:"#3e2417",b2:"#5d3a26",s:"#a0674a",o:"#1f0f07",e:"#7a4a30",h:"#e6c3ad"},
{n:"Bleu ciel",b:"#0b5f8a",b2:"#0284c7",s:"#7dd3fc",o:"#06324a",e:"#38bdf8",h:"#e0f2fe"},
{n:"Doré",b:"#6b4e00",b2:"#a37b00",s:"#facc15",o:"#2b2000",e:"#ca9a04",h:"#fef08a"},
{n:"Bordeaux",b:"#5c0f24",b2:"#8b1a3a",s:"#e87a97",o:"#3a0716",e:"#a3254a",h:"#fbd0dc"},
{n:"Olive",b:"#3f4a12",b2:"#5f6f1a",s:"#b5c43a",o:"#1f2505",e:"#7d8d22",h:"#e5edb0"}];
const SPI={owner:"🏢",driver:"🚖",user:"🙋",company:"💼"};
let PALSEL=(()=>{const d={owner:0,driver:1,user:2,company:3};try{return Object.assign(d,JSON.parse(localStorage.getItem("tm-pal")||"{}"))}catch(e){return d}})();
let FRM=(()=>{try{return localStorage.getItem("tm-frm")!=="0"}catch(e){return true}})();
const darkMQ=window.matchMedia?matchMedia("(prefers-color-scheme: dark)"):null;
const dk=(h,f)=>"#"+[1,3,5].map(i=>Math.round(parseInt(h.substr(i,2),16)*f).toString(16).padStart(2,"0")).join("");
let curSp=(()=>{try{return sessionStorage.getItem("tm-sp")||null}catch(e){return null}})();
const laneOf=()=>mems.some(m=>m.status==="active"&&m.role!=="driver")?"owner":(MYSP.includes("driver")||mems.some(m=>m.status==="active"&&m.role==="driver"))?"driver":MYSP.includes("company")?"company":MYSP.includes("user")?"user":null;
const SPS=()=>isPA?["owner","driver","user","company"]:(laneOf()?[laneOf()]:[]);
function pickSpace(){const L=SPS();if(curSp&&!L.includes(curSp))curSp=null;if(!curSp&&L.length===1)curSp=L[0];try{curSp?sessionStorage.setItem("tm-sp",curSp):sessionStorage.removeItem("tm-sp")}catch(e){}}
function applySpace(sp,lab){const p=PAL[PALSEL[sp]]||PAL[0],f=darkMQ&&darkMQ.matches?.7:1,r=document.documentElement.style;r.setProperty("--brand",dk(p.b,f));r.setProperty("--brand2",dk(p.b2,f));r.setProperty("--sun",p.s);r.setProperty("--on",p.o);r.setProperty("--end",dk(p.e,f));r.setProperty("--hl",p.h);r.setProperty("--frame",FRM?p.s+"b3":"");r.setProperty("--frame-top",FRM?p.s:"");r.setProperty("--frame-w",FRM?"4px":"");const m=document.querySelector('meta[name=theme-color]');if(m)m.content=dk(p.b,f);const sb2=document.querySelector("header .sub");if(sb2)sb2.textContent=user?"TRANSPORT MANAGER · "+(lab===false?"MES ESPACES":"ESPACE "+SPN[sp].toUpperCase()):"TRANSPORT MANAGER"}
if(darkMQ&&darkMQ.addEventListener)darkMQ.addEventListener("change",()=>{try{view()}catch(e){}});
const STE={online:"🟢 En ligne",exchange:"🔵 En échange",accepted:"🔴 Demande acceptée",offline:"⚫ Pas en ligne"};
const VC={new:"Neuf",recent:"Récent",old:"Ancien"};
const MYNAME=()=>((user&&user.user_metadata)||{}).full_name||"";
const VT=()=>[["","Type…"]].concat(["vtc","taxi","gbaka","woro"].filter(k=>TN[k]).map(k=>[k,TN[k]]),[["other","Autre"]]);
const KL={staff:"Transport du personnel",delivery:"Livraison",regular:"Mission régulière",personal:"Déplacement personnel (quotidien)",event:"Événement et cérémonie",travel:"Voyage et long trajet",fulltime:"En plein temps",family:"Course familiale (sortie, détente, école)",replacement:"Remplacement de chauffeur",join:"Rejoindre une entreprise",other:"Autre"};
const SST={pending:["t-warn","En attente"],accepted:["t-warn","Acceptée : à confirmer"],confirmed:["t-ok","Confirmée ✅"],declined:["t-bad","Refusée"],cancelled:["t-warn","Annulée"]};
async function loadStaff(){
 const q=(t,c)=>sb.from(t).select(c).eq("business_id",bid),vr=can("vehicle.read"),fin=can("finance.read")||can("shift.read_all"),S31d=new Date(Date.now()-30*864e5).toLocaleDateString("sv-SE"),S31=S31d+"T00:00:00";
 const r=await Promise.all([
  can("member.read")?q("business_memberships","id,user_id,role,status,profiles(full_name,residence,phone,public_code)"):null,
  vr?q("vehicles","id,plate,make,model,transport_type,status,line_id"):null,
  vr?q("transport_lines","id,name,transport_type"):null,
  vr?q("vehicle_assignments","id,vehicle_id,driver_id").is("ends_on",null):null,
  can("contract.read")?q("contracts","id,vehicle_id,mode,period,fixed_amount,percentage,rest_days_per_week,carry_over_arrears,starts_on,ends_on").order("starts_on",{ascending:false}):null,
  can("document.read")?q("documents","id,target_id,doc_type,expires_on,file_path").eq("target_type","vehicle"):null,
  (can("finance.read")||can("settlement.review"))?q("settlements","shift_id,status,gross,expenses_total,net,due_owner,driver_balance,return_reason,submitted_at").order("submitted_at",{ascending:false}).limit(30):null,
  can("ledger.read")?q("ledger_entries","id,driver_id,kind,amount,reason,created_at").order("created_at",{ascending:false}).limit(400):null,
  can("payment.record")?q("payments","id,driver_id,kind,method,amount").is("acknowledged_at",null):null,
  can("maintenance.read")?q("maintenance_orders","id,vehicle_id,kind,status,release_decision").order("created_at",{ascending:false}).limit(20):null,
  can("member.read")?sb.from("driver_profiles").select("user_id,licence_number,licence_category,licence_expires_on"):null,
  fin?sb.from("revenues").select("shift_id,amount").eq("business_id",bid).gte("received_at",S31):null,
  fin?sb.from("expenses").select("id,shift_id,vehicle_id,category,amount,status,spent_at,note").eq("business_id",bid).gte("spent_at",S31):null,
  can("shift.read_all")?q("shifts","id,shift_date,vehicle_id,driver_id,start_km,end_km,ended_at").gte("shift_date",S31d).order("shift_date",{ascending:false}).limit(80):null,
  fin?q("fuel_logs","expense_id,liters,vehicle_id").limit(40):null,
  can("incident.read")?q("incidents","id,vehicle_id,type,severity,status,description").order("occurred_at",{ascending:false}).limit(15):null,
  fin?sb.from("trips").select("id,shift_id,passengers,fare").eq("business_id",bid).gte("started_at",S31):null,
  can("document.read")?sb.from("documents").select("target_id,file_path").eq("business_id",bid).eq("target_type","expense"):null]);
 const v=i=>(r[i]&&r[i].data)||[];
 D.mem=v(0);D.veh=v(1);D.lines=v(2);D.asg=v(3);D.conAll=v(4);D.con=D.conAll.filter(c=>!c.ends_on);D.docs=v(5);D.set=v(6);D.led=v(7);D.pay=v(8);D.mnt=v(9);D.dp=v(10);D.rv=v(11);D.ex=v(12);D.ms=v(13);D.fl=v(14);D.inc=v(15);D.tr=v(16);D.xr={};v(17).forEach(x=>D.xr[x.target_id]=x.file_path);D.sh={};
 if(D.set.length){const s=await sb.from("shifts").select("id,shift_date,vehicle_id,driver_id").in("id",D.set.map(x=>x.shift_id));(s.data||[]).forEach(x=>D.sh[x.id]=x)}
}
async function loadDrv(){
 const a=await sb.from("vehicle_assignments").select("vehicle_id").eq("driver_id",user.id).eq("business_id",bid).is("ends_on",null);
 const ids=(a.data||[]).map(x=>x.vehicle_id);let vid=ids[0];const pv=localStorage.getItem("tm-veh");if(ids.includes(pv))vid=pv;
 const L=await Promise.all([sb.from("ledger_entries").select("amount").eq("driver_id",user.id).eq("business_id",bid),
  sb.from("payments").select("id,kind,amount,acknowledged_at").eq("driver_id",user.id).eq("business_id",bid).order("paid_at",{ascending:false}).limit(10),
  sb.from("shifts").select("id,shift_date,vehicle_id").eq("driver_id",user.id).eq("business_id",bid).order("shift_date",{ascending:false}).limit(14),
  ids.length?sb.from("vehicles").select("id,plate").in("id",ids):null,
  sb.from("ledger_entries").select("kind,amount,reason,created_at").eq("driver_id",user.id).eq("business_id",bid).order("created_at",{ascending:false}).limit(20)]);
 D.dBal=(L[0].data||[]).reduce((s,x)=>s+(+x.amount),0);D.dPay=L[1].data||[];D.my=null;D.minev=(L[3]&&L[3].data)||[];D.dLed=L[4].data||[];D.past=L[2].data||[];
 if(D.past.length){const s=await sb.from("settlements").select("shift_id,status").in("shift_id",D.past.map(x=>x.id)),m={};(s.data||[]).forEach(x=>m[x.shift_id]=x.status);
  D.past.forEach(x=>{x.status=m[x.id]||null;const v=D.minev.find(y=>y.id===x.vehicle_id);x.plate=v?v.plate:""})}
 const lp=await sb.from("driver_profiles").select("licence_number,licence_category,licence_expires_on").eq("user_id",user.id).maybeSingle();D.dp0=lp.data;
 if(!vid)return;
 const q=await Promise.all([
  sb.from("vehicles").select("id,plate,make,model,transport_type,line_id,status").eq("id",vid).maybeSingle(),
  sb.from("contracts").select("mode,period,fixed_amount,percentage,rest_days_per_week,carry_over_arrears").eq("vehicle_id",vid).is("ends_on",null).limit(1),
  sb.from("documents").select("doc_type,expires_on").eq("target_type","vehicle").eq("target_id",vid),
  sb.from("shifts").select("id,start_km,end_km,ended_at").eq("vehicle_id",vid).eq("driver_id",user.id).eq("shift_date",selDate||today()).maybeSingle()]);
 D.my=q[0].data;D.rule=(q[1].data||[])[0]||null;D.ddocs=q[2].data||[];D.shift=q[3].data;D.line=null;D.rev=[];D.exp=[];D.st=null;D.trp=[];D.rcp={};
 if(D.my&&D.my.line_id){const l=await sb.from("transport_lines").select("name").eq("id",D.my.line_id).maybeSingle();D.line=l.data}
 if(D.shift){const w=await Promise.all([sb.from("revenues").select("id,amount,source,trip_id").eq("shift_id",D.shift.id).order("received_at"),
  sb.from("expenses").select("id,category,amount,status,note").eq("shift_id",D.shift.id).order("spent_at"),
  sb.from("settlements").select("status,return_reason").eq("shift_id",D.shift.id).maybeSingle(),
  sb.from("trips").select("id,fare,passengers,note").eq("shift_id",D.shift.id).order("started_at"),
  sb.from("documents").select("target_id,file_path").eq("business_id",bid).eq("target_type","expense").eq("uploaded_by",user.id)]);
  D.rev=w[0].data||[];D.exp=w[1].data||[];D.st=w[2].data;D.trp=w[3].data||[];D.rcp={};(w[4].data||[]).forEach(x=>D.rcp[x.target_id]=x.file_path)}
}

/* ---------- calculs ---------- */
function dueOf(net,r){if(!r)return 0;
 const fx=r.mode==="percentage"?0:(r.period==="week"?r.fixed_amount/Math.max(7-(r.rest_days_per_week||0),1):r.fixed_amount);
 const raw=r.mode==="fixed"?fx:r.mode==="percentage"?Math.max(net,0)*r.percentage/100:fx+Math.max(net-fx,0)*r.percentage/100;
 return r.carry_over_arrears?raw:Math.min(raw,Math.max(net,0))}
const conTxt=c=>(c.mode==="fixed"?fmt(c.fixed_amount):c.mode==="percentage"?c.percentage+" %":fmt(c.fixed_amount)+" + "+c.percentage+" %")+(c.period==="week"?" / semaine":"");
const docRows=l=>l.map(d=>{const j=d.expires_on?dl(d.expires_on):null,t=j===null?["t-warn","Sans date"]:j<0?["t-bad","Expiré"]:j<=5?["t-warn","Dans "+j+" j"]:["t-ok","Valide"];
 return `<div class="row"><span>${DOCT[d.doc_type]||esc(d.doc_type)}<br><span class="note" style="margin:0">${d.expires_on?"échéance "+d.expires_on.split("-").reverse().join("/"):""}</span></span>${tag(t)}${d.file_path&&can("document.read")?`<button class="btn ghost sm" data-a="seefile" data-f="${esc(d.file_path)}">📎</button>`:""}</div>`}).join("");
const okPhone=x=>/^\+?[0-9 ().-]{8,20}$/.test((x||"").trim());
const profOf=u=>{const m=(D.mem||[]).find(x=>x.user_id===u);return(m&&m.profiles)||{}};
const residOf=u=>profOf(u).residence||"";
const nameOf=u=>{const m=(D.mem||[]).find(x=>x.user_id===u);return(m&&m.profiles&&m.profiles.full_name)||"Membre"};
const plateOf=id=>{const v=(D.veh||[]).find(x=>x.id===id);return v?v.plate:""};

/* ---------- écrans ---------- */
const authTabs=()=>`<div class="seg"><button class="btn ${mode==="in"?"":"ghost"}" data-a="mode" data-v="in">Se connecter</button><button class="btn ${mode==="up"?"":"ghost"}" data-a="mode" data-v="up">Créer un compte</button>${SMS?`<button class="btn ${mode==="ph"?"":"ghost"}" data-a="mode" data-v="ph">Téléphone</button>`:""}</div>`;
function phoneView(){return card("",authTabs()+(phStep?`<label for="pt">Code reçu par SMS</label><input id="pt" inputmode="numeric" autocomplete="one-time-code"><div class="btns"><button class="btn sun" data-a="phverify">Valider</button></div>`:`<label for="fn">Nom complet (nouveau compte)</label><input id="fn"><label for="ph">Téléphone (+225…)</label><input id="ph" type="tel" inputmode="tel" placeholder="+225 07 00 00 00 00"><div class="btns"><button class="btn sun" data-a="phsend">Recevoir le code</button></div>`))}
const pwi=(id,ac)=>`<div class="pwf"><input id="${id}" type="password" autocomplete="${ac}" placeholder="8 caractères minimum"><button type="button" class="eye" data-a="eye" data-t="${id}" aria-label="Afficher le mot de passe">👁️</button></div>`;
function codeView(){return card("Confirme ton e-mail",`<p style="margin:0">Nous avons envoyé un e-mail à <b>${esc(pendEm)}</b>.</p><p style="margin:10px 0 0"><b>Le plus simple :</b> ouvre l’e-mail et touche <b>Confirmer mon e-mail</b>. Tu reviens ici automatiquement.</p><p style="margin:10px 0 0">Le bouton ne marche pas ? Écris le code de l’e-mail :</p><label for="cd">Code reçu par e-mail</label><input id="cd" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="Ex. 123456"><div class="btns"><button class="btn sun" data-a="vcode">Valider le code</button></div><div class="btns"><button class="btn ghost sm" data-a="rcode">Renvoyer l’e-mail</button><button class="btn ghost sm" data-a="mode" data-v="in">Retour</button></div><p class="note">Pas reçu ? Regarde dans les Spams.</p>`)}
function authView(){return authView0()+`<p class="note" style="text-align:center;margin:4px 0 0">Version ${APP_VER}</p>`}
function authView0(){if(mode==="code")return codeView();if(mode==="ph"&&SMS)return phoneView();const up=mode==="up";
 if(up&&!suGo)return card("",authTabs()+`<h3 style="margin:14px 0 4px">Quel est ton espace ?</h3><p class="note" style="margin:0 0 8px">Choisis un seul espace. Tu ne pourras plus en changer.</p>`+[["user","🙋 Particulier","Je cherche un chauffeur"],["company","💼 Entreprise","Ma société cherche des chauffeurs"],["driver","🚖 Chauffeur","Je conduis et je peux être sollicité"],["owner","🏢 Propriétaire","J’ai des véhicules à gérer"]].map(x=>`<button class="menu" data-a="spt" data-v="${x[0]}"><span>${suSp.has(x[0])?"✅":"⬜"} ${x[1]}<br><span class="note" style="margin:0">${x[2]}</span></span></button>`).join("")+`<div class="btns"><button class="btn sun" data-a="spgo">Continuer</button></div>`);
 return card("",`${authTabs()}
 ${up?`<div class="row" style="padding-top:0"><span>Espace : <b>${[...suSp].map(k=>SPN[k]).join(", ")}</b></span><button class="btn ghost sm" data-a="spback">Changer</button></div><label for="fn">Nom complet</label><input id="fn" autocomplete="name"><label for="ph2">Numéro de téléphone</label><input id="ph2" type="tel" inputmode="tel" maxlength="25" autocomplete="tel" placeholder="+225 07 00 00 00 00">${suSp.has("owner")?'<label for="sb">Nom de ton entreprise ou activité</label><input id="sb" placeholder="Ex. Transports Kouassi">':""}${suSp.has("company")?'<label for="sco">Nom de ta société</label><input id="sco" maxlength="100" placeholder="Ex. Société Kouassi SARL">':""}`:""}
 <label for="em">Adresse e-mail</label><input id="em" type="email" autocomplete="email" inputmode="email">
 <label for="pw">Mot de passe</label>${pwi("pw",up?"new-password":"current-password")}
 <div class="btns"><button class="btn sun" data-a="${up?"signup":"signin"}">${up?"Créer mon compte":"Me connecter"}</button></div>${up?"":'<p class="note" style="text-align:center"><a href="#" data-a="forgot">Mot de passe oublié ?</a></p>'}
 <p class="note">Phase de test : connexion par e-mail. Le code SMS viendra plus tard.</p>`)}

const ICON={sl:"🔎",sq:"🤝",td:"📊",vh:"🚗",cd:"👥",ms:"📍",fi:"💰",ps:"☰",jr:"🚖",mc:"💳",sg:"⚠️"};
const GRP={cv:"sq",ms:"td",en:"td",rp:"td",au:"td",pa:"ps",pf:"ps",ap:"ps",nt:"ps",gd:"ps",ct:"ps"};
const BK={td:"Tableau",sl:"Demande",sq:"Demandes",ps:"Plus"};
const VST={in_service:["t-ok","En service"],available:["t-ok","Disponible"],maintenance:["t-warn","En maintenance"],immobilised:["t-bad","Immobilisé"]};
const IT={accident:"Accident",police_check:"Contrôle de police",theft:"Vol",dispute:"Litige",breakdown:"Panne en route",other:"Autre"};
const IS={open:["t-bad","Ouvert"],handled:["t-warn","Pris en charge"],closed:["t-ok","Clôturé"]};
const G=t=>t==="sq"?(curSp==="owner"?"sl":null):t==="sl"?null:GRP[t];
function tabsList(){const T=[];
 if(curSp==="owner"){if(P.size){T.push(["td","Tableau"]);
   if(can("vehicle.read"))T.push(["vh","Véhicules"]);
   if(can("member.read"))T.push(["cd","Conducteurs"]);
   if(can("settlement.review")||can("finance.read")||can("ledger.read"))T.push(["fi","Finances"]);}
  if(can("member.manage"))T.push(["sl","Demande"])}
 else if(curSp==="driver"){if(isDrv())T.push(["jr","Ma journée"]);T.push(["sq","Demandes"]);if(isDrv())T.push(["mc","Mon compte"],["sg","Signaler"])}
 else if(curSp==="user"||curSp==="company"){T.push(["sl","Chauffeurs"],["sq","Demandes"])}
 T.push(["ps","Plus"]);return T}
const unr=()=>(D.nt||[]).filter(x=>!x.read_at).length;
const badge=t=>t==="sq"?((curSp==="driver"?pendIn():0)+Object.values(UNR).reduce((a,b)=>a+b,0)):t==="cd"&&can("member.manage")?(D.mem||[]).filter(x=>x.status==="pending").length:t==="fi"?((can("settlement.review")?(D.set||[]).filter(x=>x.status==="submitted").length:0)+(can("expense.approve")?(D.ex||[]).filter(x=>x.status==="pending").length:0)):t==="ps"?unr():0;

function view(){
 applySpace(curSp||"owner",!!curSp);
 $("out").hidden=!user;$("bar").hidden=!user||!curSp;$("bell").hidden=!user||!curSp;$("swsp").hidden=!user||!curSp||!isPA;{const u=unr();$("bell").innerHTML="🔔"+(u?`<i class="bd2">${u}</i>`:"")}
 if(recov){$("main").innerHTML=card("Nouveau mot de passe",`<label for="np">Nouveau mot de passe</label>${pwi("np","new-password")}<div class="btns"><button class="btn sun" data-a="newpw">Enregistrer</button></div>`);return}
 if(mfaStep){$("bar").hidden=true;$("main").innerHTML=card("Vérification en deux étapes",`<p class="note" style="margin-top:0">Entre le code à 6 chiffres affiché par ton application d’authentification.</p><label for="mc">Code</label><input id="mc" inputmode="numeric" autocomplete="one-time-code" maxlength="6"><div class="btns"><button class="btn sun" data-a="mfaok">Valider</button><button class="btn ghost" data-a="mfaout">Annuler</button></div>`);return}
 if(!user){$("main").innerHTML=tab==="ap"?aproposView()+'<div class="btns"><button class="btn ghost" data-a="home">Retour</button></div>':scr==="auth"?authView()+'<div class="btns"><button class="btn ghost" data-a="home">Retour</button></div>':accueil();return}
 if(!curSp){$("bar").hidden=true;$("main").innerHTML=(tab==="pa"&&isPA?`<div class="btns" style="margin:0 0 10px"><button class="btn ghost sm" data-a="hub" style="flex:none">← Mes espaces</button></div>`+plateforme():hub());return}
 const T=tabsList();if(!T.some(x=>x[0]===tab)&&!G(tab))tab=T[0][0];
 const cur=G(tab)||tab;
 $("bar").innerHTML=`<div>${T.map(x=>{const n=badge(x[0]);return `<button class="${cur===x[0]?"on":""}" data-a="tab" data-v="${x[0]}"><span class="ic">${ICON[x[0]]}</span>${x[1]}${n?`<i class="bd">${n}</i>`:""}</button>`}).join("")}</div>`;
 const F={td:tableau,vh:flotte,cd:conducteurs,ms:missions,fi:finances,en:carbEnt,rp:rapports,ps:plus,pa:plateforme,pf:profil,ap:aproposView,nt:notifs,au:journal,jr:journee,mc:monCompte,sg:signaler,sl:chauffeurs,sq:demandes,cv:conversation,gd:guide,ct:contact};
 $("main").innerHTML=(G(tab)&&tab!=="ps"?`<div class="btns" style="margin:0 0 10px"><button class="btn ghost sm" data-a="tab" data-v="${G(tab)}" style="flex:none">← ${BK[G(tab)]||"Plus"}</button></div>`:"")+(curSp&&!introSeen(curSp)&&tab===T[0][0]?introCard():"")+F[tab]();
 {const n=qget().length;if(!navigator.onLine||n)$("main").insertAdjacentHTML("afterbegin",`<div class="card" style="border-color:var(--sun);padding:10px 14px">${!navigator.onLine?"📴 Hors connexion. Tes saisies sont gardées sur le téléphone."+(n?" ("+n+" en attente)":""):"⏳ "+n+" saisie(s) en attente d’envoi."}</div>`)}
}

function exportCsv(){
 const since=new Date(Date.now()-(rpP-1)*864e5).toLocaleDateString("sv-SE"),M=(D.ms||[]).filter(s=>s.shift_date>=since),R={},E={},S={};
 (D.rv||[]).forEach(x=>R[x.shift_id]=(R[x.shift_id]||0)+(+x.amount));(D.ex||[]).filter(x=>x.status!=="rejected").forEach(x=>E[x.shift_id]=(E[x.shift_id]||0)+(+x.amount));(D.set||[]).forEach(x=>S[x.shift_id]=x);
 const q=s=>'"'+String(s==null?"":s).replace(/"/g,'""')+'"',rows=[["Date","Véhicule","Conducteur","Recettes","Dépenses","Résultat","Clôture","Dû au propriétaire"].map(q).join(";")];
 M.forEach(s=>{const st=S[s.id],r=R[s.id]||0,e=E[s.id]||0;rows.push([s.shift_date,plateOf(s.vehicle_id),nameOf(s.driver_id),r,e,r-e,st?CS[st.status][1]:"Non envoyée",st?st.due_owner:""].map(q).join(";"))});
 const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff"+rows.join("\n")],{type:"text/csv;charset=utf-8"}));a.download="edsp-rapport-"+today()+".csv";a.click();toast("Export prêt.")}

function accueil(){
 return `<div style="text-align:center;padding:10px 0 4px"><img src="icon-512.png" alt="" style="width:112px;height:112px;border-radius:26px;box-shadow:0 6px 22px #03326e33"><h2 style="margin:16px 0 4px;font-size:24px">EDSP – <span style="color:var(--brand2)">ESPACE TRANSPORT</span></h2><p class="note" style="margin:0;letter-spacing:.2em;font-weight:700">TRANSPORT MANAGER</p></div>`+
  card("",`<p style="margin:0">Gère tes véhicules, tes chauffeurs, tes recettes et tes dépenses, avec une clôture claire chaque jour.</p><div class="btns"><button class="btn sun" data-a="go" data-v="in">Se connecter</button><button class="btn" data-a="go" data-v="up">Créer un compte</button></div>`)+
  card("Pour qui ?",`<div class="row"><span>🏢 Propriétaires et gestionnaires de flotte</span></div><div class="row"><span>🚖 Chauffeurs : VTC, taxi, Gbaka, wôrô-wôrô</span></div><div class="row"><span>🧾 Comptables et techniciens</span></div>`)+
  `<p class="note" style="text-align:center"><a href="#" data-a="tab" data-v="ap">À propos</a></p>`}

function tableau(){
 const t0=today(),M=D.ms||[],V=D.veh||[],drv=(D.mem||[]).filter(x=>x.role==="driver"&&x.status==="active"),ids=new Set(M.filter(s=>s.shift_date===t0).map(s=>s.id));
 const sm=(L)=>L.filter(x=>ids.has(x.shift_id)).reduce((s,x)=>s+(+x.amount),0),rj=sm(D.rv||[]),dj=sm((D.ex||[]).filter(x=>x.status!=="rejected"));
 const pend=(D.mem||[]).filter(x=>x.status==="pending").length,sub=(D.set||[]).filter(x=>x.status==="submitted").length;
 const ds=(D.docs||[]).filter(d=>d.expires_on&&dl(d.expires_on)<=5),mo=(D.mnt||[]).filter(x=>x.status==="reported").length,io=(D.inc||[]).filter(x=>x.status==="open").length;
 const lc=(D.dp||[]).filter(x=>x.licence_expires_on&&dl(x.licence_expires_on)<=5),fin=can("finance.read");
 let h="";
 /* Niveau 1 : premier démarrage */
 if(!V.length&&can("vehicle.write"))h+=card("Pour commencer",`<p style="margin:0">Ajoute ton premier véhicule, puis accepte tes chauffeurs et affecte-les.</p><div class="btns"><button class="btn sun" data-a="tab" data-v="vh">Ajouter un véhicule</button></div>`);
 /* Niveau 1 : l'argent du jour */
 if(fin)h+=card("Aujourd’hui",`<div class="row"><span>Recettes</span><b>${fmt(rj)}</b></div><div class="row"><span>Dépenses</span><b>− ${fmt(dj)}</b></div><div class="row"><span>Résultat</span><b>${fmt(rj-dj)}</b></div><p class="note" style="margin:8px 0 0">${ids.size} mission(s) aujourd’hui</p>`);
 else h+=`<div class="kpis"><div class="kpi"><b>${ids.size}</b><span>Missions du jour</span></div></div>`;
 /* Niveau 1 : à traiter (urgent d'abord, 4 visibles au maximum) */
 const al=[];
 const urg=(i,t,v)=>al.push([0,i,t,v]),nor=(i,t,v)=>al.push([1,i,t,v]);
 if(io)urg("🚨",io+" incident(s) ouvert(s)","en");
 if(mo)urg("🔧",mo+" panne(s) signalée(s)","en");
 ds.forEach(d=>urg("📄",esc((DOCT[d.doc_type]||d.doc_type)+" · "+plateOf(d.target_id))+" : "+(dl(d.expires_on)<0?"expiré":"dans "+dl(d.expires_on)+" j"),"vh"));
 lc.forEach(x=>urg("🪪","Permis de "+esc(nameOf(x.user_id))+" : "+(dl(x.licence_expires_on)<0?"expiré":"dans "+dl(x.licence_expires_on)+" j"),"cd"));
 if(sub&&can("settlement.review"))nor("🧾",sub+" clôture(s) à valider","fi");
 if(pend&&can("member.manage"))nor("👥",pend+" demande(s) d’inscription","cd");
 {const unc=V.filter(x=>(D.asg||[]).some(a=>a.vehicle_id===x.id)&&!(D.con||[]).some(c=>c.vehicle_id===x.id)),nod=V.filter(x=>!(D.asg||[]).some(a=>a.vehicle_id===x.id)),sgn=new Set((D.set||[]).map(s=>s.shift_id)),old=M.filter(s=>s.shift_date<t0&&!sgn.has(s.id)).length;
  if(old)nor("⏳",old+" journée(s) passée(s) non clôturée(s)","ms");
  if(unc.length&&can("contract.write"))nor("📝",unc.length+" véhicule(s) affecté(s) sans contrat","vh");
  if(nod.length&&can("assignment.write"))nor("🚗",nod.length+" véhicule(s) sans conducteur","vh");}
 {const bz=(mems.find(x=>x.business_id===bid&&x.status==="active")||{}).business_accounts||{};if(bz.verification_status&&bz.verification_status!=="verified")nor("🏢","Entreprise pas encore vérifiée par EDSP (forme juridique et immatriculation à renseigner)","rp")}
 al.sort((a,b)=>a[0]-b[0]);
 const row=x=>`<div class="row"><span>${x[1]} ${x[2]}</span><button class="btn ghost sm" data-a="tab" data-v="${x[3]}">Voir</button></div>`;
 const LIM=4,top=al.slice(0,LIM),rest=al.slice(LIM);
 h+=card("À traiter"+(al.length?" ("+al.length+")":""),al.length?top.map(row).join("")+(rest.length?acc("td:more","Voir les "+rest.length+" autres","",rest.map(row).join(""),false):""):none("Rien à traiter pour l’instant."));
 /* Niveau 2 : chiffres de la flotte, repliés */
 h+=accCard("td:fleet","Ma flotte en un coup d’œil",V.length+" véhicule(s) · "+drv.length+" conducteur(s)",false,`<div class="row" style="border:0"><span>Véhicules</span><b>${V.length}</b></div><div class="row" style="border:0"><span>Conducteurs actifs</span><b>${drv.length}</b></div><div class="btns" style="margin-top:4px"><button class="btn lnk sm" data-a="tab" data-v="vh" style="flex:none">Ouvrir les véhicules</button><button class="btn lnk sm" data-a="tab" data-v="cd" style="flex:none">Ouvrir les conducteurs</button></div>`);
 {const TL=[];if(can("shift.read_all"))TL.push(["📍","Missions","ms"]);if(P.size&&can("maintenance.read"))TL.push(["🔧","Carburant et entretien","en"]);if(P.size&&can("report.read"))TL.push(["📈","Rapports et paramètres","rp"]);if(P.size&&can("audit.read"))TL.push(["📜","Journal d’activité","au"]);
  if(TL.length)h+=accCard("td:tools","🧰 Outils de gestion",TL.length+"",false,TL.map(x=>`<button class="menu" data-a="tab" data-v="${x[2]}"><span>${x[0]} ${x[1]}</span><span>›</span></button>`).join(""))}
 return h}

function conducteurs(){
 const M=D.mem||[],pend=M.filter(x=>x.status==="pending"),drv=M.filter(x=>x.role==="driver"&&x.status==="active"),oth=M.filter(x=>x.role!=="driver"&&x.status==="active");
 const free=(D.veh||[]).filter(v=>!(D.asg||[]).some(a=>a.vehicle_id===v.id)),b=(mems.find(x=>x.business_id===bid&&x.status==="active")||{}).business_accounts||{};
 let h=can("member.manage")?accCard("cd:code","Code de l’entreprise",esc(b.code),false,`<div class="note" style="margin-top:0">À donner à ton équipe pour qu’elle s’inscrive :</div><div class="code">${esc(b.code)}</div>`):"";
 h+=!pend.length?"":card("Demandes d’inscription ("+pend.length+")",pend.map(r=>`<div class="row"><span><b>${esc(nameOf(r.user_id))}</b><br><span class="note" style="margin:0">${RN[r.role]}${profOf(r.user_id).public_code?" · "+esc(profOf(r.user_id).public_code):""}${residOf(r.user_id)?" · 📍 "+esc(residOf(r.user_id)):""}${r.role==="driver"?" · "+STE[TST[r.user_id]||"offline"]:""}</span></span>`+(can("member.manage")?`<span class="col">${r.role==="driver"&&can("assignment.write")&&free.length?sel("fv"+r.id,free.map(v=>[v.id,v.plate]))+`<button class="btn sun sm" data-a="accasg" data-id="${r.id}" data-u="${r.user_id}">Accepter et affecter</button>`:`<button class="btn sun sm" data-a="acc" data-id="${r.id}" data-v="active">Accepter</button>`}<button class="btn lnk sm" data-a="acc" data-id="${r.id}" data-v="suspended">Refuser</button></span>`:"")+`</div>`).join(""));
 h+=card("Conducteurs ("+drv.length+")",drv.length?drv.map(r=>{const dp=(D.dp||[]).find(x=>x.user_id===r.user_id),as=(D.asg||[]).find(x=>x.driver_id===r.user_id),j=dp&&dp.licence_expires_on?dl(dp.licence_expires_on):null,lt=j===null?"":tag(j<0?["t-bad","Permis expiré"]:j<=5?["t-warn","Permis : "+j+" j"]:["t-ok","Permis valide"]);
  return acc("cd:"+r.id,esc(nameOf(r.user_id)),lt,`<div class="row" style="border:0"><span>Véhicule</span><b>${as?esc(plateOf(as.vehicle_id)):"—"}</b></div><div class="row" style="border:0"><span>Code</span><span>${esc(profOf(r.user_id).public_code||"")}</span></div><div class="row" style="border:0"><span>Téléphone</span><span>${profOf(r.user_id).phone?esc(profOf(r.user_id).phone):"non renseigné"}</span></div><div class="row" style="border:0"><span>Résidence</span><span>${residOf(r.user_id)?esc(residOf(r.user_id)):"non renseignée"}</span></div><div class="row" style="border:0"><span>Permis</span><span>${dp&&dp.licence_number?esc(dp.licence_number)+(dp.licence_category?" ("+esc(dp.licence_category)+")":""):"non renseigné"}</span></div>${can("member.manage")?`<div class="btns" style="margin-top:4px"><button class="btn lnk sm" data-a="acc" data-id="${r.id}" data-v="suspended" data-u="${r.user_id}" data-c="1" style="flex:none">Suspendre cet accès</button></div>`:""}`,false)}).join(""):none("Aucun conducteur actif."));
 h+=accCard("cd:oth","Autres membres",oth.length+"",false,oth.map(r=>`<div class="row"><span>${esc(nameOf(r.user_id))}</span><span class="col">${tag(["t-ok",RN[r.role]])}${can("member.manage")&&r.role!=="owner"?`<button class="btn lnk sm" data-a="acc" data-id="${r.id}" data-v="suspended" data-c="1">Suspendre</button>`:""}</span></div>`).join("")||none("—"));
 const sus=M.filter(x=>x.status==="suspended");
 h+=accCard("cd:sus","Accès suspendus ou refusés",sus.length+"",false,sus.length?sus.map(r=>`<div class="row"><span>${esc(nameOf(r.user_id))}<br><span class="note" style="margin:0">${RN[r.role]}</span></span>${can("member.manage")?`<button class="btn ghost sm" data-a="acc" data-id="${r.id}" data-v="active">Réactiver</button>`:""}</div>`).join(""):none("Aucun."));
 return h}

function missions(){
 const M=D.ms||[],sg={},R={},E={},TR={};(D.tr||[]).forEach(x=>TR[x.shift_id]=(TR[x.shift_id]||0)+1);(D.set||[]).forEach(s=>sg[s.shift_id]=s);
 (D.rv||[]).forEach(x=>R[x.shift_id]=(R[x.shift_id]||0)+(+x.amount));(D.ex||[]).filter(x=>x.status!=="rejected").forEach(x=>E[x.shift_id]=(E[x.shift_id]||0)+(+x.amount));
 const it=s=>{const st=sg[s.id],km=s.end_km!=null&&s.start_km!=null?(s.end_km-s.start_km)+" km":"",r2=(f,v)=>`<div class="row" style="border:0"><span>${f}</span><b>${v}</b></div>`;
  return acc("ms:"+s.id,`<b>${esc(s.shift_date)}</b> · <span class="chip">${esc(plateOf(s.vehicle_id))}</span>`,tag(st?CS[st.status]:s.ended_at?["t-warn","Terminée"]:["t-warn","En cours"]),r2("Conducteur",esc(nameOf(s.driver_id)))+(km?r2("Distance",km):"")+(TR[s.id]?r2("Courses / tours",TR[s.id]):"")+r2("Recettes",fmt(R[s.id]||0))+r2("Dépenses","− "+fmt(E[s.id]||0))+r2("Résultat",fmt((R[s.id]||0)-(E[s.id]||0))),false)};
 return card("Missions des 30 derniers jours ("+M.length+")",M.length?M.slice(0,10).map(it).join("")+(M.length>10?acc("ms:more","Voir les "+(M.length-10)+" autres","",M.slice(10).map(it).join(""),false):""):none("Aucune mission pour l’instant."))}

function approbations(){
 if(!can("expense.approve"))return "";
 const msd={};(D.ms||[]).forEach(s=>msd[s.id]=s);const L=(D.ex||[]).filter(x=>x.status==="pending");
 return card("Dépenses à approuver",L.length?L.map(x=>{const s=msd[x.shift_id]||{};return `<div class="row"><span><b>${esc(CAT[x.category]||x.category)}</b> · <span class="chip">${esc(plateOf(x.vehicle_id))}</span><br><span class="note" style="margin:0">${esc(nameOf(s.driver_id))} · ${esc(s.shift_date||"")}${x.note?" · "+esc(x.note):""}</span></span><span class="col"><b>${fmt(x.amount)}</b>${D.xr&&D.xr[x.id]?`<button class="btn ghost sm" data-a="seefile" data-f="${esc(D.xr[x.id])}">📎 Justificatif</button>`:""}<span style="display:flex;gap:6px"><button class="btn sun sm" data-a="xa" data-id="${x.id}" data-v="approved">Approuver</button><button class="btn ghost sm" data-a="xa" data-id="${x.id}" data-v="rejected">Rejeter</button></span></span></div>`}).join(""):none("Aucune dépense en attente."))}
function finances(){
 const nv=(D.set||[]).filter(x=>x.status==="submitted").length,nd=can("expense.approve")?(D.ex||[]).filter(x=>x.status==="pending").length:0,np=(D.pay||[]).length;
 const T=[["val","Clôtures",nv]].concat(can("expense.approve")?[["dep","Dépenses",nd]]:[],[["cpt","Comptes",np]]);
 if(!fiTab||!T.some(x=>x[0]===fiTab))fiTab=(T.find(x=>x[2])||T[0])[0];
 return `<div class="seg" style="margin-bottom:12px">${T.map(x=>`<button class="btn ${fiTab===x[0]?"":"ghost"}" data-a="fitab" data-v="${x[0]}">${x[1]}${x[2]?" ("+x[2]+")":""}</button>`).join("")}</div>`+(fiTab==="val"?clotures():fiTab==="dep"?approbations():comptes())}

function carbEnt(){
 const FL=D.fl||[],X={};(D.ex||[]).forEach(x=>X[x.id]=x);
 const fe=(D.ex||[]).filter(x=>(x.category==="essence"||x.category==="gasoil")&&x.status!=="rejected"),tot=fe.reduce((s,x)=>s+(+x.amount),0),lit=FL.reduce((s,x)=>s+(+x.liters),0);
 let h=card("Carburant (30 derniers jours)",`<div class="row"><span>Dépenses de carburant</span><b>${fmt(tot)}</b></div><div class="row"><span>Litres déclarés</span><b>${lit.toLocaleString("fr-FR")} L</b></div>`+(FL.length?FL.slice(0,8).map(f=>{const e=X[f.expense_id]||{};return `<div class="row"><span>${esc(plateOf(f.vehicle_id))}<br><span class="note" style="margin:0">${esc((e.spent_at||"").slice(0,10))} · ${f.liters} L</span></span><b>${fmt(e.amount||0)}</b></div>`}).join(""):none("Aucun plein détaillé.")));
 h+=entretien();
 h+=card("Incidents",(D.inc||[]).length?D.inc.map(x=>`<div class="row"><span><b>${IT[x.type]||x.type}</b> · <span class="chip">${esc(plateOf(x.vehicle_id))}</span><br><span class="note" style="margin:0">${esc(x.description||"")}</span></span><span class="col">${tag(IS[x.status])}${can("incident.write")&&x.status!=="closed"?`<button class="btn ghost sm" data-a="inc2" data-id="${x.id}" data-v="${x.status==="open"?"handled":"closed"}">${x.status==="open"?"Prendre en charge":"Clôturer"}</button>`:""}</span></div>`).join(""):none("Aucun incident."));
 return h}

function rapports(){
 const since=new Date(Date.now()-(rpP-1)*864e5).toLocaleDateString("sv-SE"),M=(D.ms||[]).filter(s=>s.shift_date>=since),ids=new Set(M.map(s=>s.id)),shv={},shd={},sdt={};
 M.forEach(s=>{shv[s.id]=s.vehicle_id;shd[s.id]=s.driver_id;sdt[s.id]=s.shift_date});
 const rv=(D.rv||[]).filter(x=>ids.has(x.shift_id)),ex=(D.ex||[]).filter(x=>ids.has(x.shift_id)&&x.status!=="rejected"),tot=L=>L.reduce((s,x)=>s+(+x.amount),0),R=tot(rv),X=tot(ex);
 const grp=(L,f)=>{const o={};L.forEach(x=>{const k=f(x);o[k]=(o[k]||0)+(+x.amount)});return o};
 const due=(D.set||[]).filter(s=>D.sh[s.shift_id]&&D.sh[s.shift_id].shift_date>=since&&s.status!=="returned").reduce((s,x)=>s+(+x.due_owner||0),0);
 const bar=(o,srt)=>{const e=Object.entries(o).sort(srt?(a,b)=>a[0]<b[0]?-1:1:(a,b)=>b[1]-a[1]),m=Math.max(1,...e.map(x=>x[1]));return e.length?e.map(x=>`<div class="row" style="border:0;padding-bottom:2px"><span>${esc(x[0])}</span><b>${fmt(x[1])}</b></div><div class="meter"><i style="width:${Math.round(x[1]/m*100)}%"></i></div>`).join(""):none("Aucune donnée.")};
 const b=(mems.find(x=>x.business_id===bid&&x.status==="active")||{}).business_accounts||{},vs={unverified:["t-warn","Non vérifiée"],pending:["t-warn","À vérifier"],verified:["t-ok","Vérifiée"],rejected:["t-bad","Rejetée"]}[b.verification_status]||["t-warn","—"];
 return `<div class="seg" style="margin-bottom:12px"><button class="btn ${rpP===7?"":"ghost"}" data-a="per" data-v="7">7 jours</button><button class="btn ${rpP===30?"":"ghost"}" data-a="per" data-v="30">30 jours</button></div>`+
  `<div class="btns" style="margin:0 0 10px"><button class="btn ghost sm" data-a="csv" style="flex:none">⬇️ Exporter en CSV</button></div>`+card("Bilan",`<div class="row"><span>Recettes</span><b>${fmt(R)}</b></div><div class="row"><span>Dépenses</span><b>− ${fmt(X)}</b></div><div class="row"><span>Résultat</span><b>${fmt(R-X)}</b></div><div class="row"><span>Dû au propriétaire (clôtures)</span><b>${fmt(due)}</b></div>`)+
  card("Détails",acc("rp:day","Recettes par jour","",bar(grp(rv,x=>sdt[x.shift_id]),1),false)+acc("rp:cat","Dépenses par catégorie","",bar(grp(ex,x=>CAT[x.category]||x.category)),false)+acc("rp:veh","Recettes par véhicule","",bar(grp(rv,x=>plateOf(shv[x.shift_id]))),false)+acc("rp:drv","Recettes par conducteur","",bar(grp(rv,x=>nameOf(shd[x.shift_id]))),false))+
  (can("business.manage")?accCard("rp:set","⚙️ Paramètres de l’entreprise","",false,`<label for="bn">Nom de l’entreprise</label><input id="bn" value="${esc(b.name)}"><label for="lf">Forme juridique</label><input id="lf" value="${esc(b.legal_form||"")}" placeholder="Ex. entreprise individuelle, SARL"><label for="rn">N° d’immatriculation (RCCM)</label><input id="rn" value="${esc(b.registration_no||"")}"><label for="bl">Dépenses approuvées automatiquement jusqu’à (FCFA, 0 = jamais)</label><input id="bl" type="number" min="0" value="${b.expense_auto_approve_limit||0}"><div class="row" style="margin-top:8px"><span>Code</span><b class="code" style="margin:0;font-size:15px">${esc(b.code)}</b></div><div class="row"><span>Vérification EDSP</span>${tag(vs)}</div><div class="btns"><button class="btn sun" data-a="savebiz">Enregistrer</button></div><p class="note">Connexion actuelle par e-mail ; le code SMS viendra plus tard.</p>`):"")}

function notifs(){const L=D.nt||[],un=unr();
 return card("Notifications",(un?`<div class="btns" style="margin:0 0 8px"><button class="btn ghost sm" data-a="readall" style="flex:none">Tout marquer comme lu</button></div>`:"")+(L.length?L.map(x=>`<div class="row"><span><b>${esc(x.title)}</b>${x.body?`<br><span class="note" style="margin:0">${esc(x.body)}</span>`:""}<br><span class="note" style="margin:0">${esc((x.created_at||"").slice(0,16).replace("T"," "))}</span></span>${x.read_at?"":tag(["t-warn","Nouveau"])}</div>`).join(""):none("Aucune notification.")))+
  ("Notification" in window&&Notification.permission==="default"?card("Alertes sur ce téléphone",`<p class="note" style="margin-top:0">Reçois une alerte quand l’application est ouverte. Les alertes en arrière-plan viendront plus tard.</p><div class="btns"><button class="btn sun" data-a="notifon">Activer les alertes</button></div>`):"")}

const TBL={business_memberships:"Équipe",vehicles:"Véhicule",vehicle_assignments:"Affectation",contracts:"Contrat",settlements:"Clôture",payments:"Versement",ledger_entries:"Compte courant",expenses:"Dépense",maintenance_orders:"Entretien",incidents:"Incident",documents:"Document",business_accounts:"Entreprise"},ACT={INSERT:"Création",UPDATE:"Modification",DELETE:"Suppression"};
function journal(){const L=D.au||[];
 return card("Journal d’activité",(L.length?L.map(x=>{const o=x.old_data||{},n=x.new_data||{},ch=o.status&&n.status&&o.status!==n.status?" : "+esc(o.status)+" → "+esc(n.status):"";
  return `<div class="row"><span><b>${TBL[x.table_name]||esc(x.table_name)}</b> · ${ACT[x.action]||esc(x.action)}${ch}<br><span class="note" style="margin:0">${esc(x.actor?nameOf(x.actor):"Système")} · ${esc((x.at||"").slice(0,16).replace("T"," "))}</span></span></div>`}).join(""):none("Aucune activité."))+`<p class="note">Chaque modification importante est conservée ici : les corrections sont historisées.</p>`)}

function solFormUser(){
 const nm=(MYNAME()||"").trim().split(/\s+/),fn=nm[0]||"",ln=nm.slice(1).join(" ");
 const kinds=[["personal","Déplacement personnel (quotidien)"],["event","Événement et cérémonie"],["travel","Voyage et long trajet"],["fulltime","En plein temps"],["family","Course familiale (sortie, détente, école des enfants)"],["other","Autres motifs (à préciser)"]];
 return `<h4 class="sec" style="margin:4px 0 0">1. Ton identité</h4><label for="sq_fn">Prénom</label><input id="sq_fn" maxlength="60" autocomplete="given-name" value="${esc(fn)}"><label for="sq_ln">Nom</label><input id="sq_ln" maxlength="60" autocomplete="family-name" value="${esc(ln)}"><label for="sq_ct">Numéro de téléphone</label><input id="sq_ct" type="tel" maxlength="25" inputmode="tel" placeholder="+225 07 00 00 00 00" value="${esc(MYPH)}"><label for="sq_zone">Ta zone (commune, quartier)</label><input id="sq_zone" maxlength="80" placeholder="Ex. Cocody, Riviera 2" value="${esc(MYR||"")}"><h4 class="sec" style="margin:12px 0 0">2. Ta recherche</h4><label for="sq_cnt">Combien de chauffeurs cherches-tu ?</label><input id="sq_cnt" type="number" min="1" max="50" inputmode="numeric" value="1"><label for="sq_kind">Motif de la recherche</label>${sel("sq_kind",kinds)}<label for="sq_purpose">Précise le motif (obligatoire pour « Autres motifs »)</label><input id="sq_purpose" maxlength="200" placeholder="Ex. déménagement, rendez-vous à l’hôpital…"><label for="sq_when">Date et heure souhaitées (facultatif)</label><input id="sq_when" type="datetime-local"><label for="sq_msg">Message pour le chauffeur (facultatif)</label><input id="sq_msg" maxlength="500" placeholder="Ex. départ à 7 h"><h4 class="sec" style="margin:12px 0 0">3. Le véhicule</h4><label for="sq_vt">Type de véhicule</label>${sel("sq_vt",VT())}<label for="sq_vm">Marque et modèle</label><input id="sq_vm" maxlength="80" placeholder="Ex. Toyota Corolla"><label for="sq_vcol">Couleur</label><input id="sq_vcol" maxlength="40" placeholder="Ex. Blanche"><label for="sq_vp">Plaque (facultatif)</label><input id="sq_vp" maxlength="20" placeholder="Ex. 1234 AB 01"><label for="sq_vs">État du véhicule</label>${sel("sq_vs",[["","Choisir…"],["new","Neuf"],["recent","Récent"],["old","Ancien"]])}<label for="sq_vpap">Papiers du véhicule à jour ?</label>${sel("sq_vpap",[["","Choisir…"],["1","Oui"],["0","Non"]])}<p class="note" style="margin:10px 0 0">🔒 Les numéros de téléphone sont débloqués après la <b>confirmation totale</b> : le chauffeur accepte, puis tu confirmes. Ton code ${esc(MYCODE)} est envoyé avec la demande.</p><div class="btns"><button class="btn sun" data-a="dsend">Envoyer la demande</button></div>`}
function solForm(){
 if(curSp==="user")return solFormUser();
 const kinds=curSp==="company"?[["staff","Transport du personnel"],["delivery","Livraison"],["regular","Mission régulière"],["other","Autre"]]:[["personal","Déplacement personnel (quotidien)"],["replacement","Remplacement de chauffeur"]].concat(bid&&can("member.manage")?[["join","Rejoindre mon entreprise"]]:[],[["other","Autre"]]);
 const who=curSp==="company"&&MYCO?MYCO+" (contact : "+MYNAME()+")":MYNAME();
 const fleet=curSp==="owner"&&(D.veh||[]).length?`<p class="note" style="margin:8px 0 4px">Choisir dans mes véhicules :</p><div class="btns">${(D.veh||[]).slice(0,6).map(x=>`<button class="btn ghost sm" data-a="vpick" data-id="${x.id}" style="flex:none">${esc(x.plate)}</button>`).join("")}</div>`:"";
 return `<div class="row" style="border:0;padding:4px 0"><span>Demande de</span><b>${esc(who)}</b></div><h4 class="sec" style="margin:8px 0 0">Le véhicule du travail</h4>${fleet}<label for="sq_vt">Type de véhicule</label>${sel("sq_vt",VT())}<label for="sq_vm">Marque et modèle</label><input id="sq_vm" maxlength="80" placeholder="Ex. Toyota Corolla"><label for="sq_vp">Plaque (facultatif)</label><input id="sq_vp" maxlength="20" placeholder="Ex. 1234 AB 01"><label for="sq_vs">État du véhicule</label>${sel("sq_vs",[["","Choisir…"],["new","Neuf"],["recent","Récent"],["old","Ancien"]])}<label for="sq_vcol">Couleur du véhicule (facultatif)</label><input id="sq_vcol" maxlength="40" placeholder="Ex. Blanche"><label for="sq_vpap">Papiers du véhicule à jour ?</label>${sel("sq_vpap",[["","Choisir…"],["1","Oui"],["0","Non"]])}<p class="note" style="margin:4px 0 0">Pour « Rejoindre mon entreprise », tu peux laisser le véhicule vide.</p><label for="sq_kind">Motif</label>${sel("sq_kind",kinds)}<label for="sq_msg">Message (facultatif)</label><input id="sq_msg" maxlength="500" placeholder="Ex. trajet demain matin"><label for="sq_when">Date et heure (facultatif)</label><input id="sq_when" type="datetime-local"><label for="sq_ct">Ton numéro de téléphone</label><input id="sq_ct" type="tel" maxlength="25" inputmode="tel" placeholder="+225 07 00 00 00 00" value="${esc(MYPH)}"><p class="note" style="margin:4px 0 0">🔒 Les numéros sont débloqués après la confirmation totale : le chauffeur accepte, puis tu confirmes. Ton code ${esc(MYCODE)} est envoyé avec la demande.</p><div class="btns"><button class="btn sun" data-a="dsend">Envoyer la demande</button></div>`}
function chauffeurs(){
 const L=DRL||[];let h=card("Demande chauffeur",`<p class="note" style="margin:0">Seuls les chauffeurs qui ont choisi d’être visibles apparaissent ici.<br>🟢 en ligne · 🔵 en échange · 🔴 travail accepté (plus joignable)</p>${curSp==="owner"?`<div class="btns"><button class="btn ghost sm" data-a="tab" data-v="sq">Mes demandes envoyées</button></div>`:""}`);
 if(!L.length)return h+card("",none("Aucun chauffeur visible pour l’instant."));
 L.forEach(x=>{const bz=x.status==="accepted",o=!bz&&selSol===x.id;h+=card("",`<div class="row" style="padding-top:0"><span><b>${esc(x.full_name||"Chauffeur")}</b><br><span class="note" style="margin:0">${STE[x.status]||STE.online}</span><br><span class="note" style="margin:0">${esc([x.public_code,TN[x.transport_type],x.zone].filter(Boolean).join(" · "))}</span></span>${bz?`<span class="tag t-warn">Indisponible</span>`:`<button class="btn ${o?"ghost":"sun"} sm" data-a="dsol" data-id="${x.id}">${o?"Fermer":"Solliciter"}</button>`}</div>${bz?`<p class="note" style="margin:6px 0 0">Il a accepté un travail : il ne peut plus être contacté pour l’instant.</p>`:""}${x.note?`<p class="note" style="margin:6px 0 0">${esc(x.note)}</p>`:""}${o?solForm():""}`)});
 return h}
const ficheHtml=x=>{
 const veh=[x.vehicle_type?(TN[x.vehicle_type]||"Autre"):"",x.vehicle_model,x.vehicle_color,x.vehicle_plate].filter(Boolean).join(" · ");
 return `<b>${esc(x.other_name||"")}</b>${x.other_code?` <span class="note" style="margin:0">${esc(x.other_code)}</span>`:""}`
  +(x.zone||x.drivers_needed?`<br><span style="font-size:13.5px">📍 ${esc(x.zone||"—")}${x.drivers_needed?" · 👥 "+x.drivers_needed+" chauffeur"+(x.drivers_needed>1?"s":""):""}</span>`:"")
  +`<br><span class="note" style="margin:0">Motif : ${KL[x.kind]||esc(x.kind)}${x.purpose_detail?" — « "+esc(x.purpose_detail)+" »":""}${x.business_name?" · "+esc(x.business_name):""}${x.when_at?" · "+esc(new Date(x.when_at).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})):""}</span>`
  +(x.vehicle_model?`<br><span style="font-size:13.5px">🚗 <b>Véhicule</b> : ${esc(veh)}${x.vehicle_condition?` — état : <b>${VC[x.vehicle_condition]||""}</b>`:""}${x.vehicle_papers===true?" — papiers à jour ✅":x.vehicle_papers===false?" — papiers non à jour ⚠️":""}</span>`:"")
  +(x.message?`<br><span class="note" style="margin:0">« ${esc(x.message)} »</span>`:"")
  +(x.other_contact?`<br><span class="note" style="margin:0">📞 ${esc(x.other_contact)}</span>`:(x.status==="pending"||x.status==="accepted"?`<br><span class="note" style="margin:0">🔒 Numéros débloqués après la confirmation totale</span>`:""))};
function demandes(){
 const dr=curSp==="driver",L=(SOL||[]).filter(x=>x.direction===(dr?"in":"out")),act=L.filter(x=>["pending","accepted","confirmed"].includes(x.status)),old=L.filter(x=>!act.includes(x)),n=L.filter(x=>x.status==="pending").length;
 const row=x=>`<div class="row" style="align-items:flex-start"><span>${ficheHtml(x)}</span><span class="col">${tag(SST[x.status]||["t-warn",x.status])}<button class="btn ghost sm" data-a="cvopen" data-id="${x.id}">${["pending","accepted","confirmed"].includes(x.status)?"💬 Écrire":"💬 Voir"}${UNR[x.id]?" ("+UNR[x.id]+")":""}</button>${x.status==="pending"?(x.direction==="in"?`<button class="btn sun sm" data-a="sresp" data-id="${x.id}" data-v="1">Accepter</button><button class="btn ghost sm" data-a="sresp" data-id="${x.id}" data-v="0">Refuser</button>`:`<button class="btn ghost sm" data-a="scancel" data-id="${x.id}">Annuler</button>`):x.status==="accepted"?(x.direction==="out"?`<button class="btn sun sm" data-a="sconf" data-id="${x.id}">✅ Confirmer</button><button class="btn ghost sm" data-a="scancel" data-id="${x.id}">Annuler</button>`:`<span class="note" style="margin:0">En attente de confirmation</span>`):""}</span></div>`;
 let h=dr?card("Mon statut",`<div class="row" style="border:0"><span>${STE[MYST]}</span><button class="btn ghost sm" data-a="tab" data-v="pf">Régler ma visibilité</button></div>`)+card("Demandes reçues"+(n?" ("+n+" à traiter)":""),act.length?act.map(row).join(""):none("Aucune demande en cours.")):card("Mes demandes envoyées",act.length?act.map(row).join(""):none("Aucune demande en cours. Va dans "+(curSp==="owner"?"Demande":"Chauffeurs")+" pour solliciter un chauffeur."));
 if(old.length)h+=accCard("sq:old","Historique",old.length+"",false,old.map(row).join(""));
 return h}
function hub(){
 const L=SPS(),DS={owner:"Véhicules, chauffeurs, finances",driver:"Ma journée, mes demandes, mon statut",user:"Trouver et solliciter un chauffeur",company:"Trouver des chauffeurs pour ta société"};
 let h=card(L.length?"Entrer dans un espace":"Bienvenue",L.length?L.map(k=>`<button class="menu" data-a="enter" data-s="${k}" style="border-left:6px solid ${PAL[PALSEL[k]].s}"><span>${SPI[k]} Espace ${SPN[k].toLowerCase()}<br><span class="note" style="margin:0">${DS[k]}</span></span><span>›</span></button>`).join(""):`<p class="note" style="margin:0">Choisis ton espace ci-dessous. Tu ne pourras plus en changer.</p>`);
 if(isPA)h+=card("",`<button class="menu" data-a="tab" data-v="pa"><span>🛡️ Plateforme EDSP</span><span>›</span></button>`);
 h+=`<h4 class="sec">${isPA?"Activer mes espaces":"Choisis ton espace : un seul, définitif"}</h4>`;
 h+=accCard("pf:sp_u","🙋 Espace particulier",spaceOn("user")?"Actif":"Non activé",false,`<p class="note" style="margin-top:0">Chercher un chauffeur visible et le solliciter (course personnelle, remplacement…).</p><div class="btns"><button class="btn ${spaceOn("user")?"ghost":"sun"}" data-a="spset" data-s="user" data-on="${spaceOn("user")?"0":"1"}">${spaceOn("user")?"Désactiver l’espace particulier":"Activer l’espace particulier"}</button></div>`);
 if(!spaceOn("driver"))h+=accCard("pf:sp_d","🚖 Espace chauffeur","Non activé",false,`<p class="note" style="margin-top:0">Être visible, recevoir des demandes de particuliers et de propriétaires, renseigner ton permis.</p><div class="btns"><button class="btn sun" data-a="spset" data-s="driver" data-on="1">Activer l’espace chauffeur</button></div>`);
 if(!mems.some(m=>m.role==="owner"))h+=accCard("pf:own","🏢 Espace propriétaire","Non activé",!mems.some(m=>m.status==="active"),`<label for="on">Nom de ton entreprise ou activité</label><input id="on" placeholder="Ex. Transports Kouassi"><div class="btns"><button class="btn sun" data-a="nb">Activer l’espace propriétaire</button></div>`);
 if(mems.some(m=>m.role==="owner"&&m.status==="active"))h+=accCard("pf:own2","🏢 Espace propriétaire","Actif",false,`<p class="note" style="margin:0">Ton espace est actif. Tu le retrouves dans « Mes espaces » ci-dessous, avec son code.</p>`);
 h+=accCard("pf:join","➕ Rejoindre une entreprise","",!mems.some(m=>m.status==="active"),`<label for="jc">Code de l’entreprise</label><input id="jc" placeholder="PROP-XXXXXX" autocapitalize="characters"><label for="jr">Mon rôle</label>${sel("jr",[["driver","Chauffeur"],["fleet_manager","Gestionnaire de flotte"],["accountant","Comptable"],["technician","Technicien"]])}<div class="btns"><button class="btn sun" data-a="jb">Envoyer ma demande</button></div>`);
 h+=accCard("pf:sp_c","💼 Espace entreprise",spaceOn("company")?"Actif":"Non activé",false,spaceOn("company")?`<p class="note" style="margin-top:0">Ta société : <b>${esc(MYCO)}</b>.</p><div class="btns"><button class="btn ghost" data-a="spset" data-s="company" data-on="0">Désactiver l’espace entreprise</button></div>`:`<p class="note" style="margin-top:0">Pour une société qui cherche des chauffeurs : transport du personnel, livraisons, missions régulières.</p><label for="co_name">Nom de ta société</label><input id="co_name" maxlength="100" placeholder="Ex. Société Kouassi SARL" value="${esc(MYCO)}"><div class="btns"><button class="btn sun" data-a="cmpact">Activer l’espace entreprise</button></div>`);
 if(mems.length)h+=accCard("hub:esp","🏢 Mes entreprises",mems.length+"",mems.length>1||mems.some(m=>m.status==="pending"),mems.map(m=>`<div class="row"><span><b>${esc((m.business_accounts||{}).name||"")}</b><br><span class="note" style="margin:0">${RN[m.role]} · Code ${esc((m.business_accounts||{}).code||"")}</span></span><span class="col">${tag(m.status==="active"?["t-ok","Actif"]:m.status==="pending"?["t-warn","En attente"]:["t-bad","Refusé"])}${m.status==="active"&&m.business_id!==bid?`<button class="btn ghost sm" data-a="sw" data-v="${m.business_id}">Ouvrir</button>`:""}</span></div>`).join(""));
 return h}
const APP_VER="v36";
const SUPPORT=Object.assign({whatsapp:"",phone:"",email:"",hours:""},(typeof TM_CONFIG!=="undefined"&&TM_CONFIG.support)||{});
const li=a=>`<ol style="margin:6px 0 0 18px;padding:0">${a.map(x=>`<li style="margin:5px 0">${x}</li>`).join("")}</ol>`;
const GUIDE={
 owner:[
  ["🚀 Pour commencer","4 étapes",li(["Touche <b>Véhicules</b>, puis <b>➕ Ajouter un véhicule</b>. Remplis la plaque, la marque et le modèle, puis touche <b>Ajouter</b>.","Fais venir tes chauffeurs : donne-leur le code de ton entreprise (dans <b>Conducteurs</b>, rubrique <b>Code de l’entreprise</b>) ou cherche-les avec <b>Demande</b>.","Dans <b>Conducteurs</b>, touche <b>Accepter et affecter</b> pour donner un véhicule à un chauffeur.","Dans <b>Véhicules</b>, règle le contrat du véhicule puis touche <b>Enregistrer le contrat</b>."])],
  ["👥 Mes chauffeurs","Accepter, suivre, suspendre",li(["Dans <b>Conducteurs</b>, chaque nouvelle demande a deux boutons : <b>Accepter</b> ou <b>Refuser</b>.","Chaque chauffeur a un rond de couleur : 🟢 en ligne, 🔵 en échange, 🔴 travail accepté, ⚫ pas en ligne.","Pour retirer un accès : <b>Suspendre cet accès</b>."])],
  ["🔎 Demander un chauffeur","Solliciter un chauffeur visible",li(["Touche <b>Demande</b> : tu vois les chauffeurs qui ont choisi d’être visibles.","Touche <b>Solliciter</b>. Indique le véhicule (touche la plaque d’un de tes véhicules pour le remplir) et son état (<b>Neuf</b>, <b>Récent</b> ou <b>Ancien</b>), choisis le motif, vérifie ton numéro, puis touche <b>Envoyer la demande</b>.","Pour suivre la réponse, touche <b>Mes demandes envoyées</b> (en haut de l’écran Demande).","Pour discuter avec le chauffeur, touche <b>💬 Écrire</b> sous la demande.","Quand le chauffeur accepte, touche <b>✅ Confirmer</b> : les numéros sont débloqués. Avec <b>Rejoindre mon entreprise</b>, il est rattaché et confirmé tout de suite."])],
  ["💰 Argent et clôtures","Valider les journées",li(["Chaque soir, le chauffeur envoie sa clôture. Dans <b>Finances</b>, touche <b>Valider</b> ou <b>Renvoyer</b> (avec un motif).","Pour une dépense : <b>Approuver</b> ou <b>Rejeter</b>.","Pour noter un versement ou une avance : <b>➕ Enregistrer un mouvement</b>."])],
  ["📊 Tableau et outils","Ce qui demande ton attention",li(["<b>Tableau</b> montre l’argent du jour et ce qui est <b>À traiter</b>.","En bas, <b>🧰 Outils de gestion</b> : Missions, Carburant et entretien, Rapports et paramètres, Journal d’activité."])]
 ],
 driver:[
  ["🚖 Ma journée","Du début à la clôture",li(["Touche <b>Ma journée</b>, puis <b>Commencer la journée</b>.","À chaque client : <b>Enregistrer la course</b> (ou <b>Enregistrer le tour</b> si tu travailles sur une ligne).","Une dépense (carburant…) : ouvre <b>Dépense ou autre recette</b>.","Le soir : <b>Terminer la mission</b>, puis <b>Envoyer la clôture</b>. Tu ne pourras plus modifier ensuite.","<span class=\"note\" style=\"margin:0\">Cet écran apparaît quand un propriétaire t’a rattaché à son entreprise.</span>"])],
  ["📥 Les demandes reçues","Accepter ou refuser",li(["Touche <b>Demandes</b>. Chaque demande montre le nom, le véhicule demandé, son état (Neuf, Récent ou Ancien) et le motif. Touche <b>Accepter</b> ou <b>Refuser</b>.","Pour discuter avant de répondre, touche <b>💬 Écrire</b> sous la demande.","Après ton <b>Accepter</b>, le demandeur doit confirmer. Les numéros de téléphone sont débloqués seulement à cette confirmation.","🔵 = une demande attend ta réponse. 🔴 = tu as accepté un travail : on ne peut plus te contacter.","Quand ton travail est terminé : <b>Plus</b>, <b>Profil et sécurité</b>, <b>🚖 Mon espace chauffeur</b>, puis <b>Je suis de nouveau disponible</b>."])],
  ["👁️ Être visible","Apparaître dans la liste",li(["Touche <b>Plus</b>, <b>Profil et sécurité</b>, puis <b>🚖 Mon espace chauffeur</b>.","Coche <b>Je suis visible</b>, remplis ta zone et ton type de transport, puis touche <b>Enregistrer</b>.","Il faut un numéro de téléphone : ajoute-le dans <b>📍 Mes coordonnées</b>.","Pour ne plus apparaître : décoche la case et touche <b>Enregistrer</b>."])],
  ["⚠️ Signaler un problème","Panne ou incident",li(["Touche <b>Signaler</b>.","Une panne : touche <b>Envoyer au propriétaire</b>.","Un accident ou un contrôle de police : touche <b>Déclarer</b>."])],
  ["💳 Mon compte","Versements au propriétaire",li(["Touche <b>Mon compte</b>, puis <b>➕ Déclarer un versement</b>.","Remplis le montant et touche <b>Déclarer</b>."])]
 ],
 company:[
  ["🔎 Chercher un chauffeur","Envoyer une demande",li(["Touche <b>Chauffeurs</b> : tu vois les chauffeurs visibles, avec leur couleur.","Touche <b>Solliciter</b>.","Indique le véhicule que le chauffeur devra prendre : son type, sa marque et son modèle, et son état (<b>Neuf</b>, <b>Récent</b> ou <b>Ancien</b>).","Choisis le motif : <b>Transport du personnel</b>, <b>Livraison</b>, <b>Mission régulière</b> ou <b>Autre</b>.","Ajoute un message, une date si besoin, vérifie ton numéro, puis touche <b>Envoyer la demande</b>.","Le chauffeur voit le nom de ta société et la personne à contacter."])],
  ["🤝 Suivre mes demandes","En attente, acceptée, refusée",li(["Touche <b>Demandes</b>.","Pour discuter avec le chauffeur, touche <b>💬 Écrire</b> : les messages restent dans l’application.","Quand le chauffeur a accepté, touche <b>✅ Confirmer</b> : les numéros sont alors débloqués.","Tant que ce n’est pas confirmé, tu peux toucher <b>Annuler</b>.","Après ta confirmation, son numéro apparaît : tu peux l’appeler."])],
  ["🎨 Les couleurs des chauffeurs","Qui est joignable ?",li(["🟢 en ligne : il peut répondre.","🔵 en échange : il discute déjà avec quelqu’un, tu peux quand même écrire.","🔴 plus joignable : il a accepté un travail, le bouton devient <b>Indisponible</b>.","⚫ pas en ligne : il n’apparaît pas dans la liste."])],
  ["💼 Ma société","Nom affiché aux chauffeurs",li(["Touche <b>Plus</b>, <b>Profil et sécurité</b>, puis <b>💼 Ma société</b>.","Modifie le nom, puis touche <b>Enregistrer</b>."])]
 ],
 user:[
  ["🔎 Trouver un chauffeur","Remplir la fiche",li(["Touche <b>Chauffeurs</b>, puis <b>Solliciter</b> sous le chauffeur voulu.","<b>1. Ton identité</b> : prénom, nom, numéro de téléphone et ta zone.","<b>2. Ta recherche</b> : combien de chauffeurs, puis le motif (déplacement personnel, événement et cérémonie, voyage et long trajet, en plein temps, course familiale ou autres motifs : écris-le).","<b>3. Le véhicule</b> : type, marque et modèle, couleur, plaque, état (<b>Neuf</b>, <b>Récent</b> ou <b>Ancien</b>) et papiers à jour.","Touche <b>Envoyer la demande</b>."])],
  ["🤝 Suivre mes demandes","Discuter, confirmer",li(["Touche <b>Demandes</b>.","Pour discuter avec le chauffeur, touche <b>💬 Écrire</b> : les messages restent dans l’application.","Quand le chauffeur a accepté, touche <b>✅ Confirmer</b> : c’est la <b>confirmation totale</b>. Les numéros de téléphone sont alors débloqués.","Tant que ce n’est pas confirmé, tu peux toucher <b>Annuler</b>."])],
  ["🎨 Les couleurs des chauffeurs","Qui est joignable ?",li(["🟢 en ligne : il peut répondre.","🔵 en échange : il discute déjà avec quelqu’un, tu peux quand même écrire.","🔴 plus joignable : il a accepté un travail, le bouton devient <b>Indisponible</b>.","⚫ pas en ligne : il n’apparaît pas dans la liste."])]
 ],
 common:[
  ["📍 Mon numéro et mon code","À renseigner une fois",li(["Touche <b>Plus</b>, puis <b>Profil et sécurité</b>, puis <b>📍 Mes coordonnées</b>.","Écris ton numéro de téléphone et ta commune, puis touche <b>Enregistrer</b>.","Ton code <b>EDSP-…</b> s’y trouve aussi : il t’identifie dans l’application."])],
  ["🧩 Mon espace","Un seul espace par compte",li(["Ton espace est choisi à l’inscription. Il ne peut plus changer.","Pour utiliser un autre espace, crée un autre compte avec une autre adresse e-mail."])],
  ["🎨 Changer les couleurs","Couleur de chaque espace",li(["Touche <b>Plus</b>, <b>Profil et sécurité</b>, puis <b>🎨 Couleurs de mes espaces</b>.","Touche un rond de couleur. La case <b>Colorer aussi les cadres de l’espace</b> règle les cadres."])],
  ["🔒 Sécurité du compte","Mot de passe et deux étapes",li(["Touche <b>Plus</b>, puis <b>Profil et sécurité</b>.","Ouvre <b>Changer mon mot de passe</b> ou <b>Sécurité du compte</b> (vérification en deux étapes)."])],
  ["✉️ Confirmer mon e-mail","À l’inscription",li(["Après <b>Créer mon compte</b>, ouvre l’e-mail de EDSP.","Touche <b>Confirmer mon e-mail</b> : tu reviens dans l’application, déjà connecté.","Si le bouton ne marche pas, écris le code de l’e-mail, puis touche <b>Valider le code</b>."])],
  ["ℹ️ Quelle version ai-je ?","Numéro de version",li(["Touche <b>Plus</b>, puis <b>À propos</b> : la version est écrite en bas du cadre.","Sur l’écran de connexion, elle est aussi écrite en petit, en bas."])],
  ["🎧 Besoin d’aide ?","Écrire au service client",li(["Touche <b>Plus</b>, puis <b>Contact service client</b>."])]
 ]
};
function guide(){
 const sp=curSp||"owner",it=GUIDE[sp]||[];
 let h=card(SPI[sp]+" Guide de l’espace "+SPN[sp].toLowerCase(),`<p class="note" style="margin:0">Touche un sujet pour voir les étapes.</p>`);
 h+=`<div class="card tight">`+it.map((x,i)=>acc("gd:"+sp+i,x[0],x[1],x[2],i===0)).join("")+`</div>`;
 h+=`<h4 class="sec">Pour tous les espaces</h4><div class="card tight">`+GUIDE.common.map((x,i)=>acc("gd:c"+i,x[0],x[1],x[2],false)).join("")+`</div>`;
 return h}
function contact(){
 const msg="Bonjour, je suis "+((user.user_metadata||{}).full_name||"")+" (code "+MYCODE+")"+(curSp?", espace "+SPN[curSp].toLowerCase():"")+". Version "+APP_VER+".",
  wa=(SUPPORT.whatsapp||"").replace(/\D/g,""),ph=(SUPPORT.phone||"").replace(/[^\d+]/g,""),em=(SUPPORT.email||"").trim(),R=[];
 const bt=(i,t,u)=>`<button class="menu" data-a="ext" data-u="${esc(u)}"><span>${i} ${t}</span><span>›</span></button>`;
 if(wa)R.push(bt("💬","Écrire sur WhatsApp","https://wa.me/"+wa+"?text="+encodeURIComponent(msg)));
 if(ph)R.push(bt("📞","Appeler le service client","tel:"+ph));
 if(em)R.push(bt("✉️","Envoyer un e-mail","mailto:"+em+"?subject="+encodeURIComponent("Aide EDSP Transport Manager")+"&body="+encodeURIComponent(msg)));
 let h=card("Contact service client",R.length?R.join("")+(SUPPORT.hours?`<p class="note">${esc(SUPPORT.hours)}</p>`:"")+`<p class="note">Ton nom, ton code ${esc(MYCODE)} et ton espace sont ajoutés au message pour qu’on te reconnaisse.</p>`:`<p style="margin:0">Le service client sera bientôt joignable ici.</p><p class="note">En attendant, ouvre le guide : la réponse y est peut-être déjà.</p>`);
 return h+card("",`<button class="menu" data-a="tab" data-v="gd"><span>📘 Guide d’utilisation</span><span>›</span></button>`)}
const INTRO={company:"Ton espace Entreprise sert à trouver des chauffeurs pour ta société : transport du personnel, livraisons, missions régulières.",owner:"Ton espace Propriétaire sert à gérer tes véhicules, tes chauffeurs et ton argent.",driver:"Ton espace Chauffeur sert à suivre ta journée, recevoir des demandes et signaler un problème.",user:"Ton espace Particulier sert à trouver un chauffeur et à lui envoyer une demande."};
const introSeen=sp=>{try{return localStorage.getItem("tm-intro-"+sp)==="1"}catch(e){return true}};
const introCard=()=>card(SPI[curSp]+" Bienvenue dans ton espace "+SPN[curSp].toLowerCase(),`<p style="margin:0">${INTRO[curSp]}</p><div class="btns"><button class="btn sun" data-a="tab" data-v="gd">Voir le guide</button><button class="btn ghost" data-a="intro" data-s="${curSp}">Compris</button></div>`);
async function loadCv(force){
 if(!cvId||!user)return;
 try{const r=await sb.rpc("my_messages",{p_sol:cvId});if(r.error)throw r.error;const d=r.data||[],changed=force||d.length!==CVM.length;CVM=d;
  const u=await sb.rpc("unread_by_solicitation");UNR={};(u.data||[]).forEach(x=>{UNR[x.solicitation_id]=x.n});
  if(changed&&tab==="cv"){const t=$("cv_in")?$("cv_in").value:"";view();if($("cv_in")&&t)$("cv_in").value=t;const bx=$("cv_box");if(bx)bx.scrollTop=bx.scrollHeight}}catch(e){}}
setInterval(()=>{if(tab==="cv"&&cvId&&user)loadCv(false)},8000);
setInterval(()=>{if(user&&tab==="sq"&&!busy)loadSol().then(()=>{if(tab==="sq")view()})},20000);
function conversation(){
 const x=(SOL||[]).find(y=>y.id===cvId);
 if(!x)return card("",none("Conversation introuvable."));
 const open=["pending","accepted","confirmed"].includes(x.status);
 let h=card("",`<div class="row" style="padding-top:0"><span>${ficheHtml(x)}</span>${tag(SST[x.status]||["t-warn",x.status])}</div>${x.direction==="out"&&x.status==="accepted"?`<div class="btns"><button class="btn sun" data-a="sconf" data-id="${x.id}">✅ Confirmer</button></div>`:""}`);
 h+=`<div class="card" id="cv_box" style="max-height:52vh;overflow:auto;display:flex;flex-direction:column;gap:8px">`+(CVM.length?CVM.map(m=>`<div style="align-self:${m.mine?"flex-end":"flex-start"};max-width:82%;padding:8px 12px;border-radius:14px;background:${m.mine?"var(--sun)":"var(--bg)"};color:${m.mine?"var(--on,#0f1f00)":"var(--ink)"};border:1px solid var(--line)"><div style="white-space:pre-wrap;word-break:break-word">${esc(m.body)}</div><div style="font-size:10.5px;opacity:.7;margin-top:2px;text-align:right">${esc(new Date(m.created_at).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"}))}</div></div>`).join(""):none("Aucun message pour l’instant. Écris le premier."))+`</div>`;
 h+=open?card("",`<label for="cv_in">Ton message</label><textarea id="cv_in" rows="2" maxlength="1000" placeholder="Écris ici…" style="width:100%;padding:10px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font:inherit"></textarea><div class="btns"><button class="btn sun" data-a="cvsend">Envoyer</button></div><p class="note">Ne partage jamais de mot de passe ni de code secret.</p>`):card("",none("Cette conversation est fermée (demande "+(x.status==="declined"?"refusée":"annulée")+")."));
 return h}
function plus(){
 const g=(t,L)=>L.length?`<h4 class="sec">${t}</h4>`+L.map(x=>`<button class="menu" data-a="${x[2]==="hub"?"hub":"tab"}" data-v="${x[2]}"><span>${x[0]} ${x[1]}</span><span>›</span></button>`).join(""):"";
 const aide=[["📘","Guide d’utilisation","gd"],["🎧","Contact service client","ct"],["ℹ️","À propos","ap"]];
 const cp=[["🔔","Notifications"+(unr()?" ("+unr()+")":""),"nt"],["👤","Profil et sécurité","pf"]].concat(isPA?[["🧩","Mes espaces","hub"]]:[]);
 return `<div class="card">${g("Aide",aide)}${g("Mon compte",cp)}</div>`}

function flotte(){
 const V=D.veh||[],drv=(D.mem||[]).filter(x=>x.role==="driver"&&x.status==="active");let h="";
 if(can("vehicle.write"))h+=accCard("veh:add","➕ Ajouter un véhicule","",!V.length,`<label for="vp">Plaque</label><input id="vp" placeholder="5821 GH 01"><label for="vk">Marque</label><input id="vk" placeholder="Toyota"><label for="vm">Modèle</label><input id="vm" placeholder="Corolla"><label for="vt">Type de transport</label>${sel("vt",Object.keys(TN).map(k=>[k,TN[k]]))}<label for="vf">Carburant</label>${sel("vf",[["","—"],["essence","Essence"],["gasoil","Gasoil"],["hybride","Hybride"],["electrique","Électrique"]])}<label for="vl">Ligne (Gbaka et Wôrô-wôrô seulement)</label><input id="vl" placeholder="Ex. Yopougon – Adjamé"><div class="btns"><button class="btn sun" data-a="addveh">Ajouter</button></div>`);
 if(!V.length)h+=card("",none("Aucun véhicule pour l’instant."));
 V.forEach((v,i)=>{const as=(D.asg||[]).find(x=>x.vehicle_id===v.id),co=(D.con||[]).find(x=>x.vehicle_id===v.id),ln=(D.lines||[]).find(x=>x.id===v.line_id),docs=(D.docs||[]).filter(d=>d.target_id===v.id),dAl=docs.filter(d=>d.expires_on&&dl(d.expires_on)<=5),hist=(D.conAll||[]).filter(k=>k.vehicle_id===v.id&&k.ends_on),K="v"+v.id;
  let c=`<div class="row" style="padding-top:0;border:0"><span class="chip">${esc(v.plate)}</span><span class="note" style="margin:0;flex:1">${esc([v.make,v.model].filter(Boolean).join(" "))} · ${TN[v.transport_type]}${ln?" · "+esc(ln.name):""}</span>${tag(VST[v.status]||["t-warn",v.status])}</div><div class="row" style="border:0;padding:0 0 4px"><span class="note" style="margin:0">${as?"👤 "+esc(nameOf(as.driver_id)):"Sans conducteur"}</span><span>${dAl.length?tag(["t-warn","⚠ "+dAl.length+" document(s)"]):""} ${as&&!co?tag(["t-warn","Sans contrat"]):""}</span></div>`;
  c+=acc(K+":drv","Conducteur",as?esc(nameOf(as.driver_id)):"Non affecté",`<div class="row" style="border:0"><span>`+(as?`<b>${esc(nameOf(as.driver_id))}</b>`+(can("assignment.write")?` <button class="btn lnk sm" data-a="unasg" data-id="${as.id}">Retirer</button>`:""):(can("assignment.write")&&drv.length?sel("as"+i,[["","Choisir…"]].concat(drv.map(d=>[d.user_id,nameOf(d.user_id)])))+` <button class="btn sun sm" data-a="asg" data-v="${v.id}" data-i="${i}">Affecter</button>`:none("Non affecté")))+`</span></div>`,false);
  let cb="";
  if(can("contract.write"))cb+=`<div class="seg">${sel("cm"+i,[["fixed","Fixe"],["percentage","Pourcentage"],["mixed","Mixte"]],co&&co.mode)}${sel("cd"+i,[["day","Par jour"],["week","Par semaine"]],co&&co.period)}</div><div class="seg" style="margin-top:6px"><input id="cf${i}" type="number" min="0" placeholder="Montant FCFA" value="${co&&co.fixed_amount!=null?co.fixed_amount:""}"><input id="cp${i}" type="number" min="0" max="100" placeholder="Part %" value="${co&&co.percentage!=null?co.percentage:""}"></div><div class="seg" style="margin-top:6px"><input id="cr${i}" type="number" min="0" max="6" placeholder="Jours de repos / semaine" value="${co?co.rest_days_per_week:""}"></div><label><input type="checkbox" id="cc${i}"${!co||co.carry_over_arrears?" checked":""}>Garder l’écart en dette si le résultat ne couvre pas la somme due</label><div class="btns"><button class="btn ghost sm" data-a="con" data-v="${v.id}" data-i="${i}">Enregistrer le contrat</button></div>`;
  else if(can("contract.read"))cb+=`<div class="row" style="border:0"><span>Contrat</span><b>${co?conTxt(co):"—"}</b></div>`;
  if(hist.length)cb+=`<p class="note" style="margin-bottom:2px">Anciens contrats</p>`+hist.slice(0,3).map(k=>`<div class="row"><span class="note" style="margin:0">${esc(k.starts_on)} → ${esc(k.ends_on)}</span><span class="note" style="margin:0">${conTxt(k)}</span></div>`).join("");
  if(can("contract.read")||can("contract.write"))c+=acc(K+":con","Contrat",co?conTxt(co):"Aucun",cb,false);
  c+=acc(K+":doc","Documents",docs.length?docs.length+" document(s)"+(dAl.length?" · ⚠ "+dAl.length+" à renouveler":""):"Aucun",(docRows(docs)||none("Aucun document."))+(can("document.write")?`<div class="seg" style="margin-top:8px">${sel("dt"+i,Object.keys(DOCT).map(k=>[k,DOCT[k]]))}<input id="dd${i}" type="date"></div><div class="btns"><button class="btn ghost sm" data-a="adddoc" data-v="${v.id}" data-i="${i}">Ajouter le document</button><button class="btn ghost sm" data-a="adddocp" data-v="${v.id}" data-i="${i}">📷 Avec photo</button></div>`:""),dAl.length>0);
  if(can("vehicle.write"))c+=acc(K+":st","État du véhicule",(VST[v.status]||[0,v.status])[1],`<div class="seg" style="margin:6px 0">${sel("st"+i,Object.keys(VST).map(k=>[k,VST[k][1]]),v.status)}<button class="btn ghost sm" data-a="vst" data-v="${v.id}" data-i="${i}" style="flex:none">Mettre à jour</button></div>`,false);
  h+=card("",c)});
 return h}

function clotures(){
 const S=D.set||[],pend=S.filter(s=>s.status==="submitted"),rest=S.filter(s=>s.status!=="submitted");
 const hd=s=>{const h=D.sh[s.shift_id]||{};return `<b>${esc(h.shift_date||"")}</b> · <span class="chip">${esc(plateOf(h.vehicle_id))}</span>`};
 const rows=s=>`${s.return_reason?`<p class="note">Renvoi : ${esc(s.return_reason)}</p>`:""}<div class="row"><span>Recettes</span><b>${fmt(s.gross)}</b></div><div class="row"><span>Dépenses</span><b>− ${fmt(s.expenses_total)}</b></div><div class="row"><span>Résultat</span><b>${fmt(s.net)}</b></div><div class="row"><span>Dû au propriétaire</span><b>${fmt(s.due_owner)}</b></div><div class="row"><span>Reste au chauffeur</span><b>${fmt(s.driver_balance)}</b></div>`;
 const acts=s=>`${s.status==="validated"&&can("settlement.review")?`<div class="btns"><button class="btn lnk sm" data-a="reopen" data-id="${s.shift_id}" style="flex:none">Rouvrir pour correction</button></div>`:""}${s.status==="submitted"&&can("settlement.review")?`<div class="btns"><button class="btn sun" data-a="rv" data-id="${s.shift_id}" data-v="1">Valider</button><button class="btn ghost" data-a="rv" data-id="${s.shift_id}" data-v="0">Renvoyer</button></div>`:""}`;
 return (pend.length?pend.map(s=>{const h=D.sh[s.shift_id]||{};return card("",`<div class="row" style="padding-top:0"><span>${hd(s)}<br><span class="note" style="margin:0">${esc(nameOf(h.driver_id))}</span></span>${tag(CS[s.status])}</div>`+rows(s)+acts(s))}).join(""):card("À valider",none("Aucune clôture en attente.")))+
  (rest.length?card("Historique ("+rest.length+")",rest.slice(0,15).map(s=>acc("cl:"+s.shift_id,hd(s),esc(nameOf((D.sh[s.shift_id]||{}).driver_id))+" "+tag(CS[s.status]),rows(s)+acts(s),false)).join("")+(rest.length>15?none("Les 15 plus récentes sont affichées."):"")):"")}

function comptes(){
 const drv=(D.mem||[]).filter(x=>x.role==="driver"&&x.status==="active"),bal={};(D.led||[]).forEach(x=>bal[x.driver_id]=(bal[x.driver_id]||0)+(+x.amount));
 let h=card("Compte courant des chauffeurs",(drv.length?drv.map(d=>{const b=bal[d.user_id]||0;return `<div class="row"><span>${esc(nameOf(d.user_id))}</span><span class="col"><b class="${b>0?"neg":""}">${b>0?"doit ":b<0?"crédit ":""}${fmt(Math.abs(b))}</b><button class="btn ghost sm" data-a="hist" data-u="${d.user_id}">Historique</button></span></div>`}).join(""):none("Aucun chauffeur actif."))+`<p class="note">Somme positive : le chauffeur doit encore cette somme au propriétaire.</p>`);
 if(selDrv)h+=histCard();
 const P2=D.pay||[];
 if(P2.length)h+=card("Versements à confirmer",P2.map(p=>`<div class="row"><span>${esc(nameOf(p.driver_id))}<br><span class="note" style="margin:0">${p.kind==="advance"?"Avance":"Versement"} · ${esc(p.method)}</span></span><span class="col"><b>${fmt(p.amount)}</b><button class="btn sun sm" data-a="cfp" data-id="${p.id}">Confirmer</button></span></div>`).join(""));
 if(can("payment.record")&&drv.length)h+=accCard("cp:mv","➕ Enregistrer un mouvement","",false,`<label for="rd">Chauffeur</label>${sel("rd",drv.map(d=>[d.user_id,nameOf(d.user_id)]))}<label for="ra">Montant (FCFA)</label><input id="ra" type="number" min="1" inputmode="numeric"><label for="rm">Moyen</label>${sel("rm",[["cash","Espèces"],["mobile_money","Paiement mobile"],["bank","Banque"],["other","Autre"]])}<div class="btns"><button class="btn sun" data-a="rp" data-k="owner_payment">Versement reçu</button><button class="btn ghost" data-a="rp" data-k="advance">Avance donnée</button><button class="btn ghost" data-a="rp" data-k="driver_pay">Rémunération versée</button></div>`);
 return h}

function entretien(){
 const M=D.mnt||[];
 return card("Maintenance",M.length?M.map(x=>`<div class="row"><span><b>${esc(x.kind)}</b><br><span class="note" style="margin:0">${esc(plateOf(x.vehicle_id))}${x.release_decision==="released"?" · remis en circulation":x.release_decision==="kept_out"?" · immobilisé":""}</span></span><span class="col">${tag(MS[x.status])}${can("maintenance.write")&&NEXT[x.status]?`<button class="btn ghost sm" data-a="mn" data-id="${x.id}" data-v="${NEXT[x.status]}">${NEXTL[x.status]}</button>`:""}${can("maintenance.release")&&x.release_decision==="pending"&&(x.status==="done"||x.status==="in_progress")?`<button class="btn sun sm" data-a="rl" data-id="${x.id}" data-u="${x.vehicle_id}" data-v="released">Remettre en circulation</button><button class="btn ghost sm" data-a="rl" data-id="${x.id}" data-u="${x.vehicle_id}" data-v="kept_out">Garder immobilisé</button>`:""}</span></div>`).join(""):none("Aucun problème signalé."))}

function journee(){
 if(!D.my)return card("Ma journée",none("Aucun véhicule ne t’est affecté pour l’instant. Demande à ton propriétaire de t’affecter un véhicule."));
 const v=D.my,ru=D.rule,qs=qget().filter(x=>D.shift&&x.row.shift_id===D.shift.id);
 let h=card("",`<div class="row" style="padding-top:0"><span class="chip">${esc(v.plate)}</span><span class="note" style="margin:0">${esc([v.make,v.model].filter(Boolean).join(" "))} · ${TN[v.transport_type]}${D.line?" · "+esc(D.line.name):""}</span></div>`);
 if((D.minev||[]).length>1)h=card("Véhicule du jour",sel("sv",D.minev.map(x=>[x.id,x.plate]),v.id))+h;
 if(selDate&&selDate!==today())h=card("",`<div class="row" style="padding-top:0"><span>Journée du <b>${esc(selDate)}</b></span><button class="btn ghost sm" data-a="opday" data-v="">Revenir à aujourd’hui</button></div>`)+h;
 h+=accCard("j:ctr","Mon contrat",ru?(ru.mode==="fixed"?fmt(ru.fixed_amount):ru.percentage+" %"):"",false,`<p class="note" style="margin:0">${ru?(ru.mode==="fixed"?"Versement fixe : "+fmt(ru.fixed_amount)+(ru.period==="week"?" par semaine":" par jour"):ru.mode==="percentage"?"Part du propriétaire : "+ru.percentage+" % du résultat":"Fixe "+fmt(ru.fixed_amount)+" + "+ru.percentage+" % du surplus"):"Aucun contrat défini pour ce véhicule."}</p>`);
 const al=(D.ddocs||[]).filter(d=>d.expires_on&&dl(d.expires_on)<=5);
 if((D.ddocs||[]).length)h+=accCard("j:docs","Documents du véhicule",al.length?"⚠ "+al.length+" à renouveler":D.ddocs.length+"",al.length>0,docRows(D.ddocs));
 if(D.dp0&&D.dp0.licence_expires_on&&dl(D.dp0.licence_expires_on)<=5)h+=card("Permis de conduire",`<p class="note" style="margin:0;color:var(--warn)"><b>Rappel :</b> ton permis expire ${dl(D.dp0.licence_expires_on)<0?"(expiré)":"dans "+dl(D.dp0.licence_expires_on)+" j"}.</p>`);
 if(!D.shift&&selDate&&selDate!==today())return h+card("",none("Aucune journée trouvée pour cette date."))+pastCard();
 if(!D.shift&&(v.status==="immobilised"||v.status==="maintenance"))return h+card("Aujourd’hui",none("Ce véhicule est immobilisé ou en maintenance : tu ne peux pas commencer de journée. Préviens ton propriétaire."))+pastCard();
 if(!D.shift)return h+card("Aujourd’hui",`<label for="sk">Kilométrage de départ (facultatif)</label><input id="sk" type="number" min="0" inputmode="numeric"><div class="btns"><button class="btn sun" data-a="start">Commencer la journée</button></div>`)+pastCard();
 const st=D.st?D.st.status:"draft",open=st==="draft"||st==="returned";
 const R=D.rev.concat(qs.filter(x=>x.t==="revenues").map(x=>x.row)),E=D.exp.concat(qs.filter(x=>x.t==="expenses").map(x=>x.row));
 const g=R.reduce((s,x)=>s+x.amount,0),e=E.filter(x=>x.status!=="rejected").reduce((s,x)=>s+x.amount,0),net=g-e,due=dueOf(net,ru);
 const lines=R.map(x=>`<div class="row"><span>Recette${x.source&&x.source!=="course"?" ("+esc(x.source)+")":""}${x.id&&qs.some(q=>q.row.id===x.id)?" · en attente":""}</span><span class="col"><b>+ ${fmt(x.amount)}</b>${open?`<button class="btn ghost sm" data-a="del" data-t="revenues" data-id="${x.id}">✕</button>`:""}</span></div>`).concat(E.map(x=>`<div class="row"><span>${esc(CAT[x.category]||x.category)}${x.note?" – "+esc(x.note):""}${x.status==="rejected"?" · rejetée":""}${qs.some(q=>q.row.id===x.id)?" · en attente":""}${x.status==="approved"?" · approuvée":""}</span><span class="col"><b>− ${fmt(x.amount)}</b>${x.id&&!qs.some(q=>q.row.id===x.id)?(D.rcp&&D.rcp[x.id]?`<button class="btn ghost sm" data-a="seefile" data-f="${esc(D.rcp[x.id])}">📎 Voir</button>`:open?`<button class="btn ghost sm" data-a="photo" data-id="${x.id}">📷 Justificatif</button>`:""):""}${open&&(x.status==="pending"||!x.status)?`<button class="btn ghost sm" data-a="del" data-t="expenses" data-id="${x.id}">✕</button>`:""}</span></div>`));
 h+=card("",`<div class="row" style="padding-top:0"><h3 style="margin:0">Aujourd’hui</h3>${tag(CS[st])}</div>${D.st&&D.st.return_reason?`<p class="note">Motif du renvoi : ${esc(D.st.return_reason)}</p>`:""}<div class="row"><span>Recettes</span><b>+ ${fmt(g)}</b></div><div class="row"><span>Dépenses</span><b>− ${fmt(e)}</b></div><div class="row"><span>Reste pour toi</span><b>${fmt(net-due)}</b></div>`);
 if(open){const tc=(D.trp||[]).length+qs.filter(x=>x.t==="trips").length;h+=accCard("j:trip",D.line?"Tours":"Courses",tc+" aujourd’hui",true,`<div class="row"><span>${D.line?"Tours effectués":"Courses effectuées"}</span><b>${tc}</b></div><label for="tf">Montant (FCFA)</label><input id="tf" type="number" min="1" inputmode="numeric">${D.line?'<label for="tp">Passagers (facultatif)</label><input id="tp" type="number" min="0" inputmode="numeric">':""}<label for="tn">Précision (facultatif)</label><input id="tn"><div class="btns"><button class="btn sun" data-a="trip">${D.line?"Enregistrer le tour":"Enregistrer la course"}</button></div>`)}
 if(open)h+=accCard("j:ent","Dépense ou autre recette",E.length+" dépense(s)",false,`<label for="et">Type</label><select id="et"><optgroup label="Recette"><option value="rev|course">Recette (course)</option><option value="rev|tour">Recette (tour de ligne)</option><option value="rev|autre">Autre recette</option></optgroup><optgroup label="Dépenses">${Object.keys(CAT).map(k=>`<option value="exp|${k}">${CAT[k]}</option>`).join("")}</optgroup></select><label for="ea">Montant (FCFA)</label><input id="ea" type="number" min="1" inputmode="numeric"><label for="el">Précision (facultatif)</label><input id="el"><label for="eq">Litres (si carburant, facultatif)</label><input id="eq" type="number" min="0" step="0.1" inputmode="decimal"><div class="btns"><button class="btn sun" data-a="ent">Enregistrer</button></div>`);
 h+=accCard("j:lines","Détail de mes saisies",(R.length+E.length)+"",false,(lines.join("")||none("Aucune saisie."))+`<div class="row"><span>Résultat</span><b>${fmt(net)}</b></div><div class="row"><span>Dû au propriétaire</span><b>${fmt(due)}</b></div>`);
 if(open)h+=card("Terminer ma journée",`${!D.shift.ended_at?`<label for="ek">Kilométrage d’arrivée (facultatif)</label><input id="ek" type="number" min="0" inputmode="numeric"><div class="btns"><button class="btn ghost" data-a="endsh">Terminer la mission</button></div>`:""}<p class="note">Quand ta journée est terminée, envoie ta clôture au propriétaire. Tu ne pourras plus la modifier ensuite.</p><div class="btns"><button class="btn sun" data-a="sub">Envoyer la clôture</button></div>`);
 return h+pastCard()}

function pastCard(){const L=(D.past||[]).filter(x=>x.shift_date!==(selDate||today()));
 return L.length?accCard("j:past","Mes derniers jours",L.length+"",false,L.map(x=>{const t=x.status?CS[x.status]:["t-warn","Non clôturé"];return `<div class="row"><span><b>${esc(x.shift_date)}</b>${x.plate?` · <span class="chip">${esc(x.plate)}</span>`:""}</span><span class="col">${tag(t)}${!x.status||x.status==="draft"||x.status==="returned"?`<button class="btn ghost sm" data-a="opday" data-v="${esc(x.shift_date)}" data-vid="${esc(x.vehicle_id)}">${x.status==="returned"?"Corriger":"Ouvrir"}</button>`:""}</span></div>`}).join("")):""}

function monCompte(){
 const b=D.dBal||0;
 return card("Mon compte",`<div class="big">${fmt(Math.abs(b))}</div><p class="note" style="margin-top:4px">${b>0?"Tu dois encore cette somme au propriétaire.":b<0?"Le propriétaire te doit cette somme.":"Tu es à jour."}</p>`)+
  accCard("mc:pay","➕ Déclarer un versement","",false,`<label for="da">Montant (FCFA)</label><input id="da" type="number" min="1" inputmode="numeric"><label for="dm">Moyen</label>${sel("dm",[["cash","Espèces"],["mobile_money","Paiement mobile"],["bank","Banque"],["other","Autre"]])}<div class="btns"><button class="btn sun" data-a="dp">Déclarer</button></div><p class="note">Le propriétaire ou le comptable confirme ensuite le versement.</p>`)+
  accCard("mc:last","Derniers versements",(D.dPay||[]).length+"",false,(D.dPay||[]).length?D.dPay.map(p=>`<div class="row"><span>${p.kind==="advance"?"Avance reçue":"Versement"}</span><span class="col"><b>${fmt(p.amount)}</b>${tag(p.acknowledged_at?["t-ok","Confirmé"]:["t-warn","À confirmer"])}</span></div>`).join(""):none("Aucun versement."))+
  accCard("mc:hist","Historique de mon compte","",false,ledgerRows(D.dLed))}
const LK={due:"Somme due",payment:"Versement",advance:"Avance",adjustment:"Ajustement",waiver:"Remise de dette"};
const ledgerRows=L=>(L&&L.length)?L.map(x=>`<div class="row"><span>${LK[x.kind]||esc(x.kind)}<br><span class="note" style="margin:0">${esc((x.created_at||"").slice(0,10))}${x.reason?" · "+esc(x.reason):""}</span></span><b class="${+x.amount>0?"neg":""}">${+x.amount>0?"+ ":"− "}${fmt(Math.abs(x.amount))}</b></div>`).join(""):none("Aucun mouvement.")
function histCard(){const L=(D.led||[]).filter(x=>x.driver_id===selDrv).slice(0,25);return card("Historique de "+esc(nameOf(selDrv)),ledgerRows(L))}

function signaler(){
 if(!D.my)return card("Signaler",none("Aucun véhicule affecté."));
 return card("Signaler une panne ou un entretien",`<label for="mk">Type</label>${sel("mk",["Vidange","Pneu","Freins","Batterie","Autre panne"].map(x=>[x,x]))}<div class="btns"><button class="btn sun" data-a="rpt">Envoyer au propriétaire</button></div>`)+
  card("Déclarer un incident",`<label for="it">Type</label>${sel("it",[["accident","Accident"],["police_check","Contrôle de police"],["theft","Vol"],["dispute","Litige"],["breakdown","Panne en route"],["other","Autre"]])}<label for="is">Gravité</label>${sel("is",[["1","Légère"],["2","Importante"],["3","Grave"]])}<label for="ix">Description</label><input id="ix"><div class="btns"><button class="btn sun" data-a="inc">Déclarer</button><button class="btn ghost" data-a="incp">📷 Déclarer avec photo</button></div>`)}

function plateforme(){const B=D.pb||[],VS={unverified:["t-warn","Non vérifiée"],pending:["t-warn","À vérifier"],verified:["t-ok","Vérifiée"],rejected:["t-bad","Rejetée"]};
 return card("Plateforme EDSP",none("Supervision des entreprises : comptes, vérification, suspension. Les véhicules et les finances des entreprises ne sont pas affichés ici."))+B.map(b=>{const c=(D.pc||{})[b.id]||{n:0,p:0};
  return card("",`<div class="row" style="padding-top:0"><span><b>${esc(b.name)}</b><br><span class="note" style="margin:0">${esc(b.code)} · ${c.n} membre(s) actif(s)${c.p?" · "+c.p+" demande(s)":""}</span></span><span class="col">${tag(VS[b.verification_status])}${b.suspended?tag(["t-bad","Suspendue"]):""}</span></div><div class="btns"><button class="btn sun sm" data-a="bv" data-id="${b.id}" data-v="verified">Vérifier</button><button class="btn ghost sm" data-a="bv" data-id="${b.id}" data-v="rejected">Rejeter</button><button class="btn ghost sm" data-a="bs" data-id="${b.id}" data-v="${b.suspended?"0":"1"}">${b.suspended?"Réactiver":"Suspendre"}</button></div>`)}).join("")}

function aproposView(){
 return card("",`<div style="text-align:center"><img src="logo-full.png" alt="EDEN SERVICE PLUS" style="width:min(72%,290px);border-radius:24px;box-shadow:0 6px 24px #03326e22"><p style="font-weight:800;margin:16px 0 2px">EDSP – ESPACE TRANSPORT</p><p class="note" style="margin:0;letter-spacing:.16em">TRANSPORT MANAGER</p></div>`)+
  card("À propos",`<p style="margin:0">Application de gestion du transport pour les propriétaires, gestionnaires et chauffeurs : véhicules, journées, recettes, dépenses, clôtures et entretien.</p><p class="note">Éditée par EDEN SERVICE PLUS (EDSP), super administrateur de la plateforme.<br>Innover aujourd’hui, bâtir demain.</p><p class="note">Version <b>${APP_VER}</b></p>`)}

function profil(){
 const nm=(user.user_metadata||{}).full_name||"";
 let h=card(esc(nm||"Mon profil"),`<div class="note" style="margin-top:0">${esc(user.email)}</div>`);
 if(curSp==="company")h+=accCard("pf:co","💼 Ma société",esc(MYCO||"à renseigner"),!MYCO,`<label for="co_name2">Nom de ta société</label><input id="co_name2" maxlength="100" value="${esc(MYCO)}"><div class="btns"><button class="btn sun" data-a="cmpsave">Enregistrer</button></div><p class="note">Ce nom et le tien sont montrés au chauffeur à qui tu envoies une demande.</p>`);
 h+=accCard("pf:col","🎨 Couleurs de mes espaces","",false,`<p class="note" style="margin-top:0">Chaque espace a sa couleur. Touche un rond pour changer. Les couleurs s’adaptent au mode clair ou sombre de ton téléphone.</p><label style="display:flex;align-items:center;gap:8px;margin:6px 0 4px"><input type="checkbox" id="frm" data-a="frm"${FRM?" checked":""}>Colorer aussi les cadres de l’espace</label>${SPS().map(k=>`<div style="padding:10px 0 4px;border-top:1px solid var(--line)"><b>${SPI[k]} ${SPN[k]}</b> <span class="note" style="margin:0">· ${esc(PAL[PALSEL[k]].n)}</span></div><div class="sw">${PAL.map((p,i)=>`<button class="swb${PALSEL[k]===i?" on":""}" data-a="pal" data-s="${k}" data-v="${i}" aria-label="${esc(p.n)}" style="background:${p.s}"></button>`).join("")}</div>`).join("")}`);
 h+=accCard("pf:res","📍 Mes coordonnées",esc(MYPH||"téléphone à renseigner"),!MYPH||!MYR,`<div class="row" style="border:0"><span>Mon code</span><b>${esc(MYCODE)}</b></div><p class="note" style="margin:0 0 6px">Ce code t’identifie dans l’application.</p><label for="rs_ph">Numéro de téléphone</label><input id="rs_ph" type="tel" inputmode="tel" maxlength="25" placeholder="+225 07 00 00 00 00" value="${esc(MYPH)}"><label for="rs_res">Commune et quartier</label><input id="rs_res" maxlength="120" placeholder="Ex. Yopougon, Niangon Nord" value="${esc(MYR)}"><div class="btns"><button class="btn sun" data-a="ressave">Enregistrer</button></div><p class="note">Visibles par les personnes de ton entreprise. Les particuliers ne voient ton numéro que si tu acceptes leur demande.</p>`);
 if(curSp==="driver"){const ml=MYL||{};h+=accCard("pf:vis","🚖 Mon espace chauffeur",STE[MYST],!MYL,`<div class="row" style="border:0"><span>Mon statut</span><b>${STE[MYST]}</b></div><p class="note" style="margin:0 0 8px">🟢 en ligne · 🔵 en échange (une demande attend ta réponse) · 🔴 travail accepté : on ne peut plus te contacter · ⚫ pas en ligne</p>${MYST==="accepted"?`<p class="note" style="margin:0 0 6px">Touche ce bouton quand ton travail est terminé : tu redeviens joignable.</p><div class="btns"><button class="btn ghost" data-a="free">Je suis de nouveau disponible</button></div>`:""}<label><input type="checkbox" id="ls_vis"${ml.visible?" checked":""}>Je suis visible : les propriétaires et particuliers peuvent me solliciter</label><label for="ls_zone">Zone</label><input id="ls_zone" maxlength="80" placeholder="Ex. Cocody, Abidjan" value="${esc(ml.zone||"")}"><label for="ls_type">Type de transport</label>${sel("ls_type",[["","—"]].concat(Object.keys(TN).map(k=>[k,TN[k]])),ml.transport_type||"")}<label for="ls_note">Présentation (facultatif)</label><input id="ls_note" maxlength="300" value="${esc(ml.note||"")}"><label for="ls_ct">Contact (laisse vide pour utiliser ton téléphone)</label><input id="ls_ct" maxlength="80" inputmode="tel" placeholder="${esc(MYPH||"+225 …")}" value="${esc(ml.contact||"")}"><div class="btns"><button class="btn sun" data-a="lssave">Enregistrer</button></div>${(!isPA||mems.some(m=>m.role==="driver"&&m.status==="active"))?"":`<div class="btns"><button class="btn lnk sm" data-a="spset" data-s="driver" data-on="0" style="flex:none">Désactiver l’espace chauffeur</button></div>`}`)}
 if(curSp==="driver"&&isDrv()){const dp=D.dp0||{};h+=accCard("pf:lic","🪪 Mon permis de conduire",dp.licence_number?esc(dp.licence_number):"à renseigner",!dp.licence_number,`<label for="pn">Numéro de permis</label><input id="pn" value="${esc(dp.licence_number||"")}"><label for="pc">Catégorie</label><input id="pc" value="${esc(dp.licence_category||"")}" placeholder="Ex. B"><label for="px">Date d’expiration</label><input id="px" type="date" value="${esc(dp.licence_expires_on||"")}"><div class="btns"><button class="btn sun" data-a="savelic">Enregistrer</button></div>`)}
 const MS=mems.filter(m=>curSp==="driver"?m.role==="driver":m.role!=="driver");if(curSp!=="user"&&curSp!=="company"&&MS.length)h+=accCard("pf:esp","🏢 Mes entreprises",MS.length+"",MS.length>1||MS.some(m=>m.status==="pending"),MS.map(m=>`<div class="row"><span><b>${esc((m.business_accounts||{}).name||"")}</b><br><span class="note" style="margin:0">${RN[m.role]} · Code ${esc((m.business_accounts||{}).code||"")}</span></span><span class="col">${tag(m.status==="active"?["t-ok","Actif"]:m.status==="pending"?["t-warn","En attente"]:["t-bad","Refusé"])}${m.status==="active"&&m.business_id!==bid?`<button class="btn ghost sm" data-a="sw" data-v="${m.business_id}">Ouvrir</button>`:""}</span></div>`).join(""));
 {const mf=D.mf||[];h+=accCard("pf:sec","🔒 Sécurité du compte",mf.length?"2 étapes activées":"2 étapes non activées",!!mfaEnr,mfaEnr?`<p class="note" style="margin-top:0">1. Scanne ce code avec une application d’authentification (Google Authenticator, Microsoft Authenticator…).<br>2. Entre le code à 6 chiffres.</p><div style="text-align:center"><img src="${esc(mfaEnr.qr)}" alt="Code QR" style="width:180px;height:180px;background:#fff;border-radius:10px;padding:6px"></div><p class="note">Clé manuelle : <b>${esc(mfaEnr.secret)}</b></p><label for="mc">Code à 6 chiffres</label><input id="mc" inputmode="numeric" maxlength="6"><div class="btns"><button class="btn sun" data-a="mfacf">Valider</button><button class="btn ghost" data-a="mfacancel">Annuler</button></div>`:mf.length?`<div class="row" style="padding-top:0"><span>Vérification en deux étapes</span>${tag(["t-ok","Activée"])}</div><div class="btns"><button class="btn ghost" data-a="mfaoff" data-f="${esc(mf[0].id)}">Désactiver</button></div>`:`<div class="row" style="padding-top:0"><span>Vérification en deux étapes</span>${tag(["t-warn","Non activée"])}</div><p class="note">Recommandée pour les propriétaires et le super administrateur : un code temporaire s’ajoute au mot de passe.</p><div class="btns"><button class="btn sun" data-a="mfaon">Activer</button></div>`)}
 h+=accCard("pf:pw","🔑 Changer mon mot de passe","",false,`<label for="cp1">Nouveau mot de passe</label>${pwi("cp1","new-password")}<div class="btns"><button class="btn ghost" data-a="chpw">Changer</button></div>`);
 return h}

/* ---------- actions ---------- */
async function run(btn,fn){if(busy)return;busy=true;if(btn)btn.disabled=true;try{await fn()}catch(e){toast(msg(e))}busy=false;if(btn)btn.disabled=false}
const ok=(r,m)=>{if(r.error)throw r.error;if(m)toast(m)};
document.addEventListener("click",e=>{
 const b=e.target.closest("[data-a]");if(!b)return;if(b.tagName==="A")e.preventDefault();const a=b.dataset.a,d=b.dataset,v=id=>$(id).value;
 if(a==="eye"){const i=$(d.t);if(i){const sh=i.type==="password";i.type=sh?"text":"password";b.textContent=sh?"🙈":"👁️";b.setAttribute("aria-label",sh?"Masquer le mot de passe":"Afficher le mot de passe")}return}
 if(a==="mode"){mode=d.v;view();return}
 if(a==="spt"){suSp.clear();suSp.add(d.v);view();return}
 if(a==="spgo"){if(!suSp.size){toast("Choisis au moins un espace.");return}suGo=true;view();return}
 if(a==="spback"){suGo=false;view();return}
 if(a==="tab"&&d.v==="au"){run(b,async()=>{const r=await sb.from("audit_log").select("at,actor,action,table_name,old_data,new_data").eq("business_id",bid).order("at",{ascending:false}).limit(60);D.au=r.data||[];tab="au";view()});return}
 if(a==="frm"){FRM=b.checked;try{localStorage.setItem("tm-frm",FRM?"1":"0")}catch(e){}view();return}
 if(a==="intro"){try{localStorage.setItem("tm-intro-"+d.s,"1")}catch(e){}view();return}
 if(a==="ext"){if(/^(tel:|mailto:)/.test(d.u))location.href=d.u;else window.open(d.u,"_blank","noopener");return}
 if(a==="hub"){curSp=null;tab=null;try{sessionStorage.removeItem("tm-sp")}catch(e){}view();return}
 if(a==="hist"){selDrv=selDrv===d.u?null:d.u;view();return}
 if(a==="tab"){tab=d.v;view();return}
 if(a==="fitab"){fiTab=d.v;view();return}
 if(a==="go"){mode=d.v;scr="auth";view();return}
 if(a==="home"){scr="home";tab=null;view();return}
 if(a==="per"){rpP=+d.v;view();return}
 run(b,async()=>{
  if(a==="signin"||a==="signup"){
   const em=v("em").trim(),pw=v("pw");if(!em||!pw){toast("Renseigne l’e-mail et le mot de passe.");return}
   if(a==="signup"){if(pw.length<8){toast("Mot de passe : 8 caractères minimum.");return}const fn=v("fn").trim();if(!fn){toast("Renseigne ton nom.");return}
    const phn=v("ph2").trim();if(!okPhone(phn)){toast("Renseigne ton numéro de téléphone.");return}
    const sco=suSp.has("company")?v("sco").trim():"";if(suSp.has("company")&&!sco){toast("Renseigne le nom de ta société.");return}
    const sbz=suSp.has("owner")?v("sb").trim():"";if(suSp.has("owner")&&!sbz){toast("Renseigne le nom de ton entreprise ou activité.");return}
    const r=await sb.auth.signUp({email:em,password:pw,options:{emailRedirectTo:location.origin+location.pathname,data:{full_name:fn,signup_phone:phn,signup_spaces:[...suSp],signup_biz:sbz,signup_company:sco}}});if(r.error)throw r.error;suSp=new Set();suGo=false;
    if(!r.data.session){pendEm=em;mode="code";toast("Code envoyé par e-mail.");view();return}user=r.data.session.user}
   else{const r=await sb.auth.signInWithPassword({email:em,password:pw});if(r.error){if(/not confirmed/i.test(r.error.message||"")){pendEm=em;await sb.auth.resend({type:"signup",email:em,options:{emailRedirectTo:location.origin+location.pathname}});mode="code";toast("E-mail pas encore confirmé : un code vient d’être envoyé.");view();return}throw r.error}user=r.data.user;if(await mfaCheck())return}
   await load();return}
  if(a==="vcode"){const t=v("cd").replace(/\s/g,"");if(t.length<6){toast("Écris le code reçu par e-mail.");return}const r=await sb.auth.verifyOtp({email:pendEm,token:t,type:"signup"});if(r.error)throw r.error;user=r.data.user||(r.data.session&&r.data.session.user);mode="in";await load();return}
  if(a==="rcode"){const r=await sb.auth.resend({type:"signup",email:pendEm,options:{emailRedirectTo:location.origin+location.pathname}});if(r.error)throw r.error;toast("Nouveau code envoyé.");return}
  if(a==="nb"){const n=v("on").trim();if(!n){toast("Renseigne le nom de ton entreprise.");return}ok(await sb.rpc("create_business",{p_name:n}),"Espace créé.");tab=null;await load();return}
  if(a==="jb"){const c=v("jc").trim();if(!c){toast("Renseigne le code du propriétaire.");return}{const r=await sb.rpc("join_business",{p_code:c,p_role:v("jr")});if(r.error)throw r.error;if(!r.data){toast("Code inconnu. Vérifie le code donné par ton propriétaire.");return}toast("Demande envoyée.")}await load();return}
  if(a==="enter"){const k=d.s,m=k==="user"?null:mems.find(x=>x.status==="active"&&(k==="driver"?x.role==="driver":x.role!=="driver"));curSp=k;tab=null;try{sessionStorage.setItem("tm-sp",k)}catch(e){}if(m&&m.business_id!==bid){localStorage.setItem("tm-biz",m.business_id);await load();return}view();return}
  if(a==="cmpact"){const nm=v("co_name").trim();if(!nm){toast("Renseigne le nom de ta société.");return}const sp=new Set(MYSP);sp.add("company");const r=await sb.from("profiles").update({spaces:[...sp],company_name:nm.slice(0,100)}).eq("id",user.id).select();if(r.error)throw r.error;if(!r.data.length)throw new Error("Action refusée.");toast("Espace entreprise activé.");await loadSol();pickSpace();view();return}
  if(a==="cmpsave"){const nm=v("co_name2").trim();if(!nm){toast("Renseigne le nom de ta société.");return}const r=await sb.from("profiles").update({company_name:nm.slice(0,100)}).eq("id",user.id).select();if(r.error)throw r.error;if(!r.data.length)throw new Error("Action refusée.");toast("Nom enregistré.");await loadSol();view();return}
  if(a==="vpick"){const x=(D.veh||[]).find(y=>y.id===d.id);if(x){$("sq_vt").value=["vtc","taxi","gbaka","woro"].includes(x.transport_type)?x.transport_type:"other";$("sq_vm").value=[x.make,x.model].filter(Boolean).join(" ");$("sq_vp").value=x.plate||""}return}
  if(a==="cvopen"){cvId=d.id;CVM=[];tab="cv";await loadCv(true);return}
  if(a==="cvsend"){const el=$("cv_in"),t=el?el.value:"";if(!t.trim()){toast("Écris un message.");return}const r=await sb.rpc("send_message",{p_sol:cvId,p_body:t});if(r.error)throw r.error;if(el)el.value="";await loadCv(true);return}
  if(a==="spset"){const k=d.s,on=d.on==="1",sp=new Set(MYSP);on?sp.add(k):sp.delete(k);ok(await sb.from("profiles").update({spaces:[...sp]}).eq("id",user.id),on?"Espace activé.":"Espace désactivé.");
   if(k==="driver"&&!on&&MYL&&MYL.visible)await sb.rpc("set_my_listing",{p_visible:false,p_zone:MYL.zone||"",p_type:MYL.transport_type||"",p_note:MYL.note||"",p_contact:MYL.contact||""});
   await loadSol();pickSpace();view();return}
  if(a==="pal"){PALSEL[d.s]=+d.v;try{localStorage.setItem("tm-pal",JSON.stringify(PALSEL))}catch(e){}view();return}
  if(a==="free"){ok(await sb.rpc("set_driver_free"),"Tu es de nouveau disponible.");await loadSol();view();return}
  if(a==="ressave"){const ph=v("rs_ph").trim();if(!okPhone(ph)){toast("Renseigne un numéro de téléphone valide.");return}const r=await sb.from("profiles").update({phone:ph,residence:v("rs_res").trim()||null}).eq("id",user.id).select();if(r.error)throw r.error;if(!r.data.length)throw new Error("Action refusée.");toast("Coordonnées enregistrées.");await load();return}
  if(a==="lssave"){ok(await sb.rpc("set_my_listing",{p_visible:$("ls_vis").checked,p_zone:v("ls_zone"),p_type:v("ls_type"),p_note:v("ls_note"),p_contact:v("ls_ct")}),"Espace chauffeur enregistré.");await loadSol();view();return}
  if(a==="dsol"){selSol=selSol===d.id?null:d.id;view();return}
  if(a==="dsend"){const g=id=>$(id)?$(id).value:"",k=g("sq_kind"),w=g("sq_when"),vt=g("sq_vt"),vm=g("sq_vm").trim(),vp=g("sq_vp").trim(),vs=g("sq_vs"),vcol=g("sq_vcol").trim(),vpap=g("sq_vpap"),fn=g("sq_fn").trim(),ln=g("sq_ln").trim(),zn=g("sq_zone").trim(),cnt=parseInt(g("sq_cnt")||"0",10),pur=g("sq_purpose").trim();
   if(curSp==="user"){if(!fn||!ln){toast("Indique ton prénom et ton nom.");return}if(!zn){toast("Indique ta zone.");return}if(!(cnt>=1)){toast("Indique combien de chauffeurs tu cherches.");return}}
   if(k==="other"&&!pur&&(curSp==="user"||curSp==="company")){toast("Précise ton motif.");return}
   if(k!=="join"&&(vm.length<2||!vs)){toast("Indique le véhicule (marque et modèle) et son état.");return}
   if(curSp==="user"&&!vcol){toast("Indique la couleur du véhicule.");return}
   if(k!=="join"&&(curSp==="user"||curSp==="company")&&!vpap){toast("Indique si les papiers du véhicule sont à jour.");return}
   if(!okPhone(g("sq_ct"))){toast("Renseigne ton numéro de téléphone.");return}
   ok(await sb.rpc("solicit_driver",{p_driver:selSol,p_kind:k,p_message:g("sq_msg"),p_when:w?new Date(w).toISOString():null,p_contact:g("sq_ct"),p_business:k==="join"?bid:null,p_vehicle_type:vt||null,p_vehicle_model:vm||null,p_vehicle_plate:vp||null,p_vehicle_condition:vs||null,p_first_name:fn||null,p_last_name:ln||null,p_zone:zn||null,p_count:cnt>=1?cnt:null,p_purpose:pur||null,p_vehicle_color:vcol||null,p_vehicle_papers:vpap===""?null:vpap==="1"}),"Demande envoyée.");selSol=null;await loadSol();tab="sq";view();return}
  if(a==="sconf"){ok(await sb.rpc("confirm_solicitation",{p_id:d.id}),"Confirmé : les numéros sont débloqués.");await loadSol();if(tab==="cv")await loadCv(true);else view();return}
  if(a==="sresp"){const yes=d.v==="1";ok(await sb.rpc("respond_solicitation",{p_id:d.id,p_accept:yes}),yes?"Demande acceptée.":"Demande refusée.");await load();return}
  if(a==="scancel"){ok(await sb.rpc("cancel_solicitation",{p_id:d.id}),"Demande annulée.");await loadSol();view();return}
  if(a==="forgot"){const em=v("em").trim();if(!em){toast("Renseigne d’abord ton e-mail.");return}ok(await sb.auth.resetPasswordForEmail(em,{redirectTo:location.origin+location.pathname}),"E-mail envoyé. Ouvre le lien reçu.");return}
  if(a==="newpw"){const pw=v("np");if(pw.length<8){toast("8 caractères minimum.");return}ok(await sb.auth.updateUser({password:pw}),"Mot de passe changé.");recov=false;await load();return}
  if(a==="phsend"){phNum=v("ph").trim();if(!phNum){toast("Renseigne ton téléphone.");return}ok(await sb.auth.signInWithOtp({phone:phNum,options:{data:{full_name:v("fn").trim()}}}),"Code envoyé par SMS.");phStep=1;view();return}
  if(a==="phverify"){const r=await sb.auth.verifyOtp({phone:phNum,token:v("pt").trim(),type:"sms"});if(r.error)throw r.error;user=r.data.user;phStep=0;await load();return}
  if(a==="readall"){ok(await sb.from("notifications").update({read_at:new Date().toISOString()}).is("read_at",null).eq("user_id",user.id));await load();return}
  if(a==="notifon"){await Notification.requestPermission();view();return}
  if(a==="seefile"){await openFile(d.f);return}
  if(a==="photo"){const f=await pick("image/*");if(!f)return;await upload(f,"expense",d.id,"justificatif");toast("Justificatif ajouté.");await load();return}
  if(a==="incp"){const f=await pick("image/*");if(!f)return;const r=await sb.from("incidents").insert({business_id:bid,vehicle_id:D.my.id,type:v("it"),severity:+v("is"),description:v("ix").trim()||null,reported_by:user.id}).select("id").single();if(r.error)throw r.error;await upload(f,"incident",r.data.id,"photo");toast("Incident déclaré avec photo.");return}
  if(a==="adddocp"){const dt=v("dd"+d.i);if(!dt){toast("Choisis d’abord la date d’échéance.");return}const f=await pick("image/*,application/pdf");if(!f)return;await upload(f,"vehicle",d.v,v("dt"+d.i),{expires_on:dt});toast("Document ajouté avec photo.");await load();return}
  if(a==="xa"){const r=await sb.from("expenses").update({status:d.v,decided_by:user.id,decided_at:new Date().toISOString()}).eq("id",d.id).select();if(r.error)throw r.error;if(!r.data.length)throw new Error("Action refusée.");toast(d.v==="approved"?"Dépense approuvée.":"Dépense rejetée.");await load();return}
  if(a==="trip"){const am=Math.round(+v("tf"));if(!(am>0)){toast("Montant invalide.");return}const ps=+v("tp")||null,tid=uid(),now=new Date().toISOString();
   const tr={id:tid,business_id:bid,shift_id:D.shift.id,started_at:now,ended_at:now,fare:am,passengers:ps,note:v("tn").trim()||null},rv={id:uid(),business_id:bid,shift_id:D.shift.id,trip_id:tid,amount:am,source:D.line?"tour":"course"};
   let good=navigator.onLine;if(good){const r1=await sb.from("trips").insert(tr);if(r1.error){if(/fetch|network/i.test(r1.error.message))good=false;else throw r1.error}else{const r2=await sb.from("revenues").insert(rv);if(r2.error)throw r2.error}}
   if(!good){qset(qget().concat([{t:"trips",row:tr},{t:"revenues",row:rv}]));toast("Pas de réseau : gardé sur le téléphone.");view();return}
   toast(D.line?"Tour enregistré.":"Course enregistrée.");await load();return}
  if(a==="endsh"){const k=v("ek");ok(await sb.from("shifts").update({ended_at:new Date().toISOString(),end_km:k?+k:null}).eq("id",D.shift.id),"Mission terminée.");await load();return}
  if(a==="savelic"){ok(await sb.from("driver_profiles").upsert({user_id:user.id,licence_number:v("pn").trim()||null,licence_category:v("pc").trim()||null,licence_expires_on:v("px")||null,updated_at:new Date().toISOString()}),"Permis enregistré.");await load();return}
  if(a==="savebiz"){const n=v("bn").trim();if(!n){toast("Renseigne le nom.");return}const r=await sb.from("business_accounts").update({name:n,legal_form:v("lf").trim()||null,registration_no:v("rn").trim()||null,expense_auto_approve_limit:Math.max(0,Math.round(+v("bl")||0))}).eq("id",bid).select();if(r.error)throw r.error;if(!r.data.length)throw new Error("Action refusée.");toast("Enregistré.");await load();return}
  if(a==="inc2"){ok(await sb.from("incidents").update({status:d.v}).eq("id",d.id));await load();return}
  if(a==="bv"){const r=await sb.from("business_accounts").update({verification_status:d.v}).eq("id",d.id).select();if(r.error)throw r.error;if(!r.data.length)throw new Error("Action refusée.");toast("Statut mis à jour.");await load();return}
  if(a==="bs"){if(d.v==="1"&&!confirm("Suspendre cette entreprise ? Plus personne ne pourra y accéder."))return;const r=await sb.from("business_accounts").update({suspended:d.v==="1"}).eq("id",d.id).select();if(r.error)throw r.error;if(!r.data.length)throw new Error("Action refusée.");toast(d.v==="1"?"Entreprise suspendue.":"Entreprise réactivée.");await load();return}
  if(a==="sw"){localStorage.setItem("tm-biz",d.v);tab=null;await load();return}
  if(a==="acc"){if(d.c==="1"&&!confirm("Suspendre cet accès ?"))return;const r=await sb.from("business_memberships").update({status:d.v}).eq("id",d.id).select();if(r.error)throw r.error;if(!r.data.length)throw new Error("Action refusée.");
   if(d.v==="suspended"&&d.u)await sb.from("vehicle_assignments").update({ends_on:today()}).eq("driver_id",d.u).eq("business_id",bid).is("ends_on",null);
   toast(d.v==="active"?"Accès activé.":"Accès suspendu ou refusé.");await load();return}
  if(a==="accasg"){const r1=await sb.from("business_memberships").update({status:"active"}).eq("id",d.id).select();if(r1.error)throw r1.error;if(!r1.data.length)throw new Error("Action refusée.");
   ok(await sb.from("vehicle_assignments").insert({business_id:bid,vehicle_id:v("fv"+d.id),driver_id:d.u,confirmed_by:user.id}),"Chauffeur accepté et affecté.");await load();return}
  if(a==="addveh"){const pl=v("vp").trim(),ty=v("vt"),ln=v("vl").trim();let lid=null;if(!pl){toast("Renseigne la plaque.");return}
   if(ty==="gbaka"||ty==="woro"){if(!ln){toast("Renseigne la ligne.");return}
    const q=await sb.from("transport_lines").select("id").eq("business_id",bid).eq("name",ln).eq("transport_type",ty).limit(1);lid=q.data&&q.data[0]&&q.data[0].id;
    if(!lid){const i=await sb.from("transport_lines").insert({business_id:bid,name:ln,transport_type:ty}).select("id").single();if(i.error)throw i.error;lid=i.data.id}}
   ok(await sb.from("vehicles").insert({business_id:bid,plate:pl,make:v("vk").trim()||null,model:v("vm").trim()||null,transport_type:ty,fuel_type:v("vf")||null,line_id:lid}),"Véhicule ajouté.");await load();return}
  if(a==="asg"){const dr=v("as"+d.i);if(!dr){toast("Choisis un chauffeur.");return}ok(await sb.from("vehicle_assignments").insert({business_id:bid,vehicle_id:d.v,driver_id:dr,confirmed_by:user.id}),"Chauffeur affecté.");await load();return}
  if(a==="unasg"){ok(await sb.from("vehicle_assignments").update({ends_on:today()}).eq("id",d.id),"Affectation retirée.");await load();return}
  if(a==="con"){const i=d.i,mo=v("cm"+i),fx=v("cf"+i),pc=v("cp"+i);
   if(mo!=="percentage"&&!(fx!==""&&+fx>=0)||mo!=="fixed"&&!(pc!==""&&+pc>=0&&+pc<=100)){toast("Montant ou pourcentage invalide.");return}
   const row={mode:mo,period:v("cd"+i),fixed_amount:mo==="percentage"?null:+fx,percentage:mo==="fixed"?null:+pc,rest_days_per_week:+v("cr"+i)||0,carry_over_arrears:$("cc"+i).checked},ex=(D.con||[]).find(c=>c.vehicle_id===d.v);
   if(ex){const r0=await sb.from("contracts").update({ends_on:new Date(Date.now()-864e5).toLocaleDateString("sv-SE")}).eq("id",ex.id);if(r0.error)throw r0.error}
   ok(await sb.from("contracts").insert(Object.assign({business_id:bid,vehicle_id:d.v,starts_on:today()},row)),"Contrat enregistré. L’ancien reste dans l’historique.");await load();return}
  if(a==="adddoc"){const dt=v("dd"+d.i);if(!dt){toast("Choisis la date d’échéance.");return}
   ok(await sb.from("documents").insert({business_id:bid,target_type:"vehicle",target_id:d.v,doc_type:v("dt"+d.i),expires_on:dt,uploaded_by:user.id}),"Document ajouté.");await load();return}
  if(a==="rv"){const yes=d.v==="1";let why=null;if(!yes){why=prompt("Motif du renvoi (obligatoire) :");if(!why||!why.trim())return}
   ok(await sb.rpc("review_settlement",{sid:d.id,approve:yes,reason:why}),yes?"Clôture validée.":"Clôture renvoyée.");await load();return}
  if(a==="cfp"){const r=await sb.from("payments").update({acknowledged_at:new Date().toISOString(),received_by:user.id}).eq("id",d.id).select();if(r.error)throw r.error;if(!r.data.length)throw new Error("Action refusée.");toast("Versement confirmé.");await load();return}
  if(a==="rp"){const am=Math.round(+v("ra"));if(!(am>0)){toast("Montant invalide.");return}const dr=v("rd");
   ok(await sb.from("payments").insert({id:uid(),business_id:bid,driver_id:dr,kind:d.k,method:v("rm"),amount:am,paid_by:d.k==="owner_payment"?dr:user.id}),({owner_payment:"Versement enregistré.",advance:"Avance enregistrée.",driver_pay:"Rémunération enregistrée."})[d.k]);await load();return}
  if(a==="mn"){ok(await sb.from("maintenance_orders").update({status:d.v}).eq("id",d.id));await load();return}
  if(a==="rl"){ok(await sb.from("maintenance_orders").update({release_decision:d.v}).eq("id",d.id));
   if(can("vehicle.write"))await sb.from("vehicles").update({status:d.v==="released"?"available":"immobilised"}).eq("id",d.u);toast("Décision enregistrée.");await load();return}
  if(a==="start"){const k=v("sk"),row={id:uid(),business_id:bid,vehicle_id:D.my.id,driver_id:user.id,shift_date:today(),started_at:new Date().toISOString(),start_km:k?+k:null};
   let good=navigator.onLine;if(good){const r=await sb.from("shifts").insert(row);if(r.error){if(/fetch|network/i.test(r.error.message))good=false;else throw r.error}}
   if(!good){qset(qget().concat({t:"shifts",row:row}));D.shift={id:row.id,start_km:row.start_km,end_km:null,ended_at:null};D.rev=[];D.exp=[];D.st=null;D.trp=[];D.rcp={};try{localStorage.setItem("tm-snap2",JSON.stringify({u:user.id,mems,bid,roles,P:[...P],D}))}catch(e){}toast("Pas de réseau : journée commencée sur le téléphone.");view();return}
   await load();return}
  if(a==="del"){if(!confirm("Supprimer cette ligne ?"))return;const q=qget(),qi=q.find(x=>x.row.id===d.id);
   if(qi){const ids=[d.id,qi.row.trip_id].filter(Boolean);qset(q.filter(x=>!ids.includes(x.row.id)));view();return}
   if(d.t==="revenues"){const rv=(D.rev||[]).find(x=>x.id===d.id);ok(await sb.from("revenues").delete().eq("id",d.id));if(rv&&rv.trip_id)await sb.from("trips").delete().eq("id",rv.trip_id)}
   else ok(await sb.from("expenses").delete().eq("id",d.id));
   toast("Ligne supprimée.");await load();return}
  if(a==="opday"){if(d.vid)localStorage.setItem("tm-veh",d.vid);selDate=d.v||null;await load();return}
  if(a==="reopen"){const why=prompt("Motif de la correction (obligatoire) :");if(!why||!why.trim())return;ok(await sb.rpc("reopen_settlement",{sid:d.id,reason:why}),"Clôture rouverte. Le chauffeur est prévenu.");await load();return}
  if(a==="vst"){ok(await sb.from("vehicles").update({status:v("st"+d.i)}).eq("id",d.v),"Statut mis à jour.");await load();return}
  if(a==="mfaon"){const r=await sb.auth.mfa.enroll({factorType:"totp",friendlyName:"EDSP "+today()});if(r.error)throw r.error;mfaEnr={id:r.data.id,qr:r.data.totp.qr_code,secret:r.data.totp.secret};view();return}
  if(a==="mfacancel"){if(mfaEnr)await sb.auth.mfa.unenroll({factorId:mfaEnr.id});mfaEnr=null;view();return}
  if(a==="mfacf"){const c=await sb.auth.mfa.challenge({factorId:mfaEnr.id});if(c.error)throw c.error;const r=await sb.auth.mfa.verify({factorId:mfaEnr.id,challengeId:c.data.id,code:v("mc").trim()});if(r.error)throw r.error;mfaEnr=null;toast("Vérification en deux étapes activée.");await load();return}
  if(a==="mfaoff"){if(!confirm("Désactiver la vérification en deux étapes ?"))return;const r=await sb.auth.mfa.unenroll({factorId:d.f});if(r.error)throw r.error;toast("Désactivée.");await load();return}
  if(a==="mfaok"){const f=mfaStep.factorId,c=await sb.auth.mfa.challenge({factorId:f});if(c.error)throw c.error;const r=await sb.auth.mfa.verify({factorId:f,challengeId:c.data.id,code:v("mc").trim()});if(r.error)throw r.error;mfaStep=null;await load();return}
  if(a==="mfaout"){mfaStep=null;await sb.auth.signOut();user=null;view();return}
  if(a==="chpw"){const pw=v("cp1");if(pw.length<8){toast("8 caractères minimum.");return}ok(await sb.auth.updateUser({password:pw}),"Mot de passe changé.");return}
  if(a==="csv"){exportCsv();return}
  if(a==="ent"){const p=v("et").split("|"),am=Math.round(+v("ea"));if(!(am>0)){toast("Montant invalide.");return}const note=v("el").trim()||null;
   const it=p[0]==="rev"?{t:"revenues",row:{id:uid(),business_id:bid,shift_id:D.shift.id,amount:am,source:p[1]}}:{t:"expenses",row:{id:uid(),business_id:bid,shift_id:D.shift.id,vehicle_id:D.my.id,category:p[1],amount:am,note:note,created_by:user.id}};
   const lt=+v("eq");if(it.t==="expenses"&&lt>0&&(p[1]==="essence"||p[1]==="gasoil"))it.fuel={business_id:bid,expense_id:it.row.id,vehicle_id:D.my.id,liters:lt,price_per_liter:Math.round(am/lt*100)/100};
   let good=navigator.onLine;if(good){const r=await sb.from(it.t).insert(it.row);if(r.error){if(/fetch|network/i.test(r.error.message))good=false;else throw r.error}}
   if(good&&it.fuel)await sb.from("fuel_logs").insert(it.fuel);
   if(!good){qset(qget().concat(it));toast("Pas de réseau : saisie gardée sur le téléphone.");view();return}
   toast("Saisie enregistrée.");await load();return}
  if(a==="sub"){if(!confirm("Envoyer la clôture ? Tu ne pourras plus modifier la journée."))return;
   await flush();if(qget().length){toast("Des saisies attendent le réseau. Réessaie quand il revient.");return}
   ok(await sb.rpc("submit_settlement",{sid:D.shift.id}),"Clôture envoyée.");await load();return}
  if(a==="dp"){const am=Math.round(+v("da"));if(!(am>0)){toast("Montant invalide.");return}
   ok(await sb.from("payments").insert({id:uid(),business_id:bid,driver_id:user.id,kind:"owner_payment",method:v("dm"),amount:am,paid_by:user.id}),"Versement déclaré.");await load();return}
  if(a==="rpt"){ok(await sb.from("maintenance_orders").insert({business_id:bid,vehicle_id:D.my.id,kind:v("mk"),reported_by:user.id}),"Problème signalé.");return}
  if(a==="inc"){ok(await sb.from("incidents").insert({business_id:bid,vehicle_id:D.my.id,type:v("it"),severity:+v("is"),description:v("ix").trim()||null,reported_by:user.id}),"Incident déclaré.");return}
 });
});
$("out").onclick=()=>run($("out"),async()=>{
 if(qget().length&&!confirm("Des saisies ne sont pas encore envoyées. Si tu te déconnectes maintenant, elles seront perdues. Continuer ?"))return;
 await sb.auth.signOut();user=null;mems=[];bid=null;D={};scr="home";tab=null;recov=false;
 qset([]);try{localStorage.removeItem("tm-snap2");localStorage.removeItem("tm-biz")}catch(e){}view()});

addEventListener("offline",()=>{toast("Hors connexion : tes saisies seront gardées sur le téléphone.");view()});
document.addEventListener("change",e=>{if(e.target&&e.target.id==="sv"){localStorage.setItem("tm-veh",e.target.value);selDate=null;load()}});
addEventListener("online",()=>flush().then(load));
setInterval(()=>{if(!user||busy||document.hidden||!navigator.onLine)return;const f=document.activeElement;if(f&&/INPUT|SELECT|TEXTAREA/.test(f.tagName))return;
 if([...document.querySelectorAll("#main input")].some(i=>i.type!=="checkbox"&&i.value!==i.defaultValue))return;load()},15000);
addEventListener("visibilitychange",()=>{if(!document.hidden&&user&&!busy)load()});
if("serviceWorker" in navigator)addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
let lastAct=Date.now();["click","keydown","touchstart"].forEach(e=>addEventListener(e,()=>{lastAct=Date.now()},{passive:true}));
setInterval(async()=>{if(!user||busy||qget().length)return;if(Date.now()-lastAct>45*60e3){await sb.auth.signOut();user=null;mems=[];bid=null;D={};scr="home";tab=null;try{localStorage.removeItem("tm-snap2");localStorage.removeItem("tm-biz")}catch(e){}toast("Déconnecté après 45 minutes d’inactivité.");view()}},60000);
init();
