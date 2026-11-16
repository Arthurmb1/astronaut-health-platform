/* =========================================================
   Athenance: widgets visuais reutilizáveis
   gauge  = velocímetro (meia-lua) com zonas em degradê
   hbar   = barra horizontal com zonas em degradê
   spark  = minigráfico dos últimos dias
   As cores das zonas vêm das faixas da métrica no motor (m.ok / m.warn),
   então o visual e o diagnóstico usam sempre os mesmos limites.
   ========================================================= */
(function () {
  const U = window.UI, { esc, fmt } = U;

  /* ---------- Cores (lidas do tema atual) ---------- */
  const hex = h => { h = h.trim().replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
  const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n);
  const mix = (a, b, t) => a.map((x, i) => Math.round(x + (b[i] - x) * t));
  const rgb = c => `rgb(${c[0]},${c[1]},${c[2]})`;
  function palette() { return { good: hex(cssVar('--good')), warn: hex(cssVar('--warn')), crit: hex(cssVar('--crit')) }; }

  /* Severidade contínua: 0 dentro da faixa ok, 1 na borda da faixa de atenção, >1 além dela. */
  function severity(m, v) {
    const [lo, hi] = m.ok, [wlo, whi] = m.warn;
    if (v < lo) return lo === wlo ? 2 : (lo - v) / (lo - wlo);
    if (v > hi) return hi === whi ? 2 : (v - hi) / (whi - hi);
    return 0;
  }
  /* Degradê: verde -> âmbar logo após o limite ok; âmbar -> vermelho ao passar do limite de atenção. */
  function colorFor(m, v, P) {
    P = P || palette();
    const s = severity(m, v);
    if (s <= 0) return rgb(P.good);
    if (s < 1) return rgb(mix(P.good, P.warn, Math.min(1, s / 0.45)));
    return rgb(mix(P.warn, P.crit, Math.min(1, (s - 1) / 0.2)));
  }
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  /* ---------- Velocímetro ----------
     o: { m, v, min, max, base?, ticks?: [valor], marks?: [{v,label}], band?: {from,to,label}, label? } */
  function gauge(o) {
    const P = palette(), W = 220, H = 128, cx = 110, cy = 112, r = 84, sw = 13;
    const t = v => clamp((v - o.min) / (o.max - o.min), 0, 1);
    const ang = v => Math.PI * (1 - t(v));
    const pt = (rr, a) => [cx + rr * Math.cos(a), cy - rr * Math.sin(a)];
    const arc = (rr, v1, v2) => { const a = pt(rr, ang(v1)), b = pt(rr, ang(v2)); return `M${a[0].toFixed(2)} ${a[1].toFixed(2)}A${rr} ${rr} 0 0 1 ${b[0].toFixed(2)} ${b[1].toFixed(2)}`; };
    const N = 72, step = (o.max - o.min) / N;
    let segs = '';
    for (let i = 0; i < N; i++) {
      const v1 = o.min + i * step, v2 = Math.min(o.max, v1 + step * 1.04);
      segs += `<path d="${arc(r, v1, v2)}" stroke="${colorFor(o.m, v1 + step / 2, P)}"/>`;
    }
    let band = '';
    if (o.band) {
      band = `<path class="g-band" d="${arc(r + sw / 2 + 5, o.band.from, o.band.to)}"><title>${esc(o.band.label || '')}</title></path>`;
    }
    const ticks = (o.ticks || []).map(v => {
      const a = ang(v), p1 = pt(r - sw / 2 - 2, a), p2 = pt(r - sw / 2 - 7, a), lp = pt(r - sw / 2 - 15, a);
      const anchor = Math.cos(a) > 0.35 ? 'end' : Math.cos(a) < -0.35 ? 'start' : 'middle';
      return `<line class="g-tick" x1="${p1[0].toFixed(1)}" y1="${p1[1].toFixed(1)}" x2="${p2[0].toFixed(1)}" y2="${p2[1].toFixed(1)}"/><text class="g-tl" x="${lp[0].toFixed(1)}" y="${(lp[1] + 3).toFixed(1)}" text-anchor="${anchor}">${fmt(v, 0)}</text>`;
    }).join('');
    const marks = (o.marks || []).map(mk => { const a = ang(mk.v), p1 = pt(r - sw / 2, a), p2 = pt(r + sw / 2, a); return `<line class="g-mark" x1="${p1[0].toFixed(1)}" y1="${p1[1].toFixed(1)}" x2="${p2[0].toFixed(1)}" y2="${p2[1].toFixed(1)}"><title>${esc(mk.label)}</title></line>`; }).join('');
    let base = '';
    if (o.base != null) { const a = ang(o.base), p = pt(r + sw / 2 + 2, a), q1 = pt(r + sw / 2 + 9, a - 0.05), q2 = pt(r + sw / 2 + 9, a + 0.05); base = `<path class="g-base" d="M${p[0].toFixed(1)} ${p[1].toFixed(1)}L${q1[0].toFixed(1)} ${q1[1].toFixed(1)}L${q2[0].toFixed(1)} ${q2[1].toFixed(1)}Z"><title>Seu padrão</title></path>`; }
    let needle = '';
    if (o.v != null && !isNaN(o.v)) {
      const a = ang(o.v), tip = pt(r - sw / 2 - 3, a), b1 = pt(5, a + Math.PI / 2), b2 = pt(5, a - Math.PI / 2), tail = pt(10, a + Math.PI);
      needle = `<g class="g-needle"><path d="M${tip[0].toFixed(1)} ${tip[1].toFixed(1)}L${b1[0].toFixed(1)} ${b1[1].toFixed(1)}L${tail[0].toFixed(1)} ${tail[1].toFixed(1)}L${b2[0].toFixed(1)} ${b2[1].toFixed(1)}Z"/><circle cx="${cx}" cy="${cy}" r="6"/><circle class="g-hub" cx="${cx}" cy="${cy}" r="2.4"/></g>`;
    }
    const ends = `<text class="g-tl g-end" x="${cx - r}" y="${cy + 14}" text-anchor="middle">${fmt(o.min, 0)}</text><text class="g-tl g-end" x="${cx + r}" y="${cy + 14}" text-anchor="middle">${fmt(o.max, 0)}${o.v > o.max ? '+' : ''}</text>`;
    return `<svg class="gauge" viewBox="0 -14 ${W} ${H + 18}" role="img" aria-label="${esc(o.label || o.m.label)}: ${fmt(o.v, o.m.dec)} ${esc(o.m.unit)}"><g class="g-arc" fill="none" stroke-width="${sw}">${segs}</g>${band}${marks}${ticks}${base}${needle}${ends}</svg>`;
  }

  /* ---------- Barra horizontal ----------
     o: { m, v, min, max, base?, ticks?: [valor], zones?: [{from,to,label}] } */
  function hbar(o) {
    const P = palette(), pos = v => clamp((v - o.min) / (o.max - o.min), 0, 1) * 100;
    const stops = []; for (let i = 0; i <= 40; i++) { const v = o.min + (o.max - o.min) * i / 40; stops.push(`${colorFor(o.m, v, P)} ${(i * 2.5).toFixed(1)}%`); }
    const ticks = (o.ticks || []).map(v => `<span style="left:${pos(v).toFixed(1)}%">${fmt(v, o.tickDec || 0)}</span>`).join('');
    const base = o.base != null ? `<i class="hb-base" style="left:${pos(o.base).toFixed(1)}%" title="Seu padrão"></i>` : '';
    const mk = o.v != null ? `<i class="hb-mk" style="left:${pos(o.v).toFixed(1)}%"></i>` : '';
    const zones = (o.zones || []).map(z => `<span style="left:${((pos(z.from) + pos(z.to)) / 2).toFixed(1)}%">${esc(z.label)}</span>`).join('');
    return `<div class="hbar${zones ? ' has-z' : ''}" role="img" aria-label="${esc(o.m.label)}: ${fmt(o.v, o.m.dec)} ${esc(o.m.unit)}">${zones ? `<div class="hb-zones">${zones}</div>` : ''}<div class="hb-track" style="background:linear-gradient(90deg,${stops.join(',')})"></div>${base}${mk}<div class="hb-ticks"><span style="left:0">${fmt(o.min, o.tickDec || 0)}</span>${ticks}<span style="left:100%">${fmt(o.max, o.tickDec || 0)}</span></div></div>`;
  }

  /* ---------- Minigráfico ----------
     pts: [{t, v}] em ordem; o: { band?: [lo, hi], base?, color? } */
  function spark(pts, o = {}) {
    if (!pts.length) return '<div class="spark empty small muted">Sem dados</div>';
    const W = 200, H = 44, pad = 4;
    const vals = pts.map(p => p.v).concat(o.band ? o.band : []).concat(o.base != null ? [o.base] : []);
    let lo = Math.min(...vals), hi = Math.max(...vals); if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
    const span = hi - lo; lo -= span * 0.12; hi += span * 0.12;
    const x = i => pts.length === 1 ? W / 2 : pad + (W - 2 * pad) * i / (pts.length - 1);
    const y = v => H - pad - (H - 2 * pad) * (v - lo) / (hi - lo);
    const line = pts.map((p, i) => `${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
    const band = o.band ? `<rect class="sp-band" x="0" width="${W}" y="${y(o.band[1]).toFixed(1)}" height="${Math.max(0, y(o.band[0]) - y(o.band[1])).toFixed(1)}"/>` : '';
    const base = o.base != null ? `<line class="sp-base" x1="0" x2="${W}" y1="${y(o.base).toFixed(1)}" y2="${y(o.base).toFixed(1)}"/>` : '';
    const last = pts[pts.length - 1];
    return `<div class="spark"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${band}${base}<polyline points="${line}"/></svg><i style="left:${(x(pts.length - 1) / W * 100).toFixed(1)}%;top:${(y(last.v) / H * 100).toFixed(1)}%"></i></div>`;
  }

  Object.assign(window.UI, { gauge, hbar, spark, colorFor, severity });
})();
