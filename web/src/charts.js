/* =========================================================
   Athenance — utilitários de UI e gráficos SVG
   ========================================================= */
(function () {
  const A = window.AT;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (v, d = 1) => v == null || isNaN(v) ? '—' : Number(v).toLocaleString(window.I18N ? window.I18N.locale() : 'pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const MON = () => (window.I18N ? window.I18N.months() : MES);
  const fmtD = d => { const p = d.slice(0, 10).split('-'); return `${p[2]} ${MON()[+p[1] - 1]}`; };
  const fmtDY = d => { const p = d.slice(0, 10).split('-'); return `${p[2]} ${MON()[+p[1] - 1]} ${p[0]}`; };
  const fmtDT = d => fmtDY(d) + (d.length > 10 ? ', ' + d.slice(11, 16) : '');
  const fromT = t => new Date(t).toISOString().slice(0, 10);
  const CREWCOLS = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--c6)', 'var(--c7)', 'var(--c8)'];
  const crewColor = id => CREWCOLS[(id - 1) % CREWCOLS.length];
  const initials = n => n.split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase();
  const LVL = ['Normal', 'Atenção', 'Crítico'];
  const unitTxt = (m, v, d) => `${fmt(v, d == null ? m.dec : d)} ${m.unit}`;

  const ICON = {
    form: '<path d="M7 3h8l4 4v14H7z"/><path d="M14 3v5h5"/><path d="M10 13h6M10 17h4"/>',
    user: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20c.8-3.6 3.6-5.4 7-5.4s6.2 1.8 7 5.4"/>',
    chart: '<path d="M4 20V4"/><path d="M4 20h16"/><path d="m7 15 3.5-4.5 3 2.5L19 7"/>',
    table: '<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 10h16M10 10v9"/>',
    book: '<path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h10"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.4A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    brain: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V4a3 3 0 0 0-3 0z"/><path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1"/>',
    flask: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/><path d="M7.5 15h9"/>',
    rad: '<circle cx="12" cy="12" r="1.8"/><path d="M12 10.2V4a8 8 0 0 1 6.9 4l-5.3 3.1M13.6 13l3.5 5.3a8 8 0 0 1-8.2 0L10.4 13M10.4 11 5.1 8A8 8 0 0 1 12 4"/>',
    wind: '<path d="M3 9h11a3 3 0 1 0-3-3M3 14h15a3 3 0 1 1-3 3M3 19h7"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>',
    spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    download: '<path d="M12 4v11"/><path d="m7 11 5 5 5-5"/><path d="M5 20h14"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    warn: '<path d="M12 4 3 19h18z"/><path d="M12 10v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    trash: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    undo: '<path d="M9 7 4 12l5 5"/><path d="M4 12h10a6 6 0 0 1 0 12"/>',
  };
  const icon = (n, cls = 'ico') => `<svg viewBox="0 0 24 24" aria-hidden="true" class="${cls}">${ICON[n] || ''}</svg>`;
  const CATICON = { vitals: 'heart', mental: 'brain', lab: 'flask', rad: 'rad', env: 'wind' };

  function chip(level, text) {
    const ic = level === 0 ? '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>' : level === 1 ? '<svg viewBox="0 0 24 24"><path d="M12 5v9M12 18.5v.01"/></svg>' : '<svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg>';
    return `<span class="chip l${level}">${ic}${esc(text || (window.I18N ? window.I18N.t(LVL[level]) : LVL[level]))}</span>`;
  }
  const levelCls = l => l == null ? 'n' : 'l' + l;

  /* ---------- Tooltip global ---------- */
  let tipEl;
  function tip() { if (!tipEl) { tipEl = document.createElement('div'); tipEl.className = 'tip'; tipEl.setAttribute('role', 'tooltip'); document.body.appendChild(tipEl); } return tipEl; }
  function tipShow(x, y, title, rows, sub) {
    const el = tip(); el.textContent = '';
    if (title) { const t = document.createElement('div'); t.className = 't'; t.textContent = title; el.appendChild(t); }
    (rows || []).forEach(r => {
      const d = document.createElement('div'); d.className = 'r';
      const s = document.createElement('span');
      if (r.color) { const i = document.createElement('i'); i.style.background = r.color; s.appendChild(i); }
      s.appendChild(document.createTextNode(r.name || '')); d.appendChild(s);
      const b = document.createElement('b'); b.textContent = r.val; d.appendChild(b); el.appendChild(d);
    });
    if (sub) { const s = document.createElement('div'); s.className = 's'; s.textContent = sub; el.appendChild(s); }
    el.classList.add('on');
    const w = el.offsetWidth, h = el.offsetHeight; let L = x + 16, T = y - h - 12;
    if (L + w > innerWidth - 8) L = x - w - 16; if (T < 8) T = y + 18;
    el.style.left = Math.max(8, L) + 'px'; el.style.top = T + 'px';
  }
  const tipHide = () => tipEl && tipEl.classList.remove('on');

  /* ---------- Mount responsivo ---------- */
  const observers = new WeakMap();
  function mount(el, draw) {
    const run = () => { const w = Math.max(280, Math.floor(el.clientWidth)); draw(w); };
    run();
    if (observers.has(el)) observers.get(el).disconnect();
    let last = el.clientWidth, raf;
    const ro = new ResizeObserver(() => { if (Math.abs(el.clientWidth - last) < 2) return; last = el.clientWidth; cancelAnimationFrame(raf); raf = requestAnimationFrame(run); });
    ro.observe(el); observers.set(el, ro);
  }

  function niceTicks(min, max, n = 5) {
    if (min === max) { min -= 1; max += 1; }
    const span = max - min, raw = span / n, p = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map(f => f * p).find(s => s >= raw) || p * 10;
    const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step, out = [];
    for (let v = lo; v <= hi + step / 2; v += step) out.push(+v.toFixed(10));
    return out;
  }
  const decFor = (span) => span >= 20 ? 0 : span >= 2 ? 1 : span >= .2 ? 2 : 3;

  /* ---------- Gráfico de linhas ---------- */
  function lineChart(el, o) {
    const H = o.height || 300, mg = { l: 50, r: 14, t: o.events && o.events.length ? 22 : 12, b: 28 };
    mount(el, W => {
      const iw = W - mg.l - mg.r, ih = H - mg.t - mg.b;
      const all = o.series.flatMap(s => s.pts);
      if (!all.length) { el.innerHTML = '<div class="empty"><b>Sem medições neste filtro</b>Ajuste o período, a fase ou os tripulantes.</div>'; return; }
      let t0 = Math.min(...all.map(p => p.t)), t1 = Math.max(...all.map(p => p.t));
      if (o.xDomain) { t0 = o.xDomain[0]; t1 = o.xDomain[1]; }
      if (t1 === t0) t1 = t0 + A.DAY;
      let vs = all.map(p => p.v); if (o.band) vs.push(o.band.lo, o.band.hi);
      let lo = Math.min(...vs), hi = Math.max(...vs);
      if (o.ref) { const sp = hi - lo || 1; if (o.ref.lo > lo - sp * 0.6) lo = Math.min(lo, o.ref.lo); if (o.ref.hi < hi + sp * 0.6) hi = Math.max(hi, o.ref.hi); }
      const pad = (hi - lo) * 0.08 || 1; lo -= pad; hi += pad;
      const yt = niceTicks(lo, hi, 4); lo = Math.min(lo, yt[0]); hi = Math.max(hi, yt[yt.length - 1]);
      const X = t => mg.l + (t - t0) / (t1 - t0) * iw, Y = v => mg.t + (1 - (v - lo) / (hi - lo)) * ih;
      const ydec = o.dec != null ? o.dec : decFor(hi - lo);
      let s = `<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="${esc(o.aria || 'Gráfico de linhas')}"><g class="ax">`;
      yt.forEach(v => { if (v < lo || v > hi) return; s += `<line x1="${mg.l}" x2="${W - mg.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--grid)"/><text x="${mg.l - 8}" y="${Y(v) + 4}" text-anchor="end">${fmt(v, ydec)}</text>`; });
      const days = (t1 - t0) / A.DAY, steps = [1, 2, 3, 5, 7, 10, 14, 21, 30, 45], stp = steps.find(x => days / x <= Math.max(3, iw / 78)) || 60;
      for (let t = t0; t <= t1; t += stp * A.DAY) s += `<text x="${X(t)}" y="${H - 8}" text-anchor="middle">${fmtD(fromT(t))}</text>`;
      s += '</g>';
      (o.phases || []).forEach((p, i) => { const a = Math.max(t0, p.from), b = Math.min(t1, p.to); if (b <= a) return; s += `<rect x="${X(a)}" y="${mg.t}" width="${X(b) - X(a)}" height="${ih}" fill="${i % 2 ? 'var(--panel-2)' : 'transparent'}" opacity=".7"/>`; });
      if (o.ref) { const a = Math.max(lo, o.ref.lo), b = Math.min(hi, o.ref.hi); if (b > a) s += `<rect x="${mg.l}" y="${Y(b)}" width="${iw}" height="${Y(a) - Y(b)}" fill="var(--good-bg)"/><text x="${W - mg.r - 6}" y="${Y(b) + 14}" text-anchor="end" class="ax" style="fill:var(--good-ink);font-size:11px">faixa de referência</text>`; }
      if (o.band) {
        s += `<rect x="${mg.l}" y="${Y(o.band.hi)}" width="${iw}" height="${Math.max(1, Y(o.band.lo) - Y(o.band.hi))}" fill="var(--accent-soft)"/><line x1="${mg.l}" x2="${W - mg.r}" y1="${Y(o.band.lo)}" y2="${Y(o.band.lo)}" stroke="var(--accent)" stroke-width="1" stroke-dasharray="3 4" opacity=".7"/><line x1="${mg.l}" x2="${W - mg.r}" y1="${Y(o.band.hi)}" y2="${Y(o.band.hi)}" stroke="var(--accent)" stroke-width="1" stroke-dasharray="3 4" opacity=".7"/>`;
        if (o.band.med != null) s += `<line x1="${mg.l}" x2="${W - mg.r}" y1="${Y(o.band.med)}" y2="${Y(o.band.med)}" stroke="var(--accent)" stroke-width="1" opacity=".55"/>`;
      }
      s += `<line x1="${mg.l}" x2="${W - mg.r}" y1="${mg.t + ih}" y2="${mg.t + ih}" stroke="var(--axis)"/>`;
      (o.events || []).forEach(e => { const a = Math.max(t0, e.from), b = Math.min(t1, e.to + A.DAY); if (b <= a) return; s += `<rect x="${X(a)}" y="2" width="${Math.max(3, X(b) - X(a))}" height="7" rx="3.5" fill="var(--warn)" opacity=".85"><title>${esc(e.label)}</title></rect><rect x="${X(a)}" y="${mg.t}" width="${Math.max(3, X(b) - X(a))}" height="${ih}" fill="var(--warn)" opacity=".06"/>`; });
      o.series.forEach(se => {
        if (!se.pts.length) return;
        const path = se.pts.map((p, i) => (i ? 'L' : 'M') + X(p.t).toFixed(1) + ' ' + Y(p.v).toFixed(1)).join('');
        s += `<path d="${path}" fill="none" style="stroke:${se.color}" stroke-width="${se.width || 2}" stroke-linejoin="round" stroke-linecap="round" opacity="${se.dim ? .55 : 1}"/>`;
        const few = se.pts.length <= 26;
        se.pts.forEach(p => { const fl = o.flag && o.flag(p, se); if (few || fl) s += `<circle cx="${X(p.t)}" cy="${Y(p.v)}" r="${fl ? 4.2 : 3}" style="fill:${fl ? (fl === 2 ? 'var(--crit)' : 'var(--warn)') : se.color}" stroke="var(--panel)" stroke-width="2"/>`; });
      });
      s += `<line class="xh" y1="${mg.t}" y2="${mg.t + ih}" stroke="var(--ink-2)" stroke-width="1" stroke-dasharray="2 3" style="display:none"/><g class="hp"></g><rect class="hit" x="${mg.l}" y="${mg.t}" width="${iw}" height="${ih}" fill="transparent" tabindex="0"/></svg>`;
      el.innerHTML = s;
      const svg = el.querySelector('svg'), hit = svg.querySelector('.hit'), xh = svg.querySelector('.xh'), hp = svg.querySelector('.hp');
      const times = [...new Set(all.map(p => p.t))].sort((a, b) => a - b);
      let idx = -1;
      const show = (cx, cy, i) => {
        const t = times[i]; xh.style.display = ''; xh.setAttribute('x1', X(t)); xh.setAttribute('x2', X(t));
        const rows = [], dots = [];
        o.series.forEach(se => { const p = se.pts.find(q => q.t === t) || se.pts.find(q => Math.abs(q.t - t) < 1.1 * A.DAY && o.snap); if (p) { rows.push({ color: se.color, name: se.name, val: fmt(p.v, o.dec != null ? o.dec : Math.max(ydec, 1)) + ' ' + (o.unit || '') }); dots.push(`<circle cx="${X(p.t)}" cy="${Y(p.v)}" r="5" style="fill:${se.color}" stroke="var(--panel)" stroke-width="2"/>`); } });
        hp.innerHTML = dots.join('');
        rows.sort((a, b) => parseFloat(b.val.replace('.', '').replace(',', '.')) - parseFloat(a.val.replace('.', '').replace(',', '.')));
        tipShow(cx, cy, fmtDY(fromT(t)), rows, o.sub ? o.sub(t) : null);
      };
      const move = e => { const r = svg.getBoundingClientRect(), x = (e.clientX - r.left) * (W / r.width); const t = t0 + (x - mg.l) / iw * (t1 - t0); let b = 0, bd = Infinity; times.forEach((tt, i) => { const d = Math.abs(tt - t); if (d < bd) { bd = d; b = i; } }); idx = b; show(e.clientX, e.clientY, b); };
      hit.addEventListener('pointermove', move); hit.addEventListener('pointerleave', () => { tipHide(); xh.style.display = 'none'; hp.innerHTML = ''; });
      hit.addEventListener('keydown', e => { if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return; e.preventDefault(); idx = Math.min(times.length - 1, Math.max(0, (idx < 0 ? times.length - 1 : idx) + (e.key === 'ArrowRight' ? 1 : -1))); const r = svg.getBoundingClientRect(); show(r.left + X(times[idx]) * r.width / W, r.top + 40, idx); });
      hit.addEventListener('blur', () => { tipHide(); xh.style.display = 'none'; hp.innerHTML = ''; });
    });
  }

  /* ---------- Cores (heatmap) ---------- */
  function cssColor(v) { const c = getComputedStyle(document.documentElement).getPropertyValue(v).trim(); return c; }
  function hex2rgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(x => x + x).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); }
  const mix = (a, b, t) => a.map((x, i) => Math.round(x + (b[i] - x) * t));
  function divColor(v, max) {
    const t = Math.max(-1, Math.min(1, v / max)), n = hex2rgb(cssColor('--div-neutral')), pole = hex2rgb(cssColor(t < 0 ? '--c1' : '--c8'));
    const c = mix(n, pole, Math.pow(Math.abs(t), .85) * .92); const lum = (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255;
    return { bg: `rgb(${c.join(',')})`, fg: lum > .58 ? '#0b0b0b' : '#fff' };
  }

  function heatmap(el, o) {
    const rowH = o.rowH || 26, left = o.left || 150, top = 34, gh = 22;
    mount(el, W => {
      const cw = Math.max(34, (W - left - 4) / o.cols.length);
      let y = top, s = '', rowsY = [];
      o.rows.forEach(r => { if (r.group) { y += 6; s += `<text x="0" y="${y + 14}" style="fill:var(--ink-2);font-weight:600;font-size:12px">${esc(r.group)}</text>`; y += gh - 4; return; } rowsY.push([r, y]); y += rowH; });
      const H = y + 4;
      let svg = `<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="${esc(o.aria || 'Mapa de calor')}"><g class="ax">`;
      o.cols.forEach((c, i) => { svg += `<text x="${left + i * cw + cw / 2}" y="20" text-anchor="middle" style="fill:var(--ink-2);font-size:12px">${esc(c.label)}</text>`; });
      svg += '</g>' + s;
      rowsY.forEach(([r, ry]) => {
        svg += `<text x="0" y="${ry + rowH / 2 + 4}" style="fill:var(--ink-2);font-size:12.5px">${esc(r.label)}</text>`;
        o.cols.forEach((c, i) => {
          const cell = o.cell(r, c, i); const x = left + i * cw;
          if (!cell || cell.v == null) { svg += `<rect x="${x + 1}" y="${ry + 1}" width="${cw - 2}" height="${rowH - 2}" rx="4" fill="var(--panel-2)" opacity=".6"/>`; return; }
          const col = divColor(cell.v, o.max);
          svg += `<g class="cell" data-r="${esc(r.key)}" data-c="${i}"><rect x="${x + 1}" y="${ry + 1}" width="${cw - 2}" height="${rowH - 2}" rx="4" style="fill:${col.bg}"/>${cell.text ? `<text x="${x + cw / 2}" y="${ry + rowH / 2 + 4}" text-anchor="middle" style="fill:${col.fg};font-size:11.5px;font-weight:600;font-variant-numeric:tabular-nums">${esc(cell.text)}</text>` : ''}${cell.flag ? `<rect x="${x + 1}" y="${ry + 1}" width="${cw - 2}" height="${rowH - 2}" rx="4" fill="none" stroke="var(--ink)" stroke-width="1.5" opacity=".9"/>` : ''}</g>`;
        });
      });
      el.innerHTML = svg + '</svg>';
      el.querySelectorAll('.cell').forEach(g => {
        const r = o.rows.find(x => x.key === g.dataset.r), c = o.cols[+g.dataset.c], cell = o.cell(r, c, +g.dataset.c);
        g.addEventListener('pointermove', e => { g.firstChild.setAttribute('stroke', 'var(--ink)'); g.firstChild.setAttribute('stroke-width', '1.5'); tipShow(e.clientX, e.clientY, cell.tipTitle, cell.tipRows, cell.tipSub); });
        g.addEventListener('pointerleave', () => { g.firstChild.removeAttribute('stroke'); tipHide(); });
      });
    });
  }

  /* ---------- Dispersão ---------- */
  function scatter(el, o) {
    const H = o.height || 320, mg = { l: 54, r: 16, t: 14, b: 40 };
    mount(el, W => {
      const iw = W - mg.l - mg.r, ih = H - mg.t - mg.b, P = o.points;
      if (P.length < 3) { el.innerHTML = '<div class="empty"><b>Poucos pontos</b>Amplie o período ou inclua mais tripulantes.</div>'; return; }
      const ext = k => { let a = Math.min(...P.map(p => p[k])), b = Math.max(...P.map(p => p[k])); const pd = (b - a) * .06 || 1; return [a - pd, b + pd]; };
      let [x0, x1] = ext('x'), [y0, y1] = ext('y'); const xt = niceTicks(x0, x1, 5), yt = niceTicks(y0, y1, 4); x0 = Math.min(x0, xt[0]); x1 = Math.max(x1, xt[xt.length - 1]); y0 = Math.min(y0, yt[0]); y1 = Math.max(y1, yt[yt.length - 1]);
      const X = v => mg.l + (v - x0) / (x1 - x0) * iw, Y = v => mg.t + (1 - (v - y0) / (y1 - y0)) * ih;
      let s = `<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="${esc(o.aria || 'Dispersão')}"><g class="ax">`;
      yt.forEach(v => { s += `<line x1="${mg.l}" x2="${W - mg.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--grid)"/><text x="${mg.l - 8}" y="${Y(v) + 4}" text-anchor="end">${fmt(v, decFor(y1 - y0))}</text>`; });
      xt.forEach(v => { s += `<text x="${X(v)}" y="${H - 20}" text-anchor="middle">${fmt(v, decFor(x1 - x0))}</text>`; });
      s += `<text x="${mg.l + iw / 2}" y="${H - 3}" text-anchor="middle" style="fill:var(--ink-2)">${esc(o.xl)}</text><text transform="translate(12 ${mg.t + ih / 2}) rotate(-90)" text-anchor="middle" style="fill:var(--ink-2)">${esc(o.yl)}</text></g>`;
      s += `<line x1="${mg.l}" x2="${W - mg.r}" y1="${mg.t + ih}" y2="${mg.t + ih}" stroke="var(--axis)"/>`;
      if (o.reg) s += `<line x1="${X(x0)}" y1="${Y(o.reg.a + o.reg.b * x0)}" x2="${X(x1)}" y2="${Y(o.reg.a + o.reg.b * x1)}" stroke="var(--ink-2)" stroke-width="1.5" stroke-dasharray="5 4"/>`;
      P.forEach(p => { s += `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="3.4" style="fill:${p.color}" fill-opacity=".72" stroke="var(--panel)" stroke-width="1"/>`; });
      s += `<g class="hp"></g><rect class="hit" x="${mg.l}" y="${mg.t}" width="${iw}" height="${ih}" fill="transparent"/></svg>`;
      el.innerHTML = s;
      const svg = el.querySelector('svg'), hit = svg.querySelector('.hit'), hp = svg.querySelector('.hp');
      hit.addEventListener('pointermove', e => {
        const r = svg.getBoundingClientRect(), k = W / r.width, mx = (e.clientX - r.left) * k, my = (e.clientY - r.top) * k; let b = null, bd = 28 * 28;
        P.forEach(p => { const d = (X(p.x) - mx) ** 2 + (Y(p.y) - my) ** 2; if (d < bd) { bd = d; b = p; } });
        if (!b) { tipHide(); hp.innerHTML = ''; return; }
        hp.innerHTML = `<circle cx="${X(b.x)}" cy="${Y(b.y)}" r="6" fill="none" stroke="var(--ink)" stroke-width="2"/>`;
        tipShow(e.clientX, e.clientY, `${b.name} · ${fmtDY(b.d)}`, [{ name: o.xl, val: fmt(b.x, o.xdec) }, { name: o.yl, val: fmt(b.y, o.ydec) }]);
      });
      hit.addEventListener('pointerleave', () => { tipHide(); hp.innerHTML = ''; });
    });
  }

  /* ---------- Faixas por fase (strip plot) ---------- */
  function phaseStrip(el, o) {
    const H = o.height || 280, mg = { l: 54, r: 16, t: 14, b: 44 };
    mount(el, W => {
      const iw = W - mg.l - mg.r, ih = H - mg.t - mg.b, vals = o.groups.flatMap(g => g.pts.map(p => p.v));
      if (!vals.length) { el.innerHTML = '<div class="empty"><b>Sem medições neste filtro</b></div>'; return; }
      let lo = Math.min(...vals), hi = Math.max(...vals); const pd = (hi - lo) * .12 || 1; lo -= pd; hi += pd; const yt = niceTicks(lo, hi, 4); lo = Math.min(lo, yt[0]); hi = Math.max(hi, yt[yt.length - 1]);
      const Y = v => mg.t + (1 - (v - lo) / (hi - lo)) * ih, bw = iw / o.groups.length, dec = decFor(hi - lo);
      let s = `<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="${esc(o.aria || '')}"><g class="ax">`;
      yt.forEach(v => { s += `<line x1="${mg.l}" x2="${W - mg.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--grid)"/><text x="${mg.l - 8}" y="${Y(v) + 4}" text-anchor="end">${fmt(v, dec)}</text>`; });
      if (o.ref) { const a = Math.max(lo, o.ref.lo), b = Math.min(hi, o.ref.hi); if (b > a) s += `<rect x="${mg.l}" y="${Y(b)}" width="${iw}" height="${Y(a) - Y(b)}" fill="var(--good-bg)"/>`; }
      o.groups.forEach((g, i) => { const cx = mg.l + bw * i + bw / 2; s += `<text x="${cx}" y="${H - 22}" text-anchor="middle" style="fill:var(--ink-2)">${esc(g.label)}</text><text x="${cx}" y="${H - 7}" text-anchor="middle">${g.n} medições</text>`; });
      s += '</g>';
      o.groups.forEach((g, i) => {
        const cx = mg.l + bw * i + bw / 2;
        if (g.pts.length) { const m = A.mean(g.pts.map(p => p.v)); s += `<line x1="${cx - bw * .3}" x2="${cx + bw * .3}" y1="${Y(m)}" y2="${Y(m)}" stroke="var(--ink)" stroke-width="2.5" stroke-linecap="round"/><text x="${cx + bw * .32}" y="${Y(m) + 4}" style="fill:var(--ink);font-size:12px;font-weight:600">${fmt(m, o.dec)}</text>`; }
        g.pts.forEach((p, j) => { const off = (j - (g.pts.length - 1) / 2) * Math.min(22, bw * .5 / Math.max(1, g.pts.length)); s += `<circle class="pt" data-g="${i}" data-j="${j}" cx="${cx + off}" cy="${Y(p.v)}" r="5.5" style="fill:${p.color}" stroke="var(--panel)" stroke-width="2"/>`; });
      });
      el.innerHTML = s + `<line x1="${mg.l}" x2="${W - mg.r}" y1="${mg.t + ih}" y2="${mg.t + ih}" stroke="var(--axis)"/></svg>`;
      el.querySelectorAll('.pt').forEach(c => { const p = o.groups[+c.dataset.g].pts[+c.dataset.j]; c.addEventListener('pointermove', e => { c.setAttribute('r', 7.5); tipShow(e.clientX, e.clientY, p.name, [{ name: 'Média na fase', val: fmt(p.v, o.dec) + ' ' + o.unit }], p.n + ' medições'); }); c.addEventListener('pointerleave', () => { c.setAttribute('r', 5.5); tipHide(); }); });
    });
  }

  /* ---------- Faixa de baseline (assinatura) ---------- */
  function laneHTML(a) {
    const m = a.m, b = a.base, v = a.v; const pts = [v]; if (b) pts.push(b.lo, b.hi);
    if (m.warn) pts.push(m.warn[0], m.warn[1]); else if (m.ok) pts.push(m.ok[0], m.ok[1]);
    let lo = Math.min(...pts), hi = Math.max(...pts); const pd = (hi - lo) * .06 || 1; lo -= pd; hi += pd;
    const P = x => Math.max(0, Math.min(100, (x - lo) / (hi - lo) * 100));
    let s = '<div class="lane"><div class="track"></div>';
    if (m.warn) s += `<div class="warnb" style="left:${P(m.warn[0])}%;width:${P(m.warn[1]) - P(m.warn[0])}%"></div>`;
    if (m.ok) s += `<div class="refb" style="left:${P(m.ok[0])}%;width:${Math.max(.6, P(m.ok[1]) - P(m.ok[0]))}%"></div>`;
    if (b) s += `<div class="baseb" style="left:${P(b.lo)}%;width:${Math.max(.8, P(b.hi) - P(b.lo))}%"></div><div class="basem" style="left:${P(b.med)}%"></div>`;
    s += `<div class="mk l${a.level}" style="left:${P(v)}%" title="${esc(fmt(v, m.dec) + ' ' + m.unit)}"></div></div>`;
    return s;
  }
  const LANE_KEY = '<div class="lane-key"><span><i style="background:var(--good-bg);box-shadow:inset 0 0 0 1px rgba(12,163,12,.3)"></i>Faixa de referência</span><span><i style="background:var(--warn-bg)"></i>Faixa de atenção</span><span><i style="border:1.5px solid var(--accent);background:var(--accent-soft)"></i>Seu padrão (±2 desvios)</span><span><i style="width:10px;height:10px;border-radius:50%;background:var(--ink-2)"></i>Medida atual</span></div>';

  function ring(level, frac, cls) {
    const col = level === 2 ? 'var(--crit)' : level === 1 ? 'var(--warn)' : level === 0 ? 'var(--good)' : 'var(--axis)', r = 40, c = 2 * Math.PI * r;
    return `<svg class="${cls}" viewBox="0 0 100 100" role="img" aria-label="Estado geral: ${level == null ? 'sem dados' : LVL[level]}"><circle cx="50" cy="50" r="${r}" stroke="var(--panel-3)"/><circle cx="50" cy="50" r="${r}" stroke="${col}" stroke-linecap="round" stroke-dasharray="${c * frac} ${c}" transform="rotate(-90 50 50)"/><g style="stroke:${col}" fill="none" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">${level === 0 ? '<path d="m36 51 10 10 19-21"/>' : level === 1 ? '<path d="M50 34v20M50 65v.5"/>' : level === 2 ? '<path d="M38 38l24 24M62 38 38 62"/>' : ''}</g></svg>`;
  }

  window.UI = { esc, fmt, fmtD, fmtDY, fmtDT, fromT, crewColor, CREWCOLS, initials, LVL, unitTxt, icon, CATICON, chip, levelCls, tipShow, tipHide, mount, lineChart, heatmap, scatter, phaseStrip, laneHTML, LANE_KEY, ring, niceTicks };
})();
