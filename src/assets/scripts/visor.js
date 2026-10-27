/* =========================================================
   XandA — Visor
   Simulador responsivo para probar diseños en distintos dispositivos.
   ========================================================= */

/* ============ Header (identidad XandA) ============ */
const siteHeader = document.querySelector('.site-header');
if(siteHeader){
    const onScroll = () => siteHeader.classList.toggle('is-stuck', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
}

const menuBtn = document.getElementById('menuBtn');
const nav = document.getElementById('nav');
if(menuBtn && nav){
    function setMenu(open){
        nav.classList.toggle('is-open', open);
        menuBtn.setAttribute('aria-expanded', String(open));
        menuBtn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    }
    menuBtn.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
    nav.addEventListener('click', e => { if(e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', e => { if(e.key === 'Escape') setMenu(false); });
}

const yearEl = document.getElementById('year');
if(yearEl) yearEl.textContent = new Date().getFullYear();

/* ============ Visor core ============ */

const typeIcons = {
    phone:'<rect x="6" y="2" width="12" height="20" rx="3"/><line x1="9" y1="18.5" x2="15" y2="18.5"/>',
    foldable:'<rect x="6" y="2" width="12" height="20" rx="3"/><line x1="12" y1="4" x2="12" y2="20" stroke-dasharray="2 2"/>',
    tablet:'<rect x="4" y="2" width="16" height="20" rx="2.5"/><line x1="10" y1="19.5" x2="14" y2="19.5"/>',
    laptop:'<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M2 19h20l-1.5-3h-17z"/>',
    desktop:'<rect x="3" y="3" width="18" height="12" rx="1.5"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="15" x2="12" y2="21"/>',
    watch:'<rect x="7" y="8" width="10" height="8" rx="2.5"/><path d="M9 8V5.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V8"/><path d="M9 16v2.5a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V16"/>',
    'watch-round':'<circle cx="12" cy="12" r="6.5"/><path d="M9 8V5.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V8"/><path d="M9 16v2.5a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V16"/>',
    tv:'<rect x="2" y="4" width="20" height="12" rx="1.5"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="16" x2="12" y2="20"/>',
    custom:'<rect x="2" y="4" width="20" height="16" rx="2"/><line x1="2" y1="9" x2="22" y2="9"/>'
};

const HEART_PATH = 'M12 21s-6.9-4.35-9.5-8.3C0.6 9.6 1.5 5.9 4.7 4.6c2.4-1 5-0.2 7.3 2.1 2.3-2.3 4.9-3.1 7.3-2.1 3.2 1.3 4.1 5 2.2 8.1C18.9 16.65 12 21 12 21z';

const categories = [
    { id:'all', label:'Todos' },
    { id:'favorites', label:'♥ Favoritos' },
    { id:'generic', label:'Genéricos' },
    { id:'phone', label:'Celulares' },
    { id:'tablet', label:'Tablets' },
    { id:'computer', label:'Computadoras' },
    { id:'watch', label:'Relojes' }
];

const devices = [
    // ---- GENÉRICOS ----
    { id:'gen-phone', name:'Celular genérico', category:'generic', type:'phone', w:390, h:844, glow:210, bezel:14, notch:'punch' },
    { id:'gen-tablet', name:'Tablet genérica', category:'generic', type:'tablet', w:820, h:1180, glow:260, bezel:17 },
    { id:'gen-laptop', name:'Laptop genérica', category:'generic', type:'laptop', w:1280, h:800, glow:260, bezel:13 },
    { id:'gen-desktop', name:'Computadora genérica', category:'generic', type:'desktop', w:1600, h:900, glow:280, bezel:20 },
    { id:'gen-watch', name:'Reloj genérico', category:'generic', type:'watch', w:198, h:242, glow:180, bezel:11 },
    { id:'gen-tv', name:'Televisor', category:'generic', type:'tv', w:1600, h:900, glow:320, bezel:8 },

    // ---- CELULARES: Apple ----
    { id:'iphone-se', name:'iPhone SE', brand:'Apple', category:'phone', type:'phone', w:375, h:667, glow:200, bezel:20, notch:'none' },
    { id:'iphone-15', name:'iPhone 15', brand:'Apple', category:'phone', type:'phone', w:393, h:852, glow:210, bezel:12, notch:'island' },
    { id:'iphone-15-pro-max', name:'iPhone 15 Pro Max', brand:'Apple', category:'phone', type:'phone', w:430, h:932, glow:220, bezel:10, notch:'island' },
    { id:'iphone-16', name:'iPhone 16', brand:'Apple', category:'phone', type:'phone', w:393, h:852, glow:210, bezel:11, notch:'island' },
    { id:'iphone-16-plus', name:'iPhone 16 Plus', brand:'Apple', category:'phone', type:'phone', w:430, h:932, glow:220, bezel:11, notch:'island' },
    { id:'iphone-16-pro', name:'iPhone 16 Pro', brand:'Apple', category:'phone', type:'phone', w:402, h:874, glow:215, bezel:9, notch:'island' },
    { id:'iphone-16-pro-max', name:'iPhone 16 Pro Max', brand:'Apple', category:'phone', type:'phone', w:440, h:956, glow:225, bezel:9, notch:'island' },
    { id:'iphone-17', name:'iPhone 17 / 17 Pro (aprox.)', brand:'Apple', category:'phone', type:'phone', w:402, h:874, glow:215, bezel:8, notch:'island' },
    { id:'iphone-17-pro-max', name:'iPhone 17 Pro Max (aprox.)', brand:'Apple', category:'phone', type:'phone', w:440, h:956, glow:225, bezel:8, notch:'island' },
    { id:'iphone-air', name:'iPhone Air (aprox.)', brand:'Apple', category:'phone', type:'phone', w:420, h:912, glow:220, bezel:7, notch:'island' },

    // ---- CELULARES: Samsung / Google ----
    { id:'galaxy-s24-ultra', name:'Galaxy S24 Ultra', brand:'Samsung', category:'phone', type:'phone', w:384, h:824, glow:210, bezel:9, notch:'punch' },
    { id:'galaxy-s23', name:'Galaxy S23', brand:'Samsung', category:'phone', type:'phone', w:360, h:780, glow:205, bezel:12, notch:'punch' },
    { id:'pixel-8-pro', name:'Pixel 8 Pro', brand:'Google', category:'phone', type:'phone', w:412, h:892, glow:215, bezel:10, notch:'punch' },

    // ---- PLEGABLES ----
    { id:'galaxy-z-fold6', name:'Galaxy Z Fold6 (pantalla interna, aprox.)', brand:'Samsung', category:'phone', type:'foldable', fold:'book', w:772, h:832, glow:250, bezel:14 },
    { id:'galaxy-z-flip6', name:'Galaxy Z Flip6 (aprox.)', brand:'Samsung', category:'phone', type:'foldable', fold:'clamshell', notch:'punch', w:342, h:748, glow:210, bezel:14 },
    { id:'pixel-fold', name:'Pixel Fold (pantalla interna, aprox.)', brand:'Google', category:'phone', type:'foldable', fold:'book', w:840, h:700, glow:255, bezel:15 },

    // ---- TABLETS ----
    { id:'ipad-mini', name:'iPad Mini', brand:'Apple', category:'tablet', type:'tablet', w:744, h:1133, glow:250, bezel:16 },
    { id:'ipad-air', name:'iPad Air 11"', brand:'Apple', category:'tablet', type:'tablet', w:820, h:1180, glow:260, bezel:14 },
    { id:'ipad-pro-11', name:'iPad Pro 11"', brand:'Apple', category:'tablet', type:'tablet', w:834, h:1194, glow:265, bezel:11 },
    { id:'ipad-pro-13', name:'iPad Pro 13"', brand:'Apple', category:'tablet', type:'tablet', w:1024, h:1366, glow:290, bezel:11 },
    { id:'galaxy-tab-s9', name:'Galaxy Tab S9', brand:'Samsung', category:'tablet', type:'tablet', w:800, h:1280, glow:260, bezel:13 },
    { id:'pixel-tablet', name:'Pixel Tablet', brand:'Google', category:'tablet', type:'tablet', w:840, h:1280, glow:265, bezel:15 },

    // ---- COMPUTADORAS ----
    { id:'macbook-air-13', name:'MacBook Air 13"', brand:'Apple', category:'computer', type:'laptop', w:1280, h:832, glow:260, bezel:10 },
    { id:'macbook-pro-14', name:'MacBook Pro 14"', brand:'Apple', category:'computer', type:'laptop', w:1512, h:982, glow:270, bezel:9 },
    { id:'macbook-pro-16', name:'MacBook Pro 16"', brand:'Apple', category:'computer', type:'laptop', w:1728, h:1117, glow:280, bezel:9 },
    { id:'imac-24', name:'iMac 24"', brand:'Apple', category:'computer', type:'desktop', w:2240, h:1260, glow:300, bezel:14 },
    { id:'galaxy-book4', name:'Galaxy Book4', brand:'Samsung', category:'computer', type:'laptop', w:1920, h:1080, glow:275, bezel:13 },
    { id:'pixelbook', name:'Pixelbook Go', brand:'Google', category:'computer', type:'laptop', w:1366, h:768, glow:255, bezel:16 },

    // ---- RELOJES ----
    { id:'apple-watch-41', name:'Apple Watch 41mm', brand:'Apple', category:'watch', type:'watch', w:176, h:215, glow:170, bezel:10 },
    { id:'apple-watch-45', name:'Apple Watch 45mm', brand:'Apple', category:'watch', type:'watch', w:198, h:242, glow:180, bezel:10 },
    { id:'galaxy-watch6', name:'Galaxy Watch6', brand:'Samsung', category:'watch', type:'watch-round', w:212, h:212, glow:175, bezel:12 },
    { id:'pixel-watch-2', name:'Pixel Watch 2', brand:'Google', category:'watch', type:'watch-round', w:190, h:190, glow:165, bezel:13 }
];

let currentDevice = { ...devices[0] };
let currentUrl = '';
let zoomMultiplier = 1;
let activeCategory = 'all';
let searchQuery = '';
let customDevice = null;
let favorites = new Set();
let isFullscreen = false;

const STORAGE_KEY = 'xanda-sim-state';

const appRoot = document.getElementById('appRoot');
const catTabsEl = document.getElementById('catTabs');
const deviceListEl = document.getElementById('deviceList');
const pinnedCustomEl = document.getElementById('pinnedCustom');
const frameSlot = document.getElementById('frameSlot');
const stageInner = document.getElementById('stageInner');
const glowEl = document.getElementById('glowEl');
const frameWrap = document.querySelector('.frame-wrap');
const deviceNameEl = document.getElementById('deviceName');
const deviceDimsEl = document.getElementById('deviceDims');
const rotateBtn = document.getElementById('rotateBtn');
const openTabBtn = document.getElementById('openTabBtn');
const zoomVal = document.getElementById('zoomVal');
const urlInput = document.getElementById('urlInput');
const searchInput = document.getElementById('searchInput');
const sidebarEl = document.querySelector('.sidebar');
const sidebarHandle = document.getElementById('sidebarHandle');
const sidebarBackdrop = document.getElementById('sidebarBackdrop');

if(!sidebarHandle){ document.documentElement.classList.add('no-sheet-handle'); }

// =========================================================
// PANEL INFERIOR EN MÓVIL
// =========================================================
const isMobileSheet = () => window.matchMedia('(max-width: 860px)').matches;

function setSheetExpanded(open){
    if(!sidebarEl) return;
    sidebarEl.classList.toggle('expanded', open);
    if(sidebarBackdrop) sidebarBackdrop.classList.toggle('show', open);
    if(sidebarHandle) sidebarHandle.setAttribute('aria-expanded', String(open));
}
function collapseSheetOnMobile(){
    if(isMobileSheet()) setSheetExpanded(false);
}
if(sidebarHandle){
    sidebarHandle.addEventListener('click', () => {
        setSheetExpanded(!sidebarEl.classList.contains('expanded'));
    });
}
if(sidebarBackdrop){
    sidebarBackdrop.addEventListener('click', () => setSheetExpanded(false));
}

// =========================================================
// PERSISTENCIA
// =========================================================
async function loadState(){
    try {
      if (window.storage) {
        const r = await window.storage.get(STORAGE_KEY);
        if (r && r.value) return JSON.parse(r.value);
      }
    } catch(e) { /* sin estado guardado todavía */ }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch(e) { /* localStorage no disponible */ }
    return null;
}

async function saveState(){
    const state = {
      favorites: [...favorites],
      lastUrl: currentUrl,
      lastDeviceId: currentDevice ? currentDevice.id : null,
      customDevice: customDevice
    };
    const json = JSON.stringify(state);
    try {
      if (window.storage) { await window.storage.set(STORAGE_KEY, json, false); return; }
    } catch(e) { /* seguirá abajo con localStorage */ }
    try { localStorage.setItem(STORAGE_KEY, json); } catch(e) { /* sin persistencia disponible */ }
}

function buildCatTabs(){
    catTabsEl.innerHTML = categories.map(c => `
      <button class="cat-tab ${c.id === activeCategory ? 'active' : ''}" data-cat="${c.id}">${c.label}</button>
    `).join('');

    catTabsEl.querySelectorAll('.cat-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        activeCategory = btn.dataset.cat;
        searchQuery = '';
        searchInput.value = '';
        buildCatTabs();
        buildDeviceList();
        btn.scrollIntoView({ behavior:'smooth', inline:'center', block:'nearest' });
      });
    });
}

document.getElementById('catNavLeft').addEventListener('click', () => catTabsEl.scrollBy({ left:-140, behavior:'smooth' }));
document.getElementById('catNavRight').addEventListener('click', () => catTabsEl.scrollBy({ left:140, behavior:'smooth' }));

function deviceItemHTML(d){
    const fav = favorites.has(d.id);
    return `
      <button class="device-item ${d.id === currentDevice.id ? 'active' : ''}" data-id="${d.id}">
        <span class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${typeIcons[d.type]}</svg></span>
        <span class="meta">
          <strong>${d.name}</strong>
          <span class="sub">${d.brand ? `<span class="brand-tag">${d.brand}</span>` : ''}${d.w} × ${d.h}</span>
        </span>
        <span class="fav-btn ${fav ? 'on' : ''}" data-fav="${d.id}" title="Favorito">
          <svg viewBox="0 0 24 24" fill="${fav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${HEART_PATH}"/></svg>
        </span>
      </button>`;
}

const BRAND_ORDER = ['Apple', 'Samsung', 'Google'];

function sortedBrands(items){
    const present = [...new Set(items.map(d => d.brand).filter(Boolean))];
    return present.sort((a, b) => {
      const ia = BRAND_ORDER.indexOf(a), ib = BRAND_ORDER.indexOf(b);
      if(ia === -1 && ib === -1) return a.localeCompare(b);
      if(ia === -1) return 1;
      if(ib === -1) return -1;
      return ia - ib;
    });
}

function attachDeviceListeners(){
    deviceListEl.querySelectorAll('.device-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const d = devices.find(x => x.id === btn.dataset.id);
        currentDevice = { ...d };
        buildDeviceList();
        renderDevice();
        saveState();
        collapseSheetOnMobile();
      });
    });
    deviceListEl.querySelectorAll('.fav-btn').forEach(fav => {
      fav.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = fav.dataset.fav;
        if(favorites.has(id)) favorites.delete(id); else favorites.add(id);
        buildDeviceList();
        saveState();
      });
    });
}

