/* =========================================================
   Análise exploratória
   ========================================================= */
(function () {
  const A = window.AT, U = window.UI, { esc, fmt, icon, chip } = U;
  const V = (window.VIEWS = window.VIEWS || {});
  const EX = { crews: null, range: 'all', phase: 'all', metric: 'hr', z: 3, days: 3, xm: 'co2', ym: 'sleep' };
  const CORR = ['hr', 'sbp', 'glu', 'temp', 'sleep', 'eff', 'mood', 'stress', 'rt', 'co2', 'rad_rate'];
  const CAREER_LIMIT = 600;

  const win = () => { const end = A.lastDate().slice(0, 10); const days = EX.range === 'all' ? null : +EX.range; return { start: days ? U.fromT(A.ts(end) - (days - 1) * A.DAY) : '0000-00-00', end }; };
  const inWin = (d, usePhase = true) => { const w = win(); return d >= w.start && d <= w.end && (!usePhase || EX.phase === 'all' || A.phaseForDate(d) === EX.phase); };
  const sel = () => A.DB.crew.filter(c => EX.crews.has(c.id));
  const pts = (m, crew, usePhase = true) => (m.cat === 'env' ? A.daily(m, 0) : A.series(m, crew)).filter(p => inWin(p.d, usePhase));
  const metOptions = (cur, keys) => ['vitals', 'mental', 'lab', 'rad', 'env'].map(cat => `<optgroup label="${A.CATS[cat].label}">${A.MET.filter(m => m.cat === cat && (!keys || keys.includes(m.key))).map(m => `<option value="${m.key}" ${m.key === cur ? 'selected' : ''}>${esc(m.label)}</option>`).join('')}</optgroup>`).join('');
  const $ = (r, s) => r.querySelector(s);

  function render(root) {
    if (!EX.crews) EX.crews = new Set(A.DB.crew.map(c => c.id));
    [...EX.crews].forEach(id => { if (!A.DB.crew.find(c => c.id === id)) EX.crews.delete(id); });
    if (!EX.crews.size) EX.crews = new Set(A.DB.crew.map(c => c.id));
    root.innerHTML = `<div class="view-in">
      <div class="filters card" role="group" aria-label="Filtros da análise">
        <div class="grp"><span>Tripulantes</span>${A.DB.crew.map(c => `<button class="pill" data-c="${c.id}" aria-pressed="${EX.crews.has(c.id)}"><i style="background:${U.crewColor(c.id)}"></i>${esc(c.name.split(' ')[0])}</button>`).join('')}<button class="btn ghost sm" id="allc">Todos</button></div>
        <div class="grp"><span>Período</span><div class="seg" id="rng">${[['all', 'Missão toda'], ['30', '30 dias'], ['14', '14 dias'], ['7', '7 dias']].map(([v, l]) => `<button data-v="${v}" aria-pressed="${EX.range === v}">${l}</button>`).join('')}</div></div>
        <div class="grp"><span>Fase</span><select class="sel" id="phs"><option value="all">Todas</option>${A.PHASES.map(p => `<option value="${p}" ${EX.phase === p ? 'selected' : ''}>${A.PHASE_PT[p]}</option>`).join('')}</select></div>
      </div>
      <div class="kpis" id="kpis"></div>
      <div class="stack">
        <div class="card"><div class="card-h"><div><h2>Evolução no tempo</h2><p id="main-sub"></p></div><select class="sel" id="mm" aria-label="Métrica">${metOptions(EX.metric)}</select></div><div class="card-b"><div class="chart-box" id="main"></div><div class="legend" id="main-lg" style="margin-top:10px"></div></div></div>
        <div class="grid g-7-5">
          <div class="card"><div class="card-h"><div><h3>Desvios por tripulante</h3><p>Média dos 7 últimos registros do período, em desvios do padrão individual (σ). Contorno = fora do esperado.</p></div></div><div class="card-b"><div class="chart-box" id="heat"></div>
            <div class="legend" style="margin-top:10px"><span><i class="sw" style="background:var(--c1)"></i>Abaixo do padrão</span><span><i class="sw" style="background:var(--div-neutral)"></i>Perto do padrão</span><span><i class="sw" style="background:var(--c8)"></i>Acima do padrão</span></div></div></div>
          <div class="card"><div class="card-h"><div><h3>Eventos persistentes</h3><p>Dias seguidos com desvio adverso, como no pipeline de detecção.</p></div></div>
            <div class="card-b" style="padding-bottom:6px"><div class="grp" style="display:flex;gap:22px;flex-wrap:wrap;font-size:12.5px;color:var(--ink-2)"><label class="range">Desvio mínimo <input type="range" id="zr" min="2" max="4" step="0.5" value="${EX.z}"><b class="num" id="zv"></b></label><label class="range">Dias seguidos <input type="range" id="dr" min="2" max="7" step="1" value="${EX.days}"><b class="num" id="dv"></b></label></div></div>
            <div id="events" style="max-height:640px;overflow:auto"></div></div>
        </div>
        <div class="grid g2">
          <div class="card"><div class="card-h"><div><h3>Como os indicadores se movem juntos</h3><p>Correlação dentro de cada pessoa (cada valor comparado à média do próprio tripulante).</p></div></div><div class="card-b"><div class="chart-box" id="corr"></div><p class="small muted" id="corr-note" style="margin:10px 0 0"></p></div></div>
          <div class="card"><div class="card-h"><div><h3>Relação entre dois indicadores</h3><p id="sc-sub"></p></div><div style="display:flex;gap:8px;flex-wrap:wrap"><select class="sel" id="sx" aria-label="Eixo X">${metOptions(EX.xm, CORR)}</select><select class="sel" id="sy" aria-label="Eixo Y">${metOptions(EX.ym, CORR)}</select></div></div><div class="card-b"><div class="chart-box" id="sc"></div><div class="legend" id="sc-lg" style="margin-top:10px"></div></div></div>
        </div>
        <div class="grid g2">
          <div class="card"><div class="card-h"><div><h3>Comparação entre fases da missão</h3><p id="ph-sub"></p></div></div><div class="card-b"><div class="chart-box" id="ph"></div></div></div>
          <div class="card"><div class="card-h"><div><h3>Detector contra cenários simulados</h3><p>O gerador de dados registrou 4 cenários. Veja se o detector os encontra com os limites escolhidos.</p></div></div><div class="card-b" style="padding:8px 0 0" id="det"></div></div>
        </div></div></div>`;
    bind(root); drawAll(root);
  }

  function bind(root) {
    root.querySelectorAll('.pill').forEach(b => b.onclick = () => { const id = +b.dataset.c; if (EX.crews.has(id)) { if (EX.crews.size > 1) EX.crews.delete(id); } else EX.crews.add(id); b.setAttribute('aria-pressed', EX.crews.has(id)); drawAll(root); });
    $(root, '#allc').onclick = () => { EX.crews = new Set(A.DB.crew.map(c => c.id)); root.querySelectorAll('.pill').forEach(b => b.setAttribute('aria-pressed', true)); drawAll(root); };
    root.querySelectorAll('#rng button').forEach(b => b.onclick = () => { EX.range = b.dataset.v; root.querySelectorAll('#rng button').forEach(x => x.setAttribute('aria-pressed', x === b)); drawAll(root); });
    $(root, '#phs').onchange = e => { EX.phase = e.target.value; drawAll(root); };
    $(root, '#mm').onchange = e => { EX.metric = e.target.value; drawMain(root); drawPhase(root); };
    $(root, '#sx').onchange = e => { EX.xm = e.target.value; drawScatter(root); };
    $(root, '#sy').onchange = e => { EX.ym = e.target.value; drawScatter(root); };
    $(root, '#zr').oninput = e => { EX.z = +e.target.value; drawEvents(root); drawDetect(root); };
    $(root, '#dr').oninput = e => { EX.days = +e.target.value; drawEvents(root); drawDetect(root); };
  }
  function drawAll(root) { drawKPIs(root); drawMain(root); drawHeat(root); drawEvents(root); drawCorr(root); drawScatter(root); drawPhase(root); drawDetect(root); }

  /* ---- KPIs ---- */
  function eventsFor(crews) { const w = win(); return crews.flatMap(c => A.persistent(c.id, EX.z, EX.days)).filter(e => e.end >= w.start && e.start <= w.end); }
  function drawKPIs(root) {
    const cs = sel(), w = win();
    let n = 0, user = 0;
    cs.forEach(c => { ['vitals', 'mental', 'rad'].forEach(t => A.DB[t].forEach(r => { if (r.crew === c.id && inWin(r.date)) { n++; if (r.user) user++; } })); A.DB.labs.forEach(r => { if (r.crew === c.id && inWin(r.date)) { n++; if (r.user) user++; } }); });
    const alerts = cs.filter(c => A.crewStatus(c.id).level > 0).length, crit = cs.filter(c => A.crewStatus(c.id).level === 2).length;
    const evs = eventsFor(cs), cm = A.MBY.rad_cum;
    const cums = cs.map(c => A.latest(cm, c.id)).filter(Boolean).map(p => p.v), mx = cums.length ? Math.max(...cums) : null;
    $(root, '#kpis').innerHTML = `
      <div class="card kpi"><small>Registros no filtro</small><strong>${n.toLocaleString('pt-BR')}</strong><p>${user ? `${user} inseridos por você` : 'Todos da base de demonstração'}</p></div>
      <div class="card kpi"><small>Tripulantes com alerta</small><strong>${alerts}<sub>de ${cs.length}</sub></strong><p>${crit ? `${crit} em nível crítico` : 'Nenhum em nível crítico'} no último registro</p></div>
      <div class="card kpi"><small>Eventos persistentes</small><strong>${evs.length}</strong><p>${EX.days}+ dias seguidos com desvio de ${fmt(EX.z, 1)}σ ou mais</p></div>
      <div class="card kpi"><small>Dose acumulada máxima</small><strong>${mx == null ? '—' : fmt(mx, 2)}<sub>mSv</sub></strong><p>${mx == null ? '' : `${fmt(mx / CAREER_LIMIT * 100, 2)}% do limite de carreira de ${CAREER_LIMIT} mSv`}</p></div>`;
  }

  /* ---- Gráfico principal ---- */
  function drawMain(root) {
    const m = A.MBY[EX.metric], cs = sel(), one = cs.length === 1, c0 = cs[0];
    const series = m.cat === 'env' ? [{ id: 0, name: 'Cabine', color: 'var(--c1)', pts: pts(m, 0) }] : cs.map(c => ({ id: c.id, name: c.name, color: U.crewColor(c.id), pts: pts(m, c.id), width: one ? 2.4 : 1.8, dim: !one }));
    const b = one && m.cat !== 'env' || m.cat === 'env' ? A.baseline(m, c0.id) : null;
    const phases = []; let cur = null; A.DB.phases.forEach(([d, p]) => { if (!cur || cur.label !== p) { cur = { label: p, from: A.ts(d), to: A.ts(d) + A.DAY }; phases.push(cur); } else cur.to = A.ts(d) + A.DAY; });
    const evs = one ? A.DB.events.filter(e => e.crew === c0.id).map(e => ({ from: A.ts(e.start), to: A.ts(e.end), label: 'Cenário simulado: ' + e.type })) : [];
    const flag = p => { if (!b || m.noZ || !one && m.cat !== 'env') return 0; const sz = A.adverseZ(m, (p.v - b.med) / b.sigma); return sz >= 3 ? 2 : sz >= 2 ? 1 : 0; };
    $(root, '#main-sub').textContent = `${m.label} em ${m.unit}.` + (one && b && !m.noZ ? ' Faixa azul = padrão individual.' : cs.length > 1 && m.cat !== 'env' ? ' Selecione um tripulante para ver o padrão individual e os cenários.' : '');
    U.lineChart($(root, '#main'), { series, band: b && !m.noZ ? { lo: b.lo, hi: b.hi, med: b.med } : null, ref: m.ok ? { lo: m.ok[0], hi: m.ok[1] } : null, unit: m.unit, dec: m.dec, phases, events: evs, flag, height: 340, aria: m.label, snap: true });
    $(root, '#main-lg').innerHTML = series.map(s => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('') + (b && !m.noZ ? '<span><i class="sw" style="background:var(--accent-soft);box-shadow:inset 0 0 0 1px var(--accent)"></i>Padrão individual</span>' : '') + (m.ok ? '<span><i class="sw" style="background:var(--good-bg);box-shadow:inset 0 0 0 1px rgba(12,163,12,.3)"></i>Faixa de referência</span>' : '') + (evs.length ? '<span><i class="sw" style="background:var(--warn)"></i>Cenário simulado</span>' : '') + '<span class="muted">Faixas cinza alternadas: fases da missão</span>';
  }

  /* ---- Heatmap de desvios ---- */
  function drawHeat(root) {
    const cs = sel(), rows = []; let lastCat = null;
    A.MET.filter(m => m.key !== 'rad_cum').forEach(m => { if (m.cat !== lastCat) { rows.push({ group: A.CATS[m.cat].label, key: 'g' + m.cat }); lastCat = m.cat; } rows.push({ key: m.key, label: m.short, m }); });
    const cache = {};
    const cellOf = (r, c) => {
      const k = r.key + '|' + c.id; if (cache[k]) return cache[k];
      const m = r.m, p = pts(m, c.id), b = A.baseline(m, c.id); let out = { v: null };
      if (p.length && b) {
        const w = p.slice(-7), v = A.mean(w.map(x => x.v)), z = (v - b.med) / b.sigma, sz = A.adverseZ(m, z);
        out = { v: z, text: Math.abs(z) >= 0.95 ? (z > 0 ? '+' : '−') + fmt(Math.abs(z), 1) : '', flag: sz >= EX.z, tipTitle: `${c.name} · ${m.label}`, tipRows: [{ name: 'Valor recente', val: `${fmt(v, m.dec)} ${m.unit}` }, { name: 'Seu padrão', val: `${fmt(b.med, m.dec)} ± ${fmt(b.sigma, m.dec)}` }, { name: 'Desvio', val: `${z > 0 ? '+' : '−'}${fmt(Math.abs(z), 1)} σ` }], tipSub: `${w.length} medição(ões) · padrão: ${b.source}` };
      } cache[k] = out; return out;
    };
    U.heatmap($(root, '#heat'), { rows, cols: cs.map(c => ({ id: c.id, label: c.name.split(' ')[0] })), max: 4, rowH: 25, left: 78, aria: 'Mapa de calor de desvios por tripulante', cell: (r, c) => cellOf(r, cs.find(x => x.id === c.id)) });
  }

  /* ---- Eventos ---- */
  function drawEvents(root) {
    $(root, '#zv').textContent = fmt(EX.z, 1) + 'σ'; $(root, '#dv').textContent = EX.days + ' dias';
    drawKPIs(root);
    const evs = eventsFor(sel()).sort((a, b) => b.maxz - a.maxz);
    $(root, '#events').innerHTML = evs.length ? evs.slice(0, 40).map(e => { const c = A.DB.crew.find(x => x.id === e.crew); return `<div class="det"><div><b><i class="dot" style="background:${U.crewColor(c.id)};margin-right:8px"></i>${esc(c.name)} · ${esc(e.m.label)}</b><p>${U.fmtD(e.start)} a ${U.fmtD(e.end)} · ${e.days} dias · máx. ${fmt(e.maxz, 1)}σ</p></div>${chip(e.maxz >= 6 ? 2 : 1, e.maxz >= 6 ? 'Forte' : 'Persistente')}</div>`; }).join('') + (evs.length > 40 ? `<div class="pager">Mostrando 40 de ${evs.length}. Aumente o desvio mínimo para refinar.</div>` : '') : '<div class="empty"><b>Nenhum evento</b>Reduza o desvio mínimo ou os dias seguidos.</div>';
  }

  /* ---- Correlação intra-pessoa ---- */
  function stdMap(m, crews) {
    const out = new Map();
    crews.forEach(c => { const p = pts(m, c.id); if (p.length < 5) return; const mu = A.mean(p.map(x => x.v)), s = A.sd(p.map(x => x.v)); if (!s) return; p.forEach(x => out.set(c.id + '|' + x.d, { z: (x.v - mu) / s, v: x.v })); });
    return out;
  }
  function drawCorr(root) {
    const cs = sel(), maps = {}; CORR.forEach(k => maps[k] = stdMap(A.MBY[k], cs));
    const rows = CORR.map(k => ({ key: k, label: ({ eff: 'Efic.', rad_rate: 'Dose', stress: 'Estr.', glu: 'Glic.', sleep: 'Sono' })[k] || A.MBY[k].short }));
    const cache = {}; let nmax = 0;
    const cell = (r, c, i) => {
      const a = r.key, b = CORR[i]; if (a === b) return { v: 0, text: '' };
      const key = [a, b].sort().join('|'); if (cache[key]) return cache[key];
      const x = [], y = []; maps[a].forEach((v, k) => { const w = maps[b].get(k); if (w) { x.push(v.z); y.push(w.z); } });
      const rr = x.length >= 20 ? A.pearson(x, y) : null; nmax = Math.max(nmax, x.length);
      cache[key] = rr == null ? { v: null } : { v: rr, text: (rr < 0 ? '−' : '') + Math.abs(rr).toFixed(2).replace('0.', '.'), tipTitle: `${A.MBY[a].label} × ${A.MBY[b].label}`, tipRows: [{ name: 'Correlação (r)', val: rr.toFixed(2).replace('.', ',') }, { name: 'Pares dia × pessoa', val: String(x.length) }], tipSub: Math.abs(rr) < .3 ? 'Relação fraca' : Math.abs(rr) < .6 ? 'Relação moderada' : 'Relação forte' };
      return cache[key];
    };
    U.heatmap($(root, '#corr'), { rows, cols: rows.map(r => ({ label: r.label })), max: 1, rowH: 27, left: 74, aria: 'Matriz de correlação', cell });
    $(root, '#corr-note').textContent = 'Azul: sobem em sentidos opostos. Vermelho: sobem juntos. Correlação não prova causa. Células cinza: menos de 20 pares em comum.';
  }

  /* ---- Dispersão ---- */
  function drawScatter(root) {
    const mx = A.MBY[EX.xm], my = A.MBY[EX.ym], cs = sel(), P = [];
    cs.forEach(c => { const px = new Map(pts(mx, c.id).map(p => [p.d, p.v])); pts(my, c.id).forEach(p => { if (px.has(p.d)) P.push({ x: px.get(p.d), y: p.v, color: U.crewColor(c.id), name: c.name, d: p.d }); }); });
    const r = P.length >= 4 ? A.pearson(P.map(p => p.x), P.map(p => p.y)) : null, reg = P.length >= 4 ? A.linreg(P.map(p => p.x), P.map(p => p.y)) : null;
    $(root, '#sc-sub').textContent = P.length >= 4 ? `${P.length} pares diários · correlação geral r = ${r == null ? '—' : fmt(r, 2)}` : '';
    U.scatter($(root, '#sc'), { points: P, xl: `${mx.short} (${mx.unit})`, yl: `${my.short} (${my.unit})`, xdec: mx.dec, ydec: my.dec, reg, height: 330, aria: `${my.label} contra ${mx.label}` });
    $(root, '#sc-lg').innerHTML = cs.map(c => `<span><i class="sw" style="background:${U.crewColor(c.id)};border-radius:50%"></i>${esc(c.name.split(' ')[0])}</span>`).join('') + '<span><i style="background:var(--ink-2)"></i>Tendência linear</span>';
  }

  /* ---- Fases ---- */
  function drawPhase(root) {
    const m = A.MBY[EX.metric], cs = sel();
    const groups = A.PHASES.map(ph => { const g = { label: A.PHASE_PT[ph], pts: [], n: 0 }; (m.cat === 'env' ? [{ id: 0, name: 'Cabine' }] : cs).forEach(c => { const p = pts(m, c.id, false).filter(x => A.phaseForDate(x.d) === ph); if (p.length) { g.pts.push({ v: A.mean(p.map(x => x.v)), color: m.cat === 'env' ? 'var(--c1)' : U.crewColor(c.id), name: c.name, n: p.length }); g.n += p.length; } }); return g; });
    $(root, '#ph-sub').textContent = `${m.label}: cada ponto é a média de um tripulante na fase; o traço é a média do grupo.`;
    U.phaseStrip($(root, '#ph'), { groups, unit: m.unit, dec: m.dec > 0 ? Math.min(m.dec, 2) : 0, ref: m.ok ? { lo: m.ok[0], hi: m.ok[1] } : null, height: 300, aria: `${m.label} por fase` });
  }

  /* ---- Detector vs cenários ---- */
  function drawDetect(root) {
    const rows = A.DB.events.map(e => {
      const s = U.fromT(A.ts(e.start) - A.DAY), en = U.fromT(A.ts(e.end) + A.DAY), c = A.DB.crew.find(x => x.id === e.crew);
      const pe = A.persistent(e.crew, EX.z, EX.days).filter(x => x.end >= s && x.start <= en && x.m.key !== 'mass'), lf = A.labFlags(e.crew, s, en, 2);
      const mets = [...new Set([...pe.map(x => x.m.short), ...lf.map(x => x.m.short)])], hit = mets.length > 0;
      return `<div class="det"><div><b>${esc(e.type)}</b><p>${esc(c ? c.name : 'Tripulante ' + e.crew)} · ${U.fmtD(e.start)} a ${U.fmtD(e.end)}${hit ? ' · sinais em: ' + esc(mets.slice(0, 4).join(', ')) : ''}</p></div>${hit ? chip(0, 'Detectado') : chip(2, 'Não detectado')}</div>`;
    });
    $(root, '#det').innerHTML = rows.join('') + '<div class="lane-key" style="display:block">Rótulos criados pelo gerador de dados sintéticos, usados só para validar o detector. Massa corporal é ignorada aqui por ter tendência de queda em toda a tripulação. Exames usam amostras quinzenais (≥ 2σ).</div>';
  }

  V.analise = { render, EX };
})();
