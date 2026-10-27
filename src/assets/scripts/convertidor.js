/* ============================================================
   XandA · Convertidor & compresor de imágenes
   Salidas: PNG · JPG · WEBP · AVIF* · ICO
   (* AVIF solo si el navegador lo soporta)
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

/* ============ Scroll reveal ============ */
const io = new IntersectionObserver(entries=>{
    entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
}, {threshold:0.12});
document.querySelectorAll('.reveal').forEach(el=> io.observe(el));

render();
})();