function buildDeviceList(){
    if(searchQuery){
      const q = searchQuery.toLowerCase();
      const items = devices.filter(d =>
        d.name.toLowerCase().includes(q) || (d.brand && d.brand.toLowerCase().includes(q))
      );
      deviceListEl.innerHTML = items.length
        ? items.map(deviceItemHTML).join('')
        : `<p class="empty-note">No hay dispositivos que coincidan con "${searchQuery}".</p>`;
      attachDeviceListeners();
      return;
    }

    if(activeCategory === 'favorites'){
      const items = devices.filter(d => favorites.has(d.id));
      deviceListEl.innerHTML = items.length
        ? items.map(deviceItemHTML).join('')
        : `<p class="empty-note">Aún no tienes favoritos. Toca el corazón de un dispositivo para fijarlo aquí.</p>`;
      attachDeviceListeners();
      return;
    }

    if(activeCategory === 'all'){
      deviceListEl.innerHTML = categories.filter(c => c.id !== 'all' && c.id !== 'favorites').map(c => {
        const items = devices.filter(d => d.category === c.id);
        if(!items.length) return '';
        return `<div class="cat-section">
          <div class="cat-heading">${c.label}</div>
          ${items.map(deviceItemHTML).join('')}
        </div>`;
      }).join('');
    } else {
      const items = devices.filter(d => d.category === activeCategory);
      const brands = sortedBrands(items);

      if(!brands.length){
        deviceListEl.innerHTML = items.map(deviceItemHTML).join('');
      } else {
        deviceListEl.innerHTML = brands.map(brand => `
          <div class="brand-block">
            <div class="brand-heading">${brand}</div>
            ${items.filter(d => d.brand === brand).map(deviceItemHTML).join('')}
          </div>
        `).join('');
      }
    }

    attachDeviceListeners();
}

