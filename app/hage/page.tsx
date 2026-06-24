export const metadata = { title: 'Hagekalender — Colletts gate 45' };

export default function HagePage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div dangerouslySetInnerHTML={{ __html: HTML }} />
      <script dangerouslySetInnerHTML={{ __html: JS }} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  background-color: #e9f1e1;
  background-image: radial-gradient(circle, rgba(44,96,48,.14) 1.5px, transparent 1.5px);
  background-size: 22px 22px;
  color: #26261f;
  min-height: 100vh;
  padding-bottom: 60px;
}
@keyframes pop { from { transform: scale(.95) translateY(8px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
@keyframes fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes toastin { from { transform: translate(-50%, 18px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
@keyframes spin { to { transform: rotate(360deg); } }

header { display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:18px clamp(16px,4vw,40px);max-width:1000px;margin:0 auto; }
.header-brand { display:flex;align-items:center;gap:12px;background:#fff;border-radius:18px;padding:10px 16px 10px 12px;box-shadow:0 4px 16px rgba(20,20,15,.08); }
.header-icon { width:42px;height:42px;border-radius:13px;background:#f7cf4d;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
.header-title { font-size:19px;font-weight:800;letter-spacing:-.4px;line-height:1.1; }
.header-sub { font-size:13px;color:#7a7971;font-weight:500;margin-top:3px; }
.header-spacer { flex:1;min-width:8px; }
.header-legend { display:flex;gap:16px;align-items:center;background:#fff;border-radius:16px;padding:11px 16px;box-shadow:0 4px 16px rgba(20,20,15,.08);flex-wrap:wrap; }
.legend-item { display:flex;align-items:center;gap:7px;font-size:13px;font-weight:600;color:#5a5950; }
.legend-dot { width:12px;height:12px;border-radius:4px; }
.main { max-width:1000px;margin:0 auto;padding:8px clamp(16px,4vw,40px) 0;display:flex;flex-direction:column;gap:22px; }
.garden-section { background:#fff;border-radius:22px;box-shadow:0 4px 20px rgba(20,20,15,.07);padding:clamp(16px,3vw,24px); }
.section-title-row { display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:14px; }
.section-title { font-size:17px;font-weight:800;letter-spacing:-.3px; }
.section-sub { font-size:14px;color:#9a988f;font-weight:500;text-transform:capitalize; }
.garden-map { position:relative;width:100%;max-width:560px;margin:0 auto;aspect-ratio:500/440;border-radius:18px;overflow:hidden;background:#a9d795;box-shadow:0 6px 20px rgba(20,20,15,.14),inset 0 0 0 1px rgba(255,255,255,.25); }
.garden-map svg { position:absolute;inset:0;width:100%;height:100%;display:block; }
.calendar-section { background:#fff;border-radius:22px;box-shadow:0 4px 20px rgba(20,20,15,.07);overflow:hidden; }
.calendar-nav { display:flex;align-items:center;gap:10px;padding:18px 20px 4px; }
.calendar-month-label { font-size:clamp(17px,3vw,21px);font-weight:800;flex:1;letter-spacing:-.4px; }
.btn-nav { border:1.5px solid #e7e4db;background:#fff;border-radius:11px;cursor:pointer;font-family:inherit;color:#26261f;transition:background .12s; }
.btn-nav:hover { background:#f7f6f1; }
.btn-today { padding:8px 15px;font-size:13px;font-weight:700; }
.btn-arrow { width:38px;height:38px;font-size:20px;display:flex;align-items:center;justify-content:center; }
.calendar-hint { padding:2px 20px 14px;font-size:13px;color:#9a988f;font-weight:500; }
.calendar-grid { display:grid;grid-template-columns:repeat(7,1fr);border-top:1px solid #ece9e0; }
.cal-header { padding:9px 4px;text-align:center;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#a6a49a;border-bottom:1px solid #ece9e0;background:#faf9f4; }
.cal-cell { position:relative;display:flex;flex-direction:column;gap:4px;align-items:stretch;min-height:clamp(64px,12vw,112px);padding:6px;cursor:pointer;border-right:1px solid #ece9e0;border-bottom:1px solid #ece9e0;background:#fff;transition:background .12s;overflow:hidden; }
.cal-cell:hover { background:#faf9f4; }
.cal-cell.selected { background:#fffaf0;box-shadow:inset 0 0 0 2.5px #f7cf4d; }
.cal-cell.dim { opacity:.38; }
.cal-num { align-self:flex-start;display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;font-size:clamp(11px,2.4vw,13px);font-weight:700;flex-shrink:0;color:#6f6e66; }
.cal-num.today { background:#26261f;color:#fff; }
.cal-num.sel-num { background:#f7cf4d;color:#26261f; }
.cal-chip { display:block;font-size:clamp(9px,1.5vw,11px);font-weight:600;line-height:1.35;border-radius:7px;padding:2px 7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
.notes-section h2 { font-size:17px;font-weight:800;letter-spacing:-.3px;margin:0 4px 14px; }
.notes-wrap { display:flex;flex-wrap:wrap;gap:16px; }
.sticky-note { position:relative;width:clamp(150px,30vw,196px);border-radius:16px;padding:18px 16px 16px;box-shadow:0 5px 16px rgba(20,20,15,.08);border-top:6px solid transparent; }
.note-delete { position:absolute;top:8px;right:8px;background:rgba(255,255,255,.6);border:none;cursor:pointer;color:#8a897f;padding:5px;border-radius:8px;display:flex;transition:color .15s,background .15s; }
.note-delete:hover { color:#e05a45;background:#fff; }
.note-zone { font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.6px; }
.note-date { font-size:14px;font-weight:600;color:#5a5950;text-transform:capitalize;margin-top:3px; }
.note-name { font-size:16px;font-weight:700;color:#26261f;margin-top:8px; }
.note-desc { font-size:13px;color:#6f6e66;margin-top:3px; }
.empty-state { background:#fff;border:2px dashed #e2dfd6;border-radius:18px;padding:36px 20px;text-align:center;color:#9a988f;font-size:14px;font-weight:500; }
.modal-overlay { position:fixed;inset:0;background:rgba(30,28,22,.42);display:flex;align-items:center;justify-content:center;z-index:100;padding:16px;animation:fade .18s ease; }
.modal-box { background:#fff;border-radius:24px;padding:22px;max-width:440px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 24px 70px rgba(20,20,15,.28);animation:pop .22s cubic-bezier(.16,1,.3,1); }
.modal-header { display:flex;align-items:flex-start;gap:12px;margin-bottom:16px; }
.modal-header-text { flex:1; }
.modal-eyebrow { font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#a6a49a; }
.modal-title { font-size:20px;font-weight:800;letter-spacing:-.3px;text-transform:capitalize;margin-top:2px; }
.btn-close { width:34px;height:34px;border-radius:10px;border:none;background:#f3f2ec;cursor:pointer;color:#6f6e66;font-size:18px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .12s; }
.btn-close:hover { background:#e8e6dd; }
.zone-cards { display:flex;flex-direction:column;gap:10px; }
.zone-card-modal { text-align:left;border-radius:15px;padding:14px 16px;display:flex;align-items:center;gap:13px;border:2px solid #e7e4db;background:#fff;cursor:pointer;transition:all .12s;width:100%;font-family:inherit; }
.zone-card-modal-dot { width:15px;height:15px;border-radius:5px;flex-shrink:0; }
.zone-card-modal-info { flex:1;min-width:0;text-align:left; }
.zone-card-modal-label { font-size:15px;font-weight:700;color:#26261f; }
.zone-card-modal-status { font-size:13px;font-weight:600;margin-top:1px; }
.zone-card-modal-note { font-size:12px;color:#8a897f;font-style:italic;margin-top:2px; }
.zone-card-check { font-weight:800;font-size:18px;flex-shrink:0; }
.zone-card-del { background:none;border:none;cursor:pointer;color:#bdbbb1;padding:6px;border-radius:9px;flex-shrink:0;display:flex;transition:color .15s,background .15s; }
.zone-card-del:hover { color:#e05a45;background:#faf0ee; }
.form-wrap { display:flex;flex-direction:column;gap:10px;margin-top:16px; }
.modal-input { width:100%;border:1.5px solid #e7e4db;border-radius:12px;padding:12px 14px;font-size:15px;font-family:inherit;color:#26261f;background:#faf9f4;outline:none;transition:border-color .15s,box-shadow .15s,background .15s; }
.modal-input:focus { border-color:#34a06a;background:#fff;box-shadow:0 0 0 3px rgba(52,160,106,.15); }
.modal-error { color:#c0392b;font-size:13px;font-weight:600; }
.btn-book { width:100%;border:none;border-radius:13px;padding:14px;font-size:15px;font-weight:700;font-family:inherit;cursor:pointer;color:#fff;transition:background .15s,opacity .15s; }
.btn-book:hover { opacity:.88; }
.fully-booked-note { margin-top:14px;background:#faf9f4;border-radius:12px;padding:14px;text-align:center;font-size:13px;font-weight:600;color:#8a897f; }
.toast { position:fixed;bottom:24px;left:50%;display:flex;align-items:center;gap:14px;background:#26261f;color:#fff;padding:12px 16px 12px 20px;border-radius:14px;font-size:14px;font-weight:600;z-index:200;box-shadow:0 10px 30px rgba(20,20,15,.3);animation:toastin .25s cubic-bezier(.16,1,.3,1); }
.btn-undo { background:#f7cf4d;color:#26261f;border:none;border-radius:9px;padding:6px 13px;font-size:13px;font-weight:700;font-family:inherit;cursor:pointer; }
.spinner { width:20px;height:20px;border:2.5px solid rgba(52,160,106,.25);border-top-color:#34a06a;border-radius:50%;animation:spin .7s linear infinite;margin:32px auto; }
`;

// ─────────────────────────────────────────────────────────────────────────────
const HTML = `
<header>
  <div class="header-brand">
    <div class="header-icon">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 4C7 7 5.5 12 8 17c4.5-1 7.5-5.5 8-13" stroke="#26261f" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M8 17c-1.4 2.2-1.6 4-1.6 5.2" stroke="#26261f" stroke-width="1.9" stroke-linecap="round"/>
      </svg>
    </div>
    <div>
      <div class="header-title">Hagekalender</div>
      <div class="header-sub">Book en dag i hagen i Colletts gate 45</div>
    </div>
  </div>
  <div class="header-spacer"></div>
  <div class="header-legend">
    <div class="legend-item"><span class="legend-dot" style="background:#34a06a"></span>Forhage</div>
    <div class="legend-item"><span class="legend-dot" style="background:#3f7fd6"></span>Bakhage</div>
    <div class="legend-item"><span class="legend-dot" style="background:#ef8244"></span>Hele hagen</div>
  </div>
</header>

<div class="main">
  <section class="notes-section">
    <h2>Kommende bestillinger</h2>
    <div id="notesList"><div class="spinner"></div></div>
  </section>

  <section class="garden-section">
    <div class="section-title-row">
      <h2 class="section-title">Hageoversikt</h2>
      <span class="section-sub" id="gardenDateLabel"></span>
    </div>
    <div class="garden-map">
      <svg viewBox="0 0 500 440" preserveAspectRatio="xMidYMid slice">
        <defs>
          <filter id="hsoft" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="5" stdDeviation="6" flood-color="#234521" flood-opacity="0.22"/></filter>
          <filter id="tsoft" x="-60%" y="-60%" width="220%" height="220%"><feDropShadow dx="0" dy="3" stdDeviation="3.5" flood-color="#234521" flood-opacity="0.20"/></filter>
          <clipPath id="roofclip"><rect x="104" y="150" width="292" height="110" rx="13"/></clipPath>
        </defs>
        <rect x="0" y="0" width="500" height="440" fill="#a9d795"/>
        <ellipse cx="120" cy="370" rx="170" ry="100" fill="#9bcf83" opacity="0.65"/>
        <ellipse cx="430" cy="120" rx="130" ry="100" fill="#9bcf83" opacity="0.55"/>
        <ellipse cx="250" cy="220" rx="240" ry="200" fill="#b2dc9f" opacity="0.45"/>
        <g opacity="0.45">
          <rect x="-46" y="-34" width="150" height="104" rx="12" transform="rotate(13 30 18)" fill="#cdbd99"/>
          <rect x="438" y="-26" width="150" height="104" rx="12" transform="rotate(-11 510 26)" fill="#b8b0a4"/>
          <rect x="-40" y="392" width="150" height="120" rx="12" transform="rotate(-8 35 452)" fill="#c2b496"/>
        </g>
        <rect x="11" y="11" width="478" height="418" rx="26" fill="none" stroke="#6fb55c" stroke-width="7" opacity="0.6"/>
        <g filter="url(#tsoft)">
          <rect x="58" y="256" width="78" height="48" rx="13" transform="rotate(40 97 280)" fill="#cda86d"/>
          <circle cx="84" cy="272" r="4" fill="#d98a6a"/>
          <circle cx="104" cy="282" r="4" fill="#e6b15c"/>
          <circle cx="94" cy="290" r="4" fill="#c97fa8"/>
        </g>
        <g filter="url(#tsoft)"><circle cx="446" cy="84" r="28" fill="#4f9e57"/><circle cx="441" cy="79" r="22" fill="#6fbf6a"/><circle cx="436" cy="74" r="11" fill="#8fd485"/></g>
        <g filter="url(#tsoft)"><circle cx="142" cy="408" r="21" fill="#4f9e57"/><circle cx="137" cy="403" r="16" fill="#6fbf6a"/><circle cx="132" cy="398" r="8" fill="#8fd485"/></g>
        <g filter="url(#tsoft)"><circle cx="42" cy="176" r="22" fill="#4f9e57"/><circle cx="37" cy="171" r="17" fill="#6fbf6a"/><circle cx="32" cy="166" r="8" fill="#8fd485"/></g>
        <g filter="url(#tsoft)"><circle cx="312" cy="30" r="18" fill="#4f9e57"/><circle cx="308" cy="26" r="14" fill="#6fbf6a"/><circle cx="304" cy="22" r="7" fill="#8fd485"/></g>
        <g transform="rotate(40 250 205)" filter="url(#hsoft)">
          <rect x="104" y="150" width="292" height="110" rx="13" fill="#9c4a30"/>
          <g clip-path="url(#roofclip)">
            <rect x="104" y="150" width="292" height="56" fill="#d9764f"/>
            <rect x="104" y="206" width="292" height="54" fill="#c2613e"/>
            <rect x="104" y="203" width="292" height="5" fill="#ef9a7b"/>
          </g>
          <rect x="150" y="170" width="22" height="13" rx="3" fill="#8f4329"/>
          <rect x="192" y="170" width="22" height="13" rx="3" fill="#8f4329"/>
          <rect x="234" y="170" width="22" height="13" rx="3" fill="#8f4329"/>
          <rect x="276" y="170" width="22" height="13" rx="3" fill="#8f4329"/>
          <rect x="158" y="226" width="22" height="13" rx="3" fill="#9c4f33"/>
          <rect x="200" y="226" width="22" height="13" rx="3" fill="#9c4f33"/>
          <rect x="242" y="226" width="22" height="13" rx="3" fill="#9c4f33"/>
          <rect x="178" y="195" width="15" height="17" rx="3" fill="#8a8079"/>
          <rect x="306" y="195" width="15" height="17" rx="3" fill="#8a8079"/>
          <rect x="356" y="250" width="50" height="44" rx="8" fill="#b35636"/>
          <rect x="356" y="250" width="50" height="6" fill="#cf6a44"/>
        </g>
        <g opacity="0.85">
          <rect x="392" y="320" width="16" height="14" rx="4" transform="rotate(40 400 327)" fill="#e8dcbb"/>
          <rect x="414" y="346" width="16" height="14" rx="4" transform="rotate(40 422 353)" fill="#e8dcbb"/>
          <rect x="436" y="372" width="16" height="14" rx="4" transform="rotate(40 444 379)" fill="#e8dcbb"/>
        </g>
      </svg>
      <div id="zoneCardBakhage" style="position:absolute;"></div>
      <div id="zoneCardForhage" style="position:absolute;"></div>
    </div>
  </section>

  <section class="calendar-section">
    <div class="calendar-nav">
      <h2 class="calendar-month-label" id="monthLabel"></h2>
      <button class="btn-nav btn-today" id="btnToday">I dag</button>
      <button class="btn-nav btn-arrow" id="btnPrev">&#8249;</button>
      <button class="btn-nav btn-arrow" id="btnNext">&#8250;</button>
    </div>
    <div class="calendar-hint">Trykk på en dag for å booke en sone</div>
    <div class="calendar-grid" id="calendarGrid"></div>
  </section>

</div>

<div id="modalOverlay" style="display:none;"></div>
<div id="toastEl" style="display:none;"></div>
`;

// ─────────────────────────────────────────────────────────────────────────────
const JS = `
const ZONES = {
  forhage: { key:'forhage', label:'Forhage',    solid:'#34a06a', light:'#dcefe3', text:'#1a6b43' },
  bakhage: { key:'bakhage', label:'Bakhage',    solid:'#3f7fd6', light:'#dde8fb', text:'#1d4f9c' },
  hele:    { key:'hele',    label:'Hele hagen', solid:'#ef8244', light:'#fce3d4', text:'#b1531f' },
};
const ORDER = ['forhage','bakhage','hele'];
const MONTHS = ['Januar','Februar','Mars','April','Mai','Juni','Juli','August','September','Oktober','November','Desember'];
const DAY_NAMES = ['Man','Tir','Ons','Tor','Fre','Lør','Søn'];

const state = {
  bookings: [],
  monthDate: startOfMonth(new Date()),
  selectedDate: toDateStr(new Date()),
  modalDate: null,
  formZone: null,
  formName: '',
  formDesc: '',
  error: '',
  toast: '',
  toastUndoable: false,
  lastDeleted: null,
  loading: true,
};
let toastTimer = null;

function toDateStr(d) {
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function todayStr() { return toDateStr(new Date()); }
function parseDate(ds) { return new Date(ds+'T12:00:00'); }

async function apiFetch(path, opts) {
  const r = await fetch(path, opts);
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || 'Noe gikk galt'); }
  return r.json();
}
async function loadBookings() {
  state.bookings = await apiFetch('/api/bookings');
  state.loading = false;
  try { state.formName = localStorage.getItem('hage_name') || ''; } catch(e) {}
  renderAll();
}

function bookingsFor(ds) { return state.bookings.filter(b => b.date === ds); }
function zoneInfo(ds) {
  const list = bookingsFor(ds);
  const f = list.find(b => b.zone==='forhage')||null;
  const k = list.find(b => b.zone==='bakhage')||null;
  const h = list.find(b => b.zone==='hele')||null;
  return { f, k, h, canBook:{ forhage:!f&&!h, bakhage:!k&&!h, hele:!f&&!k&&!h } };
}

function hexToRgba(hex, a) {
  const n = parseInt(hex.slice(1),16);
  return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+a+')';
}

function renderGarden() {
  const ds = state.selectedDate;
  document.getElementById('gardenDateLabel').textContent =
    parseDate(ds).toLocaleDateString('no',{weekday:'long',day:'numeric',month:'long'});
  renderZoneCard('bakhage','left:7%;top:10%;');
  renderZoneCard('forhage','right:7%;bottom:15%;');
}

function renderZoneCard(zoneKey, posStyle) {
  const m = ZONES[zoneKey];
  const info = zoneInfo(state.selectedDate);
  const own = zoneKey==='forhage' ? info.f : info.k;
  const h = info.h;
  const booked = !!(own||h);
  const byHele = !own && !!h;
  const accent = byHele ? ZONES.hele : m;
  const name = own ? own.name : (h ? h.name : '');
  const el = document.getElementById('zoneCard'+zoneKey.charAt(0).toUpperCase()+zoneKey.slice(1));
  el.style.cssText = 'position:absolute;'+posStyle+'display:flex;align-items:center;gap:9px;border-radius:14px;padding:9px 13px 9px 11px;box-shadow:0 6px 18px rgba(20,20,15,.30);cursor:pointer;transition:transform .14s ease;'+(booked?'background:'+accent.solid+';border:2px solid '+accent.solid+';':'background:rgba(255,255,255,.96);border:2px solid '+hexToRgba(m.solid,0.55)+';');
  el.innerHTML = '<span style="width:12px;height:12px;border-radius:50%;flex-shrink:0;background:'+(booked?'#fff':m.solid)+';"></span><div style="text-align:left;"><div style="font-size:clamp(13px,2.4vw,15px);font-weight:800;letter-spacing:-.2px;line-height:1.1;color:'+(booked?'#fff':m.text)+';">'+m.label+'</div><div style="font-size:clamp(10px,1.8vw,12px);font-weight:600;margin-top:1px;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:'+(booked?'rgba(255,255,255,.92)':'#6f6e66')+';">'+(booked?(byHele?'Hele hagen · '+name:name):'Ledig')+'</div></div>';
  el.onclick = () => openZoneFromMap(zoneKey);
}

function renderCalendar() {
  document.getElementById('monthLabel').textContent = MONTHS[state.monthDate.getMonth()]+' '+state.monthDate.getFullYear();
  const grid = document.getElementById('calendarGrid');
  grid.innerHTML = '';
  DAY_NAMES.forEach(d => { const h=document.createElement('div');h.className='cal-header';h.textContent=d;grid.appendChild(h); });
  const year=state.monthDate.getFullYear(), month=state.monthDate.getMonth();
  const first=new Date(year,month,1);
  const dow=(first.getDay()+6)%7;
  const daysInMonth=new Date(year,month+1,0).getDate();
  const numCells=Math.ceil((dow+daysInMonth)/7)*7;
  const today=todayStr();
  for(let i=0;i<numCells;i++){
    const cur=new Date(year,month,1-dow+i);
    const ds=toDateStr(cur);
    const inMonth=cur.getMonth()===month;
    const isToday=ds===today, isSel=ds===state.selectedDate;
    const cell=document.createElement('div');
    cell.className='cal-cell'+(isSel?' selected':'')+((!inMonth)?' dim':'');
    const num=document.createElement('span');
    num.className='cal-num'+(isToday?' today':(isSel?' sel-num':''));
    num.textContent=cur.getDate();
    cell.appendChild(num);
    const chips=document.createElement('div');
    chips.style.cssText='display:flex;flex-direction:column;gap:2px;';
    ORDER.forEach(z=>{
      const b=bookingsFor(ds).find(x=>x.zone===z);
      if(!b)return;
      const m=ZONES[z];
      const chip=document.createElement('span');
      chip.className='cal-chip';
      chip.style.cssText='background:'+m.light+';color:'+m.text+';';
      chip.textContent=z==='hele'?('Hele · '+b.name):b.name;
      chips.appendChild(chip);
    });
    cell.appendChild(chips);
    cell.addEventListener('click',()=>openDay(ds));
    grid.appendChild(cell);
  }
}

function renderNotes() {
  const container=document.getElementById('notesList');
  if(state.loading){container.innerHTML='<div class="spinner"></div>';return;}
  const today=todayStr();
  const upcoming=state.bookings.filter(b=>b.date>=today).sort((a,b)=>(a.date+a.zone).localeCompare(b.date+b.zone));
  if(!upcoming.length){container.innerHTML='<div class="empty-state">Ingen kommende bestillinger ennå — trykk på en dag i kalenderen for å booke.</div>';return;}
  container.innerHTML='';
  const wrap=document.createElement('div');wrap.className='notes-wrap';
  upcoming.forEach((b,i)=>{
    const m=ZONES[b.zone];
    const rot=((i%3)-1)*1.1;
    const note=document.createElement('div');
    note.className='sticky-note';
    note.style.cssText='background:'+m.light+';transform:rotate('+rot+'deg);border-top-color:'+m.solid+';';
    const del=document.createElement('button');del.className='note-delete';del.title='Slett';
    del.innerHTML='<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M6 4V3h4v1M5 4l.5 9h5L11 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    del.addEventListener('click',()=>deleteBooking(b.id));
    const zone=document.createElement('div');zone.className='note-zone';zone.style.color=m.text;zone.textContent=m.label;
    const dateEl=document.createElement('div');dateEl.className='note-date';dateEl.textContent=parseDate(b.date).toLocaleDateString('no',{weekday:'short',day:'numeric',month:'short'});
    const nameEl=document.createElement('div');nameEl.className='note-name';nameEl.textContent=b.name;
    note.appendChild(del);note.appendChild(zone);note.appendChild(dateEl);note.appendChild(nameEl);
    if(b.desc){const d=document.createElement('div');d.className='note-desc';d.textContent=b.desc;note.appendChild(d);}
    wrap.appendChild(note);
  });
  container.appendChild(wrap);
}

function getSavedName(){try{return localStorage.getItem('hage_name')||state.formName;}catch(e){return state.formName;}}

function openDay(ds){
  state.modalDate=ds;state.selectedDate=ds;state.formZone=null;state.error='';
  state.formName=getSavedName();state.formDesc='';
  renderAll();showModal();
}
function openZoneFromMap(zoneKey){
  const ds=state.selectedDate;
  const info=zoneInfo(ds);
  state.modalDate=ds;state.formZone=info.canBook[zoneKey]?zoneKey:null;state.error='';
  state.formName=getSavedName();state.formDesc='';
  renderAll();showModal();
}
function closeModal(){
  state.modalDate=null;state.error='';state.formZone=null;
  document.getElementById('modalOverlay').style.display='none';
  document.getElementById('modalOverlay').innerHTML='';
  renderAll();
}

function showModal(){
  const ds=state.modalDate;if(!ds)return;
  const info=zoneInfo(ds);
  const d=parseDate(ds);
  const anyFree=ORDER.some(z=>info.canBook[z]);
  const overlay=document.getElementById('modalOverlay');
  overlay.style.display='flex';overlay.className='modal-overlay';overlay.onclick=closeModal;
  const box=document.createElement('div');box.className='modal-box';box.onclick=e=>e.stopPropagation();
  const hdr=document.createElement('div');hdr.className='modal-header';
  hdr.innerHTML='<div class="modal-header-text"><div class="modal-eyebrow">Book en sone</div><div class="modal-title">'+d.toLocaleDateString('no',{weekday:'long',day:'numeric',month:'long'})+'</div></div><button class="btn-close" id="btnClose">✕</button>';
  box.appendChild(hdr);
  const cards=document.createElement('div');cards.className='zone-cards';
  ORDER.forEach(z=>{
    const m=ZONES[z];const isSel=state.formZone===z;
    let status='free',booking=null,reason='';
    if(z==='hele'){if(info.h){status='booked';booking=info.h;}else if(info.f||info.k){status='blocked';reason='Deler av hagen er allerede booket';}}
    else{const own=z==='forhage'?info.f:info.k;if(own){status='booked';booking=own;}else if(info.h){status='blocked';reason='Hele hagen er booket';}}
    const free=status==='free';
    const card=document.createElement('button');card.className='zone-card-modal';
    card.style.cssText='border-color:'+(free?(isSel?m.solid:'#e7e4db'):(status==='booked'?m.light:'#efece4'))+';background:'+(isSel?m.light:(status==='booked'?m.light:'#fff'))+';cursor:'+(free?'pointer':'default')+';opacity:'+(status==='blocked'?0.6:1)+';';
    const statusText=status==='booked'?('Booket av '+booking.name):(status==='blocked'?reason:'Ledig — trykk for å velge');
    card.innerHTML='<span class="zone-card-modal-dot" style="background:'+m.solid+';"></span><div class="zone-card-modal-info"><div class="zone-card-modal-label">'+m.label+'</div><div class="zone-card-modal-status" style="color:'+(free?m.text:'#8a897f')+';">'+statusText+'</div>'+(status==='booked'&&booking&&booking.desc?'<div class="zone-card-modal-note">'+booking.desc+'</div>':'')+' </div>'+(isSel?'<span class="zone-card-check" style="color:'+m.solid+';">✓</span>':'');
    if(free){card.addEventListener('click',()=>{state.formZone=state.formZone===z?null:z;state.error='';showModal();});}
    if(status==='booked'&&booking){
      const del=document.createElement('button');del.className='zone-card-del';del.title='Slett';
      del.innerHTML='<svg width="17" height="17" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M6 4V3h4v1M5 4l.5 9h5L11 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      del.addEventListener('click',e=>{e.stopPropagation();deleteBooking(booking.id);});
      card.appendChild(del);
    }
    cards.appendChild(card);
  });
  box.appendChild(cards);
  if(anyFree){
    const form=document.createElement('div');form.className='form-wrap';
    const ni=document.createElement('input');ni.className='modal-input';ni.type='text';ni.placeholder='Navnet ditt';ni.value=state.formName;ni.addEventListener('input',e=>{state.formName=e.target.value;});
    const di=document.createElement('input');di.className='modal-input';di.type='text';di.placeholder='Notat (valgfritt) – f.eks. grilling med venner';di.value=state.formDesc;di.addEventListener('input',e=>{state.formDesc=e.target.value;});
    form.appendChild(ni);form.appendChild(di);
    if(state.error){const err=document.createElement('div');err.className='modal-error';err.textContent=state.error;form.appendChild(err);}
    const sm=state.formZone?ZONES[state.formZone]:null;
    const btn=document.createElement('button');btn.className='btn-book';btn.style.background=sm?sm.solid:'#cdcabf';btn.textContent=sm?('Book '+sm.label):'Velg en ledig sone over';
    btn.addEventListener('click',submitBooking);
    form.appendChild(btn);
    box.appendChild(form);
  } else {
    const fb=document.createElement('div');fb.className='fully-booked-note';fb.textContent='Alt er booket denne dagen. Slett en bestilling for å frigjøre en sone.';box.appendChild(fb);
  }
  overlay.innerHTML='';overlay.appendChild(box);
  document.getElementById('btnClose').addEventListener('click',closeModal);
  setTimeout(()=>{const ni=overlay.querySelector('.modal-input');if(ni)ni.focus();},50);
}

async function submitBooking(){
  const {modalDate,formZone,formDesc}=state;
  const nm=(state.formName||'').trim();
  if(!formZone){state.error='Velg en ledig sone.';showModal();return;}
  if(!nm){state.error='Skriv inn navnet ditt.';showModal();return;}
  const booking={id:Date.now().toString(),zone:formZone,date:modalDate,name:nm,desc:(formDesc||'').trim()};
  try {
    const saved = await apiFetch('/api/bookings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(booking)});
    state.bookings=[...state.bookings,saved];
    try{localStorage.setItem('hage_name',nm);}catch(e){}
    state.modalDate=null;state.formZone=null;state.formDesc='';
    document.getElementById('modalOverlay').style.display='none';document.getElementById('modalOverlay').innerHTML='';
    renderAll();flash('Plassen er booket 🌿',false);
  } catch(e) {
    state.error=e.message;showModal();
  }
}

async function deleteBooking(id){
  const b=state.bookings.find(x=>x.id===id);
  try {
    await apiFetch('/api/bookings?id='+id,{method:'DELETE'});
    state.bookings=state.bookings.filter(x=>x.id!==id);
    state.lastDeleted=b;
    closeModal();renderAll();flash('Bestilling slettet',true);
  } catch(e) {
    flash(e.message,false);
  }
}

async function undoDelete(){
  const b=state.lastDeleted;if(!b)return;
  try {
    const saved=await apiFetch('/api/bookings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});
    state.bookings=[...state.bookings,saved];
    state.lastDeleted=null;
    if(toastTimer)clearTimeout(toastTimer);
    hideToast();renderAll();
  } catch(e) { flash(e.message,false); }
}

function flash(msg,undoable){
  state.toast=msg;state.toastUndoable=undoable;showToast();
  if(toastTimer)clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>{state.lastDeleted=null;hideToast();},undoable?5000:2500);
}
function showToast(){
  const el=document.getElementById('toastEl');el.style.display='flex';el.className='toast';
  el.innerHTML='<span>'+state.toast+'</span>';
  if(state.toastUndoable){const btn=document.createElement('button');btn.className='btn-undo';btn.textContent='Angre';btn.addEventListener('click',undoDelete);el.appendChild(btn);}
}
function hideToast(){const el=document.getElementById('toastEl');el.style.display='none';el.innerHTML='';}

function renderAll(){renderGarden();renderCalendar();renderNotes();}

document.getElementById('btnPrev').addEventListener('click',()=>{const d=state.monthDate;state.monthDate=new Date(d.getFullYear(),d.getMonth()-1,1);renderAll();});
document.getElementById('btnNext').addEventListener('click',()=>{const d=state.monthDate;state.monthDate=new Date(d.getFullYear(),d.getMonth()+1,1);renderAll();});
document.getElementById('btnToday').addEventListener('click',()=>{const t=new Date();state.monthDate=startOfMonth(t);state.selectedDate=toDateStr(t);renderAll();});

renderAll();
loadBookings();
`;
