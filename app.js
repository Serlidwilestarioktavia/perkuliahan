const cfgReady = window.SUPABASE_URL && !window.SUPABASE_URL.includes("PASTE_") &&
  window.SUPABASE_ANON_KEY && !window.SUPABASE_ANON_KEY.includes("PASTE_");
const sb = cfgReady ? supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY) : null;

const state = { user:null, items:[] };
const DAYS = ["", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const toast = (msg, ok=true) => {
  const t=$("toast");
  t.textContent=msg;
  t.className=ok?"show ok":"show err";
  setTimeout(()=>t.className="",2800);
};

function localISO(date = new Date()){
  const y=date.getFullYear();
  const m=String(date.getMonth()+1).padStart(2,"0");
  const d=String(date.getDate()).padStart(2,"0");
  return `${y}-${m}-${d}`;
}

function todayISO(){ return localISO(); }

function fmtDate(d){
  if(!d)return "-";
  return new Date(d+"T00:00:00").toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"});
}

function daysLeft(d){
  return Math.ceil((new Date(d+"T23:59:59")-new Date())/86400000);
}

function getDayNumber(date){
  const day = new Date(date+"T00:00:00").getDay();
  return day === 0 ? 7 : day;
}

function nextDateForDay(dayNumber){
  const today = new Date();
  today.setHours(0,0,0,0);
  const current = getDayNumber(localISO(today));
  let diff = Number(dayNumber) - current;
  if(diff < 0) diff += 7;
  const result = new Date(today);
  result.setDate(today.getDate()+diff);
  return localISO(result);
}

function nextOccurrence(item){
  if((item.category==="kuliah" || item.category==="praktikum") && item.day_of_week){
    return nextDateForDay(item.day_of_week);
  }
  return item.date;
}

function dayLabel(item){
  if((item.category==="kuliah" || item.category==="praktikum") && item.day_of_week){
    return `Setiap ${DAYS[item.day_of_week]}`;
  }
  return fmtDate(item.date);
}

function setScheduleFields(type, item=null){
  const recurring = type==="kuliah" || type==="praktikum";
  $("recurringWrap").classList.toggle("hidden", !recurring);
  $("dateWrap").classList.toggle("hidden", recurring);
  $("statusWrap").classList.toggle("hidden", type!=="tugas");

  if(recurring){
    let day = item?.day_of_week || (item?.date ? getDayNumber(item.date) : 1);
    $("fDay").value = String(day);
  }
}

async function init(){
  $("today").textContent = new Intl.DateTimeFormat("id-ID",{dateStyle:"full"}).format(new Date());
  if(!sb){
    showAuth();
    toast("Isi config.js dengan URL dan publishable/anon key Supabase.",false);
    return;
  }
  const {data:{session}} = await sb.auth.getSession();
  if(session) await enterApp(session.user);
  else showAuth();

  sb.auth.onAuthStateChange(async (_event, session)=>{
    if(session) await enterApp(session.user);
    else showAuth();
  });
}

function showAuth(){
  $("authView").classList.remove("hidden");
  $("appView").classList.add("hidden");
}

async function enterApp(user){
  state.user=user;
  $("authView").classList.add("hidden");
  $("appView").classList.remove("hidden");
  $("userEmail").textContent=user.email||"";
  $("userName").textContent=user.user_metadata?.full_name || user.email?.split("@")[0] || "Mahasiswa";
  $("userAvatar").textContent=($("userName").textContent[0]||"U").toUpperCase();
  await loadItems();
  renderAll();
}

$("showRegister").onclick=()=>{
  $("loginBox").classList.add("hidden");
  $("registerBox").classList.remove("hidden");
};

$("showLogin").onclick=()=>{
  $("registerBox").classList.add("hidden");
  $("loginBox").classList.remove("hidden");
};

$("loginForm").onsubmit=async e=>{
  e.preventDefault();
  if(!sb)return;
  const {error}=await sb.auth.signInWithPassword({
    email:$("loginEmail").value,
    password:$("loginPassword").value
  });
  if(error) toast(error.message,false);
};

$("registerForm").onsubmit=async e=>{
  e.preventDefault();
  if(!sb)return;
  const {error}=await sb.auth.signUp({
    email:$("regEmail").value,
    password:$("regPassword").value,
    options:{data:{full_name:$("regName").value}}
  });
  if(error) toast(error.message,false);
  else toast("Akun berhasil dibuat. Cek email jika konfirmasi email aktif.");
};

$("logout").onclick=()=>sb?.auth.signOut();

async function loadItems(){
  const {data,error}=await sb
    .from("academic_items")
    .select("*")
    .order("date",{ascending:true})
    .order("time",{ascending:true});

  if(error){
    toast(error.message,false);
    return;
  }
  state.items=data||[];
}

async function saveItem(data,id){
  const payload={...data,user_id:state.user.id};

  let result = id
    ? await sb.from("academic_items").update(payload).eq("id",id).eq("user_id",state.user.id)
    : await sb.from("academic_items").insert(payload);

  if(result.error){
    toast(result.error.message,false);
  }else{
    toast("Data tersimpan");
    await loadItems();
    renderAll();
  }
}

async function deleteItem(id){
  if(!confirm("Hapus data ini?"))return;

  const {error}=await sb
    .from("academic_items")
    .delete()
    .eq("id",id)
    .eq("user_id",state.user.id);

  if(error) toast(error.message,false);
  else{
    toast("Data dihapus");
    await loadItems();
    renderAll();
  }
}

function openModal(type="kuliah",item=null){
  $("itemDialog").showModal();
  $("modalTitle").textContent=item?"Edit Data":"Tambah Data";
  $("editId").value=item?.id||"";
  $("itemType").value=type;

  $("fTitle").value=item?.title||"";
  $("fTime").value=item?.time||"";
  $("fCategory").value=item?.category||type;
  $("fLocation").value=item?.location||"";
  $("fNote").value=item?.note||"";
  $("fStatus").value=item?.status||"belum";

  $("fDate").value=item?.date||todayISO();
  setScheduleFields(type,item);
}

$("fCategory").onchange=()=>{
  setScheduleFields($("fCategory").value);
};

$("itemForm").onsubmit=async e=>{
  e.preventDefault();

  const id=$("editId").value;
  const category=$("fCategory").value;
  const recurring = category==="kuliah" || category==="praktikum";

  if(recurring && !$("fDay").value){
    toast("Pilih hari terlebih dahulu.",false);
    return;
  }

  const dayOfWeek = recurring ? Number($("fDay").value) : null;
  const date = recurring ? nextDateForDay(dayOfWeek) : $("fDate").value;

  await saveItem({
    title:$("fTitle").value,
    date,
    time:$("fTime").value,
    category,
    day_of_week:dayOfWeek,
    location:$("fLocation").value,
    note:$("fNote").value,
    status:category==="tugas" ? $("fStatus").value : "belum"
  },id);

  $("itemDialog").close();
};

function renderAll(){
  renderDashboard();
  renderList("jadwal","kuliah","Jadwal Kuliah");
  renderList("praktikum","praktikum","Praktikum");
  renderTasks();
}

function card(i){
  const date = nextOccurrence(i);
  const left=daysLeft(date);
  const urgency=left<0?"terlambat":left===0?"hari ini":left===1?"besok":`${left} hari`;
  const schedule = (i.category==="kuliah" || i.category==="praktikum")
    ? `📅 ${esc(dayLabel(i))}`
    : `📅 ${esc(fmtDate(i.date))}`;

  return `<article class="item-card">
    <div class="itemtop">
      <span class="badge ${i.category}">${esc(i.category)}</span>
      <span class="datebadge">${schedule}</span>
    </div>
    <h3>${esc(i.title)}</h3>
    <p class="meta">🕐 ${esc(i.time||"-")} &nbsp; 📍 ${esc(i.location||"-")}</p>
    ${i.note?`<p class="note">${esc(i.note)}</p>`:""}
    <div class="itembottom">
      <span class="${left<=1?'urgent':''}">⏳ ${urgency}</span>
      <div>
        <button class="small" onclick='editItem(${JSON.stringify(i.id)})'>Edit</button>
        <button class="small danger" onclick='deleteItem(${JSON.stringify(i.id)})'>Hapus</button>
      </div>
    </div>
  </article>`;
}

function renderList(id,type,title){
  const list=state.items
    .filter(x=>x.category===type)
    .sort((a,b)=>(nextOccurrence(a)+(a.time||"")).localeCompare(nextOccurrence(b)+(b.time||"")));

  $(id).innerHTML=`
    <div class="pagehead">
      <div>
        <h1>${title}</h1>
        <p>${type==="kuliah" || type==="praktikum"
          ? "Masukkan jadwal satu kali, lalu pilih harinya. Jadwal akan berulang setiap minggu."
          : `Kelola data ${title.toLowerCase()} Anda.`}
        </p>
      </div>
      <button class="primary" onclick="openModal('${type}')">＋ Tambah</button>
    </div>
    <div class="cards">
      ${list.length
        ? list.map(card).join("")
        : `<div class="empty">Belum ada data. Klik <b>＋ Tambah</b> untuk memasukkan data.</div>`}
    </div>`;
}

function renderTasks(){
  const list=state.items
    .filter(x=>x.category==="tugas")
    .sort((a,b)=>a.date.localeCompare(b.date));

  $("tugas").innerHTML=`
    <div class="pagehead">
      <div>
        <h1>Tugas & Deadline</h1>
        <p>Pantau semua tugas dan batas pengumpulan.</p>
      </div>
      <button class="primary" onclick="openModal('tugas')">＋ Tambah Tugas</button>
    </div>
    <div class="cards">
      ${list.length
        ? list.map(card).join("")
        : `<div class="empty">Belum ada tugas.</div>`}
    </div>`;
}

function renderDashboard(){
  const today=todayISO();

  const todayItems=state.items.filter(x=>nextOccurrence(x)===today);

  const tasks=state.items
    .filter(x=>x.category==="tugas"&&x.status!=="selesai"&&daysLeft(x.date)>=0)
    .sort((a,b)=>a.date.localeCompare(b.date));

  const upcoming=state.items
    .filter(x=>nextOccurrence(x)>=today)
    .sort((a,b)=>(nextOccurrence(a)+(a.time||"")).localeCompare(nextOccurrence(b)+(b.time||"")))
    .slice(0,5);

  $("dashboard").innerHTML=`
    <div class="welcome">
      <div>
        <h1>Halo, ${esc(state.user?.user_metadata?.full_name||state.user?.email?.split("@")[0]||"Mahasiswa")} 👋</h1>
        <p>Ini ringkasan aktivitas perkuliahan kamu.</p>
      </div>
      <button class="primary" onclick="openModal('kuliah')">＋ Tambah Jadwal</button>
    </div>

    <div class="stats">
      <div><span>📅</span><b>${todayItems.length}</b><small>Agenda hari ini</small></div>
      <div><span>📝</span><b>${tasks.length}</b><small>Tugas aktif</small></div>
      <div><span>🧪</span><b>${state.items.filter(x=>x.category==="praktikum").length}</b><small>Praktikum</small></div>
      <div><span>📚</span><b>${state.items.filter(x=>x.category==="kuliah").length}</b><small>Jadwal kuliah</small></div>
    </div>

    <div class="dashboard-grid">
      <section class="panel">
        <div class="panelhead">
          <h2>Agenda Mendatang</h2>
          <button class="link" onclick="go('jadwal')">Lihat semua</button>
        </div>
        ${upcoming.length
          ? upcoming.map(i=>`
            <div class="agenda">
              <div class="day">${new Date(nextOccurrence(i)+"T00:00").toLocaleDateString("id-ID",{day:"2-digit",month:"short"})}</div>
              <div>
                <b>${esc(i.title)}</b>
                <small>${esc(i.time||"-")} · ${esc(i.location||"-")} · ${i.category==="kuliah"||i.category==="praktikum"?esc(DAYS[i.day_of_week]||""):""}</small>
              </div>
              <span class="badge ${i.category}">${esc(i.category)}</span>
            </div>`).join("")
          : `<div class="empty">Belum ada agenda.</div>`}
      </section>

      <section class="panel">
        <div class="panelhead">
          <h2>Deadline Terdekat</h2>
          <button class="link" onclick="go('tugas')">Lihat semua</button>
        </div>
        ${tasks.slice(0,5).map(i=>`
          <div class="deadline">
            <div><b>${esc(i.title)}</b><small>${fmtDate(i.date)}</small></div>
            <strong class="${daysLeft(i.date)<=1?'urgent':''}">
              ${daysLeft(i.date)===0?"Hari ini":daysLeft(i.date)===1?"Besok":daysLeft(i.date)+" hari"}
            </strong>
          </div>`).join("")
          || `<div class="empty">Tidak ada deadline aktif.</div>`}
      </section>
    </div>`;
}

function editItem(id){
  const i=state.items.find(x=>x.id===id);
  if(i) openModal(i.category,i);
}

window.editItem=editItem;
window.deleteItem=deleteItem;
window.openModal=openModal;

function go(page){
  document.querySelectorAll(".page").forEach(x=>x.classList.add("hidden"));
  $(page).classList.remove("hidden");
  document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.page===page));
  $("pageTitle").textContent={dashboard:"Dashboard",jadwal:"Jadwal Kuliah",praktikum:"Praktikum",tugas:"Tugas & Deadline"}[page];
  document.querySelector(".sidebar").classList.remove("open");
}

document.querySelectorAll(".nav").forEach(n=>n.onclick=()=>go(n.dataset.page));
$("mobileMenu").onclick=()=>document.querySelector(".sidebar").classList.toggle("open");

init();