function buildPinnedCustom(){
    if(!customDevice){ pinnedCustomEl.classList.remove('show'); pinnedCustomEl.innerHTML = ''; return; }
    pinnedCustomEl.classList.add('show');
    pinnedCustomEl.innerHTML = `
      <div class="cat-heading" style="padding-top:0">Tu tamaño</div>
      ${deviceItemHTML(customDevice)}
    `;
    pinnedCustomEl.querySelectorAll('.device-item').forEach(btn => {
      btn.addEventListener('click', () => { currentDevice = { ...customDevice }; buildDeviceList(); buildPinnedCustom(); renderDevice(); saveState(); collapseSheetOnMobile(); });
    });
    pinnedCustomEl.querySelectorAll('.fav-btn').forEach(fav => {
      fav.addEventListener('click', (e) => { e.stopPropagation(); });
    });
}

function frameMarkup(d){
    const screenContent = currentUrl
      ? `<iframe src="${currentUrl}" loading="lazy"></iframe>`
      : `<div class="placeholder">
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/></svg>
           <p>Escribe una URL y presiona "Cargar" para ver tu sitio aquí</p>
         </div>`;

    const rootVars = `--w:${d.w};--h:${d.h};--bezel:${d.bezel || 14}px`;

    function notchMarkup(dev){
      if(dev.notch === 'island') return '<div class="island"></div>';
      if(dev.notch === 'punch') return '<div class="punch"></div>';
      return '';
    }

    switch(d.type){
      case 'phone':
        return `<div class="device-frame phone" style="${rootVars}">
          <div class="btn power"></div><div class="btn vol1"></div><div class="btn vol2"></div>
          ${notchMarkup(d)}
          <div class="screen">${screenContent}</div>
        </div>`;
      case 'foldable':
        if(d.fold === 'book'){
          return `<div class="device-frame tablet foldable book" style="${rootVars}">
            <div class="cam"></div>
            <div class="screen">${screenContent}<span class="crease-v"></span></div>
          </div>`;
        }
        return `<div class="device-frame phone foldable clamshell" style="${rootVars}">
          <div class="btn power"></div><div class="btn vol1"></div><div class="btn vol2"></div>
          ${notchMarkup(d)}
          <div class="screen">${screenContent}<span class="crease-h"></span></div>
        </div>`;
      case 'tablet':
        return `<div class="device-frame tablet" style="${rootVars}">
          <div class="cam"></div>
          <div class="screen">${screenContent}</div>
        </div>`;
      case 'laptop':
        return `<div class="device-frame laptop" style="${rootVars}">
          <div class="lid"><div class="screen">${screenContent}</div></div>
          <div class="hinge"></div>
          <div class="base"></div>
        </div>`;
      case 'desktop':
        return `<div class="device-frame desktop" style="${rootVars}">
          <div class="monitor"><div class="screen">${screenContent}</div></div>
          <div class="neck"></div>
          <div class="base"></div>
        </div>`;
      case 'tv':
        return `<div class="device-frame tv" style="${rootVars}">
          <div class="panel"><div class="screen">${screenContent}</div></div>
          <div class="stand-row"><div class="foot"></div><div class="foot"></div></div>
        </div>`;
      case 'watch':
        return `<div class="device-frame watch" style="${rootVars}">
          <div class="band top"></div>
          <div class="case">
            <div class="crown"></div><div class="side-btn"></div>
            <div class="screen">${screenContent}</div>
          </div>
          <div class="band bottom"></div>
        </div>`;
      case 'watch-round':
        return `<div class="device-frame watch-round" style="${rootVars}">
          <div class="band top"></div>
          <div class="case">
            <div class="crown"></div><div class="side-btn"></div>
            <div class="screen">${screenContent}</div>
          </div>
          <div class="band bottom"></div>
        </div>`;
      case 'custom':
        return `<div class="device-frame custom" style="${rootVars}">
          <div class="chrome-bar">
            <span class="tl r"></span><span class="tl y"></span><span class="tl g"></span>
            <div class="addr"></div>
          </div>
          <div class="screen">${screenContent}</div>
        </div>`;
    }
}

