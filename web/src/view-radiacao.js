/* =========================================================
   Radiação: tela RAD (dose de carreira, saída da base,
   atividade solar real, efeitos no corpo, fontes)
   Modelo e constantes em radiation.js.
   ========================================================= */
(function () {
  const A = window.AT, U = window.UI, M = window.MOD, R = window.RAD, { esc, fmt, icon, chip } = U;
  const V = (window.VIEWS = window.VIEWS || {});
  const RC = R.RC;

  const LAYOUT = [
    'RAD-01',                 // seleção de tripulante
    'RAD-02', 'RAD-03',       // orçamento de dose da carreira | dose projetada (velocímetro)
    'RAD-10',                 // trajetória da dose: recebida até hoje e projeção contra o limite
    'RAD-04',                 // planejar saída da base
    'RAD-05',                 // atividade solar e eventos (dados reais)
    'RAD-06', 'RAD-07',       // efeitos no corpo | grandezas e partículas
    'RAD-08',                 // escala de doses
    'RAD-09',                 // fontes e suposições
  ];

  /* ---------- Estado do plano (conveniência local: lembra entre recargas) ---------- */
  const LS = 'athenance.rad.plan';
  const RP = { prior: { ...R.PRIOR_DEFAULT }, surfaceDays: 30, returnDays: 180, hours: 6, sorties: 1, prot: 'traje', solar: null, returnMin: 45 };
  try { Object.assign(RP, JSON.parse(localStorage.getItem(LS) || '{}')); } catch (e) {}
  const save = () => { try { localStorage.setItem(LS, JSON.stringify(RP)); } catch (e) {} };

  const SW = () => (window.SEED && window.SEED.sw) || null;
  const nowMonth = () => { const s = SW(); return s ? s.fetched.slice(0, 7) : new Date().toISOString().slice(0, 7); };

  function ssnFor(month) {
    const s = SW(); if (!s) return null;
    const o = s.ssn.find(m => m[0] === month); if (o && o[1] >= 0) return o[1];
    const p = s.pred.find(m => m[0] === month); return p ? p[1] : null;
  }
  function autoSolar(crew) {
    const S = window.SCN && window.SCN.state;
    if (S && S.active === 'radiacao' && S.crew === crew) return { v: 'evento', why: window.I18N.t('cenário "Evento de radiação" ativo') };
    const model = R.sepModel(SW()), ssn = ssnFor(nowMonth());
    if (!model || ssn == null) return { v: 'calmo', why: window.I18N.t('sem dados de clima espacial') };
    const p = model.pMonth(ssn);
    return { v: p >= 0.5 ? 'elevado' : 'calmo', why: window.I18N.t('{p}% de chance de evento SEP neste mês (manchas: {s})', { p: Math.round(p * 100), s: fmt(ssn, 0) }) };
  }

  function health(crew) {
    const st = A.crewStatus(crew), red = [];
    const lvl = Math.max(0, ...st.items.filter(i => i.m.cat !== 'rad' && i.m.cat !== 'env').map(i => i.level));  // saúde, sem a própria radiação
    const crit = keys => st.items.some(i => keys.includes(i.m.key) && i.level === 2);
    if (crit(['hr', 'sbp', 'dbp'])) red.push('cardiovascular');
    if (crit(['sleep', 'eff', 'mood', 'stress', 'rt'])) red.push('neurocognitivo');
    return { level: lvl, red };
  }

  function context(S, rerender) {
    const crews = A.DB.crew;
    if (!crews.find(c => c.id === S.crewId)) S.crewId = crews[0].id;
    const crew = crews.find(c => c.id === S.crewId);
    const last = A.crewLastDate(crew.id);
    const auto = autoSolar(crew.id);
    const plan = {
      prior: RP.prior[crew.id] != null ? RP.prior[crew.id] : 0,
      elapsedDays: last ? A.missionDay(last) : 0,
      surfaceDays: RP.surfaceDays, returnDays: RP.returnDays, hours: RP.hours, sorties: RP.sorties, prot: RP.prot,
      solar: RP.solar || auto.v, returnMin: RP.returnMin,
    };
    const proj = R.project(plan), hl = health(crew.id), dec = R.decide(plan, proj, hl);
    return { S, crews, crew, last, plan, proj, hl, dec, auto, rerender };
  }

  /* ---------- RAD-01 Seleção de tripulante ---------- */
  M.define({ id: 'RAD-01', key: 'rad.selecao', title: 'Seleção de tripulante', size: 'full', bare: true,
    render(b, c) {
      b.innerHTML = `<div class="crew-bar" role="group" aria-label="Selecionar tripulante">${c.crews.map(x => { const p = R.project({ ...c.plan, prior: RP.prior[x.id] || 0 }); return `<button data-c="${x.id}" aria-pressed="${x.id === c.crew.id}"><span class="avatar" style="background:${U.crewColor(x.id)}">${U.initials(x.name)}</span><span><b>${esc(x.name)}</b><small>${fmt(p.total, 0)} mSv projetados</small></span></button>`; }).join('')}</div>`;
      b.querySelectorAll('button').forEach(btn => btn.onclick = () => { c.S.crewId = +btn.dataset.c; c.rerender(); });
    } });

  /* ---------- RAD-02 Orçamento de dose da carreira ---------- */
  M.define({ id: 'RAD-02', key: 'rad.orcamento', title: 'Orçamento de dose da carreira', sub: 'Quanto do limite de 600 mSv já foi usado e quanto o plano da missão vai usar', size: 'xl',
    render(b, c) {
      const P = c.proj, plan = c.plan;
      const segs = [
        { k: 'prior', name: 'Missões anteriores', v: plan.prior, cls: 'sg-prior', note: 'suposição' },
        { k: 'sofar', name: `Esta missão até hoje (${plan.elapsedDays} dias de trânsito)`, v: P.transitSoFar, cls: 'sg-sofar', note: 'modelo RAD' },
        { k: 'surf', name: `Superfície, na base (${plan.surfaceDays} dias)`, v: P.surface, cls: 'sg-surf', note: 'planejado' },
        { k: 'ret', name: `Retorno à Terra (${plan.returnDays} dias)`, v: P.ret, cls: 'sg-ret', note: 'planejado' },
        { k: 'eva', name: `Acréscimo das saídas (${plan.sorties}×${fmt(plan.hours, 1)} h)`, v: P.evaExtra, cls: 'sg-eva', note: 'planejado' },
      ];
      const max = Math.max(RC.LIMIT * 1.15, P.total * 1.05), pos = v => (v / max * 100).toFixed(2);
      let acc = 0;
      const bar = segs.map(s => { const x = acc; acc += s.v; return s.v > 0 ? `<i class="${s.cls}" style="left:${pos(x)}%;width:${pos(s.v)}%" title="${esc(s.name)}: ${fmt(s.v, 1)} mSv"></i>` : ''; }).join('');
      const dos = A.lastCum(c.crew.id);
      b.innerHTML = `<div class="budget">
        <div class="bg-track">${bar}<span class="bg-mark caut" style="left:${pos(RC.CAUTION * RC.LIMIT)}%"><em>${Math.round(RC.CAUTION * RC.LIMIT)}</em></span><span class="bg-mark lim" style="left:${pos(RC.LIMIT)}%"><em>Limite ${RC.LIMIT} mSv</em></span></div>
        <ul class="bg-leg">${segs.map(s => `<li><i class="${s.cls}"></i><span>${esc(s.name)}</span><b class="num">${fmt(s.v, s.v > 0 && s.v < 1 ? 2 : 1)}</b><small>${s.note}</small></li>`).join('')}<li class="tot"><i></i><span>Total projetado ao fim da missão</span><b class="num">${fmt(P.total, 0)} mSv</b><small>${fmt(P.pct * 100, 0)}% do limite</small></li></ul>
        <div class="bg-in">
          <label>Missões anteriores<span class="unit-wrap"><input class="inp" type="number" min="0" max="600" step="1" data-k="prior" value="${plan.prior}"><em>mSv</em></span></label>
          <label>Dias na superfície<span class="unit-wrap"><input class="inp" type="number" min="0" max="900" step="1" data-k="surfaceDays" value="${plan.surfaceDays}"><em>dias</em></span></label>
          <label>Dias de retorno<span class="unit-wrap"><input class="inp" type="number" min="0" max="400" step="1" data-k="returnDays" value="${plan.returnDays}"><em>dias</em></span></label>
        </div>
        <p class="vnote">Dose na missão estimada com as taxas medidas pelo instrumento RAD da Curiosity: ${fmt(RC.RATE_CRUISE, 2)} mSv/dia em trânsito e ${fmt(RC.RATE_SURFACE, 2)} mSv/dia na superfície. Missões anteriores: valor de demonstração, edite acima. ${dos ? `O dosímetro da base sintética marca só ${fmt(dos.cum, 2)} mSv em ${plan.elapsedDays} dias, muito abaixo do medido no espaço profundo; por isso a estimativa usa a taxa da RAD.` : ''}</p>
      </div>`;
      b.querySelectorAll('input[data-k]').forEach(inp => inp.onchange = () => {
        const v = Math.max(0, +inp.value || 0);
        if (inp.dataset.k === 'prior') RP.prior[c.crew.id] = v; else RP[inp.dataset.k] = v;
        save(); c.rerender();
      });
    } });

  /* ---------- RAD-03 Dose projetada (velocímetro) ---------- */
  M.define({ id: 'RAD-03', key: 'rad.projetada', title: 'Dose de carreira projetada', sub: 'Ao fim da missão, com o plano atual', size: 'm',
    render(b, c, el) {
      const P = c.proj, m = { label: 'Dose de carreira projetada', unit: 'mSv', dec: 0, ok: [0, RC.CAUTION * RC.LIMIT], warn: [0, RC.LIMIT] };
      const lvl = P.total > RC.LIMIT ? 2 : P.total > RC.CAUTION * RC.LIMIT ? 1 : 0;
      el.querySelector('.mod-x').innerHTML = chip(lvl, ['Dentro do limite', 'Perto do limite', 'Acima do limite'][lvl]);
      b.innerHTML = `<div class="gauge-wrap">${U.gauge({ m, v: P.total, min: 0, max: 800, ticks: [RC.CAUTION * RC.LIMIT, RC.LIMIT] })}</div>
        <div class="vr"><strong class="num">${fmt(P.total, 0)}<small>mSv</small></strong><span>${fmt(P.pct * 100, 0)}% do limite de carreira</span><span class="${P.margin < 0 ? 'neg' : ''}">${P.margin >= 0 ? `Margem de ${fmt(P.margin, 0)} mSv` : `Excede em ${fmt(-P.margin, 0)} mSv`}</span></div>
        <p class="vnote">Limite NASA: dose efetiva de carreira abaixo de 600 mSv, igual para todas as idades e sexos (NASA-STD-3001). Ele mantém o risco de morte por câncer até cerca de 3% acima do normal.</p>`;
    } });

  /* ---------- RAD-10 Trajetória da dose de carreira ----------
     Dose efetiva acumulada por dia de missão: linha cheia = já recebida, tracejada = projeção do plano.
     Mesmos números de R.project (RAD-02/03); aqui o eixo é o tempo, para ver QUANDO o limite é cruzado. */
  const TJ_PHASE = ['no trânsito de ida', 'na estadia na superfície', 'no retorno à Terra'];
  M.define({ id: 'RAD-10', key: 'rad.trajetoria', title: 'Trajetória da dose de carreira', sub: 'Dose efetiva já recebida e projeção até o fim da missão, contra o limite da NASA', size: 'full',
    render(b, c) {
      const P = c.proj, plan = c.plan, LIM = RC.LIMIT, CAU = RC.CAUTION * RC.LIMIT;
      const d1 = plan.elapsedDays, d2 = d1 + plan.surfaceDays, d3 = d2 + plan.returnDays, D = Math.max(d3, 1);
      const pts = [[0, plan.prior], [d1, P.toDate], [d2, P.toDate + P.surface + P.evaExtra], [d3, P.total]];  // acréscimo das saídas distribuído pela superfície
      /* Cruzamento do limite: seg -1 = antes da missão, 0 = já na ida (passado), 1 = superfície, 2 = retorno */
      let cross = null;
      if (plan.prior > LIM) cross = { day: 0, seg: -1 };
      else for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
        if (y0 <= LIM && y1 > LIM) { cross = { day: x0 + (x1 - x0) * (LIM - y0) / (y1 - y0), seg: i - 1 }; break; }
      }
      const lvl = P.total > LIM ? 2 : P.total > CAU ? 1 : 0, past = cross && cross.seg <= 0, left = d3 - d1;
      const crossDay = cross ? Math.max(1, Math.ceil(cross.day)) : null;
      const head = !cross ? ['Dentro do limite de carreira', 'Perto do limite de carreira'][lvl] : past ? 'Limite de carreira já excedido' : 'Vai exceder o limite de carreira';
      const text = !cross
        ? `Termina a missão com ${fmt(P.pct * 100, 0)}% do limite e margem de ${fmt(P.margin, 0)} mSv.${lvl ? ' Dias extras ou um evento solar podem levar acima do limite.' : ''}`
        : past ? `A dose já recebida passa de ${LIM} mSv. O plano termina ${fmt(-P.margin, 0)} mSv acima do limite.`
          : `Cruza ${LIM} mSv no dia ${crossDay} da missão, ${TJ_PHASE[cross.seg]} (hoje é o dia ${d1}). Termina ${fmt(-P.margin, 0)} mSv acima do limite.`;

      const W = 960, H = 250, L = 44, Rr = 84, T = 20, B = 44, iw = W - L - Rr, ih = H - T - B;
      const ymax = Math.ceil(Math.max(LIM * 1.15, P.total * 1.08) / 100) * 100;
      const x = d => L + iw * d / D, y = v => T + ih * (1 - Math.min(v, ymax) / ymax), f1 = n => n.toFixed(1);
      const line = arr => arr.map((p, i) => `${i ? 'L' : 'M'}${f1(x(p[0]))} ${f1(y(p[1]))}`).join('');
      const area = (arr, base) => arr.length < 2 ? '' : `${line(arr)}L${f1(x(arr[arr.length - 1][0]))} ${f1(y(base))}L${f1(x(arr[0][0]))} ${f1(y(base))}Z`;
      const xp = cross && [cross.day, LIM];
      const before = !cross ? pts.slice(1) : past ? [] : [pts[1], ...pts.slice(2, cross.seg + 1), xp];
      const after = !cross ? [] : past ? pts.slice(1) : [xp, ...pts.slice(cross.seg + 1)];
      const nice = (span, opts, n) => opts.find(s => span / s <= n) || opts[opts.length - 1];
      const ys = nice(ymax, [100, 200, 250, 500, 1000, 2000], 5), xs = nice(D, [5, 10, 20, 25, 50, 100, 200, 500], 9);
      let yt = '', xt = '';
      for (let v = 0; v <= ymax; v += ys) yt += `<line class="sw-grid" x1="${L}" x2="${W - Rr}" y1="${f1(y(v))}" y2="${f1(y(v))}"/><text class="sw-ax" x="${L - 6}" y="${f1(y(v) + 3)}" text-anchor="end">${v}</text>`;
      for (let d = 0; d <= D; d += xs) xt += `<text class="sw-ax" x="${f1(x(d))}" y="${H - B + 14}" text-anchor="middle">${d}</text>`;
      const phases = [[0, d1, 'Trânsito de ida'], [d1, d2, 'Superfície'], [d2, d3, 'Retorno']].filter(p => x(p[1]) - x(p[0]) > 64)
        .map(p => `<text class="tj-ph" x="${f1((x(p[0]) + x(p[1])) / 2)}" y="${H - 8}" text-anchor="middle">${p[2]}</text>`).join('');
      const cx = cross && x(cross.day), farLeft = cross && cx < L + 300;
      const svg = `<svg class="tjchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Dose efetiva acumulada por dia de missão, recebida e projetada, contra o limite de carreira">
        <rect class="tj-zone" x="${L}" y="${f1(y(ymax))}" width="${iw}" height="${f1(y(LIM) - y(ymax))}"/>
        ${d2 > d1 ? `<rect class="tj-band" x="${f1(x(d1))}" y="${f1(y(LIM))}" width="${f1(x(d2) - x(d1))}" height="${f1(y(0) - y(LIM))}"/>` : ''}
        ${yt}${xt}${phases}
        <text class="sw-ax" x="${W - 4}" y="${H - 8}" text-anchor="end">dia da missão</text><text class="sw-ax" x="${L}" y="11">mSv</text>
        <path class="tj-area-p" d="${area(pts.slice(1), 0)}"/><path class="tj-area" d="${area(pts.slice(0, 2), 0)}"/>
        ${after.length ? `<path class="tj-excess" d="${area(after, LIM)}"/>` : ''}
        <line class="tj-cau" x1="${L}" x2="${W - Rr}" y1="${f1(y(CAU))}" y2="${f1(y(CAU))}"/><text class="tj-cau-t" x="${L + 6}" y="${f1(y(CAU) + 13)}">${Math.round(RC.CAUTION * 100)}% do limite</text>
        <line class="tj-lim" x1="${L}" x2="${W - Rr}" y1="${f1(y(LIM))}" y2="${f1(y(LIM))}"/><text class="tj-lim-t" x="${L + 6}" y="${f1(y(LIM) - 6)}">Limite ${LIM} mSv</text>
        ${before.length > 1 ? `<path class="tj-proj" d="${line(before)}"/>` : ''}${after.length > 1 ? `<path class="tj-over" d="${line(after)}"/>` : ''}
        <path class="tj-got" d="${line(pts.slice(0, 2))}"/>
        <line class="sw-now" x1="${f1(x(d1))}" x2="${f1(x(d1))}" y1="${T}" y2="${T + ih}"/><text class="sw-now-t" x="${f1(x(d1) + 5)}" y="${T + ih - 6}">hoje</text>
        <circle class="tj-now-dot" cx="${f1(x(d1))}" cy="${f1(y(P.toDate))}" r="5"><title>Recebida até hoje: ${fmt(P.toDate, 0)} mSv</title></circle>
        ${cross && !past ? `<circle class="tj-x-ring" cx="${f1(cx)}" cy="${f1(y(LIM))}" r="7"/><circle class="tj-x" cx="${f1(cx)}" cy="${f1(y(LIM))}" r="6"/><text class="tj-x-t" x="${f1(farLeft ? cx + 12 : cx - 12)}" y="${f1(farLeft ? y(LIM) + 17 : y(LIM) - 9)}" text-anchor="${farLeft ? 'start' : 'end'}">Cruza o limite no dia ${crossDay}</text>` : ''}
        <circle class="tj-end l${lvl}" cx="${f1(x(d3))}" cy="${f1(y(P.total))}" r="5.5"/><text class="tj-end-t l${lvl}" x="${f1(x(d3) + 10)}" y="${f1(y(P.total) + 4)}">${fmt(P.total, 0)} mSv</text>
      </svg>`;
      b.innerHTML = `<div class="tj">
        <div class="tj-top">
          <div class="tj-status l${lvl}"><span class="tj-ic">${icon(lvl ? 'warn' : 'check')}</span><div><strong>${head}</strong><p>${text}</p></div></div>
          <div class="tj-kpis">
            <div><span>Recebida até hoje</span><b class="num">${fmt(P.toDate, 0)} mSv</b><small>${fmt(P.toDate / LIM * 100, 0)}% do limite</small></div>
            <div><span>Ainda a receber no plano</span><b class="num">${fmt(P.total - P.toDate, 0)} mSv</b><small>${left === 1 ? '1 dia restante' : `${left} dias restantes`}</small></div>
            <div class="l${lvl}"><span>Ao fim da missão</span><b class="num">${fmt(P.total, 0)} mSv</b><small>${P.margin >= 0 ? `Margem de ${fmt(P.margin, 0)} mSv` : `Excede em ${fmt(-P.margin, 0)} mSv`}</small></div>
          </div>
        </div>
        ${svg}
        <div class="legend"><span><i style="background:var(--accent)"></i>Dose já recebida</span><span><i style="height:2px;border-top:2px dashed var(--accent);background:none"></i>Projeção do plano</span><span><i style="background:var(--crit)"></i>Acima do limite</span></div>
        <p class="vnote">Dose efetiva (mSv), a grandeza do limite de carreira; não é a dose absorvida (Gy), que mede só a energia depositada. Já recebida: missões anteriores (suposição) mais o trânsito até hoje, pela taxa medida pelo instrumento RAD. Projeção: dias planejados vezes as taxas medidas; o acréscimo das saídas é distribuído pela estadia na superfície.</p>
      </div>`;
    } });

  /* ---------- RAD-04 Planejar saída da base ---------- */
  const VERD = { go: ['Pode seguir', 'l0', 'check'], caution: ['Seguir com cautela', 'l1', 'warn'], nogo: ['Não seguir agora', 'l2', 'warn'] };
  M.define({ id: 'RAD-04', key: 'rad.saida', title: 'Planejar saída da base', sub: 'Atividade extraveicular em Marte: dose esperada e recomendação', size: 'full',
    render(b, c) {
      const P = c.proj, plan = c.plan, d = c.dec, [vt, vc, vi] = VERD[d.verdict];
      const seg = (k, opts) => `<div class="seg" role="group">${Object.entries(opts).map(([v, t]) => `<button type="button" data-${k}="${v}" aria-pressed="${plan[k] === v}">${esc(t)}</button>`).join('')}</div>`;
      const earthDays = P.evaPer / (RC.EARTH_BG_YEAR / 365);
      b.innerHTML = `<div class="eva">
        <div class="eva-in">
          <label>Duração de cada saída <b class="num" data-o="hours">${fmt(plan.hours, 1)} h</b><input type="range" min="1" max="8" step="0.5" data-k="hours" value="${plan.hours}"></label>
          <label>Número de saídas <b class="num" data-o="sorties">${plan.sorties}</b><input type="range" min="1" max="20" step="1" data-k="sorties" value="${plan.sorties}"></label>
          <div class="lab">Proteção${seg('prot', { traje: R.PROT.traje.name, rover: R.PROT.rover.name })}</div>
          <div class="lab">Atividade solar${seg('solar', { calmo: 'Calma', elevado: 'Elevada', evento: 'Evento em curso' })}<small>${RP.solar ? `Escolhido manualmente. <button type="button" class="linkbtn" data-auto>Usar sugestão (${esc(R.SOLAR[c.auto.v].name.toLowerCase())})</button>` : `Sugerido: ${esc(c.auto.why)}.`}</small></div>
          <label>Tempo de retorno ao abrigo <b class="num" data-o="returnMin">${plan.returnMin} min</b><input type="range" min="5" max="240" step="5" data-k="returnMin" value="${plan.returnMin}"></label>
        </div>
        <div class="eva-out">
          <div class="verdict-card ${vc}"><span class="vc-ic">${icon(vi)}</span><div><strong>${vt}</strong><p>${d.reasons.length ? esc(d.reasons.join('; ')) + '.' : 'Atividade solar calma, dose dentro do orçamento e nenhum status crítico de saúde.'}</p></div></div>
          <div class="eva-kpis">
            <div><span>Dose de cada saída</span><b class="num">${fmt(P.evaPer, 2)} mSv</b><small>${fmt(earthDays, 0)} dias de fundo natural na Terra</small></div>
            <div><span>Todas as saídas</span><b class="num">${fmt(P.evaTotal, 2)} mSv</b><small>${plan.sorties} saída${plan.sorties > 1 ? 's' : ''}</small></div>
            <div><span>Acréscimo por sair da base</span><b class="num">${fmt(P.evaExtra, 2)} mSv</b><small>em relação a ficar no habitat</small></div>
            <div><span>Carreira projetada</span><b class="num">${fmt(P.total, 0)} mSv</b><small>${fmt(P.pct * 100, 0)}% do limite</small></div>
          </div>
          <p class="vnote">Na superfície, a blindagem barra só cerca de 7% dos raios cósmicos galácticos, então uma saída em dia calmo acrescenta pouca dose. O risco real de sair é um evento de partículas solares: a blindagem corta cerca de 50% dessa dose, e encerrar a saída em até 2 h com alerta de dosimetria em tempo real dá proteção muito alta (NASA OCHMO-TB-020). Em set/2017, a taxa na superfície subiu 2 a 3 vezes durante horas.</p>
        </div></div>`;
      b.querySelectorAll('input[type=range]').forEach(inp => {
        const out = b.querySelector(`[data-o="${inp.dataset.k}"]`), unit = { hours: ' h', returnMin: ' min', sorties: '' }[inp.dataset.k];
        inp.oninput = () => { out.textContent = (inp.dataset.k === 'hours' ? fmt(+inp.value, 1) : inp.value) + unit; };
        inp.onchange = () => { RP[inp.dataset.k] = +inp.value; save(); c.rerender(); };
      });
      b.querySelectorAll('[data-prot]').forEach(x => x.onclick = () => { RP.prot = x.dataset.prot; save(); c.rerender(); });
      b.querySelectorAll('[data-solar]').forEach(x => x.onclick = () => { RP.solar = x.dataset.solar; save(); c.rerender(); });
      const au = b.querySelector('[data-auto]'); if (au) au.onclick = () => { RP.solar = null; save(); c.rerender(); };
    } });

  /* ---------- RAD-05 Atividade solar e eventos (dados reais) ---------- */
  M.define({ id: 'RAD-05', key: 'rad.solar', title: 'Atividade solar e eventos de partículas', sub: 'Dados reais: manchas solares (NOAA) e eventos SEP registrados pela NASA (DONKI)', size: 'full',
    render(b, c, el) {
      const s = SW();
      if (!s) { b.innerHTML = '<div class="empty"><b>Sem dados de clima espacial</b>Rode scripts/fetch_space_weather.py e web/prep_data.py.</div>'; return; }
      el.querySelector('.mod-x').innerHTML = `<span class="chip l0">Dado real</span>`;
      const model = R.sepModel(s), now = nowMonth();
      const months = []; { let [y, mo] = [2019, 12]; while (y < 2031) { months.push(`${y}-${String(mo).padStart(2, '0')}`); mo++; if (mo > 12) { mo = 1; y++; } } }
      const W = 960, H = 230, L = 34, Rr = 10, T = 30, B = 26, iw = W - L - Rr, ih = H - T - B, ymax = 220;
      const x = mth => L + iw * months.indexOf(mth) / (months.length - 1), y = v => T + ih * (1 - Math.min(v, ymax) / ymax);
      const obs = s.ssn.filter(m => m[0] >= months[0] && m[1] >= 0), sm = obs.filter(m => m[2] != null);
      const pred = s.pred.filter(m => m[0] >= months[0] && m[0] <= months[months.length - 1]);
      const line = (arr, i) => arr.map((m, k) => `${k ? 'L' : 'M'}${x(m[0]).toFixed(1)} ${y(m[i]).toFixed(1)}`).join('');
      const band = pred.length ? `M${pred.map(m => `${x(m[0]).toFixed(1)} ${y(m[3]).toFixed(1)}`).join('L')}L${pred.slice().reverse().map(m => `${x(m[0]).toFixed(1)} ${y(m[2]).toFixed(1)}`).join('L')}Z` : '';
      const covM = [...model.cov].sort(), cov0 = covM[0], cov1 = covM[covM.length - 1];
      const xd = iso => { const m = iso.slice(0, 7), dd = +iso.slice(8, 10); return x(m) + (dd - 1) / 30 * (iw / (months.length - 1)); };
      const dots = s.sep.map(e => `<circle class="sw-sep${e[4] ? ' hard' : ''}" cx="${xd(e[0]).toFixed(1)}" cy="${T - 12}" r="${e[4] ? 5 : 4}"><title>${e[0].slice(0, 10)}: evento SEP${e[4] ? ' com prótons acima de 100 MeV' : ''} (${e[2]} detecções)</title></circle>`).join('');
      const covBar = cov0 ? `<line class="sw-cov" x1="${x(cov0)}" x2="${x(cov1) + iw / (months.length - 1)}" y1="${T - 3}" y2="${T - 3}"/>` : '';
      const yt = [0, 50, 100, 150, 200].map(v => `<line class="sw-grid" x1="${L}" x2="${W - Rr}" y1="${y(v)}" y2="${y(v)}"/><text class="sw-ax" x="${L - 6}" y="${y(v) + 3}" text-anchor="end">${v}</text>`).join('');
      const xt = [2020, 2022, 2024, 2026, 2028, 2030].map(yr => `<text class="sw-ax" x="${x(yr + '-01')}" y="${H - 8}" text-anchor="middle">${yr}</text>`).join('');
      const mis = A.DB.missions[0], ms = mis.start.slice(0, 7), me = mis.end.slice(0, 7);
      const peak = sm.reduce((a, m) => m[2] > a[2] ? m : a, sm[0]);
      const svg = `<svg class="swchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Número de manchas solares de 2019 a 2030 com eventos de partículas solares">
        ${yt}${xt}
        <rect class="sw-mis" x="${x(ms)}" y="${T}" width="${Math.max(3, x(me) - x(ms))}" height="${ih}"><title>Missão ${esc(mis.name)} (fictícia)</title></rect>
        ${band ? `<path class="sw-band" d="${band}"/>` : ''}
        <path class="sw-obs" d="${line(obs, 1)}"/><path class="sw-sm" d="${line(sm, 2)}"/>${pred.length ? `<path class="sw-pred" d="${line(pred, 1)}"/>` : ''}
        ${covBar}${dots}
        <line class="sw-now" x1="${x(now)}" x2="${x(now)}" y1="${T - 26}" y2="${T + ih}"/><text class="sw-now-t" x="${x(now) + 4}" y="${T + 10}">hoje</text>
        <text class="sw-ax" x="${L}" y="12">eventos SEP medidos (NASA DONKI)${cov0 ? `, cobertura ${cov0.replace('-', '/')} a ${cov1.replace('-', '/')}` : ''}</text>
      </svg>`;
      const next = []; { let [yy, mm] = now.split('-').map(Number); for (let i = 0; i < 12; i++) { const k = `${yy}-${String(mm).padStart(2, '0')}`, ss = ssnFor(k); next.push([k, ss, ss == null ? null : model.pMonth(ss)]); mm++; if (mm > 12) { mm = 1; yy++; } } }
      const MES = window.I18N.months();
      const lv = p => p == null ? 'n' : p >= 0.6 ? 'l2' : p >= 0.35 ? 'l1' : 'l0';
      const hard = s.sep.filter(e => e[4]).length, inMis = s.sep.filter(e => e[0].slice(0, 7) >= ms && e[0].slice(0, 7) <= me);
      b.innerHTML = `<div class="sw">
        <div class="sw-kpis"><div><span>Eventos SEP medidos</span><b class="num">${s.sep.length}</b><small>${cov0 ? `${cov0.replace('-', '/')} a ${cov1.replace('-', '/')}` : 'sem cobertura'}</small></div><div><span>Com prótons acima de 100 MeV</span><b class="num">${hard}</b><small>os mais penetrantes</small></div><div><span>Durante a missão (fictícia)</span><b class="num">${inMis.length}</b><small>${inMis.map(e => U.fmtD(e[0])).join(', ') || 'nenhum'}</small></div><div><span>Pico do ciclo 25</span><b class="num">${fmt(peak[2], 0)}</b><small>manchas (média suavizada), ${peak[0].replace('-', '/')}</small></div></div>
        ${svg}
        <div class="legend"><span><i style="background:var(--muted)"></i>Manchas no mês</span><span><i style="background:var(--accent)"></i>Média suavizada (NOAA)</span><span><i style="background:var(--c4);height:2px;border-top:2px dashed var(--c4);background:none"></i>Previsão NOAA e faixa</span><span><i class="sw" style="background:var(--warn);border-radius:50%"></i>Evento SEP (NASA DONKI)</span><span><i class="sw" style="background:var(--crit);border-radius:50%"></i>Com prótons acima de 100 MeV</span><span><i class="sw" style="background:var(--accent-soft);box-shadow:inset 0 0 0 1px var(--accent-line)"></i>Período da missão (fictícia)</span></div>
        <h3 class="sw-h">Próximos 12 meses: chance de pelo menos um evento SEP no mês</h3>
        <div class="sw-cal">${next.map(([k, ss, p]) => `<div class="${lv(p)}"><span>${MES[+k.slice(5) - 1]}/${k.slice(2, 4)}</span><b class="num">${p == null ? '—' : Math.round(p * 100) + '%'}</b><small>${ss == null ? 'sem previsão' : fmt(ss, 0) + ' manchas'}</small></div>`).join('')}</div>
        <p class="vnote">Estimativa simples nossa: a taxa de eventos por mês é proporcional ao número de manchas, ajustada nos ${model.months} meses com cobertura completa do DONKI (${model.events} eventos; detecções do mesmo evento em até 48 h contam uma vez; entradas só de modelo foram descartadas). A previsão de manchas é da NOAA. Eventos SEP são detectados perto da Terra; em Marte a chegada depende da posição dos planetas. Os raios cósmicos galácticos fazem o oposto: são mais intensos no mínimo solar.</p>
      </div>`;
    } });

  /* ---------- RAD-06 Efeitos no corpo ---------- */
  const ORG = [
    { p: [0, 18], n: 'Sistema nervoso central', t: 'Íons pesados podem afetar cognição e memória; efeito em estudo.' },
    { p: [-7, 24], n: 'Cristalino (olhos)', t: 'Catarata precoce, observada em astronautas.' },
    { p: [6, 118], n: 'Coração e vasos', t: 'Maior risco de doença cardiovascular a longo prazo.' },
    { p: [0, 172], n: 'Intestino', t: 'Muito sensível a doses altas: náusea e vômito no quadro agudo.' },
    { p: [-20, 236], n: 'Medula óssea', t: 'Produz o sangue; doses altas derrubam leucócitos e plaquetas.' },
    { p: [44, 150], n: 'Pele', t: 'Vermelhidão e lesão com doses altas de prótons de evento solar.' },
  ];
  M.define({ id: 'RAD-06', key: 'rad.corpo', title: 'Efeitos da radiação no corpo', sub: 'Órgãos mais sensíveis e o que acontece com cada um', size: 'l', flush: true,
    render(b) {
      const body = window.BODYMAP && window.BODYMAP.BODY;
      b.innerHTML = `<div class="rbody">
        ${body ? `<svg class="rbody-fig" viewBox="-70 -12 140 440" aria-hidden="true"><path class="bm-body" d="${body}" fill="url(#rb-fill)"/><defs><linearGradient id="rb-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".14"/><stop offset="1" stop-color="var(--accent)" stop-opacity=".03"/></linearGradient></defs>${ORG.map((o, i) => `<g class="rb-pt"><circle cx="${o.p[0]}" cy="${o.p[1]}" r="8"/><text x="${o.p[0]}" y="${o.p[1] + 3.5}">${i + 1}</text></g>`).join('')}</svg>` : ''}
        <ol class="rbody-list">${ORG.map(o => `<li><b>${esc(o.n)}</b><span>${esc(o.t)}</span></li>`).join('')}</ol>
      </div>
      <div class="rterm"><div><h4>Curto prazo</h4><p>Só com doses altas e rápidas, como um evento solar forte sem abrigo: náusea, fadiga, queda de células do sangue e lesão de pele (síndrome aguda da radiação).</p></div><div><h4>Longo prazo</h4><p>Câncer é o risco que define o limite de 600 mSv. Também catarata, doença cardiovascular e efeitos no sistema nervoso, que ainda estão em estudo.</p></div></div>`;
    } });

  /* ---------- RAD-07 Grandezas e partículas ---------- */
  M.define({ id: 'RAD-07', key: 'rad.grandezas', title: 'Como a radiação é medida', sub: 'Energia depositada, dano biológico e as partículas que mais preocupam', size: 'l',
    render(b) {
      b.innerHTML = `<div class="qty">
        <div><span class="qty-u">Gy</span><div><b>Dose absorvida</b><p>Energia depositada no tecido: 1 gray = 1 joule por kg. Na superfície de Marte, a RAD mediu ${fmt(RC.ABS_SURFACE[0], 2)} a ${fmt(RC.ABS_SURFACE[1], 3)} mGy por dia.</p></div></div>
        <div><span class="qty-u">Sv</span><div><b>Dose equivalente</b><p>Dose absorvida multiplicada pelo peso do tipo de radiação: partículas pesadas causam mais dano por joule. Em Marte, ${fmt(RC.RATE_SURFACE, 2)} mSv por dia, cerca de 3 vezes a dose absorvida.</p></div></div>
        <div><span class="qty-u">Sv</span><div><b>Dose efetiva</b><p>Soma ponderada pelos órgãos expostos. É a grandeza do limite de carreira da NASA (600 mSv).</p></div></div>
      </div>
      <div class="ptype">
        <div><h4>${icon('rad')}Raios cósmicos galácticos</h4><p>Núcleos pesados de altíssima energia, como o ferro (íons HZE). Chegam o tempo todo, ionizam densamente o DNA e atravessam a blindagem: ela reduz só cerca de 7% da dose.</p></div>
        <div><h4>${icon('sun')}Eventos de partículas solares</h4><p>Rajadas de prótons que duram horas a dias, mais comuns perto do máximo solar. A blindagem corta cerca de 50%; um abrigo com 10 cm de água equivalente protege contra eventos extremos.</p></div>
      </div>`;
    } });

  /* ---------- RAD-08 Escala de doses ---------- */
  M.define({ id: 'RAD-08', key: 'rad.escala', title: 'Escala de doses', sub: 'Escala logarítmica: cada marca vale 10 vezes a anterior', size: 'full',
    render(b, c) {
      const P = c.proj;
      const rows = [
        { n: '1 dia na superfície de Marte', v: RC.RATE_SURFACE, k: 'ref' },
        { n: '1 dia em trânsito no espaço profundo', v: RC.RATE_CRUISE, k: 'ref' },
        { n: '1 ano de fundo natural na Terra', v: RC.EARTH_BG_YEAR, k: 'ref' },
        { n: window.I18N.t('Saída planejada ({h} h, {p})', { h: fmt(c.plan.hours, 1), p: window.I18N.t(R.PROT[c.plan.prot].name).toLowerCase() }), v: P.evaPer, k: 'you' },
        { n: 'Limite para o evento solar de projeto', v: RC.SPE_LIMIT, k: 'lim' },
        { n: 'Limite de carreira NASA', v: RC.LIMIT, k: 'lim' },
        { n: `Carreira projetada de ${c.crew.name}`, v: P.total, k: 'you' },
        { n: 'Trânsitos de ida e volta a Marte', v: RC.TRANSIT_ROUND, k: 'ref' },
        { n: 'Missão completa a Marte (~500 dias na superfície)', v: RC.FULL_MISSION, k: 'ref' },
      ].sort((a, z) => a.v - z.v);
      const lo = -1, hi = Math.log10(3000), pos = v => ((Math.log10(Math.max(v, 0.1)) - lo) / (hi - lo) * 100).toFixed(2);
      b.innerHTML = `<div class="ladder"><div class="ld-ax">${[0.1, 1, 10, 100, 1000].map(v => `<span style="left:${pos(v)}%">${fmt(v, v < 1 ? 1 : 0)}</span>`).join('')}<span class="u">mSv</span></div>
        ${rows.map(r => `<div class="ld-row ${r.k}"><span>${esc(r.n)}</span><div class="ld-tr"><i style="width:${pos(r.v)}%"></i><b class="num" style="left:${pos(r.v)}%">${fmt(r.v, r.v < 10 ? 2 : 0)}</b></div></div>`).join('')}</div>
        <p class="vnote">Uma missão completa a Marte, nas estimativas publicadas com dados da RAD, passa do limite de carreira atual. Por isso cada saída e cada dia de trânsito contam.</p>`;
    } });

  /* ---------- RAD-09 Fontes e suposições ---------- */
  M.define({ id: 'RAD-09', key: 'rad.fontes', title: 'Fontes e suposições', sub: 'O que é medido, o que é modelo nosso e o que é dado de demonstração', size: 'full',
    render(b) {
      const s = SW(), T = { real: ['l0', 'Real'], sup: ['l1', 'Suposição'], sint: ['n', 'Sintético'] };
      const rows = [
        ['real', 'Limite de carreira 600 mSv [V1 4030], evento solar de projeto 250 mSv [V1 4031], blindagem 7% (raios cósmicos) e 50% (eventos solares), encerrar EVA em até 2 h', 'NASA OCHMO-TB-020, Technical Brief derivado do NASA-STD-3001 Vol. 1 Rev B (dez/2022)', 'https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf'],
        ['real', '1,84 mSv/dia em cruzeiro e cerca de 0,66 Sv nos trânsitos de ida e volta', 'Zeitlin et al., Science 2013 (instrumento RAD, Mars Science Laboratory)', 'https://www.swri.org/press-release/swri-scientists-publish-first-radiation-measurements-surface-mars'],
        ['real', '0,64 mSv/dia e 0,18 a 0,225 mGy/dia na superfície de Marte', 'Hassler et al., Science 2014, doi:10.1126/science.1244797', 'https://doi.org/10.1126/science.1244797'],
        ['real', 'Missão completa a Marte: cerca de 1,01 Sv (180 dias de ida, 500 na superfície, 180 de volta)', 'Hassler et al., Science 2014, doi:10.1126/science.1244797', 'https://doi.org/10.1126/science.1244797'],
        ['real', 'Evento de set/2017: taxa 2 a 3 vezes o fundo na superfície por horas', 'Zeitlin et al. 2018, GRL; Hassler et al. 2018, Space Weather', 'https://doi.org/10.1029/2018GL077760'],
        ['real', `Manchas solares observadas e previstas (baixado em ${s ? s.fetched : '—'})`, 'NOAA Space Weather Prediction Center', 'https://www.swpc.noaa.gov/products/solar-cycle-progression'],
        ['real', `Eventos de partículas solares energéticas: ${s ? s.sep.length : '—'} eventos em ${s && s.sep_months_covered ? s.sep_months_covered.length : 0} meses com cobertura completa`, 'NASA DONKI (Space Weather Database Of Notifications, Knowledge, Information), CCMC/GSFC, via api.nasa.gov', 'https://ccmc.gsfc.nasa.gov/tools/DONKI/'],
        ['real', 'Máximo solar do ciclo 25 anunciado em out/2024', 'NASA e NOAA', 'https://svs.gsfc.nasa.gov/14683/'],
        ['sup', 'Taxa de eventos SEP proporcional ao número de manchas; chance mensal = 1 − e^(−taxa)', 'Modelo nosso, ajustado nos dados reais acima', ''],
        ['sup', 'Fatores de proteção do traje (sem redução) e do rover/habitat (7% e 50%); evento em curso multiplica a taxa por 2,5', 'Escolhas nossas a partir das fontes acima', ''],
        ['real', 'Fundo natural na Terra 2,4 mSv/ano (média mundial)', 'UNSCEAR 2008, Relatório à Assembleia Geral, Anexo B', 'https://www.unscear.org/unscear/en/publications/2008_1.html'],
        ['sint', 'Dose de missões anteriores, duração da missão, dosímetro pessoal (0,5 µSv/h)', 'Base de demonstração do projeto', ''],
      ];
      b.innerHTML = `<ul class="src">${rows.map(([k, w, src, url]) => `<li><span class="chip ${T[k][0]}">${T[k][1]}</span><div><b>${esc(w)}</b><span>${url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(src)}</a>` : esc(src)}</span></div></li>`).join('')}</ul>`;
    } });

  function render(root) {
    const S = window.APP.state, ctx = context(S, () => render(root));
    M.mount(root, LAYOUT, ctx);
  }
  V.radiacao = { render, LAYOUT, RP };
})();
