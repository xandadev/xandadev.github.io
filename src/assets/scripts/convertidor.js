/* ============================================================
   XandA · Convertidor & compresor de imágenes
   Salidas: PNG · JPG · WEBP · AVIF* · ICO
   (* AVIF solo si el navegador lo soporta)
   + Mejorador con IA (Real-ESRGAN, ONNX Runtime Web) — ver bloque «Mejorador»
   ============================================================ */
(function(){
"use strict";

/* ============ Header (identidad XandA) ============ */
const header = document.querySelector('.site-header');
if(header){
    const onScroll = () => header.classList.toggle('is-stuck', window.scrollY > 8);
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

/* ============ State ============ */
const files = []; // {id, file, url, format, size, target, quality, scale, status, outUrl, outBlob, outSize, outName}
let idSeed = 0;
let selectedForCompare = null;
let avifSupported = false;

const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const browseBtn = document.getElementById('browseBtn');
const fileList = document.getElementById('fileList');
const fileCount = document.getElementById('fileCount');
const emptyState = document.getElementById('emptyState');
const clearBtn = document.getElementById('clearBtn');
const zipBtn = document.getElementById('zipBtn');
const convertAllBtn = document.getElementById('convertAllBtn');
const globalFormat = document.getElementById('globalFormat');
const qualityRange = document.getElementById('qualityRange');
const qualityVal = document.getElementById('qualityVal');
const scaleSeg = document.getElementById('scaleSeg');
const statTotal = document.getElementById('statTotal');
const statDone = document.getElementById('statDone');
const statSaved = document.getElementById('statSaved');
const compareBox = document.getElementById('compareBox');
const compareEmpty = document.getElementById('compareEmpty');
const toastWrap = document.getElementById('toastWrap');

let currentScale = 1;

/* feature detect avif */
(function(){
    const c = document.createElement('canvas'); c.width=1;c.height=1;
    c.toBlob(function(b){ avifSupported = !!b; if(avifSupported){
        const opt = document.createElement('option'); opt.value='image/avif'; opt.textContent='AVIF';
        globalFormat.appendChild(opt);
    }}, 'image/avif');
})();

/* asegurar la opción ICO en el select global */
(function(){
    if(!globalFormat.querySelector('option[value="image/x-icon"]')){
        const opt = document.createElement('option');
        opt.value = 'image/x-icon';
        opt.textContent = 'ICO';
        globalFormat.appendChild(opt);
    }
})();

/* ============ Helpers ============ */
function fmtBytes(n){
    if(n < 1024) return n + ' B';
    if(n < 1024*1024) return (n/1024).toFixed(1) + ' KB';
    return (n/(1024*1024)).toFixed(2) + ' MB';
}
function extFromMime(m){
    return { 'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/avif':'avif',
            'image/bmp':'bmp','image/gif':'gif','image/x-icon':'ico','image/vnd.microsoft.icon':'ico' }[m] || 'img';
}
function labelFromMime(m){
    return { 'image/png':'PNG','image/jpeg':'JPG','image/webp':'WEBP','image/avif':'AVIF',
            'image/bmp':'BMP','image/gif':'GIF','image/svg+xml':'SVG',
            'image/x-icon':'ICO','image/vnd.microsoft.icon':'ICO' }[m]
        || (m||'???').split('/').pop().toUpperCase();
}
function detectFormat(file){
    if(file.type) return file.type;
    const ext = file.name.split('.').pop().toLowerCase();
    const map = {jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',bmp:'image/bmp',gif:'image/gif',svg:'image/svg+xml',avif:'image/avif',ico:'image/x-icon'};
    return map[ext] || 'application/octet-stream';
}
function baseName(name){ return name.replace(/\.[^.]+$/, ''); }
function defaultTarget(format){
    if(['image/png','image/jpeg','image/webp','image/avif'].includes(format)) return format;
    return 'image/png';
}
function uid(){ return 'f' + (++idSeed); }

function toast(msg, kind){
    const el = document.createElement('div');
    el.className = 'toast' + (kind ? ' ' + kind : '');
    el.textContent = msg;
    toastWrap.appendChild(el);
    setTimeout(()=>{ el.style.opacity='0'; el.style.transform='translateY(6px)'; el.style.transition='all .25s ease'; setTimeout(()=>el.remove(),260); }, 3200);
}

/* ============ Ingestion ============ */
function addFiles(fileArr){
    let added = 0;
    [...fileArr].forEach(file=>{
        if(!file.type.startsWith('image/') && !/\.(png|jpe?g|webp|bmp|gif|svg|ico)$/i.test(file.name)){
            toast(file.name + ' no es una imagen compatible', 'bad');
            return;
        }
        const format = detectFormat(file);
        const entry = {
            id: uid(), file, url: URL.createObjectURL(file), format, size: file.size,
            target: defaultTarget(format),
            quality: Number(qualityRange.value), scale: currentScale,
            status: 'pending', outUrl:null, outBlob:null, outSize:null, outName:null
        };
        files.push(entry);
        added++;
    });
    if(added) toast(added + (added===1 ? ' imagen añadida' : ' imágenes añadidas'));
    render();
}

browseBtn.addEventListener('click', ()=> fileInput.click());
fileInput.addEventListener('change', e => { addFiles(e.target.files); fileInput.value=''; });

['dragenter','dragover'].forEach(evt=>{
    dropzone.addEventListener(evt, e=>{ e.preventDefault(); dropzone.classList.add('drag'); });
});
['dragleave','drop'].forEach(evt=>{
    dropzone.addEventListener(evt, e=>{ e.preventDefault(); dropzone.classList.remove('drag'); });
});
dropzone.addEventListener('drop', e=>{
    if(e.dataTransfer.files && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
});
dropzone.addEventListener('click', e=>{
    if(e.target === dropzone) fileInput.click();
});

window.addEventListener('dragover', e=>e.preventDefault());
window.addEventListener('drop', e=>e.preventDefault());

/* ============ Global controls ============ */
function markStaleAsPending(){
    files.forEach(f=>{ if(f.status === 'done') f.status = 'pending'; });
}

function updateQualityFill(){
    const min = Number(qualityRange.min), max = Number(qualityRange.max), val = Number(qualityRange.value);
    const pct = ((val - min) / (max - min)) * 100;
    qualityRange.style.background =
        `linear-gradient(to right, var(--violet) 0%, var(--violet) ${pct}%, var(--line-strong) ${pct}%, var(--line-strong) 100%)`;
}

qualityRange.addEventListener('input', ()=>{
    qualityVal.textContent = qualityRange.value + '%';
    updateQualityFill();
    const q = Number(qualityRange.value);
    files.forEach(f=>{ f.quality = q; });
    markStaleAsPending();
    render();
});
updateQualityFill();

scaleSeg.addEventListener('click', e=>{
    const btn = e.target.closest('button');
    if(!btn) return;
    [...scaleSeg.children].forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    currentScale = Number(btn.dataset.scale);
    files.forEach(f=>{ f.scale = currentScale; });
    markStaleAsPending();
    render();
    toast('Tamaño de salida ajustado a ' + Math.round(currentScale*100) + '%');
});

globalFormat.addEventListener('change', ()=>{
    const val = globalFormat.value;
    if(val === '__keep') return;
    if(!files.length){ toast('Añade imágenes primero', 'bad'); return; }
    files.forEach(f=>{ f.target = val; });
    markStaleAsPending();
    render();
    toast('Formato de salida cambiado a ' + labelFromMime(val) + ' para todos');
});

clearBtn.addEventListener('click', ()=>{
    files.forEach(f=>{ URL.revokeObjectURL(f.url); if(f.outUrl) URL.revokeObjectURL(f.outUrl); });
    files.length = 0;
    selectedForCompare = null;
    render();
    toast('Lista vaciada');
});

convertAllBtn.addEventListener('click', async ()=>{
    convertAllBtn.disabled = true;
    for(const f of files){ await convertOne(f); }
    render();
    toast('Conversión completa', 'good');
});

zipBtn.addEventListener('click', async ()=>{
    const done = files.filter(f=>f.status==='done');
    if(!done.length){ toast('Convierte al menos una imagen primero', 'bad'); return; }
    zipBtn.disabled = true;
    zipBtn.textContent = 'Empaquetando…';
    try{
        const zip = new JSZip();
        done.forEach(f=> zip.file(f.outName, f.outBlob));
        const blob = await zip.generateAsync({type:'blob'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'imagenes-convertidas.zip';
        a.click();
        toast('ZIP descargado', 'good');
    }catch(err){
        toast('No se pudo generar el ZIP', 'bad');
    }
    zipBtn.disabled = false;
    zipBtn.textContent = 'Descargar todo (.zip)';
});

/* ============ ICO encoder ============ */
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];

function nearestIcoSize(n){
    return ICO_SIZES.reduce((best, s) => Math.abs(s - n) < Math.abs(best - n) ? s : best);
}

function buildIcoCanvas(img, scale){
    const raw = Math.max(img.naturalWidth, img.naturalHeight) * (scale || 1);
    const side = nearestIcoSize(Math.max(16, Math.round(raw)));
    const canvas = document.createElement('canvas');
    canvas.width = side; canvas.height = side;
    const ctx = canvas.getContext('2d');
    const ratio = Math.min(side / img.naturalWidth, side / img.naturalHeight);
    const w = Math.max(1, Math.round(img.naturalWidth * ratio));
    const h = Math.max(1, Math.round(img.naturalHeight * ratio));
    ctx.drawImage(img, Math.round((side - w) / 2), Math.round((side - h) / 2), w, h);
    return canvas;
}

function canvasToIcoBlob(canvas){
    return new Promise((resolve, reject) => {
        canvas.toBlob(async (pngBlob) => {
            try{
                if(!pngBlob) throw new Error('no-png');
                const png = new Uint8Array(await pngBlob.arrayBuffer());
                const header = new ArrayBuffer(22);
                const dv = new DataView(header);
                dv.setUint16(0, 0, true);
                dv.setUint16(2, 1, true);
                dv.setUint16(4, 1, true);
                dv.setUint8(6,  canvas.width  >= 256 ? 0 : canvas.width);
                dv.setUint8(7,  canvas.height >= 256 ? 0 : canvas.height);
                dv.setUint8(8,  0);
                dv.setUint8(9,  0);
                dv.setUint16(10, 1, true);
                dv.setUint16(12, 32, true);
                dv.setUint32(14, png.length, true);
                dv.setUint32(18, 22, true);
                resolve(new Blob([header, png], { type: 'image/x-icon' }));
            }catch(err){ reject(err); }
        }, 'image/png');
    });
}

/* ============ Conversion core ============ */
function loadImage(url){
    return new Promise((resolve,reject)=>{
        const img = new Image();
        img.onload = ()=>resolve(img);
        img.onerror = reject;
        img.src = url;
    });
}

async function convertOne(entry){
    entry.status = 'working';
    render();
    try{
        const img = await loadImage(entry.url);
        const mime = entry.target;
        let blob;

        if(mime === 'image/x-icon'){
            const canvas = buildIcoCanvas(img, entry.scale || 1);
            blob = await canvasToIcoBlob(canvas);
        } else {
            const scale = entry.scale || 1;
            const w = Math.max(1, Math.round(img.naturalWidth * scale));
            const h = Math.max(1, Math.round(img.naturalHeight * scale));
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            if(mime === 'image/jpeg'){
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0,0,w,h);
            }
            ctx.drawImage(img, 0, 0, w, h);

            const quality = (mime === 'image/png') ? undefined : (entry.quality/100);
            blob = await new Promise(resolve=> canvas.toBlob(resolve, mime, quality));
            if(!blob) throw new Error('no-blob');
        }

        if(entry.outUrl) URL.revokeObjectURL(entry.outUrl);
        entry.outBlob = blob;
        entry.outUrl = URL.createObjectURL(blob);
        entry.outSize = blob.size;
        entry.outName = baseName(entry.file.name) + '.' + extFromMime(mime);
        entry.status = 'done';
        selectedForCompare = entry.id;
        renderCompare(entry);
    }catch(err){
        entry.status = 'error';
        toast('No se pudo convertir ' + entry.file.name, 'bad');
    }
    render();
}

/* ============ Rendering ============ */
function render(){
    fileCount.textContent = files.length;
    emptyState.style.display = files.length ? 'none' : 'block';
    clearBtn.disabled = !files.length;
    zipBtn.disabled = !files.some(f=>f.status==='done');
    const allDone = files.length>0 && files.every(f=>f.status==='done');
    convertAllBtn.disabled = !files.length || allDone;
    convertAllBtn.textContent = allDone ? 'Has convertido todo' : 'Convertir todo';

    fileList.innerHTML = '';
    files.forEach(f=>{
        const card = document.createElement('div');
        card.className = 'file-card' + (selectedForCompare===f.id ? ' selected' : '');

        const savedPct = f.outSize ? Math.round((1 - f.outSize/f.size) * 100) : null;

        card.innerHTML = `
            <img class="thumb" src="${f.url}" alt="Miniatura de ${escapeHtml(f.file.name)}" title="Ver comparación">
            <div class="file-meta">
                <div class="file-name">${escapeHtml(f.file.name)}</div>
                <div class="file-sub">
                    <span class="badge badge-in">${labelFromMime(f.format)}</span>
                    <span class="arrow">→</span>
                    <select class="target-select-row" data-role="target">
                        ${targetOptions(f.target)}
                    </select>
                    <span class="status-pill status-${f.status}">${statusLabel(f.status)}</span>
                </div>
                <div class="row-controls">
                    <span class="size-text">${fmtBytes(f.size)}${f.outSize ? ' → ' + fmtBytes(f.outSize) + '  ' + (savedPct>=0 ? '<span class="save">−'+savedPct+'%</span>' : '<span class="grow">+'+(-savedPct)+'%</span>') : ''}</span>
                    <span class="size-text">· calidad ${f.quality}% · escala ${Math.round(f.scale*100)}%</span>
                </div>
                ${f.status==='working' ? '<div class="progress"><i style="width:70%"></i></div>' : ''}
            </div>
            <div class="file-actions">
                <div class="row-btns">
                    <button class="icon-btn" data-role="remove" title="Eliminar">✕</button>
                </div>
                <div class="row-btns">
                    <button class="btn ${f.status==='done' ? 'btn-ghost' : 'btn-primary'} btn-sm" data-role="convert">${f.status==='done' ? 'Reconvertir' : 'Convertir'}</button>
                    ${f.status==='done'
                        ? `<button class="btn btn-ghost btn-sm" data-role="compare">Comparar</button><button class="btn btn-ghost btn-sm" data-role="download">Descargar</button>`
                        : ''}
                </div>
            </div>
        `;

        card.querySelector('[data-role=target]').addEventListener('change', e=>{
            f.target = e.target.value;
            if(f.status === 'done'){ f.status = 'pending'; render(); }
        });
        card.querySelector('[data-role=remove]').addEventListener('click', ()=>{
            URL.revokeObjectURL(f.url); if(f.outUrl) URL.revokeObjectURL(f.outUrl);
            const idx = files.indexOf(f); files.splice(idx,1);
            if(selectedForCompare === f.id){ selectedForCompare=null; renderCompareEmpty(); }
            render();
        });
        const convBtn = card.querySelector('[data-role=convert]');
        if(convBtn) convBtn.addEventListener('click', ()=> convertOne(f));
        const dlBtn = card.querySelector('[data-role=download]');
        if(dlBtn) dlBtn.addEventListener('click', ()=>{
            const a = document.createElement('a');
            a.href = f.outUrl; a.download = f.outName; a.click();
        });
        const cmpBtn = card.querySelector('[data-role=compare]');
        if(cmpBtn) cmpBtn.addEventListener('click', ()=>{
            selectedForCompare = f.id;
            render();
            renderCompare(f);
            compareBox.scrollIntoView({behavior:'smooth', block:'center'});
        });
        card.querySelector('.thumb').addEventListener('click', ()=>{
            selectedForCompare = f.id;
            render();
            if(f.status==='done') renderCompare(f); else renderCompareEmpty('Convierte "'+f.file.name+'" para comparar su resultado');
            compareBox.scrollIntoView({behavior:'smooth', block:'center'});
        });

        fileList.appendChild(card);
    });

    // stats
    statTotal.textContent = files.length;
    const doneFiles = files.filter(f=>f.status==='done');
    statDone.textContent = doneFiles.length;
    if(doneFiles.length){
        const avg = doneFiles.reduce((acc,f)=> acc + (1 - f.outSize/f.size), 0) / doneFiles.length;
        statSaved.textContent = Math.round(avg*100) + '%';
    } else {
        statSaved.textContent = '0%';
    }
}

function targetOptions(current){
    const opts = [
        ['image/png','PNG'], ['image/jpeg','JPG'], ['image/webp','WEBP'], ['image/x-icon','ICO']
    ];
    if(avifSupported) opts.push(['image/avif','AVIF']);
    return opts.map(([v,l])=>`<option value="${v}" ${v===current?'selected':''}>${l}</option>`).join('');
}

function statusLabel(s){
    return { pending:'Pendiente', working:'Convirtiendo…', done:'Lista', error:'Error' }[s] || s;
}

function escapeHtml(s){
    return s.replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ============ Compare slider ============ */
function renderCompareEmpty(msg){
    compareState.active = false;
    compareBox.innerHTML = `<div class="compare-empty">${msg || 'Convierte una imagen para ver la comparación aquí'}</div>`;
}

const compareState = { active:false, dragging:false, pct:50 };

function compareSetPos(pct){
    if(!compareState.active) return;
    const beforeWrap = document.getElementById('beforeWrap');
    const beforeImg = document.getElementById('beforeImg');
    const handle = document.getElementById('compareHandle');
    if(!beforeWrap || !beforeImg || !handle) return;
    pct = Math.max(2, Math.min(98, pct));
    compareState.pct = pct;
    const r = compareBox.getBoundingClientRect();
    beforeWrap.style.width = pct + '%';
    handle.style.left = pct + '%';
    beforeImg.style.width = r.width + 'px';
}

function compareMove(clientX){
    const r = compareBox.getBoundingClientRect();
    if(!r.width) return;
    compareSetPos(((clientX - r.left) / r.width) * 100);
}

window.addEventListener('mousedown', e=>{
    if(e.target.closest && e.target.closest('#compareHandle')) compareState.dragging = true;
});
window.addEventListener('mouseup', ()=> compareState.dragging = false);
window.addEventListener('mousemove', e=>{ if(compareState.dragging) compareMove(e.clientX); });
window.addEventListener('touchstart', e=>{
    if(e.target.closest && e.target.closest('#compareHandle')) compareState.dragging = true;
}, {passive:true});
window.addEventListener('touchend', ()=> compareState.dragging = false);
window.addEventListener('touchmove', e=>{ if(compareState.dragging && e.touches[0]) compareMove(e.touches[0].clientX); }, {passive:true});
window.addEventListener('resize', ()=> compareSetPos(compareState.pct));
compareBox.addEventListener('click', e=>{
    if(compareState.active && (e.target === compareBox || e.target.closest('.layer'))) compareMove(e.clientX);
});

function renderCompare(f){
    if(!f || f.status !== 'done' || !f.outUrl){ renderCompareEmpty(); return; }
    compareBox.innerHTML = `
        <img class="layer" src="${f.outUrl}" alt="Convertida">
        <div class="after-wrap" id="beforeWrap">
            <img src="${f.url}" alt="Original" id="beforeImg">
        </div>
        <span class="compare-tag left">${labelFromMime(f.format)} · ${fmtBytes(f.size)}</span>
        <span class="compare-tag right">${labelFromMime(f.target)} · ${fmtBytes(f.outSize)}</span>
        <div class="compare-handle" id="compareHandle" style="left:50%;">
            <div class="grip">⇔</div>
        </div>
    `;
    compareState.active = true;
    requestAnimationFrame(()=> compareSetPos(50));
}

/* ----- Código del Web Worker (se inyecta como Blob; sin archivo extra) ----- */
function enhWorkerMain(){
"use strict";
let session = null;
const CACHE_NAME = "xanda-mejorador-v1";

async function loadModel(url){
    // Cache API (si existe) para que el modelo quede guardado tras la primera carga.
    try{
        if(typeof caches !== "undefined"){
            const cache = await caches.open(CACHE_NAME);
            let res = await cache.match(url);
            if(!res){
                res = await fetch(url);
                if(!res.ok) throw new Error("HTTP " + res.status);
                await cache.put(url, res.clone());
            }
            return await res.arrayBuffer();
        }
    }catch(_){ /* si la caché falla, se intenta la descarga directa */ }
    const res = await fetch(url);
    if(!res.ok) throw new Error("No se pudo cargar el modelo (HTTP " + res.status + ")");
    return await res.arrayBuffer();
}

self.onmessage = async (e) => {
    const m = e.data;

    if(m.type === "init"){
        try{
            importScripts(m.ortBase + "ort.wasm.min.js");
            ort.env.wasm.wasmPaths = m.ortBase;
            ort.env.wasm.numThreads = 1;   // el paralelismo se logra con varios workers
            ort.env.wasm.proxy = false;
            const buf = await loadModel(m.modelUrl);
            session = await ort.InferenceSession.create(buf, {
                executionProviders: ["wasm"],
                graphOptimizationLevel: "all"
            });
            self.postMessage({ type: "ready" });
        }catch(err){
            self.postMessage({ type: "error", stage: "init", message: String((err && err.message) || err) });
        }
        return;
    }

    if(m.type === "tile"){
        try{
            const { id, pw, ph, pad, tw, th, data } = m;
            const n = pw * ph;
            const f = new Float32Array(3 * n);
            for(let i = 0; i < n; i++){
                f[i]         = data[4 * i]     / 255;
                f[n + i]     = data[4 * i + 1] / 255;
                f[2 * n + i] = data[4 * i + 2] / 255;
            }
            const out = await session.run({ input: new ort.Tensor("float32", f, [1, 3, ph, pw]) });
            const o = out.output;
            const od = o.data;
            const ow = pw * 4, oh = ph * 4, on = ow * oh;
            const cw = tw * 4, ch = th * 4, off = pad * 4;
            const res = new Uint8ClampedArray(cw * ch * 4);
            for(let y = 0; y < ch; y++){
                const rowSrc = (y + off) * ow + off;
                let di = y * cw * 4;
                for(let x = 0; x < cw; x++){
                    const si = rowSrc + x;
                    res[di]     = od[si]          * 255;
                    res[di + 1] = od[on + si]     * 255;
                    res[di + 2] = od[2 * on + si] * 255;
                    res[di + 3] = 255;
                    di += 4;
                }
            }
            if(o.dispose) o.dispose();
            self.postMessage({ type: "tile", id, w: cw, h: ch, data: res }, [res.buffer]);
        }catch(err){
            self.postMessage({ type: "error", stage: "tile", id: m.id, message: String((err && err.message) || err) });
        }
    }
};

}

/* ============ Mejorador de imágenes con IA ============ */
(function(){
"use strict";
/* ============ Rutas (relativas a este script) ============ */
const scriptEl = document.querySelector('script[src*="convertidor.js"]');
const BASE = new URL('./', scriptEl ? scriptEl.src : location.href);
let WORKER_URL = null;   // Blob creado al primer uso
function getWorkerUrl(){
    if(!WORKER_URL) WORKER_URL = URL.createObjectURL(new Blob(['(' + enhWorkerMain.toString() + ')()'], { type: 'text/javascript' }));
    return WORKER_URL;
}
const MODEL_URL  = new URL('../models/realesr-general-x4v3.onnx', BASE).href;
const ORT_BASE   = new URL('../vendor/ort/', BASE).href;

/* ============ Límites (protegen memoria y el navegador) ============ */
const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const MAX_FILE_MB = 40;
const MAX_IN_MP   = 12;
const MAX_OUT_MP  = IS_IOS ? 16 : 36;
const MAX_SIDE    = 16384;
const PAD         = 12;     // solapamiento por lado en cada bloque
const MODEL_SCALE = 4;
const ALLOWED     = ['image/jpeg', 'image/png', 'image/webp'];

/* ============ Elementos ============ */
const $ = id => document.getElementById('enh-' + id);
const dropSection = $('dropSection'), dropzone = $('dropzone'), fileInput = $('fileInput'), browseBtn = $('browseBtn');
const workspace = $('workspace'), origPreview = $('origPreview'), origMeta = $('origMeta'), resetBtn = $('resetBtn');
const scaleSeg = $('scaleSeg'), tileSeg = $('tileSeg');
const fidelityRange = $('fidelityRange'), fidelityVal = $('fidelityVal');
const outFormat = $('outFormat'), qualityField = $('qualityField'), qualityRange = $('qualityRange'), qualityVal = $('qualityVal');
const outInfo = $('outInfo'), enhanceBtn = $('enhanceBtn'), cancelBtn = $('cancelBtn');
const progressCard = $('progressCard'), statusTitle = $('statusTitle'), statusText = $('statusText'), progressMeta = $('progressMeta');
const barWrap = $('barWrap'), barFill = $('barFill');
const resultSection = $('resultSection'), viewer = $('viewer'), stage = $('stage');
const afterImg = $('afterImg'), beforeImg = $('beforeImg'), vhandle = $('vhandle');
const tagBefore = $('tagBefore'), tagAfter = $('tagAfter');
const zoomIn = $('zoomIn'), zoomOut = $('zoomOut'), zoomReset = $('zoomReset'), zoomVal = $('zoomVal'), fsBtn = $('fsBtn');
const rOrig = $('rOrig'), rOut = $('rOut'), rTime = $('rTime');
const downloadBtn = $('downloadBtn'), downloadInfo = $('downloadInfo');
const notices = $('notices'), toastWrap = $('toastWrap');
const engineChip = $('engineChip'), engineText = $('engineText');

/* ============ Estado ============ */
const S = {
    file: null, url: null, srcCanvas: null, w: 0, h: 0, hasAlpha: false,
    scale: 4, tile: 160, fidelity: 100, mime: 'image/png', quality: 0.92,
    running: false, runId: 0, workers: [],
    resultBlob: null, resultUrl: null, resultName: '', engineOk: false
};

/* ============ Utilidades ============ */
function fmtTime(ms){
    const s = Math.round(ms / 1000);
    if(s < 60) return s + ' s';
    const m = Math.floor(s / 60);
    return m + ' min ' + String(s % 60).padStart(2, '0') + ' s';
}
function enhExt(m){ return { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[m] || 'png'; }
function mp(w, h){ return (w * h) / 1e6; }

function notice(kind, title, text, opts){
    opts = opts || {};
    if(opts.key){
        const prev = notices.querySelector('[data-key="' + opts.key + '"]');
        if(prev) prev.remove();
    }
    const el = document.createElement('div');
    el.className = 'notice ' + kind;
    if(opts.key) el.dataset.key = opts.key;
    const body = document.createElement('div');
    const b = document.createElement('b'); b.textContent = title;
    body.appendChild(b);
    if(text){ body.appendChild(document.createTextNode(' ' + text)); }
    if(opts.link){
        body.appendChild(document.createTextNode(' '));
        const a = document.createElement('a'); a.href = opts.link.href; a.textContent = opts.link.text;
        body.appendChild(a);
    }
    el.appendChild(body);
    const x = document.createElement('button');
    x.className = 'x'; x.type = 'button'; x.setAttribute('aria-label', 'Cerrar aviso'); x.textContent = '✕';
    x.addEventListener('click', () => el.remove());
    el.appendChild(x);
    notices.appendChild(el);
    return el;
}
function clearNotices(){ notices.innerHTML = ''; }

/* ============ Estado del motor ============ */
async function checkEngine(){
    const set = (state, text) => { engineChip.dataset.state = state; engineText.textContent = text; };
    if(typeof WebAssembly === 'undefined' || typeof Worker === 'undefined'){
        set('bad', 'Navegador no compatible');
        notice('error', 'Navegador no compatible.', 'Este mejorador necesita WebAssembly y Web Workers. Prueba con una versión reciente de Chrome, Edge, Firefox o Safari.', { key: 'engine' });
        return;
    }
    try{
        const r = await fetch(MODEL_URL, { method: 'HEAD' });
        if(!r.ok) throw new Error('HTTP ' + r.status);
        S.engineOk = true;
        set('ok', 'Real-ESRGAN · local');
    }catch(_){
        set('bad', 'Modelo no disponible');
        notice('error', 'No se encontró el modelo de IA.',
            'Falta el archivo src/assets/models/realesr-general-x4v3.onnx o la página no se sirve por http(s). Si abres el HTML con doble clic (file://) los navegadores bloquean los workers: sírvelo con un servidor local o súbelo al sitio.', { key: 'engine' });
    }
    updateOutInfo();
}

/* ============ Ingesta de archivos ============ */
async function sniffMime(file){
    const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    if(b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return 'image/jpeg';
    if(b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return 'image/png';
    if(b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
       b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
    return null;
}

async function loadFile(file){
    if(!file) return;
    if(S.running){ toast('Espera a que termine el proceso o cancélalo', 'bad'); return; }
    clearNotices();
    if(!S.engineOk) checkEngine();

    if(file.size > MAX_FILE_MB * 1024 * 1024){
        notice('error', 'Archivo demasiado grande.', 'El límite es de ' + MAX_FILE_MB + ' MB y el archivo pesa ' + fmtBytes(file.size) + '.');
        return;
    }
    const mime = await sniffMime(file);
    if(!mime || !ALLOWED.includes(mime)){
        notice('error', 'Formato no compatible.', 'Solo se admiten JPG, PNG y WEBP. Si tu imagen es BMP, GIF, AVIF u otro formato, conviértela primero con el',
            { link: { href: 'convertidor.html', text: 'Convertidor' } });
        return;
    }

    let bitmap;
    try{
        try{ bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
        catch(_){ bitmap = await createImageBitmap(file); }
    }catch(_){
        notice('error', 'No se pudo leer la imagen.', 'El archivo parece dañado o incompleto. Prueba con otra copia.');
        return;
    }
    const w = bitmap.width, h = bitmap.height;
    if(mp(w, h) > MAX_IN_MP){
        bitmap.close();
        notice('error', 'Imagen demasiado grande.', 'Tiene ' + w + '×' + h + ' px (' + mp(w, h).toFixed(1) + ' MP). El máximo de entrada es ' + MAX_IN_MP + ' MP; reduce la imagen antes de mejorarla.');
        return;
    }

    resetState(true);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();

    let hasAlpha = false;
    if(mime !== 'image/jpeg'){
        const d = ctx.getImageData(0, 0, w, h).data;
        for(let i = 3; i < d.length; i += 4){ if(d[i] < 255){ hasAlpha = true; break; } }
    }

    S.file = file; S.url = URL.createObjectURL(file); S.srcCanvas = c;
    S.w = w; S.h = h; S.hasAlpha = hasAlpha;
    // formato de salida por defecto: PNG si hay transparencia, si no el mismo que la entrada
    S.mime = hasAlpha ? 'image/png' : mime;
    outFormat.value = S.mime;
    syncQualityField();

    origPreview.src = S.url;
    origMeta.textContent = file.name + ' · ' + w + '×' + h + ' px · ' + fmtBytes(file.size) + (hasAlpha ? ' · con transparencia' : '');
    dropSection.hidden = true;
    workspace.hidden = false;
    resultSection.hidden = true;
    progressCard.hidden = true;
    updateOutInfo();
    if(hasAlpha) notice('info', 'Esta imagen tiene transparencia.', 'Se conservará en PNG y WEBP. El canal alfa se amplía con un escalado convencional (la IA procesa solo el color).', { key: 'alpha' });
}

browseBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => { loadFile(e.target.files[0]); fileInput.value = ''; });
['dragenter', 'dragover'].forEach(evt => dropzone.addEventListener(evt, e => { e.preventDefault(); dropzone.classList.add('drag'); }));
['dragleave', 'drop'].forEach(evt => dropzone.addEventListener(evt, e => { e.preventDefault(); dropzone.classList.remove('drag'); }));
dropzone.addEventListener('drop', e => {
    const files = e.dataTransfer && e.dataTransfer.files;
    if(files && files.length){
        if(files.length > 1) toast('Se procesa una imagen a la vez: se usará la primera');
        loadFile(files[0]);
    }
});
dropzone.addEventListener('click', e => { if(e.target === dropzone) fileInput.click(); });
window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', e => e.preventDefault());

/* ============ Controles ============ */
function bindSeg(seg, attr, onPick){
    seg.addEventListener('click', e => {
        const btn = e.target.closest('button');
        if(!btn || S.running) return;
        [...seg.children].forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        onPick(Number(btn.dataset[attr]));
    });
}
bindSeg(scaleSeg, 'scale', v => { S.scale = v; updateOutInfo(); });
bindSeg(tileSeg, 'tile', v => { S.tile = v; updateOutInfo(); });

function fillRange(r){
    const pct = ((r.value - r.min) / (r.max - r.min)) * 100;
    r.style.background = 'linear-gradient(to right, var(--violet) 0%, var(--violet) ' + pct + '%, var(--line-strong) ' + pct + '%, var(--line-strong) 100%)';
}
fidelityRange.addEventListener('input', () => {
    S.fidelity = Number(fidelityRange.value);
    fidelityVal.textContent = S.fidelity + '%';
    fillRange(fidelityRange);
});
qualityRange.addEventListener('input', () => {
    S.quality = Number(qualityRange.value) / 100;
    qualityVal.textContent = qualityRange.value + '%';
    fillRange(qualityRange);
});
fillRange(fidelityRange); fillRange(qualityRange);

function syncQualityField(){ qualityField.hidden = S.mime === 'image/png'; }
outFormat.addEventListener('change', () => { S.mime = outFormat.value; syncQualityField(); updateOutInfo(); });

function updateOutInfo(){
    if(!S.file){ return; }
    const outW = S.w * S.scale, outH = S.h * S.scale;
    const tiles = Math.ceil(S.w / S.tile) * Math.ceil(S.h / S.tile);
    let cls = '', msg = 'Salida: ' + outW + '×' + outH + ' px (' + mp(outW, outH).toFixed(1) + ' MP) · ' + tiles + (tiles === 1 ? ' bloque' : ' bloques');
    let ok = S.engineOk;
    if(outW > MAX_SIDE || outH > MAX_SIDE || mp(outW, outH) > MAX_OUT_MP){
        ok = false; cls = 'bad';
        msg = 'Salida de ' + outW + '×' + outH + ' px (' + mp(outW, outH).toFixed(1) + ' MP) supera el máximo de ' + MAX_OUT_MP + ' MP que este navegador puede manejar con seguridad. ' +
              (S.scale === 4 ? 'Prueba con 2× o con una imagen más pequeña.' : 'Usa una imagen más pequeña.') + ' No se reduce la resolución automáticamente.';
    } else if(S.mime === 'image/jpeg' && S.hasAlpha){
        cls = 'warn';
        msg += ' · El JPG no admite transparencia: se aplanará sobre fondo blanco (elige PNG o WEBP para conservarla).';
    }
    outInfo.className = 'out-info ' + cls;
    outInfo.textContent = msg;
    enhanceBtn.disabled = !ok || S.running;
}

/* ============ Mosaicos ============ */
function buildTiles(w, h, T){
    const tiles = [];
    for(let y0 = 0; y0 < h; y0 += T){
        for(let x0 = 0; x0 < w; x0 += T){
            tiles.push({ x0, y0, tw: Math.min(T, w - x0), th: Math.min(T, h - y0) });
        }
    }
    return tiles;
}

// Extrae el bloque con PAD píxeles de margen (replicando bordes fuera de la imagen)
function extractTile(src, w, h, t){
    const pw = t.tw + 2 * PAD, ph = t.th + 2 * PAD;
    const out = new Uint8ClampedArray(pw * ph * 4);
    let o = 0;
    for(let y = 0; y < ph; y++){
        let sy = t.y0 - PAD + y; sy = sy < 0 ? 0 : (sy >= h ? h - 1 : sy);
        const row = sy * w;
        for(let x = 0; x < pw; x++){
            let sx = t.x0 - PAD + x; sx = sx < 0 ? 0 : (sx >= w ? w - 1 : sx);
            const si = (row + sx) * 4;
            out[o++] = src[si]; out[o++] = src[si + 1]; out[o++] = src[si + 2]; out[o++] = src[si + 3];
        }
    }
    return { pw, ph, data: out };
}

/* ============ Workers ============ */
function workerCount(){
    const hc = navigator.hardwareConcurrency || 2;
    let n = Math.max(1, Math.min(4, hc - 1));
    if(navigator.deviceMemory && navigator.deviceMemory <= 4) n = Math.min(n, 2);
    return n;
}
function killWorkers(){
    S.workers.forEach(w => { try{ w.terminate(); }catch(_){} });
    S.workers = [];
}
function spawnWorkers(n){
    return Promise.all(Array.from({ length: n }, () => new Promise((resolve, reject) => {
        let wk;
        try{ wk = new Worker(getWorkerUrl()); }
        catch(err){ reject(Object.assign(new Error(err.message || 'No se pudo crear el worker'), { stage: 'init' })); return; }
        S.workers.push(wk);
        wk.onerror = ev => reject(Object.assign(new Error(ev.message || 'Error al cargar el worker'), { stage: 'init' }));
        wk.onmessage = ev => {
            if(ev.data.type === 'ready') resolve(wk);
            else if(ev.data.type === 'error') reject(Object.assign(new Error(ev.data.message), { stage: 'init' }));
        };
        wk.postMessage({ type: 'init', modelUrl: MODEL_URL, ortBase: ORT_BASE });
    })));
}

/* ============ Proceso principal ============ */
function setProgress(done, total, startTs){
    if(total){
        barWrap.classList.remove('indeterminate');
        barFill.style.width = ((done / total) * 100).toFixed(1) + '%';
        statusText.textContent = 'Bloques procesados: ' + done + ' de ' + total;
        const el = performance.now() - startTs;
        let meta = 'Transcurrido ' + fmtTime(el);
        if(done >= 2 && done < total){
            const rem = (el / done) * (total - done);
            meta += ' · restante aprox. ' + fmtTime(rem);
        }
        progressMeta.textContent = meta;
    }
}

async function enhance(){
    if(S.running || !S.file) return;
    const { w, h, scale, tile, fidelity, hasAlpha } = S;
    const outW = w * scale, outH = h * scale;
    S.running = true;
    const myRun = ++S.runId;
    const t0 = performance.now();

    resultSection.hidden = true;
    clearResult();
    progressCard.hidden = false;
    statusTitle.textContent = 'Procesando…';
    statusText.textContent = 'Iniciando el motor de IA (primera vez: se descarga el modelo, ~5 MB)…';
    progressMeta.textContent = '';
    barWrap.classList.add('indeterminate'); barFill.style.width = '';
    enhanceBtn.disabled = true; cancelBtn.hidden = false;
    progressCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    let outCanvas = null, srcData = null;
    try{
        outCanvas = document.createElement('canvas');
        outCanvas.width = outW; outCanvas.height = outH;
        const octx = outCanvas.getContext('2d');
        if(!octx) throw Object.assign(new Error('canvas'), { stage: 'memory' });
        octx.imageSmoothingEnabled = true; octx.imageSmoothingQuality = 'high';

        srcData = S.srcCanvas.getContext('2d').getImageData(0, 0, w, h).data;
        const tiles = buildTiles(w, h, tile);
        const n = Math.min(workerCount(), tiles.length);
        const workers = await spawnWorkers(n);
        if(myRun !== S.runId) return;

        const tileCanvas = document.createElement('canvas');
        const refCanvas = document.createElement('canvas');
        const refCtx = refCanvas.getContext('2d', { willReadFrequently: true });
        const needRef = fidelity < 100 || hasAlpha;

        statusText.textContent = 'Mejorando…';
        const tStart = performance.now();
        setProgress(0, tiles.length, tStart);

        await new Promise((resolve, reject) => {
            let next = 0, done = 0, failed = false;
            const feed = wk => {
                if(failed || next >= tiles.length) return;
                const id = next++;
                const t = tiles[id];
                const ex = extractTile(srcData, w, h, t);
                wk.postMessage({ type: 'tile', id, pw: ex.pw, ph: ex.ph, pad: PAD, tw: t.tw, th: t.th, data: ex.data }, [ex.data.buffer]);
            };
            workers.forEach(wk => {
                wk.onerror = ev => { failed = true; reject(Object.assign(new Error(ev.message || 'Error en el worker'), { stage: 'tile' })); };
                wk.onmessage = ev => {
                    const m = ev.data;
                    if(failed || myRun !== S.runId) return;
                    if(m.type === 'error'){ failed = true; reject(Object.assign(new Error(m.message), { stage: m.stage })); return; }
                    if(m.type !== 'tile') return;
                    try{
                        composeTile(tiles[m.id], m, octx, tileCanvas, refCanvas, refCtx, needRef);
                    }catch(err){ failed = true; reject(Object.assign(err, { stage: 'tile' })); return; }
                    done++;
                    setProgress(done, tiles.length, tStart);
                    if(done === tiles.length) resolve(); else feed(wk);
                };
                feed(wk);
            });
        });
        if(myRun !== S.runId) return;

        killWorkers();
        srcData = null;

        statusText.textContent = 'Codificando ' + enhExt(S.mime).toUpperCase() + '…';
        barWrap.classList.add('indeterminate');
        const blob = await encodeCanvas(outCanvas, S.mime, S.quality, S.mime === 'image/jpeg');
        outCanvas.width = outCanvas.height = 0;   // libera memoria
        outCanvas = null;
        if(!blob) throw Object.assign(new Error('encode'), { stage: 'memory' });
        if(myRun !== S.runId) return;

        S.resultBlob = blob;
        S.resultUrl = URL.createObjectURL(blob);
        S.resultName = baseName(S.file.name) + '-mejorada-' + scale + 'x.' + enhExt(S.mime);
        await showResult(outW, outH, performance.now() - t0);
        progressCard.hidden = true;
        toast('Imagen mejorada', 'good');
    }catch(err){
        if(myRun === S.runId) handleError(err);
    }finally{
        if(myRun === S.runId){
            killWorkers();
            S.running = false;
            cancelBtn.hidden = true;
            barWrap.classList.remove('indeterminate');
            updateOutInfo();
        }
        if(outCanvas){ outCanvas.width = outCanvas.height = 0; }
    }
}

function composeTile(t, m, octx, tileCanvas, refCanvas, refCtx, needRef){
    const cw = m.w, ch = m.h;
    const img = new ImageData(m.data, cw, ch);
    if(needRef){
        if(refCanvas.width !== cw || refCanvas.height !== ch){ refCanvas.width = cw; refCanvas.height = ch; }
        refCtx.imageSmoothingEnabled = true; refCtx.imageSmoothingQuality = 'high';
        refCtx.clearRect(0, 0, cw, ch);
        refCtx.drawImage(S.srcCanvas, t.x0, t.y0, t.tw, t.th, 0, 0, cw, ch);
        const r = refCtx.getImageData(0, 0, cw, ch).data;
        const d = img.data;
        const a = S.fidelity / 100, b = 1 - a;
        const alpha = S.hasAlpha;
        for(let i = 0; i < d.length; i += 4){
            if(a < 1){
                d[i]     = d[i]     * a + r[i]     * b;
                d[i + 1] = d[i + 1] * a + r[i + 1] * b;
                d[i + 2] = d[i + 2] * a + r[i + 2] * b;
            }
            if(alpha) d[i + 3] = r[i + 3];
        }
    }
    if(S.scale === MODEL_SCALE){
        octx.putImageData(img, t.x0 * MODEL_SCALE, t.y0 * MODEL_SCALE);
    }else{
        if(tileCanvas.width !== cw || tileCanvas.height !== ch){ tileCanvas.width = cw; tileCanvas.height = ch; }
        tileCanvas.getContext('2d').putImageData(img, 0, 0);
        octx.drawImage(tileCanvas, 0, 0, cw, ch, t.x0 * S.scale, t.y0 * S.scale, t.tw * S.scale, t.th * S.scale);
    }
}

function encodeCanvas(canvas, mime, quality, flatten){
    return new Promise(resolve => {
        let src = canvas;
        if(flatten){
            const f = document.createElement('canvas');
            f.width = canvas.width; f.height = canvas.height;
            const fc = f.getContext('2d');
            fc.fillStyle = '#FFFFFF'; fc.fillRect(0, 0, f.width, f.height);
            fc.drawImage(canvas, 0, 0);
            src = f;
        }
        src.toBlob(b => {
            if(src !== canvas){ src.width = src.height = 0; }
            resolve(b);
        }, mime, mime === 'image/png' ? undefined : quality);
    });
}

function handleError(err){
    const msg = String((err && err.message) || err);
    const mem = err && err.stage === 'memory' || /memory|alloc|out of|RangeError|Array buffer/i.test(msg);
    progressCard.hidden = true;
    if(mem){
        notice('error', 'No hay memoria suficiente.', 'Prueba con ampliación 2×, el tamaño de bloque «Bajo» o una imagen más pequeña. Cierra otras pestañas pesadas y vuelve a intentarlo.', { key: 'run' });
    }else if(err && err.stage === 'init'){
        notice('error', 'No se pudo iniciar el motor de IA.',
            'Detalle: ' + msg + '. Comprueba que existan src/assets/models/ y src/assets/vendor/ort/ y que la página se sirva por http(s), no con file://.', { key: 'run' });
    }else{
        notice('error', 'Falló el procesamiento.', 'Detalle: ' + msg + '. Tu imagen original no se modificó; puedes reintentar.', { key: 'run' });
    }
}

cancelBtn.addEventListener('click', () => {
    if(!S.running) return;
    S.runId++;                 // invalida el proceso en curso
    killWorkers();
    S.running = false;
    cancelBtn.hidden = true;
    progressCard.hidden = true;
    updateOutInfo();
    toast('Procesamiento cancelado');
});
enhanceBtn.addEventListener('click', enhance);

/* ============ Resultado y visor ============ */
const V = { z: 1, tx: 0, ty: 0, pct: 50, drag: null, lx: 0, ly: 0 };

function clearResult(){
    if(S.resultUrl){ URL.revokeObjectURL(S.resultUrl); }
    S.resultUrl = null; S.resultBlob = null; S.resultName = '';
    afterImg.removeAttribute('src');
}

async function showResult(outW, outH, elapsed){
    beforeImg.src = S.url;
    afterImg.src = S.resultUrl;
    try{ await Promise.all([afterImg.decode(), beforeImg.decode()]); }catch(_){ /* se muestra igualmente */ }
    viewer.style.aspectRatio = outW + ' / ' + outH;
    tagBefore.textContent = 'Original · ' + S.w + '×' + S.h;
    tagAfter.textContent = 'Mejorada ' + S.scale + '× · ' + outW + '×' + outH;
    rOrig.textContent = S.w + '×' + S.h;
    rOut.textContent = outW + '×' + outH;
    rTime.textContent = fmtTime(elapsed);
    document.querySelector('#enh-rOrig + .l').textContent = 'Original · ' + fmtBytes(S.file.size);
    document.querySelector('#enh-rOut + .l').textContent = 'Resultado · ' + fmtBytes(S.resultBlob.size);
    downloadInfo.textContent = S.resultName;
    resultSection.hidden = false;
    V.z = 1; V.tx = 0; V.ty = 0; V.pct = 50;
    requestAnimationFrame(() => {
        applyView(); setPct(50);
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
}

function setPct(p){
    V.pct = Math.max(0, Math.min(100, p));
    beforeImg.style.clipPath = 'inset(0 ' + (100 - V.pct) + '% 0 0)';
    vhandle.style.left = V.pct + '%';
}
function applyView(){
    const r = viewer.getBoundingClientRect();
    V.tx = Math.min(0, Math.max(r.width  * (1 - V.z), V.tx));
    V.ty = Math.min(0, Math.max(r.height * (1 - V.z), V.ty));
    stage.style.transform = 'translate(' + V.tx + 'px,' + V.ty + 'px) scale(' + V.z + ')';
    stage.style.setProperty('--inv', String(1 / V.z));
    zoomVal.textContent = Math.round(V.z * 100) + '%';
    viewer.classList.toggle('zoomed', V.z > 1);
    viewer.classList.toggle('pixelated', V.z >= 2);
}
function zoomAt(factor, cx, cy){
    const z2 = Math.max(1, Math.min(16, V.z * factor));
    const k = z2 / V.z;
    V.tx = cx - (cx - V.tx) * k;
    V.ty = cy - (cy - V.ty) * k;
    V.z = z2;
    applyView();
}
function pctFromX(clientX){
    const r = viewer.getBoundingClientRect();
    return ((clientX - r.left - V.tx) / (r.width * V.z)) * 100;
}

zoomIn.addEventListener('click', () => { const r = viewer.getBoundingClientRect(); zoomAt(1.5, r.width / 2, r.height / 2); });
zoomOut.addEventListener('click', () => { const r = viewer.getBoundingClientRect(); zoomAt(1 / 1.5, r.width / 2, r.height / 2); });
zoomReset.addEventListener('click', () => { V.z = 1; V.tx = 0; V.ty = 0; applyView(); });

viewer.addEventListener('wheel', e => {
    if(!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    const r = viewer.getBoundingClientRect();
    zoomAt(e.deltaY < 0 ? 1.2 : 1 / 1.2, e.clientX - r.left, e.clientY - r.top);
}, { passive: false });

viewer.addEventListener('dblclick', e => {
    if(e.target.closest('.vhandle')) return;
    const r = viewer.getBoundingClientRect();
    if(V.z > 1){ V.z = 1; V.tx = 0; V.ty = 0; applyView(); }
    else zoomAt(4, e.clientX - r.left, e.clientY - r.top);
});

viewer.addEventListener('pointerdown', e => {
    if(e.pointerType === 'mouse' && e.button !== 0) return;
    const onHandle = !!e.target.closest('.vhandle');
    V.drag = (onHandle || V.z === 1) ? 'slider' : 'pan';
    V.lx = e.clientX; V.ly = e.clientY;
    viewer.setPointerCapture(e.pointerId);
    if(V.drag === 'slider') setPct(pctFromX(e.clientX));
    else viewer.classList.add('panning');
});
viewer.addEventListener('pointermove', e => {
    if(!V.drag) return;
    if(V.drag === 'slider') setPct(pctFromX(e.clientX));
    else{
        V.tx += e.clientX - V.lx; V.ty += e.clientY - V.ly;
        V.lx = e.clientX; V.ly = e.clientY;
        applyView();
    }
});
const endDrag = () => { V.drag = null; viewer.classList.remove('panning'); };
viewer.addEventListener('pointerup', endDrag);
viewer.addEventListener('pointercancel', endDrag);
window.addEventListener('resize', () => { if(!resultSection.hidden) applyView(); });

/* Pantalla completa */
const fsEl = viewer;
const reqFs = fsEl.requestFullscreen || fsEl.webkitRequestFullscreen;
if(!reqFs){ fsBtn.hidden = true; }
fsBtn.addEventListener('click', () => {
    if(document.fullscreenElement || document.webkitFullscreenElement){
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    }else{
        reqFs.call(fsEl);
    }
});
document.addEventListener('fullscreenchange', () => setTimeout(applyView, 50));
document.addEventListener('webkitfullscreenchange', () => setTimeout(applyView, 50));

/* ============ Descarga (sin tocar el original) ============ */
downloadBtn.addEventListener('click', async () => {
    if(!S.resultBlob) return;
    const blob = S.resultBlob, name = S.resultName;
    if(window.showSaveFilePicker){
        try{
            const ext = '.' + enhExt(blob.type);
            const handle = await window.showSaveFilePicker({
                suggestedName: name,
                types: [{ description: 'Imagen', accept: { [blob.type]: [ext] } }]
            });
            const wr = await handle.createWritable();
            await wr.write(blob);
            await wr.close();
            toast('Imagen guardada', 'good');
            return;
        }catch(err){
            if(err && err.name === 'AbortError') return;   // el usuario canceló
            /* cualquier otro fallo: se usa la descarga normal */
        }
    }
    const a = document.createElement('a');
    a.href = S.resultUrl; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    toast('Descarga iniciada', 'good');
});

/* ============ Reinicio ============ */
function resetState(keepWorkspace){
    S.runId++;
    killWorkers();
    S.running = false;
    clearResult();
    if(S.url){ URL.revokeObjectURL(S.url); S.url = null; }
    S.file = null; S.srcCanvas = null;
    cancelBtn.hidden = true;
    if(!keepWorkspace){
        workspace.hidden = true;
        dropSection.hidden = false;
        resultSection.hidden = true;
        progressCard.hidden = true;
        origPreview.removeAttribute('src');
    }
}
resetBtn.addEventListener('click', () => {
    resetState(false);
    clearNotices();
    if(!S.engineOk) checkEngine();
});


/* ============ Selector de herramienta ============ */
const tabConv = document.getElementById('tab-conv'), tabEnh = document.getElementById('tab-enh');
const panelConv = document.getElementById('panelConv'), panelEnh = document.getElementById('enh-panel');
function setMode(mode, push){
    const enh = mode === 'enh';
    panelConv.hidden = enh; panelEnh.hidden = !enh;
    tabConv.classList.toggle('active', !enh); tabEnh.classList.toggle('active', enh);
    tabConv.setAttribute('aria-selected', String(!enh)); tabEnh.setAttribute('aria-selected', String(enh));
    if(push){
        const u = new URL(location.href); u.hash = enh ? 'mejorar' : '';
        history.replaceState(null, '', u.pathname + u.search + u.hash);
    }
    if(enh && !S.engineOk) checkEngine();
    if(!enh) requestAnimationFrame(() => compareSetPos(compareState.pct));
}
tabConv.addEventListener('click', () => setMode('conv', true));
tabEnh.addEventListener('click', () => setMode('enh', true));
window.addEventListener('hashchange', () => setMode(location.hash === '#mejorar' ? 'enh' : 'conv', false));

checkEngine();
if(location.hash === '#mejorar') setMode('enh', false);
})();

/* ============ Scroll reveal ============ */
const io = new IntersectionObserver(entries=>{
    entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
}, {threshold:0.12});
document.querySelectorAll('.reveal').forEach(el=> io.observe(el));

render();
})();