function renderDevice(){
    frameSlot.innerHTML = frameMarkup(currentDevice);

    glowEl.style.width = currentDevice.glow + 'px';
    glowEl.style.height = currentDevice.glow + 'px';

    deviceNameEl.textContent = currentDevice.name;
    deviceDimsEl.textContent = `${currentDevice.w} × ${currentDevice.h} px`;
    rotateBtn.style.display = (currentDevice.type === 'phone' || currentDevice.type === 'tablet' || currentDevice.type === 'foldable') ? 'flex' : 'none';
    openTabBtn.style.display = currentUrl ? 'flex' : 'none';

    panX = 0; panY = 0;
    requestAnimationFrame(fitStage);
}

// =========================================================
// ZOOM + DESPLAZAMIENTO (pan)
// =========================================================
let panX = 0, panY = 0, maxPanX = 0, maxPanY = 0;
let spaceHeld = false, isPanning = false;
let panStartPointer = { x:0, y:0 }, panStartOffset = { x:0, y:0 };

function applyTransform(scale){
    stageInner.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
}

function fitStage(){
    const availW = frameWrap.clientWidth - 40;
    const availH = frameWrap.clientHeight - 40;
    const rect = frameSlot.querySelector('.device-frame').getBoundingClientRect();
    const currentScale = parseFloat(stageInner.dataset.scale || '1');
    const naturalW = rect.width / currentScale;
    const naturalH = rect.height / currentScale;

    const fitScale = Math.min(availW / naturalW, availH / naturalH, 1);
    const finalScale = Math.max(fitScale * zoomMultiplier, 0.12);
    stageInner.dataset.scale = finalScale;

    const scaledW = naturalW * finalScale;
    const scaledH = naturalH * finalScale;
    maxPanX = Math.max(0, (scaledW - availW) / 2);
    maxPanY = Math.max(0, (scaledH - availH) / 2);
    panX = Math.min(Math.max(panX, -maxPanX), maxPanX);
    panY = Math.min(Math.max(panY, -maxPanY), maxPanY);

    applyTransform(finalScale);
    zoomVal.textContent = Math.round(finalScale * 100) + '%';
}

