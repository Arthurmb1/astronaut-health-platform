/* =========================================================
   Tripulante: mapa do corpo clicável (TRI-19)
   Figura em contorno holográfico; cada sistema do corpo recebe a
   cor do pior status entre suas métricas no último registro.
   Clique em um sistema: abre a métrica no TRI-10 e destaca a caixa.
   ========================================================= */
(function () {
  const A = window.AT, U = window.UI, M = window.MOD, { esc, fmt } = U;
  const T = (s, v) => window.I18N.t(s, v);

  /* Metade direita do contorno (x >= 0, y para baixo). Espelhada para formar o corpo. */
  const HALF = [[0, 0], [11, 2], [18, 10], [20, 24], [18, 38], [13, 49], [9, 55], [9, 63], [20, 68], [33, 72], [41, 79], [45, 92],
    [47, 115], [50, 140], [54, 165], [57, 188], [60, 198], [62, 214], [58, 226], [52, 224], [50, 210], [48, 196], [45, 172], [41, 146],
    [37, 122], [33, 104], [31, 124], [28, 150], [28, 166], [33, 186], [35, 206], [34, 240], [31, 275], [28, 296], [30, 320], [27, 355],
    [21, 384], [26, 396], [27, 406], [10, 408], [10, 394], [11, 380], [12, 350], [13, 322], [11, 296], [10, 268], [7, 236], [3, 214], [0, 212]];

  function bodyPath() {
    const right = HALF.slice(0, -1), left = HALF.slice(1).reverse().map(([x, y]) => [-x, y]).slice(0, -1);
    const P = right.concat(left), n = P.length;
    let d = `M${P[0][0]} ${P[0][1]}`;
    for (let i = 0; i < n; i++) {   // Catmull-Rom fechado -> Bézier cúbica
      const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0]} ${p2[1]}`;
    }
    return d + 'Z';
  }
  const BODY = bodyPath();

  /* Órgãos (traço fino). Cada um pertence a um sistema e herda a cor do status. */
  const ORGANS = {
    neuro: '<path d="M-12 20c0-9 6-14 12-14s12 5 12 14c0 7-5 11-12 11S-12 27-12 20z"/><path d="M0 7v23M-7 13c3 2 3 6 0 8M7 13c-3 2-3 6 0 8"/>',
    resp: '<path d="M-4 86c-8 2-17 14-19 32-1 12 1 21 6 22 6 1 11-4 13-12V86z"/><path d="M4 86c8 2 17 14 19 32 1 12-1 21-6 22-6 1-11-4-13-12V86z"/>',
    cardio: '<path d="M6 128c-7-5-11-9-11-14 0-4 3-6 6-6 2 0 4 1 5 3 1-2 3-3 5-3 3 0 6 2 6 6 0 5-4 9-11 14z"/>',
    imuno: '<ellipse cx="-14" cy="156" rx="6" ry="9" transform="rotate(20 -14 156)"/><circle cx="-12" cy="66" r="2.2"/><circle cx="12" cy="66" r="2.2"/><circle cx="-24" cy="98" r="2"/><circle cx="24" cy="98" r="2"/>',
    metab: '<path d="M-14 166c4-6 24-6 28 0 3 8-2 22-14 22s-17-14-14-22z"/><path d="M-8 174c5 3 11 3 16 0M-8 181c5 2 11 2 16 0"/>',
    osseo: '<path d="M0 60v150" stroke-dasharray="2 3"/><path d="M-18 92c10 4 26 4 36 0M-19 104c11 4 27 4 38 0M-19 116c11 4 27 4 38 0M-17 128c10 3 24 3 34 0"/><path d="M-20 215v70M20 215v70M-19 300v70M19 300v70"/><circle cx="-20" cy="292" r="3"/><circle cx="20" cy="292" r="3"/>',
  };

  /* Sistemas: posição do ponto, lado do rótulo, métricas, caixa de destino */
  const SYS = [
    { id: 'neuro', name: 'Neurocognitivo', p: [0, 20], side: -1, ly: 22, metrics: ['sleep', 'eff', 'mood', 'stress', 'rt', 'cort'], go: 'sleep', target: 'TRI-06',
      sum: g => `${T('Sono')} ${g('sleep', 1, 'h')}` },
    { id: 'resp', name: 'Respiratório', p: [-14, 112], side: -1, ly: 112, metrics: ['spo2'], go: 'spo2', target: 'TRI-15',
      sum: g => `SpO₂ ${g('spo2', 0, '%')}` },
    { id: 'metab', name: 'Metabólico', p: [0, 178], side: -1, ly: 200, metrics: ['mass', 'glu', 'shannon'], go: 'mass', target: 'TRI-17',
      sum: g => `${T('Massa')} ${g('mass', 1, 'kg')}` },
    { id: 'cardio', name: 'Cardiovascular', p: [6, 118], side: 1, ly: 92, metrics: ['hr', 'sbp', 'dbp', 'imt'], go: 'hr', target: 'TRI-13',
      sum: g => `${T('PA')} ${g('sbp', 0)}/${g('dbp', 0)}` },
    { id: 'imuno', name: 'Imunológico', p: [-14, 156], side: 1, ly: 160, metrics: ['temp', 'wbc', 'crp', 'ebv'], go: 'wbc', target: 'TRI-07',
      sum: g => `${T('Temp')} ${g('temp', 1, '°C')}` },
    { id: 'osseo', name: 'Ósseo-muscular', p: [20, 292], side: 1, ly: 292, metrics: ['ctx', 'vitd'], go: 'ctx', target: 'TRI-07',
      sum: g => `${T('Vit. D')} ${g('vitd', 0)} ng/mL` },
  ];
  const LVL_TXT = ['Normal', 'Atenção', 'Crítico'];

  function sysStatus(c, s) {
    const items = c.st.items.filter(i => s.metrics.includes(i.m.key));
    return items.length ? Math.max(...items.map(i => i.level)) : null;
  }

  M.define({ id: 'TRI-19', key: 'tri.corpo', title: 'Mapa do corpo', sub: 'Clique em um sistema para ver os detalhes', size: 'm', rows: 2,
    render(b, c) {
      const get = (k, d, u) => { const a = c.st.items.find(i => i.m.key === k); return a ? fmt(a.v, d) + (u ? ' ' + u : '') : '—'; };
      const st = Object.fromEntries(SYS.map(s => [s.id, sysStatus(c, s)]));
      /* Resumo: se algo estiver fora do esperado, mostra a métrica pior; senão, o resumo padrão do sistema */
      const summary = s => {
        const bad = c.st.items.filter(i => s.metrics.includes(i.m.key) && i.level > 0).sort((x, y) => y.level - x.level || (y.sz || 0) - (x.sz || 0))[0];
        return bad ? `${bad.m.short} ${fmt(bad.v, bad.m.dec)} ${bad.m.unit}` : s.sum(get);
      };
      const cls = l => l == null ? 'ln' : 'l' + l;
      const LX = 94;   // rótulos começam aqui e crescem para fora, sem cobrir o corpo
      const labels = SYS.map(s => {
        const l = st[s.id], x0 = s.p[0], y0 = s.p[1], ex = s.side * 72, tx = s.side * LX, anchor = s.side < 0 ? 'end' : 'start';
        return `<g class="bm-sys ${cls(l)}" data-sys="${s.id}" role="button" tabindex="0" aria-label="${esc(T(s.name))}: ${l == null ? T('sem dados') : T(LVL_TXT[l])}. ${esc(summary(s))}">
          <polyline class="bm-lead" points="${x0},${y0} ${ex},${s.ly} ${tx - s.side * 4},${s.ly}"/>
          <circle class="bm-ring" cx="${x0}" cy="${y0}" r="7"/><circle class="bm-dot" cx="${x0}" cy="${y0}" r="3.2"/>
          <text class="bm-name" x="${tx}" y="${s.ly - 6}" text-anchor="${anchor}">${esc(T(s.name))}</text>
          <text class="bm-st" x="${tx}" y="${s.ly + 6}" text-anchor="${anchor}">${l == null ? T('Sem dados') : T(LVL_TXT[l])}</text>
          <text class="bm-sum" x="${tx}" y="${s.ly + 17}" text-anchor="${anchor}">${esc(summary(s))}</text>
          <rect class="bm-hit" x="${s.side < 0 ? -186 : ex}" y="${s.ly - 18}" width="${186 - 72}" height="40"/>
        </g>`;
      }).join('');
      const organs = SYS.map(s => `<g class="bm-org ${cls(st[s.id])}" data-org="${s.id}">${ORGANS[s.id]}</g>`).join('');
      b.innerHTML = `<div class="bodymap"><svg viewBox="-186 -14 372 450" role="group" aria-label="${T('Mapa do corpo com status por sistema')}">
        <defs>
          <clipPath id="bm-clip"><path d="${BODY}"/></clipPath>
          <linearGradient id="bm-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".16"/><stop offset="1" stop-color="var(--accent)" stop-opacity=".04"/></linearGradient>
          <linearGradient id="bm-scan" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity="0"/><stop offset=".85" stop-color="var(--accent)" stop-opacity=".22"/><stop offset="1" stop-color="var(--accent)" stop-opacity=".55"/></linearGradient>
          <radialGradient id="bm-pad"><stop offset="0" stop-color="var(--accent)" stop-opacity=".35"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></radialGradient>
        </defs>
        <ellipse class="bm-pad-glow" cx="0" cy="410" rx="78" ry="14" fill="url(#bm-pad)"/>
        <ellipse class="bm-pad" cx="0" cy="410" rx="58" ry="9"/><ellipse class="bm-pad" cx="0" cy="410" rx="40" ry="6" opacity=".6"/>
        <path class="bm-body" d="${BODY}" fill="url(#bm-fill)"/>
        <g clip-path="url(#bm-clip)"><rect class="bm-scanbar" x="-70" y="-40" width="140" height="40" fill="url(#bm-scan)"/></g>
        <g class="bm-organs">${organs}</g>
        ${labels}
      </svg>
      <div class="bm-key"><span><i class="l0"></i>${T('Normal')}</span><span><i class="l1"></i>${T('Atenção')}</span><span><i class="l2"></i>${T('Crítico')}</span></div></div>`;

      b.querySelectorAll('.bm-sys').forEach(g => {
        const s = SYS.find(x => x.id === g.dataset.sys), org = b.querySelector(`[data-org="${s.id}"]`);
        const go = () => {
          c.S.metric = s.go; c.rerender();
          const t = document.querySelector(`[data-mod="${s.target}"]`);
          if (t) { t.scrollIntoView({ behavior: 'smooth', block: 'center' }); t.classList.remove('flash'); void t.offsetWidth; t.classList.add('flash'); }
        };
        g.addEventListener('click', go);
        g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
        g.addEventListener('mouseenter', () => org.classList.add('hi')); g.addEventListener('mouseleave', () => org.classList.remove('hi'));
        g.addEventListener('focus', () => org.classList.add('hi')); g.addEventListener('blur', () => org.classList.remove('hi'));
      });
    } });

  window.BODYMAP = { SYS, BODY };
})();
