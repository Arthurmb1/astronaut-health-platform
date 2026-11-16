/* =========================================================
   Tripulante: sono (TRI-20)
   Fases do sono SINTÉTICAS (data/sleep_stages.csv, gerado por
   scripts/gen_sleep_stages.py). Só exibição: não entram no diagnóstico.
   ========================================================= */
(function () {
  const A = window.AT, U = window.UI, M = window.MOD, { esc, fmt, icon, chip } = U;
  const T = (s, v) => window.I18N.t(s, v);

  /* Referência para adultos saudáveis (% do tempo total de sono). A CONFERIR na fonte. */
  const STG = [
    { k: 'light', name: 'Sono leve', ref: [50, 60], what: 'Fases N1 e N2: transição e sono estável.' },
    { k: 'deep', name: 'Sono profundo', ref: [13, 23], what: 'Fase N3: recuperação física e imune.' },
    { k: 'rem', name: 'Sono REM', ref: [20, 25], what: 'Sonhos, memória e regulação emocional.' },
  ];
  const hm = min => `${Math.floor(min / 60)} h ${String(Math.round(min % 60)).padStart(2, '0')} min`;

  function donut(n) {
    const R = 52, C = 2 * Math.PI * R, gap = 1.6;
    let off = 0;
    const arcs = STG.map(s => {
      const len = C * n[s.k] / 100, a = `<circle class="sd-arc sd-${s.k}" r="${R}" cx="70" cy="70" stroke-dasharray="${Math.max(0, len - gap).toFixed(2)} ${C.toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}"><title>${T(s.name)}: ${fmt(n[s.k], 1)}%</title></circle>`;
      off += len; return a;
    }).join('');
    return `<svg class="sdonut" viewBox="0 0 140 140" role="img" aria-label="${T('Fases do sono')}: ${T('Sono leve')} ${fmt(n.light, 0)}%, ${T('Sono profundo')} ${fmt(n.deep, 0)}%, REM ${fmt(n.rem, 0)}%"><circle class="sd-track" r="${R}" cx="70" cy="70"/><g transform="rotate(-90 70 70)">${arcs}</g><text x="70" y="70" class="sd-big">${Math.floor(n.tst / 60)}h${String(Math.round(n.tst % 60)).padStart(2, '0')}</text><text x="70" y="88" class="sd-sm">${T('dormindo')}</text></svg>`;
  }

  function bars(nights) {
    const W = 300, H = 92, pad = 2, maxMin = Math.max(540, ...nights.map(n => n.tst)), bw = (W - pad * 2) / nights.length;
    const cols = nights.map((n, i) => {
      let y = H; const x = pad + i * bw + bw * 0.18, w = bw * 0.64;
      const seg = ['deep', 'rem', 'light'].map(k => { const h = H * (n.tst * n[k] / 100) / maxMin; y -= h; return `<rect class="sd-${k}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${Math.max(0, h - 0.6).toFixed(1)}"/>`; }).join('');
      return `<g><title>${U.fmtD(n.date)}: ${hm(n.tst)} · ${T('Sono leve')} ${fmt(n.light, 0)}%, ${T('Sono profundo')} ${fmt(n.deep, 0)}%, REM ${fmt(n.rem, 0)}%</title>${seg}</g>`;
    }).join('');
    const y7 = H - H * 420 / maxMin;
    return `<svg class="sbars" viewBox="0 0 ${W} ${H + 14}" preserveAspectRatio="none" aria-hidden="true"><line class="sb-ref" x1="0" x2="${W}" y1="${y7.toFixed(1)}" y2="${y7.toFixed(1)}"/>${cols}</svg>
      <div class="sb-ax"><span>${U.fmtD(nights[0].date)}</span><span>${T('linha tracejada: 7 h')}</span><span>${U.fmtD(nights[nights.length - 1].date)}</span></div>`;
  }

  M.define({ id: 'TRI-20', key: 'tri.sono', title: 'Sono', sub: 'Fases da última noite, eficiência e últimas 14 noites', size: 'xl',
    render(b, c, el) {
      const nights = A.sleepNights(c.crew.id), n = nights[nights.length - 1];
      const effA = c.st.items.find(i => i.m.key === 'eff'), slA = c.st.items.find(i => i.m.key === 'sleep');
      el.querySelector('.mod-x').innerHTML = `<span class="chip n" title="${T('Fases do sono geradas para demonstração; não são medidas reais')}">${T('Fases sintéticas')}</span>${slA ? chip(Math.max(slA.level, effA ? effA.level : 0)) : ''}`;
      if (!n) { b.innerHTML = `<div class="empty"><b>${T('Sem fases do sono')}</b>${T('Rode scripts/gen_sleep_stages.py e web/prep_data.py.')}</div>`; return; }
      const m = A.MBY.eff, bs = A.baseline(m, c.crew.id);
      const legend = STG.map(s => {
        const v = n[s.k], out = v < s.ref[0] ? T('abaixo') : v > s.ref[1] ? T('acima') : null;
        return `<li><i class="sd-sw sd-${s.k}"></i><div><b>${T(s.name)}</b><span>${T(s.what)}</span></div><strong class="num">${fmt(v, 0)}%<small>${hm(n.tst * v / 100)}</small></strong><em class="${out ? 'out' : ''}">${T('ref. {a} a {b}%', { a: s.ref[0], b: s.ref[1] })}${out ? ` · ${out}` : ''}</em></li>`;
      }).join('');
      b.innerHTML = `<div class="sleep">
        <div class="sl-donut">${donut(n)}<time>${T('Noite de {d}', { d: U.fmtDT(n.date) })}</time></div>
        <ul class="sl-leg">${legend}</ul>
        <div class="sl-eff"><h3>${T('Eficiência do sono')}</h3><div class="gauge-wrap sm">${U.gauge({ m, v: effA && effA.v, min: 60, max: 100, base: bs && bs.med, ticks: [m.warn[0], m.ok[0]] })}</div>
          <div class="vr"><strong class="num">${effA ? fmt(effA.v, 0) : '—'}<small>%</small></strong><span>${T('do tempo na cama dormindo')}</span></div></div>
        <div class="sl-hist"><h3>${T('Últimas 14 noites')} <span>${T('(altura = horas dormidas; cores = fases)')}</span></h3>${bars(nights.slice(-14))}</div>
      </div>
      <p class="vnote">${T('Fases do sono sintéticas, geradas a partir da duração, da eficiência, do estresse e da idade de cada tripulante, para demonstrar a visualização. As faixas de referência (adultos saudáveis) ainda precisam ser conferidas na fonte. Em missão, as fases viriam de uma faixa de EEG ou de um vestível validado.')}</p>`;
    } });
})();