function zoomIn(){ zoomMultiplier = Math.min(zoomMultiplier + 0.15, 3); fitStage(); }
function zoomOut(){ zoomMultiplier = Math.max(zoomMultiplier - 0.15, 0.2); fitStage(); }

document.getElementById('loadBtn').addEventListener('click', loadUrl);
urlInput.addEventListener('keydown', e => { if(e.key === 'Enter') loadUrl(); });

function loadUrl(){
    let val = urlInput.value.trim();
    if(!val) return;
    if(!/^https?:\/\//i.test(val)) val = 'https://' + val;
    currentUrl = val;
    renderDevice();
    saveState();
    collapseSheetOnMobile();
}

openTabBtn.addEventListener('click', () => {
    if(currentUrl) window.open(currentUrl, '_blank', 'noopener,noreferrer');
});

rotateBtn.addEventListener('click', () => {
    const w = currentDevice.w;
    currentDevice.w = currentDevice.h;
    currentDevice.h = w;
    renderDevice();
    buildDeviceList();
});

document.getElementById('zoomIn').addEventListener('click', zoomIn);
document.getElementById('zoomOut').addEventListener('click', zoomOut);

function isFormField(el){
    return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}
window.addEventListener('keydown', e => {
    const meta = e.ctrlKey || e.metaKey;
    if(meta && (e.key === '+' || e.key === '=')){ e.preventDefault(); zoomIn(); }
    else if(meta && (e.key === '-' || e.key === '_')){ e.preventDefault(); zoomOut(); }
});

window.addEventListener('keydown', e => {
    if(e.code === 'Space' && !isFormField(e.target) && !spaceHeld){
      spaceHeld = true;
      frameWrap.classList.add('space-pan');
      e.preventDefault();
    }
});
window.addEventListener('keyup', e => {
    if(e.code === 'Space'){
      spaceHeld = false;
      isPanning = false;
      frameWrap.classList.remove('space-pan', 'panning');
      stageInner.classList.remove('no-transition');
    }
});

frameWrap.addEventListener('pointerdown', e => {
    if(!spaceHeld) return;
    isPanning = true;
    frameWrap.classList.add('panning');
    stageInner.classList.add('no-transition');
    try { frameWrap.setPointerCapture(e.pointerId); } catch(err){ /* no-op */ }
    panStartPointer = { x:e.clientX, y:e.clientY };
    panStartOffset = { x:panX, y:panY };
    e.preventDefault();
});
frameWrap.addEventListener('pointermove', e => {
    if(!isPanning) return;
    const dx = e.clientX - panStartPointer.x;
    const dy = e.clientY - panStartPointer.y;
    panX = Math.min(Math.max(panStartOffset.x + dx, -maxPanX), maxPanX);
    panY = Math.min(Math.max(panStartOffset.y + dy, -maxPanY), maxPanY);
    applyTransform(parseFloat(stageInner.dataset.scale || '1'));
});
function endPan(){
    if(!isPanning) return;
    isPanning = false;
    frameWrap.classList.remove('panning');
    stageInner.classList.remove('no-transition');
}
frameWrap.addEventListener('pointerup', endPan);
frameWrap.addEventListener('pointercancel', endPan);

window.addEventListener('resize', fitStage);

// ---- búsqueda ----
searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value.trim();
    buildDeviceList();
});

