/* =========================================================
   Athenance: modelo de dose de radiação (página RAD)
   Toda constante tem a fonte ao lado. "real" = medido/publicado,
   "suposição" = escolha nossa para a demonstração.
   ========================================================= */
(function () {
  const RC = {
    LIMIT: 600,              // mSv, limite de carreira, dose efetiva. NASA-STD-3001 Vol.1 Rev B [V1 4030] (real)
    CAUTION: 0.8,            // 80% do limite = faixa de cautela (suposição, mesma regra do motor Python R9)
    SPE_LIMIT: 250,          // mSv, evento solar de projeto (soma dos eventos de out/1989). [V1 4031] (real)
    RATE_CRUISE: 1.84,       // mSv/dia, dose equivalente em cruzeiro Terra-Marte, MSL/RAD (Zeitlin et al. 2013) (real)
    RATE_SURFACE: 0.64,      // mSv/dia, dose equivalente na superfície de Marte, MSL/RAD (Hassler et al. 2014) (real; 0,67 em outra média)
    ABS_SURFACE: [0.18, 0.225], // mGy/dia, dose absorvida na superfície (Hassler et al. 2014) (real)
    GCR_SHIELD: 0.07,        // blindagem de alumínio/polietileno reduz só ~7% da dose de raios cósmicos. NASA OCHMO-TB-020 (real)
    SPE_SHIELD: 0.50,        // e ~50% da dose de eventos solares. NASA OCHMO-TB-020 (real)
    SPE_SURFACE_MULT: 2.5,   // set/2017: na superfície a taxa subiu 2 a 3 vezes o fundo por horas (Zeitlin/Hassler 2018) (real, valor médio)
    EVA_ABORT_MIN: 120,      // encerrar a EVA em até 2 h com alerta em tempo real dá proteção muito alta. NASA OCHMO-TB-020 (real)
    EARTH_BG_YEAR: 2.4,      // mSv/ano, fundo natural médio na Terra. UNSCEAR 2008, Anexo B, média mundial (real)
    TRANSIT_ROUND: 660,      // mSv, só os trânsitos de ida e volta (~0,66 Sv). SwRI/RAD (real)
    FULL_MISSION: 1010,      // mSv, missão completa com ~500 dias em Marte (~1,01 Sv). Hassler et al. 2014, Science: 180 d de ida + 500 d na superfície + 180 d de volta (real, estimativa publicada)
  };

  /* Proteção durante a saída: fator sobre a dose de raios cósmicos (gcr) e de evento solar (spe) */
  const PROT = {
    traje: { name: 'Traje de EVA, a pé', gcr: 1, spe: 1 },
    rover: { name: 'Rover pressurizado', gcr: 1 - RC.GCR_SHIELD, spe: 1 - RC.SPE_SHIELD },
  };
  const HABITAT = { gcr: 1 - RC.GCR_SHIELD, spe: 1 - RC.SPE_SHIELD };  // dentro da base (suposição: blindagem típica)

  const SOLAR = {
    calmo: { name: 'Calma', mult: 1 },
    elevado: { name: 'Elevada', mult: 1 },          // risco de evento, dose ainda de fundo
    evento: { name: 'Evento em curso', mult: RC.SPE_SURFACE_MULT },
  };

  /* Dose de missões anteriores por tripulante (SUPOSIÇÃO sintética, editável na tela) */
  const PRIOR_DEFAULT = { 1: 72, 2: 0, 3: 45, 4: 0, 5: 110, 6: 38 };

  /* plan: { prior, elapsedDays, surfaceDays, returnDays, hours, sorties, prot, solar, returnMin } */
  function project(plan) {
    const p = PROT[plan.prot] || PROT.traje, s = SOLAR[plan.solar] || SOLAR.calmo;
    const transitSoFar = plan.elapsedDays * RC.RATE_CRUISE;
    const surface = plan.surfaceDays * RC.RATE_SURFACE * HABITAT.gcr;
    const ret = plan.returnDays * RC.RATE_CRUISE;
    /* Durante evento solar a taxa sobe (mult); a parte extra é de prótons e a blindagem corta ~50% dela */
    const dose = f => plan.hours / 24 * RC.RATE_SURFACE * (f.gcr + (s.mult - 1) * f.spe);
    const evaPer = dose(p);                                                                   // dose de uma saída
    const evaInHab = dose(HABITAT);                                                           // o que receberia na base no mesmo tempo
    const evaExtra = Math.max(0, evaPer - evaInHab) * plan.sorties;                          // acréscimo real por sair
    const toDate = plan.prior + transitSoFar;
    const total = toDate + surface + ret + evaExtra;
    return { transitSoFar, surface, ret, evaPer, evaExtra, evaTotal: evaPer * plan.sorties, toDate, total, pct: total / RC.LIMIT, margin: RC.LIMIT - total };
  }

  /* Recomendação: seguir / cautela / não seguir, com todos os motivos que dispararam */
  function decide(plan, proj, health) {
    const no = [], ca = [], T = (s, v) => (window.I18N ? window.I18N.t(s, v) : s);
    if (plan.solar === 'evento') no.push(T('evento de partículas solares em curso: permaneça no abrigo'));
    if (plan.solar === 'elevado' && plan.returnMin > RC.EVA_ABORT_MIN) no.push(T('atividade solar elevada e retorno ao abrigo em {m} min, acima das 2 h recomendadas', { m: plan.returnMin }));
    if (proj.total > RC.LIMIT) no.push(T('dose projetada de {d} mSv ultrapassa o limite de carreira de {l} mSv', { d: proj.total.toFixed(0), l: RC.LIMIT }));
    else if (proj.total > RC.CAUTION * RC.LIMIT) ca.push(T('dose projetada de {d} mSv acima de {p}% do limite de carreira', { d: proj.total.toFixed(0), p: Math.round(RC.CAUTION * 100) }));
    if (plan.solar === 'elevado' && plan.returnMin <= RC.EVA_ABORT_MIN) ca.push(T('atividade solar elevada: mantenha o alerta de dosimetria ligado e rota curta até o abrigo'));
    if (health && health.red.length) ca.push(T('status crítico em {s}', { s: health.red.map(x => T(x)).join(T(' e ')) }));
    if (health && health.level === 2 && !health.red.length) ca.push(T('condição geral crítica no último registro'));
    const verdict = no.length ? 'nogo' : ca.length ? 'caution' : 'go';
    return { verdict, reasons: no.concat(ca) };
  }

  /* Taxa de eventos SEP proporcional ao número de manchas solares, ajustada nos dados reais (NOAA + DONKI) */
  function sepModel(sw) {
    if (!sw || !sw.ssn || !sw.sep) return null;
    const count = {}; sw.sep.forEach(e => { const k = e[0].slice(0, 7); count[k] = (count[k] || 0) + 1; });
    const cov = new Set(sw.sep_months_covered || []);   // só meses que o DONKI cobriu por inteiro
    const months = sw.ssn.filter(m => cov.has(m[0]) && m[1] >= 0);
    let sumN = 0, sumS = 0;
    months.forEach(m => { sumN += count[m[0]] || 0; sumS += Math.max(0, m[1]); });
    const k = sumS ? sumN / sumS : 0;  // eventos por mês por unidade de manchas
    const lambda = ssn => k * Math.max(0, ssn);
    const pMonth = ssn => 1 - Math.exp(-lambda(ssn));
    return { k, count, lambda, pMonth, months: months.length, events: sumN, cov };
  }

  window.RAD = { RC, PROT, HABITAT, SOLAR, PRIOR_DEFAULT, project, decide, sepModel };
})();
