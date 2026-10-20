(function () {
  const list = document.getElementById("list");
  const panel = document.getElementById("panel");
  const preview = document.getElementById("preview");
  const count = document.getElementById("count");

  WORKS.forEach((w, i) => { w.id = "project-" + String(i + 1).padStart(2, "0"); });

  // o poză poate fi scrisă simplu "img/..." sau { src: "img/..." }
  const srcOf = (img) => (typeof img === "string" ? img : img.src);

  // proporțiile pozelor se află automat (nu mai trebuie scrise în data.js)
  const sizes = {};
  function withRatio(src, cb) {
    if (sizes[src]) return cb(sizes[src]);
    const im = new Image();
    im.onload = () => { sizes[src] = im.naturalWidth / im.naturalHeight; cb(sizes[src]); };
    im.onerror = () => cb(null);
    im.src = src;
  }
  count.textContent = WORKS.length + " textures";

  /* ----- Lista ----- */
  list.innerHTML = WORKS.map((w) => {
    const imgs = w.images || [];
    const media = imgs.map((img, i) =>
      `<div class="media${i ? "" : " is-active"}" data-src="${srcOf(img)}"></div>`).join("");
    const slider = imgs.length ? `
      <div class="slider" data-i="0">${media}</div>
      <div class="slide-count">${imgs.length > 1 ? "1 / " + imgs.length : ""}</div>` : "";
    const text = (w.text || []).map((p) => `<p>${p}</p>`).join("");
    return `
      <li class="item" id="${w.id}">
        <div class="row">
          <span class="title"><span class="name">${w.title}</span><button class="arrow" aria-label="Deschide / închide"></button></span>
          <span>${w.material ?? ""}</span>
          <span>${w.number ?? ""}</span>
          <span>${w.year ?? ""}</span>
          <span>${w.type ?? ""}</span>
        </div>
        <div class="item-body">
          ${slider}
          <div class="item-info">
            <div class="item-specs">${w.specs || ""}</div>
            <div class="item-text">${text}</div>
          </div>
        </div>
      </li>`;
  }).join("");

  /* ----- Gallery: prima poză din fiecare rând, într-un grid de pătrate ----- */
  const grid = document.getElementById("grid");
  const listView = document.getElementById("listView");
  grid.innerHTML = WORKS.filter((w) => w.images && w.images.length).map((w) => `
    <button class="tile" data-id="${w.id}" data-i="0" data-src="${srcOf(w.images[0])}">
      <span class="tile-label">${w.title}</span>
    </button>`).join("");

  // pozele din grid se încarcă doar când ajung pe ecran
  const lazy = "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => entries.forEach((en) => {
        if (en.isIntersecting) { loadMedia(en.target); lazy.unobserve(en.target); }
      }), { rootMargin: "300px" })
    : null;
  grid.querySelectorAll(".tile").forEach((t) => (lazy ? lazy.observe(t) : loadMedia(t)));

  // click pe o poză din grid = deschide proiectul în listă, la poza respectivă
  let pendingSlide = 0;
  grid.addEventListener("click", (e) => {
    const t = e.target.closest(".tile");
    if (!t) return;
    pendingSlide = Number(t.dataset.i);
    location.hash = t.dataset.id;
  });

  /* ----- Imagini: puse ca fundal (nu <img>), deci fără "Save image as" ----- */
  function loadMedia(el) {
    if (el.dataset.loaded) return;
    el.dataset.loaded = "1";
    const src = el.dataset.src;
    const probe = new Image();
    probe.onload = () => { el.style.backgroundImage = `url("${src}")`; };
    probe.onerror = () => el.classList.add("is-missing");
    probe.src = src;
  }

  /* ----- Deschide / închide un proiect ----- */
  function openItem(id) {
    list.querySelectorAll(".item").forEach((li) => {
      const on = li.id === id;
      li.classList.toggle("is-open", on);
      if (on) {
        li.querySelectorAll(".media").forEach(loadMedia);
        const slider = li.querySelector(".slider");
        if (slider) { showSlide(slider, pendingSlide); pendingSlide = 0; }
      }
    });
    const li = document.getElementById(id);
    if (li) {
      const top = li.getBoundingClientRect().top + scrollY - list.offsetTop + 4;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      document.title = li.querySelector(".name").textContent + " — + Archive";
    } else {
      document.title = "+ Archive";
    }
  }

  // slide-ul are lățimea barei de titluri; înălțimea se potrivește pozei afișate
  function fitSlider(slider) {
    const active = slider.querySelector(".media.is-active");
    if (!active) return;
    withRatio(active.dataset.src, (ratio) => {
      if (ratio && active.classList.contains("is-active")) slider.style.setProperty("--r", ratio);
    });
  }

  /* ----- Slide: click în dreapta pozei = următoarea, în stânga = anterioara ----- */
  function slideSide(slider, e) {
    const r = slider.getBoundingClientRect();
    return e.clientX < r.left + r.width / 3 ? -1 : 1;
  }
  list.addEventListener("click", (e) => {
    const slider = e.target.closest(".slider");
    if (!slider) return;
    const n = slider.querySelectorAll(".media").length;
    if (n < 2) return;
    showSlide(slider, (Number(slider.dataset.i) + slideSide(slider, e) + n) % n);
  });
  function showSlide(slider, i) {
    const slides = slider.querySelectorAll(".media");
    if (!slides[i]) i = 0;
    slider.dataset.i = i;
    slides.forEach((s, k) => s.classList.toggle("is-active", k === i));
    fitSlider(slider);
    if (slides.length > 1) slider.nextElementSibling.textContent = (i + 1) + " / " + slides.length;
  }
  list.addEventListener("mousemove", (e) => {
    const slider = e.target.closest(".slider");
    if (slider) slider.classList.toggle("on-left", slideSide(slider, e) < 0);
  });

  list.addEventListener("click", (e) => {
    const li = e.target.closest(".item");
    if (!li || !e.target.closest(".row")) return;
    if (li.classList.contains("is-open")) {
      history.pushState("", "", location.pathname);   // săgeata / click pe rând închide
      openItem(null);
    } else {
      location.hash = li.id;
    }
  });

  /* ----- Preview la hover: fix, sus în coloana din stânga, deasupra planetei ----- */
  list.addEventListener("mouseover", (e) => {
    const row = e.target.closest(".row");
    const li = row && row.parentElement;
    if (!row || li.classList.contains("is-open")) return hidePreview();
    const w = WORKS.find((x) => x.id === li.id);
    const src = w && (w.thumb || (w.images?.[0] && srcOf(w.images[0])));
    if (!src) return hidePreview();
    hovered = src;
    withRatio(src, (ratio) => { if (hovered === src && ratio) showPreview(src, ratio); });
  });
  let hovered = null;

  function showPreview(src, ratio) {
    const side = document.querySelector(".side");
    const top = side.getBoundingClientRect().top + parseFloat(getComputedStyle(side).paddingTop);
    const maxH = document.getElementById("sphere").getBoundingClientRect().top - 24 - top;
    const fullW = document.querySelector(".side").clientWidth - 2 * parseFloat(getComputedStyle(preview).left);
    let width = fullW, height = width / ratio;
    if (height > maxH) { height = Math.max(0, maxH); width = height * ratio; }
    preview.style.width = width + "px";
    preview.style.height = height + "px";
    preview.style.top = top + "px";
    preview.style.backgroundImage = `url("${src}")`;
    preview.classList.add("is-on");
  }
  list.addEventListener("mouseleave", hidePreview);
  window.addEventListener("scroll", hidePreview, { passive: true });
  function hidePreview() { hovered = null; preview.classList.remove("is-on"); }

  /* ----- Meniu: nav-1 = lista / nav-2 = grid cu poze / nav-3 = panou text ----- */
  let view = "nav-1";
  function showView(name) {
    view = name;
    grid.hidden = name !== "nav-2";
    listView.hidden = name === "nav-2";
    setMenu(name);
  }
  function setMenu(name) {
    document.querySelectorAll(".menu a").forEach((a) =>
      a.classList.toggle("is-current", a.dataset.nav === name));
  }
  function openPanel(name) {
    panel.querySelectorAll(".panel-section").forEach((s) =>
      s.classList.toggle("is-visible", s.dataset.panel === name));
    panel.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
    setMenu(name);
  }
  function closePanel() {
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
    setMenu(view);
  }
  function goIndex() {
    history.pushState("", "", location.pathname);
    closePanel();
  }
  document.getElementById("panelClose").addEventListener("click", goIndex);
  document.querySelectorAll('[data-nav="nav-1"]').forEach((a) =>
    a.addEventListener("click", (e) => {
      e.preventDefault();
      goIndex();
      showView("nav-1");
      openItem(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && panel.classList.contains("is-open")) goIndex();
  });

  /* ----- Rutare (#project-01 etc.) ----- */
  function route() {
    const h = location.hash.slice(1);
    if (h === "nav-3") return openPanel(h);
    if (h === "nav-2") {
      showView("nav-2");
      closePanel();
      hidePreview();
      window.scrollTo(0, 0);
      return;
    }
    showView("nav-1");
    closePanel();
    openItem(h || null);
  }
  window.addEventListener("hashchange", route);
  route();

  /* ----- Protecție imagini ----- */
  document.addEventListener("contextmenu", (e) => e.preventDefault());
  document.addEventListener("dragstart", (e) => e.preventDefault());
  document.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    const mod = e.ctrlKey || e.metaKey;
    if (
      k === "f12" ||
      (mod && ["s", "u", "p"].includes(k)) ||
      (mod && e.shiftKey && ["i", "j", "c"].includes(k))
    ) e.preventDefault();
  });
})();
