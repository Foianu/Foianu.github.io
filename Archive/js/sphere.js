/*
  Sfera din puncte de sub „+ Archive”.
  Lumina urmărește cursorul; pe telefon se rotește singură.
  Același desen e folosit și ca iconiță în tab-ul browserului.
*/
(function () {
  const INK = "#141414";

  // „relief” de lună: câteva valuri suprapuse pe suprafața sferei
  function terrain(x, y, z) {
    return 0.5
      + 0.22 * Math.sin(3.1 * x + 1.7 * y + 2.3 * z)
      + 0.14 * Math.sin(6.7 * x - 4.9 * z + 1.3)
      + 0.09 * Math.sin(10.3 * y + 8.1 * x - 0.7)
      + 0.06 * Math.sin(15.0 * z - 12.0 * y + 2.1);
  }

  // desenează sfera într-un context 2D
  function drawSphere(ctx, size, cell, light, spin) {
    const c = size / 2, R = size * 0.4;
    const n = Math.ceil(size / cell);
    const cs = Math.cos(spin), sn = Math.sin(spin);
    ctx.fillStyle = ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(0.6, cell * 0.14);

    for (let gy = 0; gy < n; gy++) {
      for (let gx = 0; gx < n; gx++) {
        const px = gx * cell + cell / 2, py = gy * cell + cell / 2;
        const x = (px - c) / R, y = (py - c) / R, d2 = x * x + y * y;

        // halou fin de puncte în jurul marginii
        if (d2 > 1) {
          const out = Math.sqrt(d2) - 1;
          if (out < 0.09) {
            const r = cell * 0.16 * (1 - out / 0.09);
            if (r > 0.25) { ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.fill(); }
          }
          continue;
        }

        const z = Math.sqrt(1 - d2);
        const dot = x * light[0] + y * light[1] + z * light[2];
        const rx = x * cs + z * sn, rz = -x * sn + z * cs;          // rotație lentă
        const t = terrain(rx, y, rz);
        // trecere lină lumină → umbră, cu relieful care o deformează
        let k = (dot + 0.2 + (t - 0.5) * 0.7) / 1.0;
        k = Math.min(1, Math.max(0, k));
        k = k * k * (3 - 2 * k);
        let dark = 0.14 + 0.92 * (1 - k) + (t - 0.5) * 0.18;
        dark = Math.min(1, Math.max(0, dark));

        if (dark < 0.1) continue;
        if (dark < 0.55) {                                           // puncte
          ctx.beginPath(); ctx.arc(px, py, cell * (0.12 + 0.55 * (dark - 0.1)), 0, 7); ctx.fill();
        } else if (dark < 0.9) {                                     // pătrățele conturate
          const s = cell * (0.6 + 0.35 * (dark - 0.55) / 0.35);
          ctx.strokeRect(px - s / 2, py - s / 2, s, s);
        } else {                                                     // umbră plină
          ctx.fillRect(px - cell / 2, py - cell / 2, cell + 0.4, cell + 0.4);
        }
      }
    }
  }

  function norm(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }

  /* ----- Animația din coloana stângă ----- */
  const canvas = document.getElementById("sphere");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    const stars = Array.from({ length: 9 }, () => ({
      x: Math.random(), y: Math.random(), s: 2 + Math.random() * 3, p: Math.random() * 6
    }));
    let size = 0, dpr = 1;
    let target = norm([-0.6, -0.5, 0.65]), light = target.slice();
    let mouse = false, spin = 0, last = performance.now();

    function resize() {
      dpr = window.devicePixelRatio || 1;
      size = canvas.clientWidth;
      canvas.width = canvas.height = Math.round(size * dpr);
    }
    resize();
    window.addEventListener("resize", resize);

    window.addEventListener("mousemove", (e) => {
      mouse = true;
      const r = canvas.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      target = norm([dx, dy, r.width * 0.9]);
    }, { passive: true });

    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      spin += dt * 0.12;
      if (!mouse) {                         // fără mouse: lumina se rotește încet
        const a = now / 4000;
        target = norm([Math.cos(a), Math.sin(a) * 0.7, 0.75]);
      }
      for (let i = 0; i < 3; i++) light[i] += (target[i] - light[i]) * 0.08;
      light = norm(light);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      drawSphere(ctx, size, Math.max(3, size / 52), light, spin);

      // stelele mici „+”
      ctx.lineWidth = 1;
      stars.forEach((st) => {
        const x = st.x * size, y = st.y * size;
        if (Math.hypot(x - size / 2, y - size / 2) < size * 0.46) return;
        ctx.globalAlpha = 0.55 + 0.45 * Math.sin(now / 900 + st.p);
        ctx.beginPath();
        ctx.moveTo(x - st.s, y); ctx.lineTo(x + st.s, y);
        ctx.moveTo(x, y - st.s); ctx.lineTo(x, y + st.s);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ----- Iconița din tab (poza 2) ----- */
  const fav = document.createElement("canvas");
  fav.width = fav.height = 64;
  drawSphere(fav.getContext("2d"), 64, 2.2, norm([-0.6, -0.5, 0.65]), 0);
  let link = document.querySelector('link[rel="icon"]');
  if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
  link.type = "image/png";
  link.href = fav.toDataURL("image/png");
})();
