/* =========================================================
   XandA — index.js
   ========================================================= */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const root = document.documentElement;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------
     Configuración: enlaces de descarga.
     Pega aquí la URL de cada instalador. Mientras estén vacíos,
     los botones de descarga muestran un aviso en lugar de fallar.
     --------------------------------------------------------- */
  const DOWNLOADS = {
    lumina: "",
    nebula: ""
  };

  /* ---------------------------------------------------------
     Marcas que usan los servicios de XandA.
     Agrega un objeto por marca:
       { name: "Marca", logo: "src/assets/images/marca.svg", url: "https://..." }
     "logo" y "url" son opcionales; sin logo se muestra el nombre.
     Mientras la lista esté vacía, se muestran espacios de ejemplo.
     --------------------------------------------------------- */
  const BRANDS = [
    { name: "Muebles Troncoso", logo: "https://www.mueblestroncoso.com.mx/cdn/shop/files/LOGO_TRONCOSO_2024.png?v=1790295661&width=400", url: "hhttps://www.mueblestroncoso.com.mx/" },
    { name: "Maderas Outlet", logo: "https://www.maderasoutlet.mx/wp-content/themes/maderasoutlet/src/assets/images/logos/logo.webp", url: "https://www.maderasoutlet.mx/" },
    { name: "Beute Bath", logo: "https://beutebath.com/src/assets/images/iconos/logo.webp", url: "https://beutebath.com/" }
  ];

  const NAMES = {
    lumina: "Lúmina",
    nebula: "Nébula",
    visor: "Visor",
    conv: "Convertidor"
  };

  /* ---------- Utilidades ---------- */
  let toastTimer;
  function toast(message) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("is-on"), 4200);
  }

  function fillRange(input) {
    const min = +input.min || 0;
    const max = +input.max || 100;
    const pct = ((+input.value - min) / (max - min)) * 100;
    input.style.setProperty("--fill", pct + "%");
  }

  /* ---------- Arranque de la animación de carga ---------- */
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 900))]).then(() => {
    requestAnimationFrame(() => root.classList.add("ready"));
  });

  /* ---------- Encabezado ---------- */
  const header = $(".site-header");
  const onScroll = () => header.classList.toggle("is-stuck", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Menú móvil ---------- */
  const menuBtn = $("#menuBtn");
  const nav = $("#nav");
  function setMenu(open) {
    nav.classList.toggle("is-open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
  }
  menuBtn.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
  nav.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

  /* ---------- Marcas ---------- */
  (function brands() {
    const list = $("#brandList");
    if (!list) return;
    const items = BRANDS.length ? BRANDS : Array.from({ length: 4 }, () => null);

    items.forEach((brand) => {
      const li = document.createElement("li");
      let inner;
      if (!brand) {
        li.className = "is-empty";
        inner = document.createElement("span");
        inner.className = "brand-name";
        inner.textContent = "Espacio para logo";
      } else {
        inner = document.createElement(brand.url ? "a" : "span");
        if (brand.url) { inner.href = brand.url; inner.target = "_blank"; inner.rel = "noopener"; }
        if (brand.logo) {
          const img = document.createElement("img");
          img.src = brand.logo;
          img.alt = brand.name;
          img.loading = "lazy";
          inner.appendChild(img);
        } else {
          inner.className = "brand-name";
          inner.textContent = brand.name;
        }
      }
      li.appendChild(inner);
      list.appendChild(li);
    });
  })();

  /* ---------- Descargas ---------- */
  $$("[data-download]").forEach((link) => {
    const key = link.dataset.download;
    const url = DOWNLOADS[key];
    if (url) {
      link.href = url;
    } else {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        toast(`El enlace de descarga de ${NAMES[key]} todavía no está configurado.`);
      });
    }
  });

  /* ---------- Lienzo técnico del hero ---------- */
  (function heroCanvas() {
    const box = $("#canvas");
    const svg = $("#draft");
    if (!box || !svg) return;

    const cross = $("#cross");
    const lineX = $("#cx");
    const lineY = $("#cy");
    const square = $("#csq");
    const readout = $("#readout");
    const anchors = $$(".anc", svg).map((el) => ({ el, x: +el.dataset.x, y: +el.dataset.y }));
    const idle = "x 300   y 300";
    let snapped = null;

    const pad = (n) => String(Math.round(n)).padStart(3, "0");

    box.addEventListener("pointermove", (e) => {
      const rect = svg.getBoundingClientRect();
      let x = ((e.clientX - rect.left) / rect.width) * 600;
      let y = ((e.clientY - rect.top) / rect.height) * 600;
      x = Math.max(0, Math.min(600, x));
      y = Math.max(0, Math.min(600, y));

      const hit = anchors.find((a) => Math.hypot(a.x - x, a.y - y) < 22) || null;
      if (hit) { x = hit.x; y = hit.y; }
      if (hit !== snapped) {
        if (snapped) snapped.el.classList.remove("is-snap");
        if (hit) hit.el.classList.add("is-snap");
        snapped = hit;
      }

      lineX.setAttribute("y1", y);
      lineX.setAttribute("y2", y);
      lineY.setAttribute("x1", x);
      lineY.setAttribute("x2", x);
      square.setAttribute("x", x - 7);
      square.setAttribute("y", y - 7);
      cross.classList.add("on");
      readout.textContent = `x ${pad(x)}   y ${pad(y)}${hit ? "   ancla" : ""}`;
    });

    box.addEventListener("pointerleave", () => {
      if (snapped) snapped.el.classList.remove("is-snap");
      snapped = null;
      cross.classList.remove("on");
      readout.textContent = idle;
    });
  })();

  /* ---------- Herramientas: pestañas ---------- */
  const tabs = $$('[role="tab"]');
  const panels = $$(".panel");
  const stageTitle = $("#stageTitle");

  function pickTool(id, focus = false) {
    if (!NAMES[id]) return;
    tabs.forEach((tab) => {
      const on = tab.dataset.tool === id;
      tab.setAttribute("aria-selected", String(on));
      tab.tabIndex = on ? 0 : -1;
      if (on && focus) tab.focus();
    });
    panels.forEach((panel) => panel.classList.toggle("is-on", panel.id === "panel-" + id));
    stageTitle.textContent = NAMES[id];
    if (id === "nebula") nebula.type();
  }

  tabs.forEach((tab) => tab.addEventListener("click", () => pickTool(tab.dataset.tool)));

  $('[role="tablist"]').addEventListener("keydown", (e) => {
    const order = tabs.map((t) => t.dataset.tool);
    const current = order.indexOf(tabs.find((t) => t.getAttribute("aria-selected") === "true").dataset.tool);
    let next = null;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") next = (current + 1) % order.length;
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = (current - 1 + order.length) % order.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = order.length - 1;
    if (next === null) return;
    e.preventDefault();
    pickTool(order[next], true);
  });

  // Cualquier elemento con data-pick selecciona esa herramienta
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-pick]");
    if (!el) return;
    pickTool(el.dataset.pick);
    if (el instanceof SVGElement) {
      $("#taller").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    }
  });

  /* ---------- Lúmina ---------- */
  (function lumina() {
    const canvas = $("#lmCanvas");
    const handle = $("#lmHandle");
    const sat = $("#lmSat");
    const bri = $("#lmBri");
    let dragging = false;

    const setSplit = (p) => {
      const v = Math.max(0, Math.min(100, p));
      canvas.style.setProperty("--split", v + "%");
      handle.setAttribute("aria-valuenow", String(Math.round(v)));
    };
    const fromEvent = (e) => {
      const r = canvas.getBoundingClientRect();
      setSplit(((e.clientX - r.left) / r.width) * 100);
    };

    canvas.addEventListener("pointerdown", (e) => {
      dragging = true;
      canvas.setPointerCapture(e.pointerId);
      fromEvent(e);
    });
    canvas.addEventListener("pointermove", (e) => { if (dragging) fromEvent(e); });
    const stop = () => { dragging = false; };
    canvas.addEventListener("pointerup", stop);
    canvas.addEventListener("pointercancel", stop);

    handle.addEventListener("keydown", (e) => {
      const v = +handle.getAttribute("aria-valuenow");
      if (e.key === "ArrowLeft") setSplit(v - 4);
      else if (e.key === "ArrowRight") setSplit(v + 4);
      else return;
      e.preventDefault();
    });

    const apply = () => {
      canvas.style.setProperty("--sat", sat.value / 100);
      canvas.style.setProperty("--bri", bri.value / 100);
    };
    [sat, bri].forEach((input) => {
      input.addEventListener("input", () => { apply(); fillRange(input); });
    });
    apply();
  })();

  /* ---------- Nébula ---------- */
  const nebula = (function () {
    const demo = $(".demo-nebula");
    const lines = $$(".code-line .t", demo);
    const runBtn = $("#nbRun");
    const out = $("#nbOut");
    const idleText = "Presiona Ejecutar para ver el resultado.";

    let elapsed = 0;
    lines.forEach((t) => {
      const n = Math.max(1, t.textContent.length);
      const dur = n * 26;
      t.style.setProperty("--n", n);
      t.style.setProperty("--dur", dur + "ms");
      t.style.setProperty("--delay", elapsed + 200 + "ms");
      elapsed += dur + 120;
    });

    runBtn.addEventListener("click", () => {
      out.textContent = "> Hola, XandA";
      out.classList.add("ok");
    });

    return {
      type() {
        out.textContent = idleText;
        out.classList.remove("ok");
        demo.classList.remove("typing");
        void demo.offsetWidth; // reinicia la animación
        demo.classList.add("typing");
      }
    };
  })();

  /* ---------- Visor ---------- */
  (function visor() {
    const range = $("#vsRange");
    const frame = $("#vsFrame");
    const out = $("#vsOut");
    const presets = $$(".vs-presets button");
    const labels = { mobile: "móvil", tablet: "tablet", desktop: "escritorio" };
    const bpOf = (w) => (w < 600 ? "mobile" : w < 1024 ? "tablet" : "desktop");

    function apply(w) {
      const min = +range.min;
      const max = +range.max;
      const bp = bpOf(w);
      frame.style.width = 30 + ((w - min) / (max - min)) * 70 + "%";
      frame.dataset.bp = bp;
      out.textContent = `${w} px, ${labels[bp]}`;
      presets.forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.w === w)));
      fillRange(range);
    }

    range.addEventListener("input", () => apply(+range.value));
    presets.forEach((button) => {
      button.addEventListener("click", () => {
        const w = +button.dataset.w;
        frame.classList.add("animate");
        range.value = w;
        apply(w);
        setTimeout(() => frame.classList.remove("animate"), 400);
      });
    });
    apply(+range.value);
  })();

  /* ---------- Convertidor (simulación) ---------- */
  (function convertidor() {
    const ORIGINAL_KB = 4200;
    const FACTORS = { webp: 0.26, jpg: 0.36, png: 0.85 };
    const buttons = $$(".cv-seg button");
    const quality = $("#cvQ");
    const qualityOut = $("#cvQo");
    const sizeOut = $("#cvSize");
    const saveOut = $("#cvSave");
    const bar = $("#cvBar");

    let format = "webp";
    let shown = 0;
    let raf = 0;

    const formatSize = (kb) => (kb >= 1000 ? (kb / 1000).toFixed(1) + " MB" : Math.round(kb) + " KB");

    function target() {
      const q = +quality.value;
      const qualityFactor = format === "png" ? 1 : 0.3 + 0.7 * (q / 100);
      return ORIGINAL_KB * FACTORS[format] * qualityFactor;
    }

    function render() {
      const kb = target();
      bar.style.setProperty("--w", (kb / ORIGINAL_KB) * 100 + "%");
      saveOut.textContent = `${Math.round((1 - kb / ORIGINAL_KB) * 100)} % menos de peso`;

      cancelAnimationFrame(raf);
      if (reduceMotion) { shown = kb; sizeOut.textContent = formatSize(kb); return; }
      const from = shown;
      const start = performance.now();
      const step = (now) => {
        const t = Math.min(1, (now - start) / 450);
        const eased = 1 - Math.pow(1 - t, 3);
        shown = from + (kb - from) * eased;
        sizeOut.textContent = formatSize(shown);
        if (t < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        format = button.dataset.fmt;
        buttons.forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
        const lossless = format === "png";
        quality.disabled = lossless;
        qualityOut.textContent = lossless ? "no aplica" : quality.value;
        render();
      });
    });

    quality.addEventListener("input", () => {
      qualityOut.textContent = quality.value;
      fillRange(quality);
      render();
    });

    shown = target();
    sizeOut.textContent = formatSize(shown);
    render();
  })();

  /* ---------- Rangos y pie ---------- */
  $$('input[type="range"]').forEach(fillRange);

  const year = $("#year");
  if (year) year.textContent = new Date().getFullYear();
})();
