/* =========================================================
   Tripulante: visão individual (tela TRI)
   Cada caixa é um módulo; a posição fica em LAYOUT.
   Textos passam por I18N.t (chave = frase em português).
   ========================================================= */
(function () {
  const A = window.AT, U = window.UI, M = window.MOD, { esc, fmt, icon, chip } = U;
  const V = (window.VIEWS = window.VIEWS || {});
  const T = (s, v) => window.I18N.t(s, v), R = r => window.I18N.reason(r);

  /* Ordem de leitura da tela. Mover uma caixa = mover o ID aqui. */
  const LAYOUT = [
    'TRI-01',                         // seleção de tripulante
    'TRI-21',                         // cenários de um clique (tri-cenarios.js)
    'TRI-02', 'TRI-03', 'TRI-04',     // perfil, condição geral, contexto
    'TRI-05',                         // seção: sinais vitais (tri-vitais.js)
    'TRI-13', 'TRI-19', 'TRI-14',     // FC | mapa do corpo (2 linhas, tri-corpo.js) | PA
    'TRI-15', 'TRI-16',               // SpO2 | (corpo) | temperatura
    'TRI-17', 'TRI-18',               // massa, glicemia
    'TRI-22',                         // explicação em linguagem simples (tri-explica.js)
    'TRI-20', 'TRI-06',               // sono (fases, tri-sono.js) | mental e sono
    'TRI-07', 'TRI-08', 'TRI-09',     // laboratorial, radiação, ambiente
    'TRI-10',                         // histórico do indicador
    'TRI-11', 'TRI-12',               // alertas, padrões combinados
  ];

  const sexTxt = s => s === 'F' ? T('feminino') : s === 'M' ? T('masculino') : esc(s || '');

  /* ---------- TRI-01 Seleção de tripulante ---------- */
  M.define({ id: 'TRI-01', key: 'tri.selecao', title: 'Seleção de tripulante', size: 'full', bare: true,
    render(b, c) {
      const stats = {}; c.crews.forEach(x => stats[x.id] = A.crewStatus(x.id).level);
      b.innerHTML = `<div class="crew-bar" role="group" aria-label="${T('Selecionar tripulante')}">${c.crews.map(x => `<button data-c="${x.id}" aria-pressed="${x.id === c.crew.id}"><span class="avatar" style="background:${U.crewColor(x.id)}">${U.initials(x.name)}</span><span><b>${esc(x.name)}<i class="dot l${stats[x.id]}"></i></b><small>${esc(x.role)}</small></span></button>`).join('')}</div>`;
      b.querySelectorAll('button').forEach(btn => btn.onclick = () => { c.S.crewId = +btn.dataset.c; c.rerender(); });
    } });

  /* ---------- TRI-02 Perfil ---------- */
  M.define({ id: 'TRI-02', key: 'tri.perfil', title: 'Tripulante', size: 'm',
    render(b, c) {
      const x = c.crew;
      b.innerHTML = `<div class="person"><span class="avatar" style="background:${U.crewColor(x.id)}">${U.initials(x.name)}</span><div><strong>${esc(x.name)}</strong><span class="muted small">${esc(x.role)} · ${T('{n} anos', { n: x.age })} · ${sexTxt(x.sex)}</span></div></div>`;
    } });

  /* ---------- TRI-03 Condição geral ---------- */
  const LVL_TXT = ['Estável', 'Atenção', 'Crítico'];
  const LVL_SUB = ['Indicadores dentro do esperado para a fase da missão.', 'Há indicadores fora do esperado. Veja os alertas.', 'Há indicador em faixa crítica. Acione o médico de voo.'];
  M.define({ id: 'TRI-03', key: 'tri.condicao', title: 'Condição geral', size: 'm',
    render(b, c) {
      const st = c.st, n = st.flagged.length;
      const cnt = n ? ' ' + (n === 1 ? T('1 indicador sinalizado.') : T('{n} indicadores sinalizados.', { n })) : '';
      b.innerHTML = `<div class="status-hero l${st.level}"><span class="sh-ico">${icon(st.level ? 'warn' : 'check')}</span><div><strong>${T(LVL_TXT[st.level])}</strong><p>${T(LVL_SUB[st.level])}${cnt}</p></div></div>`;
    } });

  /* ---------- TRI-04 Contexto da missão ---------- */
  M.define({ id: 'TRI-04', key: 'tri.contexto', title: 'Contexto da missão', size: 'm',
    render(b, c) {
      const last = A.crewLastDate(c.crew.id);
      b.innerHTML = last ? `<div class="kv"><div><span>${T('Último registro')}</span><strong class="num">${U.fmtDT(last)}</strong></div><div><span>${T('Dia da missão')}</span><strong class="num">${A.missionDay(last)}</strong></div><div><span>${T('Fase')}</span><strong>${A.PHASE_PT[A.phaseForDate(last)]}</strong></div></div>` : `<div class="empty">${T('Sem registros.')}</div>`;
    } });

  /* ---------- TRI-06 a TRI-09 Cartões por sistema ---------- */
  function catCard(id, cat, size, keys) {
    M.define({ id, key: 'tri.cat.' + cat, title: A.CATS[cat].label, size, flush: true,
      render(b, c, el) {
        el.querySelector('.mod-t h2').textContent = A.CATS[cat].label;  // rótulo já traduzido pelo motor
        const cs = c.st.cat[cat], get = k => cs.items.find(i => i.m.key === k);
        el.querySelector('.mod-x').innerHTML = cs.level == null ? `<span class="chip n">${T('Sem dados')}</span>` : chip(cs.level);
        const line = k => {
          if (k === 'bp') { const s = get('sbp'), d = get('dbp'); return [T('Pressão arterial'), s && d ? `${fmt(s.v, 0)}/${fmt(d.v, 0)}` : '—', 'mmHg', Math.max(s ? s.level : 0, d ? d.level : 0), 'sbp']; }
          if (k === 'dos') { const l = A.lastCum(c.crew.id); return [T('Dosímetro'), l ? l.dos : '—', '', null, 'rad_cum']; }
          const a = get(k), m = A.MBY[k];
          return [m.label, a ? fmt(a.v, m.dec) : '—', m.unit, a ? a.level : null, k];
        };
        b.innerHTML = `<ul class="vlist">${keys.map(k => { const [l, v, u, lv, mk] = line(k); return `<li><button data-m="${mk}" aria-pressed="${c.m.key === mk}"><i class="dot ${lv == null ? 'n' : 'l' + lv}"></i><span>${esc(l)}</span><b class="num">${esc(v)}<small>${esc(u)}</small></b></button></li>`; }).join('')}</ul>`;
        b.querySelectorAll('button[data-m]').forEach(btn => btn.onclick = () => { c.S.metric = btn.dataset.m; c.rerender(); });
      } });
  }
  /* TRI-05 (sinais vitais) é a seção de velocímetros em tri-vitais.js */
  catCard('TRI-06', 'mental', 'm', ['sleep', 'eff', 'mood', 'stress']);
  catCard('TRI-07', 'lab', 'm', ['wbc', 'crp', 'cort', 'vitd']);
  catCard('TRI-08', 'rad', 'm', ['rad_rate', 'rad_cum', 'dos']);
  catCard('TRI-09', 'env', 'm', ['co2', 'rh']);

  /* ---------- TRI-10 Histórico do indicador ---------- */
  M.define({ id: 'TRI-10', flush: true, key: 'tri.historico', title: 'Histórico do indicador', size: 'full',
    render(b, c, el) {
      const { st, m } = c, cats = Object.keys(A.CATS);
      b.innerHTML = `<div class="analysis"><nav class="mnav" aria-label="${T('Métricas')}">${cats.map(cat => `<div class="grp">${A.CATS[cat].label}</div>${A.MET.filter(x => x.cat === cat).map(x => { const a = st.items.find(i => i.m.key === x.key); return `<button data-m="${x.key}" aria-pressed="${x.key === m.key}"><span>${esc(x.short)}</span><i class="dot ${a ? 'l' + a.level : 'n'}"></i></button>`; }).join('')}`).join('')}</nav>
        <div class="chart-wrap"><div class="chart-box" data-r="chart"></div><div class="legend" data-r="lg" style="margin-top:10px"></div></div>
        <aside class="stats" data-r="stats"></aside></div><div class="info-box" data-r="info"></div>`;
      b.querySelectorAll('.mnav button').forEach(btn => btn.onclick = () => { c.S.metric = btn.dataset.m; c.rerender(); });
      drawMetric(b, el, c.crew, m, st);
    } });

  function drawMetric(root, el, crew, m, st) {
    const q = r => root.querySelector(`[data-r="${r}"]`);
    const pts = A.series(m, crew.id), b = A.baseline(m, crew.id), a = st.items.find(i => i.m.key === m.key);
    el.querySelector('.mod-t h2').textContent = T('{l} ({u}), histórico da missão', { l: m.label, u: m.unit });
    const sub = b ? (b.source === 'individual' ? T('Faixa destacada: seu padrão (mediana ± 2 desvios) dos primeiros {n} dias.', { n: A.BASE_DAYS }) : T('Sem histórico suficiente: padrão calculado pela {s}.', { s: T(b.source) })) : T('Sem padrão calculado.');
    el.querySelector('.mod-t').insertAdjacentHTML('beforeend', `<p>${esc(sub)}</p>`);
    const phases = []; let cur = null; A.DB.phases.forEach(([d, p]) => { if (!cur || cur.label !== p) { cur = { label: p, from: A.ts(d), to: A.ts(d) + A.DAY }; phases.push(cur); } else cur.to = A.ts(d) + A.DAY; });
    const flag = p => { if (!b || m.noZ) return 0; const sz = A.adverseZ(m, (p.v - b.med) / b.sigma); return sz >= 3 ? 2 : sz >= 2 ? 1 : 0; };
    const ev = A.DB.events.filter(e => e.crew === crew.id).map(e => ({ from: A.ts(e.start), to: A.ts(e.end), label: T('Cenário simulado: ') + e.type }));
    U.lineChart(q('chart'), { series: [{ id: crew.id, name: crew.name, color: U.crewColor(crew.id), pts: m.cat === 'env' ? A.daily(m, 0) : pts }], band: b && !m.noZ ? { lo: b.lo, hi: b.hi, med: b.med } : null, ref: m.ok ? { lo: m.ok[0], hi: m.ok[1] } : null, unit: m.unit, dec: m.dec, phases, events: ev, flag, height: 320, aria: `${m.label}, ${crew.name}`, snap: true,
      sub: t => { const p = pts.find(x => Math.abs(x.t - t) < A.DAY); if (!p || !b || m.noZ) return null; const z = (p.v - b.med) / b.sigma; return T('{z} desvios do seu padrão', { z: `${z > 0 ? '+' : '−'}${fmt(Math.abs(z), 1)}` }); } });
    q('lg').innerHTML = `<span><i style="background:${U.crewColor(crew.id)}"></i>${esc(crew.name)}</span>${b && !m.noZ ? `<span><i class="sw" style="background:var(--accent-soft);box-shadow:inset 0 0 0 1px var(--accent)"></i>${T('Seu padrão')}</span>` : ''}${m.ok ? `<span><i class="sw" style="background:var(--good-bg);box-shadow:inset 0 0 0 1px var(--good)"></i>${T('Faixa de referência')}</span>` : ''}<span><i class="sw" style="background:var(--warn)"></i>${T('Cenário simulado (rótulo do gerador)')}</span><span><i class="sw" style="background:var(--warn);border-radius:50%"></i>${T('Ponto com desvio')}</span>`;
    const vals = pts.map(p => p.v), w7 = pts.slice(-7).map(p => p.v);
    const row = (k, v) => `<div class="stat"><span>${T(k)}</span><strong>${v}</strong></div>`;
    q('stats').innerHTML = `<h3>${T('Estatísticas ({s})', { s: esc(m.short) })}</h3>${vals.length ? row('Último valor', `${fmt(vals[vals.length - 1], m.dec)} ${m.unit}`) + row('Média (missão)', fmt(A.mean(vals), m.dec)) + row('Mínimo', fmt(Math.min(...vals), m.dec)) + row('Máximo', fmt(Math.max(...vals), m.dec)) + row('Média dos últimos 7', fmt(A.mean(w7), m.dec)) + (b && !m.noZ ? row('Seu padrão', `${fmt(b.med, m.dec)} ± ${fmt(b.sigma, m.dec)}`) : '') + (a && a.z != null ? row('Desvio atual', `${a.z > 0 ? '+' : '−'}${fmt(Math.abs(a.z), 1)} σ`) : '') + (a ? row('Estado', chip(a.level)) : '') : `<div class="small muted">${T('Sem medições.')}</div>`}`;
    const acts = Object.entries(m.act).map(([k, v]) => (Object.keys(m.act).length > 1 ? T(k === 'high' ? 'Se estiver alto: ' : 'Se estiver baixo: ') : '') + esc(v)).join('<br>');
    q('info').innerHTML = `<div><h4>${T('O que é')}</h4><p>${esc(m.what)}</p></div><div><h4>${T('Por que importa no espaço')}</h4><p>${esc(m.why)}</p></div>${m.ok ? `<div><h4>${T('Faixa de referência do protótipo')}</h4><p>${T('{a} a {b} {u} (atenção até {c} a {d}).', { a: fmt(m.ok[0], m.dec), b: fmt(m.ok[1], m.dec), u: esc(m.unit), c: fmt(m.warn[0], m.dec), d: fmt(m.warn[1], m.dec) })}</p></div>` : ''}<div><h4>${T('Se sair do esperado')}</h4><p>${acts}</p></div>`;
  }

  /* ---------- TRI-11 Alertas ---------- */
  M.define({ id: 'TRI-11', flush: true, key: 'tri.alertas', title: 'Alertas recentes', sub: 'Do último registro de cada indicador.', size: 'l',
    render(b, c) {
      const st = c.st;
      b.innerHTML = st.flagged.length ? st.flagged.slice(0, 7).map(a => `<div class="alert"><div class="bar l${a.level}"></div><div><b>${esc(a.m.label)} ${chip(a.level)}</b><p>${fmt(a.v, a.m.dec)} ${esc(a.m.unit)} · ${esc(a.reasons.map(R).join(', '))}</p><time>${U.fmtDT(a.p.date)}</time></div></div>`).join('') : `<div class="empty"><b>${T('Sem alertas')}</b>${T('Todos os indicadores estão dentro do esperado.')}</div>`;
    } });

  /* ---------- TRI-12 Padrões combinados ---------- */
  M.define({ id: 'TRI-12', flush: true, key: 'tri.padroes', title: 'Padrões combinados', sub: 'Combinações de indicadores que, juntas, sugerem um risco.', size: 'l',
    render(b, c) {
      const pt = A.patterns(A.szMapFromAssess(c.st.items));
      b.innerHTML = pt.length ? pt.map(p => `<div class="pattern"><div class="tag">${esc(p.risk)}</div><h4>${esc(p.title)}</h4><p>${esc(p.text)}</p></div>`).join('') : `<div class="empty" style="padding:26px 18px">${T('Nenhum padrão combinado no último registro.')}</div>`;
    } });

  function render(root) {
    const S = window.APP.state, crews = A.DB.crew;
    if (!crews.find(c => c.id === S.crewId)) S.crewId = crews[0].id;
    if (!S.metric || !A.MBY[S.metric]) S.metric = 'hr';
    const crew = crews.find(c => c.id === S.crewId);
    const ctx = { S, crews, crew, st: A.crewStatus(crew.id), m: A.MBY[S.metric], rerender: () => render(root) };
    M.mount(root, LAYOUT, ctx);
  }

  V.tripulante = { render, LAYOUT };
})();
