/* REFLECTORS — concept interactions */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  /* ---- clock ---- */
  const clock = document.getElementById('clock');
  const tick = () => { clock.textContent = new Date().toLocaleTimeString('en-GB', { hour12: false }) + ' BUC'; };
  tick(); setInterval(tick, 1000);

  /* ---- reveal + counter (the counter shows how many photos the page holds) ---- */
  document.querySelectorAll('[data-count="photos"]').forEach(el => {
    el.dataset.count = document.querySelectorAll('.lead, .ph').length;
  });
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      const num = en.target.querySelector('[data-count]');
      if (num) countUp(num);
      io.unobserve(en.target);
    });
  }, { threshold: .15 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  function countUp(el) {
    const end = +el.dataset.count, t0 = performance.now(), dur = reduce ? 0 : 1600;
    const step = now => {
      const k = dur ? Math.min(1, (now - t0) / dur) : 1;
      el.textContent = Math.round(end * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---- helpers ---- */
  function fit(canvas) {
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w: r.width, h: r.height };
  }
  // deterministic pseudo random
  const rand = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  /* ---- generated "photograph": a concrete roof against a grey sky ---- */
  const roofs = document.querySelectorAll('canvas.roof');
  function drawRoof(roof) {
    const { ctx, w, h } = fit(roof);
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#9c9c9a'); sky.addColorStop(1, '#d9d9d6');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);

    // stepped tower
    const tx = w * .2, tw = w * .3;
    for (let i = 0; i < 9; i++) {
      const y = h * .18 + i * h * .045;
      ctx.fillStyle = i % 2 ? '#8a8a87' : '#cfcfcc';
      ctx.fillRect(tx + i * 2, y, tw - i * 2, h * .045);
    }
    // crane
    ctx.strokeStyle = '#5a5a58'; ctx.lineWidth = 1.2;
    const cx = w * .14;
    ctx.beginPath(); ctx.moveTo(cx, h * .1); ctx.lineTo(cx, h * .65); ctx.moveTo(cx + 8, h * .1); ctx.lineTo(cx + 8, h * .65);
    for (let y = h * .1; y < h * .65; y += 10) { ctx.moveTo(cx, y); ctx.lineTo(cx + 8, y + 10); }
    ctx.stroke();
    // ladder cage
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const y = h * .2 + i * h * .06; ctx.moveTo(w * .19, y); ctx.lineTo(w * .225, y); }
    ctx.moveTo(w * .19, h * .18); ctx.lineTo(w * .19, h * .62); ctx.moveTo(w * .225, h * .18); ctx.lineTo(w * .225, h * .62);
    ctx.stroke();

    // cantilevered slab in perspective
    ctx.beginPath();
    ctx.moveTo(w * .05, h * .62); ctx.lineTo(w * .56, h * .42); ctx.lineTo(w * .93, h * 1.02); ctx.lineTo(w * .05, h * 1.02);
    ctx.closePath(); ctx.fillStyle = '#262626'; ctx.fill();
    // slab top face
    ctx.beginPath();
    ctx.moveTo(w * .05, h * .62); ctx.lineTo(w * .56, h * .42); ctx.lineTo(w * .6, h * .47); ctx.lineTo(w * .07, h * .7);
    ctx.closePath(); ctx.fillStyle = '#efefed'; ctx.fill();
    // slab fascia
    const f = ctx.createLinearGradient(0, h * .45, 0, h * .9);
    f.addColorStop(0, '#e6e6e4'); f.addColorStop(1, '#a9a9a6');
    ctx.beginPath();
    ctx.moveTo(w * .07, h * .7); ctx.lineTo(w * .6, h * .47); ctx.lineTo(w * .88, h * .97); ctx.lineTo(w * .07, h * .98);
    ctx.closePath(); ctx.fillStyle = f; ctx.fill();
    // panel joints
    ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 1;
    for (let i = 1; i < 12; i++) {
      const k = i / 12, x1 = w * (.07 + .53 * k), y1 = h * (.7 - .23 * k);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + (k * w * .05), h * .98); ctx.stroke();
    }
    // glazing band underneath
    ctx.fillStyle = '#141414'; ctx.fillRect(w * .07, h * .97, w * .82, h * .05);

    // film grain
    const img = ctx.getImageData(0, 0, roof.width, roof.height), d = img.data, rnd = rand(7);
    for (let i = 0; i < d.length; i += 4) { const n = (rnd() - .5) * 26; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    ctx.putImageData(img, 0, 0);
  }

  function init() { roofs.forEach(drawRoof); }
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(init);
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(init, 150); });

  /* ---- photo protection: no context menu ("Save image as…") or dragging out of photo frames ---- */
  const isPhoto = el => el instanceof Element && el.closest('.lead, .ph');
  ['contextmenu', 'dragstart'].forEach(type =>
    document.addEventListener(type, e => { if (isPhoto(e.target)) e.preventDefault(); })
  );

  /* ---- slideshow: next photo every few seconds, paused while the tab is hidden ---- */
  document.querySelectorAll('.slides').forEach(show => {
    const slides = [...show.querySelectorAll('.slide')];
    const no = show.querySelector('.slides__no');
    const pad = n => String(n).padStart(2, '0');
    let i = 0;
    setInterval(() => {
      if (document.hidden || slides.length < 2) return;
      slides[i].classList.remove('is-on');
      i = (i + 1) % slides.length;
      slides[i].classList.add('is-on');
      if (no) no.textContent = `${pad(i + 1)} / ${pad(slides.length)}`;
    }, 4000);
  });
})();
