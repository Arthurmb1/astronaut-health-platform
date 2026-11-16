/* =========================================================
   Tripulante: módulos de sinais vitais (TRI-05, TRI-13 a TRI-18)
   Faixas e cores vêm do motor (AT.MBY[...].ok / .warn).
   ========================================================= */
(function () {
  const A = window.AT, U = window.UI, M = window.MOD, { esc, fmt, icon, chip } = U;
  const T = (s, v) => window.I18N.t(s, v);

  const get = (c, k) => c.st.items.find(i => i.m.key === k);
  const base = (c, k) => { const b = A.baseline(A.MBY[k], c.crew.id); return b && b.source === 'individual' ? b : null; };
  const last14 = (c, k) => A.daily(A.MBY[k], c.crew.id).slice(-14);

  /* Botão "Histórico": abre a métrica no TRI-10 */
  function histBtn(el, c, key) {
    const x = el.querySelector('.mod-x');
    x.insertAdjacentHTML('beforeend', `<button class="btn ghost sm hist-btn" type="button" aria-label="${T('Ver histórico da missão')}" title="${T('Ver histórico da missão (abre no TRI-10)')}">${icon('chart')}</button>`);
    x.querySelector('.hist-btn').onclick = () => {
      c.S.metric = key; c.rerender();
      const t = document.querySelector('[data-mod="TRI-10"]'); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  }
  function statusChip(el, a) { el.querySelector('.mod-x').insertAdjacentHTML('afterbegin', a ? chip(a.level) : `<span class="chip n">${T('Sem dados')}</span>`); }

  /* Valor grande + padrão pessoal */
  function readout(a, m, b, extra) {
    if (!a) return '<div class="vr"><strong class="num">—</strong></div>';
    const rd = x => Math.round(x * Math.pow(10, m.dec)) / Math.pow(10, m.dec);
    const d = b ? rd(rd(a.v) - rd(b.med)) : null;  // diferença entre os valores como exibidos
    const vs = b ? `${T('Seu padrão:')} <b class="num">${fmt(b.med, m.dec)}</b> ${esc(m.unit)}${Math.abs(d) >= Math.pow(10, -m.dec) ? ` (${d > 0 ? '+' : '−'}${fmt(Math.abs(d), m.dec)})` : ''}` : T('Padrão pessoal ainda não calculado');
    return `<div class="vr"><strong class="num">${fmt(a.v, m.dec)}<small>${esc(m.unit)}</small></strong><span>${vs}</span>${extra || ''}<time>${a.p ? T('Medido em {d}', { d: U.fmtDT(a.p.date) }) : ''}</time></div>`;
  }

  /* ---------- TRI-05 Cabeçalho da seção de sinais vitais ---------- */
  M.define({ id: 'TRI-05', key: 'tri.vitais.secao', title: 'Sinais vitais', size: 'full', bare: true,
    render(b, c) {
      const cs = c.st.cat.vitals;
      b.innerHTML = `<div class="sec-h"><span class="sec-ic">${icon('heart')}</span><div><h2>${T('Sinais vitais')}</h2><p>${T('Medidas em repouso, protocolo matinal. Verde é a faixa esperada; a cor muda em degradê ao se aproximar dos limites. O triângulo ciano marca o seu padrão pessoal.')}</p></div>${cs.level == null ? `<span class="chip n">${T('Sem dados')}</span>` : chip(cs.level)}</div>`;
    } });

  /* ---------- TRI-13 Frequência cardíaca ---------- */
  M.define({ id: 'TRI-13', key: 'tri.vitais.fc', title: 'Frequência cardíaca', sub: 'Em repouso', size: 'm',
    render(b, c, el) {
      const m = A.MBY.hr, a = get(c, 'hr'), bs = base(c, 'hr');
      statusChip(el, a); histBtn(el, c, 'hr');
      b.innerHTML = `<div class="gauge-wrap">${U.gauge({ m, v: a && a.v, min: 20, max: 120, base: bs && bs.med, ticks: [m.ok[0], m.ok[1]], marks: [{ v: 60, label: T('60 bpm: limite inferior usual da AHA (atletas costumam ficar abaixo)') }], band: { from: m.ok[1], to: 120, label: T('Faixa esperada durante exercício') } })}</div>
        <div class="g-leg"><span><i class="lg-dash"></i>${T('Esperado em exercício')}</span><span><i class="lg-mark"></i>60 bpm (AHA)</span><span><i class="lg-base"></i>${T('Seu padrão')}</span></div>
        ${readout(a, m, bs)}
        <p class="vnote">${T('Repouso: {a} a {b} bpm. Abaixo de 60 é comum em atletas treinados, como astronautas. Durante exercício, valores acima de {b} bpm são esperados e não geram alerta.', { a: m.ok[0], b: m.ok[1] })}</p>`;
    } });

  /* ---------- TRI-14 Pressão arterial ---------- */
  M.define({ id: 'TRI-14', key: 'tri.vitais.pa', title: 'Pressão arterial', sub: 'Sistólica / diastólica', size: 'm',
    render(b, c, el) {
      const ms = A.MBY.sbp, md = A.MBY.dbp, s = get(c, 'sbp'), d = get(c, 'dbp'), bs = base(c, 'sbp'), bd = base(c, 'dbp');
      const lvl = s || d ? { level: Math.max(s ? s.level : 0, d ? d.level : 0) } : null;
      statusChip(el, lvl); histBtn(el, c, 'sbp');
      const one = (m, a, bb, min, max, aha, lab) => `<div class="g2-item"><div class="gauge-wrap sm">${U.gauge({ m, v: a && a.v, min, max, base: bb && bb.med, ticks: [m.ok[0], m.ok[1]], marks: aha.map(v => ({ v, label: T('{v} mmHg: corte de categoria da AHA 2017', { v }) })) })}</div><span>${lab}</span></div>`;
      b.innerHTML = `<div class="g2">${one(ms, s, bs, 70, 180, [120, 130], T('Sistólica'))}${one(md, d, bd, 40, 110, [80], T('Diastólica'))}</div>
        <div class="vr"><strong class="num">${s ? fmt(s.v, 0) : '—'}/${d ? fmt(d.v, 0) : '—'}<small>mmHg</small></strong><span>${bs && bd ? `${T('Seu padrão:')} <b class="num">${fmt(bs.med, 0)}/${fmt(bd.med, 0)}</b> mmHg` : T('Padrão pessoal ainda não calculado')}</span><time>${s && s.p ? T('Medido em {d}', { d: U.fmtDT(s.p.date) }) : ''}</time></div>
        <p class="vnote">${T('Traços brancos: cortes da AHA 2017 (normal abaixo de 120/80, hipertensão a partir de 130/80). Cores: faixas do protótipo, verde até {s}/{d}.', { s: ms.ok[1], d: md.ok[1] })}</p>`;
    } });

  /* ---------- TRI-15 Saturação de O2 ---------- */
  M.define({ id: 'TRI-15', key: 'tri.vitais.spo2', title: 'Saturação de O₂', sub: 'Oxímetro de dedo', size: 'm',
    render(b, c, el) {
      const m = A.MBY.spo2, a = get(c, 'spo2'), bs = base(c, 'spo2');
      statusChip(el, a); histBtn(el, c, 'spo2');
      b.innerHTML = `${readout(a, m, bs)}
        <div class="o2">${U.hbar({ m, v: a && a.v, min: 85, max: 100, base: bs && bs.med, ticks: [m.warn[0], m.ok[0]], zones: [{ from: 85, to: m.warn[0], label: T('Baixa') }, { from: m.warn[0], to: m.ok[0], label: T('Atenção') }, { from: m.ok[0], to: 100, label: T('Ideal') }] })}</div>
        <div class="sp-wrap"><span>${T('Últimos 14 dias')}</span>${U.spark(last14(c, 'spo2'), { band: m.ok })}</div>
        <p class="vnote">${T('De {a}% a 100% é a faixa ideal. Abaixo de {b}%, acione o médico de voo e verifique o O₂ da cabine.', { a: m.ok[0], b: m.warn[0] })}</p>`;
    } });

  /* ---------- TRI-16 a TRI-18 Cartões compactos ---------- */
  function compact(id, key, title, sub, scale, ticks, tickDec, size = 'm') {
    M.define({ id, key: 'tri.vitais.' + key, title, sub, size,
      render(b, c, el) {
        const m = A.MBY[key], a = get(c, key), bs = base(c, key);
        statusChip(el, a); histBtn(el, c, key);
        let bar = '', extra = '', band = m.ok, note = '';
        if (m.ok) {
          bar = U.hbar({ m, v: a && a.v, min: scale[0], max: scale[1], base: bs && bs.med, ticks, tickDec });
          note = T('Faixa esperada: {a} a {b} {u}.', { a: fmt(m.ok[0], m.dec), b: fmt(m.ok[1], m.dec), u: m.unit });
        } else if (bs && a) {
          const pct = (a.v - bs.med) / bs.med * 100;
          band = [bs.med * (1 - m.pct[0] / 100), bs.med * (1 + m.pct[0] / 100)];
          extra = `<span class="delta ${a.pctLevel ? 'l' + a.pctLevel : ''}">${T('{p}% sobre o seu padrão', { p: `${pct > 0 ? '+' : '−'}${fmt(Math.abs(pct), 1)}` })}</span>`;
          note = T('Atenção a partir de {a}% de variação sobre o seu padrão; crítico a partir de {b}%.', { a: fmt(m.pct[0], 1), b: fmt(m.pct[1], 0) });
        }
        b.innerHTML = `${readout(a, m, bs, extra)}${bar}<div class="sp-wrap"><span>${T('Últimos 14 dias')}</span>${U.spark(last14(c, key), { band, base: bs && bs.med })}</div><p class="vnote">${esc(note)}</p>`;
      } });
  }
  compact('TRI-16', 'temp', 'Temperatura corporal', 'Termômetro de ouvido ou testa', [35, 39], [36, 37.5], 1);
  compact('TRI-17', 'mass', 'Massa corporal', 'Dispositivo de massa da estação', null, null, 0, 'l');
  compact('TRI-18', 'glu', 'Glicemia capilar', 'Em jejum, pela manhã', [50, 140], [70, 110], 0, 'l');
})();