// ---- tamaño personalizado ----
document.getElementById('customApply').addEventListener('click', () => {
    const w = Math.max(120, Math.min(3840, parseInt(document.getElementById('customW').value) || 1024));
    const h = Math.max(120, Math.min(2400, parseInt(document.getElementById('customH').value) || 768));
    customDevice = { id:'custom', name:'Personalizado', category:'custom', type:'custom', w, h, glow: Math.min(320, Math.max(200, Math.round((w + h) / 6))) };
    currentDevice = { ...customDevice };
    buildPinnedCustom();
    buildDeviceList();
    renderDevice();
    saveState();
    collapseSheetOnMobile();
});

// ---- pantalla completa ----
document.getElementById('fullscreenBtn').addEventListener('click', () => {
    isFullscreen = !isFullscreen;
    appRoot.classList.toggle('fullscreen', isFullscreen);
    document.getElementById('fullscreenLabel').textContent = isFullscreen ? 'Salir' : 'Enfocar';
    setTimeout(fitStage, 320);
});
window.addEventListener('keydown', e => {
    if(e.key === 'Escape' && isFullscreen){
      isFullscreen = false;
      appRoot.classList.remove('fullscreen');
      document.getElementById('fullscreenLabel').textContent = 'Enfocar';
      setTimeout(fitStage, 320);
    }
    if(e.key === 'Escape' && sidebarEl && sidebarEl.classList.contains('expanded')){
      setSheetExpanded(false);
    }
});

function obtenerUrlDeLaExtension(){
    const parametros = new URLSearchParams(window.location.search);
    return parametros.get('url');
}

// ---- arranque ----
(async function init(){

    const saved = await loadState();
    const urlExtension = obtenerUrlDeLaExtension();

    if(saved){
        favorites = new Set(saved.favorites || []);

        if(saved.customDevice){
            customDevice = saved.customDevice;
        }

        if(saved.lastDeviceId){
            const pool = customDevice ? devices.concat([customDevice]) : devices;
            const found = pool.find(d => d.id === saved.lastDeviceId);

            if(found){
                currentDevice = { ...found };
            }
        }

        if(saved.lastUrl){
            currentUrl = saved.lastUrl;
            urlInput.value = saved.lastUrl;
        }
    }

    if(urlExtension){
        urlInput.value = urlExtension;
        loadUrl();
    }

    buildCatTabs();
    buildDeviceList();
    buildPinnedCustom();
    renderDevice();

})();
