/* =========================================================
   Athenance: cenários de demonstração de um clique
   ---------------------------------------------------------
   Um cenário reescreve, SÓ EM MEMÓRIA, os últimos dias de UM tripulante
   (o selecionado). Nada vai para localStorage nem para os CSVs.
   "Voltar aos dados da base" recarrega a base sintética + registros do usuário.
   Valores são relativos ao padrão pessoal (baseline) do tripulante.
   ========================================================= */
(function () {
  const A = window.AT;
  const DAY = 864e5;
  const S = { active: null, crew: null };

  /* RNG determinístico: o mesmo cenário gera sempre os mesmos números */
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const gauss = r => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const round = (x, d) => Math.round(x * 10 ** d) / 10 ** d;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const dayStr = t => new Date(t).toISOString().slice(0, 10);

  /* Contexto comum entregue a cada cenário */
  function context(crew, days, seed) {
    const last = A.crewLastDate(crew).slice(0, 10), lastT = A.ts(last);
    const start = dayStr(lastT - (days - 1) * DAY);
    const r = rng(seed * 7919 + crew);
    const B = {}; A.MET.forEach(m => { const b = A.baseline(m, crew); if (b) B[m.key] = b; });
    const med = k => B[k] ? B[k].med : null, sig = k => B[k] ? B[k].sigma : 0;
    const inWin = row => row.crew === crew && row.date.slice(0, 10) >= start;
    const frac = row => days <= 1 ? 1 : (A.ts(row.date.slice(0, 10)) - A.ts(start)) / DAY / (days - 1); // 0 no 1º dia, 1 no último
    const n = (s = 1) => gauss(r) * s;
    return { crew, last, start, r, B, med, sig, inWin, frac, n };
  }

  /* Recalcula a dose acumulada do tripulante a partir das taxas (integração de 24 h) */
  function recomputeCum(crew) {
    const rows = A.DB.rad.filter(x => x.crew === crew).sort((a, b) => a.date < b.date ? -1 : 1);
    let cum = 0; rows.forEach(x => { cum += x.rate * 24 / 1000; x.cum = round(cum, 4); });
  }
  function addLab(c, code, value) {
    A.DB.labs.push({ crew: c.crew, date: c.last + 'T07:00', code, value: round(value, 3), qual: 'Quantified', scenario: true });
  }
  function setStages(c, row, deep, rem) {
    const s = A.DB.sleep.find(x => x.crew === c.crew && x.date === row.date); if (!s) return;
    s.tst = Math.round(row.sleep * 60); s.deep = round(clamp(deep, 6, 30), 1); s.rem = round(clamp(rem, 10, 32), 1); s.light = round(100 - s.deep - s.rem, 1);
  }

  const SCENARIOS = {
    nominal: {
      name: 'Nominal', icon: 'check', days: 14, seed: 1,
      desc: 'Duas semanas de rotina estável, todos os indicadores perto do padrão pessoal.',
      expect: ['Condição geral: Estável', 'Mapa do corpo todo verde', 'Nenhum padrão combinado'],
      apply(c) {
        A.DB.vitals.filter(c.inWin).forEach(x => {
          ['hr', 'sbp', 'dbp', 'temp', 'spo2', 'glu'].forEach(k => { if (c.med(k) != null) x[k] = round(c.med(k) + c.n(0.35 * c.sig(k)), A.MBY[k].dec + 1); });
          x.spo2 = clamp(x.spo2, 0, 100); if (c.med('mass') != null) x.mass = round(c.med('mass') + c.n(0.12), 2);
        });
        A.DB.mental.filter(c.inWin).forEach(x => {
          ['sleep', 'eff', 'mood', 'rt'].forEach(k => { if (c.med(k) != null) x[k] = round(c.med(k) + c.n(0.35 * c.sig(k)), 2); });
          x.stress = round(clamp(c.med('stress') + c.n(0.2), 1, 2.4), 1); x.mood = round(clamp(x.mood, 3.6, 5), 1); x.eff = round(clamp(x.eff, 85, 99), 1);
          setStages(c, x, 19 + c.n(1.2), 22.5 + c.n(1.2));
        });
        ['WBC', 'HS_CRP', 'CORTISOL_AM', 'VITAMIN_D_25OH', 'CTX', 'EBV_DNA_SALIVA', 'MICROBIOME_SHANNON', 'CAROTID_IMT'].forEach(code => {
          const k = A.LABCODE[code], m = A.MBY[k]; if (c.med(k) == null) return;
          let v = c.med(k) + c.n(0.2 * c.sig(k));
          if (m.ok) v = clamp(v, m.ok[0] + 0.1 * (m.ok[1] - m.ok[0]), m.ok[1] - 0.1 * (m.ok[1] - m.ok[0]));  // rotina: dentro da faixa de referência
          addLab(c, code, v);
        });
        A.DB.rad.filter(c.inWin).forEach(x => { x.rate = round(c.med('rad_rate') + c.n(0.3 * c.sig('rad_rate')), 3); });
        recomputeCum(c.crew);
        A.DB.env.filter(x => x.date.slice(0, 10) >= c.start).forEach(x => { x.co2 = round(c.med('co2') + c.n(40), 1); x.rh = round(c.med('rh') + c.n(1.5), 1); });
      },
    },

    sono: {
      name: 'Dívida de sono', icon: 'moon', days: 6, seed: 2,
      desc: 'Rotina estável e depois seis noites curtas e fragmentadas por carga de trabalho, cerca de 5 h por noite.',
      expect: ['Sono e eficiência fora da faixa', 'Padrão "Fadiga e estresse combinados"', 'Menos sono profundo e REM no TRI-20', 'FC de repouso um pouco acima do padrão'],
      apply(c) {
        A.DB.mental.filter(c.inWin).forEach(x => {
          const f = clamp(0.35 + c.frac(x), 0, 1);
          x.sleep = round(c.med('sleep') - f * (c.med('sleep') - 5.0) + c.n(0.2), 2);
          x.eff = round(c.med('eff') - f * (c.med('eff') - 77) + c.n(1.2), 1);
          x.stress = round(clamp(c.med('stress') + f * (3.3 - c.med('stress')) + c.n(0.15), 1, 5), 1);
          x.mood = round(clamp(c.med('mood') - f * (c.med('mood') - 2.9) + c.n(0.15), 1, 5), 1);
          x.rt = round(c.med('rt') * (1 + 0.16 * f) + c.n(4), 1);
          setStages(c, x, 19 - 8 * f + c.n(1), 22 - 7 * f + c.n(1));
        });
        A.DB.vitals.filter(c.inWin).forEach(x => { const f = clamp(0.35 + c.frac(x), 0, 1); x.hr = round(c.med('hr') + 6 * f + c.n(1), 1); x.sbp = round(c.med('sbp') + 5 * f + c.n(1.5), 1); x.glu = round(c.med('glu') + 6 * f + c.n(2), 1); });
      },
    },

    radiacao: {
      name: 'Evento de radiação', icon: 'rad', days: 3, seed: 3,
      desc: 'Rotina estável e depois um evento de partículas solares (prótons de alta energia), com a tripulação no abrigo da nave.',
      expect: ['Taxa de dose muito acima do padrão no TRI-08', 'Padrão "Pico de radiação"', 'Sinais vitais sem mudança: doses dessa ordem não dão sintomas agudos; o risco é de longo prazo'],
      apply(c) {
        const prof = [120, 55, 14];  // µSv/h médio em cada dia: início, pico decaindo, cauda (ilustrativo, dentro do abrigo)
        A.DB.rad.filter(c.inWin).sort((a, b) => a.date < b.date ? -1 : 1).forEach((x, i) => { x.rate = round(prof[Math.min(i, prof.length - 1)] * (1 + c.n(0.06)), 3); });
        recomputeCum(c.crew);
      },
    },

    viral: {
      name: 'Síndrome gripal', icon: 'warn', days: 4, seed: 4,
      desc: 'Rotina estável e depois quatro dias de quadro compatível com influenza A: febre, FC alta, cansaço e PCR elevada.',
      expect: ['Temperatura crítica (febre acima de 38 °C)', 'Padrão "Possível resposta infecciosa"', 'Sistema imunológico em alerta no mapa do corpo', 'SpO₂ cai cerca de 2 pontos: ainda na faixa ideal, mas abaixo do seu padrão'],
      apply(c) {
        const ramp = [0.35, 0.85, 1, 1];  // intensidade por dia: início, piora, pico, pico
        const f = x => ramp[clamp(Math.round(c.frac(x) * (ramp.length - 1)), 0, ramp.length - 1)];
        A.DB.vitals.filter(c.inWin).forEach(x => {
          const k = f(x);
          x.temp = round(c.med('temp') + 1.9 * k + c.n(0.08), 2); x.hr = round(c.med('hr') + 18 * k + c.n(1.5), 1);
          x.spo2 = round(clamp(c.med('spo2') - 2.4 * k + c.n(0.3), 0, 100), 1); x.glu = round(c.med('glu') + 8 * k + c.n(2), 1);
        });
        A.DB.mental.filter(c.inWin).forEach(x => {
          const k = f(x);
          x.eff = round(c.med('eff') - 9 * k + c.n(1), 1); x.mood = round(clamp(c.med('mood') - 1.3 * k + c.n(0.1), 1, 5), 1);
          x.stress = round(clamp(c.med('stress') + 0.9 * k + c.n(0.1), 1, 5), 1); x.rt = round(c.med('rt') * (1 + 0.12 * k), 1);
          setStages(c, x, 19 - 5 * k + c.n(1), 22 - 5 * k + c.n(1));
        });
        addLab(c, 'HS_CRP', 18 + c.n(2));                              // inflamação aguda
        addLab(c, 'WBC', Math.max(3.8, c.med('wbc') * 0.85));          // influenza: leucócitos normais ou um pouco baixos
      },
    },
  };

  function apply(id, crew) {
    reset(true);
    const sc = SCENARIOS[id]; if (!sc) return;
    /* Eventos partem de uma rotina nominal: o sinal do cenário aparece limpo, sem as tendências da base */
    const nom = SCENARIOS.nominal, cn = context(crew, nom.days, nom.seed);
    nom.apply(cn);
    const c = id === 'nominal' ? cn : context(crew, sc.days, sc.seed);
    if (id !== 'nominal') sc.apply(c);
    S.start = cn.start;
    A.DB.version++;
    S.active = id; S.crew = crew; S.last = c.last; S.eventStart = c.start;
  }
  function reset(silent) {
    A.loadSeed(); A.loadUser(); A.DB.version++;
    if (!silent) { S.active = null; S.crew = null; }
  }

  function crewName(id) { const x = A.DB.crew.find(c => c.id === id); return x ? x.name : ''; }

  /* Aviso global (APP-03) */
  function renderBanner() {
    const el = document.getElementById('scnb'); if (!el) return;
    if (!S.active) { el.hidden = true; el.innerHTML = ''; return; }
    const sc = SCENARIOS[S.active], U = window.UI, T = (s, v) => window.I18N.t(s, v);
    el.hidden = false;
    el.innerHTML = `<span class="scn-dot"></span><div><b>${T('Cenário simulado ativo: {s}', { s: U.esc(T(sc.name)) })}</b><span>${T('Aplicado a {n}: rotina nominal de {a} a {b}', { n: U.esc(crewName(S.crew)), a: U.fmtD(S.start), b: U.fmtD(S.last) })}${S.active !== 'nominal' ? T(', evento a partir de {d}', { d: U.fmtD(S.eventStart) }) : ''}. ${T('Só em memória: não altera a base nem os registros salvos.')}</span></div><button class="btn sm" type="button" data-scn-reset>${U.icon('undo')}${T('Voltar aos dados da base')}</button>`;
    el.querySelector('[data-scn-reset]').onclick = () => { reset(); window.APP.refreshHeader(); window.APP.render(); window.APP.toast(T('Dados da base restaurados')); };
    window.MOD.tagAll();
  }

  window.SCN = { SCENARIOS, apply, reset, state: S, renderBanner, crewName };
})();
