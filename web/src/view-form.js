/* =========================================================
   Registrar dados + diagnóstico imediato
   ========================================================= */
(function () {
  const A = window.AT, U = window.UI, { esc, fmt, icon, chip } = U;
  const V = (window.VIEWS = window.VIEWS || {});

  const TABS = ['vitals', 'mental', 'lab', 'rad', 'env'];
  const F = { crew: null, date: '', phase: '', tab: 'vitals', vals: {}, ebvBelow: false, dos: '', cabin: 'HAB-01', cumTouched: false, result: null, phaseTouched: false };

  const fieldMets = cat => A.MET.filter(m => m.cat === cat);
  const parse = s => { if (s == null || s === '') return null; const n = parseFloat(String(s).replace(',', '.')); return isNaN(n) ? NaN : n; };

  function resetForm(keepCrew) {
    const c = keepCrew || F.crew || A.DB.crew[0].id;
    F.crew = c; F.vals = {}; F.ebvBelow = false; F.cumTouched = false; F.result = null;
    F.date = A.nextSuggestedDate(c); F.phase = A.phaseForDate(F.date); F.phaseTouched = false;
    const last = A.lastCum(c); F.dos = last ? last.dos : 'DOS-0' + c; F.cabin = 'HAB-01';
  }

  function filled() { return A.MET.filter(m => F.vals[m.key] != null && F.vals[m.key] !== '' && !isNaN(parse(F.vals[m.key]))); }
  function errors() {
    const e = {}; A.MET.forEach(m => { const raw = F.vals[m.key]; if (raw == null || raw === '') return; const v = parse(raw); if (isNaN(v)) e[m.key] = 'Digite um número.'; else if (!A.plausible(m, v)) e[m.key] = `Fora do intervalo plausível (${fmt(m.plaus[0], m.dec)} a ${fmt(m.plaus[1], m.dec)} ${m.unit}).`; });
    if (F.vals.dbp != null && F.vals.sbp != null && parse(F.vals.dbp) >= parse(F.vals.sbp)) e.dbp = 'A diastólica deve ser menor que a sistólica.';
    return e;
  }
  function computeItems() {
    const err = errors();
    return filled().filter(m => !err[m.key]).map(m => A.assess(m, F.crew, parse(F.vals[m.key])));
  }
  function summarize(items) {
    const level = items.length ? Math.max(...items.map(i => i.level)) : null;
    const nOk = items.filter(i => i.level === 0).length;
    return { level, nOk, frac: items.length ? nOk / items.length : 0, n1: items.filter(i => i.level === 1).length, n2: items.filter(i => i.level === 2).length };
  }
  function hintFor(m) {
    const b = A.baseline(m, F.crew), p = [];
    if (b) p.push(`Seu padrão: <b>${fmt(b.med, m.dec)}</b> ± ${fmt(b.sigma, m.dec)}${b.source !== 'individual' ? ` (${b.source})` : ''}`);
    if (m.ok) p.push(`ref. ${fmt(m.ok[0], m.dec)}–${fmt(m.ok[1], m.dec)}`);
    return p.join(' · ') || 'Sem padrão ainda';
  }

  /* ---------- Render ---------- */
  function fieldHTML(m) {
    const v = F.vals[m.key] != null ? F.vals[m.key] : '';
    let extra = '';
    if (m.cat === 'mental' && (m.key === 'mood' || m.key === 'stress')) extra = `<div class="quick" data-quick="${m.key}">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-v="${n}" class="${parse(v) === n ? 'on' : ''}" aria-label="${m.label} ${n}">${n}</button>`).join('')}</div>`;
    const ok = m.key === 'ebv' ? `<label class="check"><input type="checkbox" id="ebvBelow" ${F.ebvBelow ? 'checked' : ''}> Abaixo do limite de quantificação (100 cópias/mL)</label>` : '';
    return `<div class="field" data-f="${m.key}"><label for="f-${m.key}"><span>${esc(m.label)}</span></label>
      <div class="unit-wrap"><input class="inp" id="f-${m.key}" inputmode="decimal" autocomplete="off" data-k="${m.key}" value="${esc(v)}" placeholder="${m.ok ? fmt((m.ok[0] + m.ok[1]) / 2, m.dec) : ''}"${m.ok && m.key !== 'rad_cum' ? ` data-sug="${((m.ok[0] + m.ok[1]) / 2).toFixed(m.dec)}" title="Clique para preencher com o valor sugerido"` : ''}><em>${esc(m.unit)}</em></div>
      ${extra}${ok}<div class="hint" data-hint="${m.key}">${hintFor(m)}</div><div class="err" data-err="${m.key}"></div></div>`;
  }
  function tabBody() {
    const t = F.tab, ms = fieldMets(t);
    if (t === 'rad') {
      return `<div class="field"><label for="f-dos"><span>Dosímetro</span></label><input class="inp" id="f-dos" value="${esc(F.dos)}"><div class="hint">Identificador do dosímetro pessoal.</div></div><div></div>` +
        ms.map(m => m.key === 'rad_cum' ? fieldHTML(m).replace('<div class="hint"', `<div class="hint cumhint"></div><div class="hint" style="display:none"`) : fieldHTML(m)).join('');
    }
    if (t === 'env') return `<div class="field"><label for="f-cabin"><span>Cabine</span></label><input class="inp" id="f-cabin" value="${esc(F.cabin)}"><div class="hint">Os dados de ambiente valem para toda a tripulação.</div></div><div></div>` + ms.map(fieldHTML).join('');
    if (t === 'lab') return `<div class="field span2"><div class="callout">${icon('info')}<div>Exames são coletados a cada ~14 dias. Preencha apenas o que foi medido hoje e deixe o resto em branco.</div></div></div>` + ms.map(fieldHTML).join('');
    return ms.map(fieldHTML).join('');
  }

  function render(root) {
    if (F.crew == null) resetForm();
    if (F.result) return renderResult(root);
    Object.keys(F.vals).length || SUG.clear();  // formulário zerado (novo, limpar, troca de tripulante): sugestões valem de novo
    const crew = A.DB.crew;
    root.innerHTML = `<div class="reg view-in"><div class="card">
      <div class="reg-head">
        <div class="field"><label for="f-crew"><span>Tripulante</span><button class="btn ghost sm" type="button" id="addCrew" style="height:22px;padding:0 6px;margin:-3px -6px 0 0">${icon('plus')}Novo</button></label>
          <select class="sel" id="f-crew" style="width:100%">${crew.map(c => `<option value="${c.id}" ${c.id === F.crew ? 'selected' : ''}>${esc(c.name)} · ${esc(c.role)}</option>`).join('')}</select></div>
        <div class="field"><label for="f-date"><span>Data e hora da medição</span></label><input class="inp" id="f-date" type="datetime-local" value="${F.date}"></div>
        <div class="field"><label for="f-phase"><span>Fase da missão</span></label><select class="sel" id="f-phase" style="width:100%">${A.PHASES.map(p => `<option value="${p}" ${p === F.phase ? 'selected' : ''}>${A.PHASE_PT[p]}</option>`).join('')}</select></div>
      </div>
      <div class="tabs" role="tablist">${TABS.map(t => `<button role="tab" type="button" data-tab="${t}" aria-selected="${t === F.tab}">${icon(U.CATICON[t])}${A.CATS[t].short}<span class="cnt" data-cnt="${t}">0</span></button>`).join('')}</div>
      <div class="fields" id="fields">${tabBody()}</div>
      <div class="form-foot"><span class="small muted" id="foot-msg">Preencha os indicadores que você mediu. Nenhum campo é obrigatório.</span>
        <div style="display:flex;gap:8px"><button class="btn ghost" type="button" id="clear">Limpar</button><button class="btn primary" type="button" id="save">${icon('check')}Salvar e ver diagnóstico</button></div></div>
    </div>
    <aside class="card live" aria-live="polite"><div id="live"></div></aside></div>`;
    bind(root); refresh(root);
  }
  const svgs = () => document.querySelector('.svg-unused');

  function bind(root) {
    root.querySelector('#f-crew').onchange = e => { F.crew = +e.target.value; F.date = A.nextSuggestedDate(F.crew); F.phase = A.phaseForDate(F.date); const l = A.lastCum(F.crew); F.dos = l ? l.dos : 'DOS-0' + F.crew; F.vals = {}; F.cumTouched = false; render(root); };
    root.querySelector('#f-date').onchange = e => { F.date = e.target.value; if (!F.phaseTouched && F.date) { F.phase = A.phaseForDate(F.date); root.querySelector('#f-phase').value = F.phase; } refresh(root); };
    root.querySelector('#f-phase').onchange = e => { F.phase = e.target.value; F.phaseTouched = true; };
    root.querySelector('#addCrew').onclick = () => window.APP.crewModal(c => { F.crew = c.id; F.vals = {}; render(root); });
    root.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { F.tab = b.dataset.tab; root.querySelectorAll('[data-tab]').forEach(x => x.setAttribute('aria-selected', x === b)); root.querySelector('#fields').innerHTML = tabBody(); bindFields(root); refresh(root); });
    root.querySelector('#clear').onclick = () => { const c = F.crew; F.vals = {}; F.ebvBelow = false; F.cumTouched = false; render(root); };
    root.querySelector('#save').onclick = () => save(root);
    bindFields(root);
  }
  /* Clique em campo vazio preenche o valor sugerido (o mesmo do placeholder; na dose acumulada, última dose + taxa × tempo).
     Vale uma vez por campo: se a pessoa apagar, o campo fica vazio. O valor entra selecionado, então digitar substitui. */
  const SUG = new Set();
  function fillSuggested(root, inp) {
    const k = inp.dataset.k;
    if (inp.value !== '' || SUG.has(k)) return;
    const s = k === 'rad_cum' ? suggestCum() : null, v = k === 'rad_cum' ? (s != null ? s.toFixed(4) : '') : (inp.dataset.sug || '').replace('.', (1.1).toLocaleString(window.I18N.locale()).charAt(1));  // vírgula decimal em pt e es
    if (!v) return;
    SUG.add(k); inp.value = v; F.vals[k] = v; if (k === 'rad_cum') F.cumTouched = true;
    syncQuick(root); refresh(root); inp.select();
  }
  function bindFields(root) {
    root.querySelectorAll('input[data-k]').forEach(inp => inp.addEventListener('click', () => fillSuggested(root, inp)));
    root.querySelectorAll('input[data-k]').forEach(inp => inp.addEventListener('input', () => { F.vals[inp.dataset.k] = inp.value; if (inp.dataset.k === 'rad_cum') F.cumTouched = true; syncQuick(root); refresh(root); }));
    root.querySelectorAll('[data-quick]').forEach(q => q.querySelectorAll('button').forEach(b => b.onclick = () => { const k = q.dataset.quick; F.vals[k] = b.dataset.v; root.querySelector('#f-' + k).value = b.dataset.v; syncQuick(root); refresh(root); }));
    const eb = root.querySelector('#ebvBelow'); if (eb) eb.onchange = () => { F.ebvBelow = eb.checked; if (eb.checked) { F.vals.ebv = '100'; root.querySelector('#f-ebv').value = '100'; } refresh(root); };
    const d = root.querySelector('#f-dos'); if (d) d.oninput = () => { F.dos = d.value; };
    const c = root.querySelector('#f-cabin'); if (c) c.oninput = () => { F.cabin = c.value; };
  }
  function syncQuick(root) { root.querySelectorAll('[data-quick]').forEach(q => { const v = parse(F.vals[q.dataset.quick]); q.querySelectorAll('button').forEach(b => b.classList.toggle('on', v === +b.dataset.v)); }); }

  function suggestCum() {
    const r = parse(F.vals.rad_rate); if (r == null || isNaN(r)) return null; const l = A.lastCum(F.crew); if (!l || !F.date) return null;
    const hours = Math.max(0, (A.ts(F.date) - A.ts(l.date)) / 36e5); return l.cum + r * hours / 1000;
  }

  function refresh(root) {
    const err = errors();
    root.querySelectorAll('[data-err]').forEach(el => { const k = el.dataset.err; el.textContent = err[k] || ''; const inp = root.querySelector('#f-' + k); if (inp) inp.classList.toggle('bad', !!err[k]); });
    TABS.forEach(t => { const n = fieldMets(t).filter(m => F.vals[m.key] != null && F.vals[m.key] !== '').length; const el = root.querySelector(`[data-cnt="${t}"]`); if (el) { el.textContent = n; el.classList.toggle('on', n > 0); } });
    const ch = root.querySelector('.cumhint'); if (ch) { const s = suggestCum(); ch.innerHTML = s != null ? `Sugestão: <b>${fmt(s, 3)} mSv</b> (última dose + taxa × tempo) · <a href="#registrar" id="useCum">usar</a>` : 'Informe a taxa de dose para ver uma sugestão.'; const u = ch.querySelector('#useCum'); if (u) u.onclick = e => { e.preventDefault(); F.vals.rad_cum = s.toFixed(4); root.querySelector('#f-rad_cum').value = F.vals.rad_cum; refresh(root); }; }
    const items = computeItems(), sm = summarize(items), live = root.querySelector('#live');
    const head = `<div class="live-top">${U.ring(sm.level, sm.level == null ? 0 : Math.max(.08, sm.frac), 'ring')}<div><div style="font-weight:620;font-size:16px;letter-spacing:-.02em">${items.length ? U.LVL[sm.level] : 'Diagnóstico ao vivo'}</div><div class="small muted">${items.length ? `${sm.nOk} de ${items.length} dentro do esperado${sm.n1 ? ` · ${sm.n1} em atenção` : ''}${sm.n2 ? ` · ${sm.n2} crítico` : ''}` : 'Os indicadores aparecem aqui conforme você digita.'}</div></div></div>`;
    live.innerHTML = head + (items.length ? `<div class="live-list">${items.map(rowHTML).join('')}</div>${U.LANE_KEY}` : `<div class="live-empty">Comparamos cada valor com a faixa de referência e com o seu padrão dos primeiros ${A.BASE_DAYS} dias de missão.</div>`);
    const msg = root.querySelector('#foot-msg'), n = filled().length; msg.textContent = n ? `${n} indicador${n > 1 ? 'es' : ''} preenchido${n > 1 ? 's' : ''}.` : 'Preencha os indicadores que você mediu. Nenhum campo é obrigatório.';
    root.querySelector('#save').disabled = !n || Object.keys(err).length > 0;
  }

  function rowHTML(a, clickable) {
    const m = a.m, tail = a.z != null ? `${a.z > 0 ? '+' : '−'}${fmt(Math.abs(a.z), 1)} σ` : (m.ok ? '' : '');
    return `<div class="row-m ${clickable ? 'clickable' : ''}" ${clickable ? `data-m="${m.key}" tabindex="0"` : ''}><div class="nm"><b>${esc(m.label)}</b><span>${a.z != null ? `${a.pct > 0 ? '+' : ''}${fmt(a.pct, 1)}% vs. padrão · ${tail}` : (a.refLevel != null ? 'vs. faixa de referência' : 'sem padrão ainda')}</span></div>${U.laneHTML(a)}<div style="text-align:right"><div class="val">${fmt(a.v, m.dec)}<small>${esc(m.unit)}</small></div>${chip(a.level)}</div></div>`;
  }

  /* ---------- Salvar ---------- */
  function save(root) {
    const err = errors(); if (Object.keys(err).length || !filled().length) return;
    if (!F.date) { window.APP.toast('Informe a data e hora da medição.'); return; }
    const date = F.date.slice(0, 16), crew = F.crew, items = computeItems();
    const patt = A.patterns(A.szMapFromAssess(items));
    const recs = [], group = 'g' + Date.now().toString(36);
    const pick = keys => { const o = {}; let any = false; keys.forEach(([k, f]) => { const v = parse(F.vals[k]); o[f] = isNaN(v) ? null : v; if (v != null && !isNaN(v)) any = true; }); return any ? o : null; };
    const vit = pick([['hr', 'hr'], ['sbp', 'sbp'], ['dbp', 'dbp'], ['temp', 'temp'], ['spo2', 'spo2'], ['mass', 'mass'], ['glu', 'glu']]);
    if (vit) recs.push({ type: 'vitals', group, row: { crew, date, phase: F.phase, ...vit } });
    const men = pick([['sleep', 'sleep'], ['eff', 'eff'], ['mood', 'mood'], ['stress', 'stress'], ['rt', 'rt']]);
    if (men) recs.push({ type: 'mental', group, row: { crew, date, phase: F.phase, ...men } });
    A.MET.filter(m => m.cat === 'lab').forEach(m => { const v = parse(F.vals[m.key]); if (v != null && !isNaN(v)) recs.push({ type: 'labs', group, row: { crew, date, code: m.code, value: v, qual: m.key === 'ebv' && F.ebvBelow ? 'Below quantification threshold' : 'Quantified' } }); });
    const rad = pick([['rad_rate', 'rate'], ['rad_cum', 'cum']]); if (rad) recs.push({ type: 'rad', group, row: { crew, date, rate: rad.rate, cum: rad.cum, dos: F.dos || ('DOS-0' + crew) } });
    const env = pick([['co2', 'co2'], ['rh', 'rh']]); if (env) recs.push({ type: 'env', group, row: { date, cabin: F.cabin || 'HAB-01', ...env } });
    recs.forEach(r => r.group = group);
    const stored = A.addRecords(recs);
    F.result = { crew, date, phase: F.phase, items, patterns: patt, group, stored, n: items.length };
    window.APP.refreshHeader(); window.APP.render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------- Resultado ---------- */
  function renderResult(root) {
    const R = F.result, c = A.DB.crew.find(x => x.id === R.crew), sm = summarize(R.items), flagged = R.items.filter(i => i.level > 0).sort((a, b) => b.level - a.level || (b.sz || 0) - (a.sz || 0));
    const title = sm.level === 0 ? 'Tudo dentro do esperado' : sm.level === 1 ? `${sm.n1} indicador${sm.n1 > 1 ? 'es' : ''} pede${sm.n1 > 1 ? 'm' : ''} atenção` : `${sm.n2} indicador${sm.n2 > 1 ? 'es' : ''} em nível crítico`;
    const sub = sm.level === 0 ? 'Todas as medidas ficaram na faixa de referência e perto do seu padrão pessoal.' : sm.level === 1 ? 'Há desvios do seu padrão ou da faixa de referência. Veja as ações sugeridas abaixo e acompanhe nos próximos dias.' : 'Há valores fora da faixa segura. Siga as ações abaixo e contate o médico de voo.';
    const groups = {}; R.items.forEach(i => (groups[i.m.cat] = groups[i.m.cat] || []).push(i));
    root.innerHTML = `<div class="stack view-in">
      <div class="card"><div class="verdict">${U.ring(sm.level, Math.max(.08, sm.frac), 'big-ring')}<div><h2>${title}</h2><p>${sub}</p><p class="small muted" style="margin-top:8px">${esc(c.name)} · ${U.fmtDT(R.date)} · Dia ${A.missionDay(R.date)} · ${A.PHASE_PT[R.phase]} · ${R.n} indicadores avaliados</p></div>
        <div style="display:grid;gap:8px"><button class="btn primary" id="newRec">${icon('plus')}Novo registro</button><button class="btn" id="goCrew">Ver painel do tripulante</button><button class="btn ghost" id="goEx">Ver análise exploratória</button></div></div>
        <div class="lane-key" style="justify-content:space-between"><span>${R.stored ? 'Registro salvo neste navegador. Exporte em Registros para levar ao pipeline.' : 'Registro mantido apenas nesta sessão (o armazenamento do navegador não está disponível).'}</span><span>Triagem de software, não é diagnóstico clínico.</span></div></div>
      ${R.patterns.length ? `<div class="card"><div class="card-h"><div><h3>Padrões combinados</h3><p>Indicadores que mudaram juntos e apontam um mesmo risco de missão.</p></div></div><div class="card-b" style="padding:8px 0 0">${R.patterns.map(p => `<div class="pattern"><div class="tag">${esc(p.risk)}</div><h4>${esc(p.title)}</h4><p>${esc(p.text)}</p><p style="margin-top:4px;color:var(--ink)"><b style="font-weight:600">O que fazer:</b> ${esc(p.act)}</p></div>`).join('')}</div></div>` : ''}
      ${flagged.length ? `<div class="card"><div class="card-h"><div><h3>O que fazer agora</h3><p>Ordenado por prioridade.</p></div></div><div class="card-b" style="padding:8px 0 0"><div class="actions-list">${flagged.map(a => { const m = a.m, side = a.side > 0 ? 'high' : 'low', act = m.act[side] || m.act.high || m.act.low; return `<div class="act"><div class="bar l${a.level}"></div><div><h4>${esc(m.label)}: ${fmt(a.v, m.dec)} ${esc(m.unit)} ${chip(a.level)}</h4><p>${esc(act)}</p><p class="why">${esc(a.reasons.join(' · '))}. ${esc(m.why)}</p></div></div>`; }).join('')}</div></div></div>` : ''}
      <div class="card"><div class="card-h"><div><h3>Todos os indicadores deste registro</h3><p>Cada linha compara a medida com a faixa de referência e com o seu padrão.</p></div></div><div class="card-b" style="padding:10px 0 0">${Object.keys(groups).map(k => `<div style="padding:10px 18px 4px;font-weight:600;font-size:13px;display:flex;gap:8px;align-items:center;color:var(--ink-2)">${icon(U.CATICON[k])}${A.CATS[k].label}</div>${groups[k].map(a => rowHTML(a, true)).join('')}`).join('')}${U.LANE_KEY}</div></div></div>`;
    root.querySelector('#newRec').onclick = () => { const c = F.crew; resetForm(c); window.APP.render(); };
    root.querySelector('#goCrew').onclick = () => { window.APP.state.crewId = R.crew; location.hash = 'tripulante'; };
    root.querySelector('#goEx').onclick = () => { location.hash = 'analise'; };
    root.querySelectorAll('.row-m[data-m]').forEach(r => r.onclick = () => { window.APP.state.crewId = R.crew; window.APP.state.metric = r.dataset.m; location.hash = 'tripulante'; });
  }

  V.registrar = { render, rowHTML, reset: () => resetForm(), form: F };
})();
