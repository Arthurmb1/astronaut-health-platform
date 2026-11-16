/* =========================================================
   Athenance — motor de dados e diagnóstico
   Espelha a lógica do pipeline Python (baseline individual dos
   primeiros 10 dias, mediana + MAD robusto, z-score, persistência).
   ========================================================= */
(function () {
  const G = typeof window !== 'undefined' ? window : globalThis;

  const CATS = {
    vitals: { label: 'Sinais vitais', short: 'Vitais' },
    mental: { label: 'Saúde mental e sono', short: 'Mental' },
    lab: { label: 'Laboratorial', short: 'Exames' },
    rad: { label: 'Radiação', short: 'Radiação' },
    env: { label: 'Ambiente da cabine', short: 'Ambiente' },
  };

  /* ---------- Registro de métricas ----------
     ok   = faixa de referência "normal" (triagem de software, não clínica)
     warn = faixa ampliada; fora dela => crítico
     pct  = [atenção, crítico] em % de desvio do padrão individual
     bad  = direção adversa para o desvio do padrão pessoal            */
  const MET = [
    { key: 'hr', cat: 'vitals', field: 'hr', label: 'Frequência cardíaca', short: 'FC', unit: 'bpm', dec: 0, step: 1, plaus: [25, 220], ok: [50, 100], warn: [40, 120], bad: 'both',
      what: 'Batimentos por minuto em repouso, medidos pela manhã, sentado e calmo.',
      why: 'A microgravidade redistribui fluidos e reduz o volume sanguíneo; a FC de repouso muda cedo quando há estresse, desidratação, infecção ou descondicionamento.',
      act: { high: 'Repita a medida após 5 minutos de repouso. Hidrate-se e revise cafeína e carga de trabalho. Se persistir por 2 dias ou vier com tontura ou dor no peito, acione o médico de voo.', low: 'Confirme com nova medida. Se houver tontura, desmaio ou fadiga incomum, acione o médico de voo.' } },
    { key: 'sbp', cat: 'vitals', field: 'sbp', label: 'Pressão sistólica', short: 'PAS', unit: 'mmHg', dec: 0, step: 1, plaus: [50, 260], ok: [90, 129], warn: [80, 159], bad: 'both',
      what: 'Pressão arterial no momento da contração do coração (o número maior).',
      why: 'O sistema cardiovascular se adapta à ausência de gravidade; variações persistentes sinalizam sobrecarga, perda de volume ou estresse.',
      act: { high: 'Meça sentado, braço na altura do coração, após 5 minutos de repouso. Reduza sódio e estimulantes. Valores altos em 2 dias seguidos pedem contato com o médico de voo.', low: 'Aumente a hidratação, levante-se devagar e confirme a medida. Com tontura ou desmaio, acione o médico de voo.' } },
    { key: 'dbp', cat: 'vitals', field: 'dbp', label: 'Pressão diastólica', short: 'PAD', unit: 'mmHg', dec: 0, step: 1, plaus: [30, 160], ok: [60, 84], warn: [50, 99], bad: 'both',
      what: 'Pressão arterial entre os batimentos (o número menor).',
      why: 'Junto com a sistólica, indica a carga sobre os vasos, que muda com o confinamento e a redistribuição de fluidos.',
      act: { high: 'Repita a medida em repouso. Se ficar alta por 2 dias seguidos, informe o médico de voo.', low: 'Hidrate-se e repita a medida. Com sintomas, acione o médico de voo.' } },
    { key: 'temp', cat: 'vitals', field: 'temp', label: 'Temperatura corporal', short: 'Temp', unit: '°C', dec: 1, step: 0.1, plaus: [30, 43], ok: [36.0, 37.5], warn: [35.5, 38.0], bad: 'both',
      what: 'Temperatura central aproximada, medida por termômetro de ouvido ou testa.',
      why: 'Em ambiente fechado, infecções se espalham com facilidade e o sistema imune fica modulado pelo voo. Febre é um alerta precoce.',
      act: { high: 'Isole-se do convívio próximo, hidrate-se e repita em 2 horas. Acima de 38,0 °C ou com sintomas, acione o médico de voo.', low: 'Aqueça o ambiente e repita a medida. Abaixo de 35,5 °C, acione o médico de voo.' } },
    { key: 'spo2', cat: 'vitals', field: 'spo2', label: 'Saturação de O₂', short: 'SpO₂', unit: '%', dec: 0, step: 1, plaus: [50, 100], ok: [95, 100], warn: [92, 100], bad: 'low',
      what: 'Percentual de hemoglobina carregando oxigênio, medido com oxímetro de dedo.',
      why: 'Mudanças na atmosfera da cabine ou falha no suporte de vida aparecem primeiro aqui.',
      act: { low: 'Repita a medida com a mão aquecida e parada. Verifique O₂ e CO₂ da cabine. Abaixo de 92%, acione o médico de voo imediatamente.' } },
    { key: 'mass', cat: 'vitals', field: 'mass', label: 'Massa corporal', short: 'Massa', unit: 'kg', dec: 1, step: 0.1, plaus: [25, 250], pct: [2.5, 5], bad: 'both',
      what: 'Massa medida com o dispositivo de massa corporal da estação, mesma hora e mesma roupa.',
      why: 'Perda de massa sinaliza ingestão calórica insuficiente, que é comum em voo e acelera a perda muscular e óssea.',
      act: { high: 'Revise a ingestão calórica e a retenção de líquidos e repita a medida em 24 horas.', low: 'Revise a ingestão calórica e de proteínas e confira o treino de resistência. Perda acima de 5% pede avaliação nutricional com o médico de voo.' } },
    { key: 'glu', cat: 'vitals', field: 'glu', label: 'Glicemia capilar', short: 'Glicose', unit: 'mg/dL', dec: 0, step: 1, plaus: [20, 600], ok: [70, 110], warn: [60, 125], bad: 'both',
      what: 'Glicose no sangue capilar, em jejum pela manhã.',
      why: 'O estresse e a inatividade alteram a sensibilidade à insulina; é um indicador simples de metabolismo e nutrição.',
      act: { high: 'Confirme em jejum, revise açúcares da última refeição e repita no dia seguinte. Acima de 125 mg/dL em jejum, informe o médico de voo.', low: 'Ingira carboidrato de ação rápida e repita em 15 minutos. Abaixo de 60 mg/dL ou com sintomas, acione o médico de voo.' } },

    { key: 'sleep', cat: 'mental', field: 'sleep', label: 'Duração do sono', short: 'Sono', unit: 'h', dec: 1, step: 0.1, plaus: [0, 24], ok: [7, 9.5], warn: [5.5, 10.5], bad: 'low',
      what: 'Horas dormidas nas últimas 24 horas, por diário de sono ou dispositivo.',
      why: 'O ciclo luz-escuro artificial, o ruído e a carga de trabalho reduzem o sono em missões. Sono curto prejudica atenção, humor e imunidade.',
      act: { low: 'Proteja a janela de sono, reduza luz azul 1 hora antes de dormir e evite cafeína à tarde. Se faltar sono por 3 noites seguidas, converse com o médico de voo.', high: 'Sono muito longo repetido pode indicar fadiga ou humor rebaixado. Observe nos próximos dias.' } },
    { key: 'eff', cat: 'mental', field: 'eff', label: 'Eficiência do sono', short: 'Efic. sono', unit: '%', dec: 0, step: 1, plaus: [0, 100], ok: [85, 100], warn: [75, 100], bad: 'low',
      what: 'Proporção do tempo na cama em que você realmente dormiu.',
      why: 'Eficiência baixa indica sono fragmentado, comum com ruído, calor ou ansiedade.',
      act: { low: 'Cheque ruído, temperatura e iluminação da cabine de dormir. Use rotina fixa de deitar e levantar.' } },
    { key: 'mood', cat: 'mental', field: 'mood', label: 'Humor', short: 'Humor', unit: '/ 5', dec: 1, step: 0.1, plaus: [1, 5], ok: [3.5, 5], warn: [2.5, 5], bad: 'low',
      what: 'Autoavaliação de 1 (muito ruim) a 5 (muito bom).',
      why: 'Isolamento e confinamento afetam o humor. A queda sustentada costuma vir antes de conflitos e erros operacionais.',
      act: { low: 'Fale com um colega de confiança, faça uma atividade de lazer ou contato com a Terra. Se a queda durar mais de 3 dias, converse com o suporte psicológico de voo.' } },
    { key: 'stress', cat: 'mental', field: 'stress', label: 'Estresse percebido', short: 'Estresse', unit: '/ 5', dec: 1, step: 0.1, plaus: [1, 5], ok: [1, 2.5], warn: [1, 3.5], bad: 'high',
      what: 'Autoavaliação de 1 (nenhum) a 5 (extremo).',
      why: 'Estresse sustentado reduz o sono, eleva a pressão e prejudica o desempenho em tarefas críticas.',
      act: { high: 'Faça uma pausa guiada (respiração lenta por 5 minutos), ajuste a agenda e converse com a equipe. Estresse acima de 3,5 por 2 dias pede contato com o suporte psicológico de voo.' } },
    { key: 'rt', cat: 'mental', field: 'rt', label: 'Tempo de reação', short: 'Reação', unit: 'ms', dec: 0, step: 1, plaus: [50, 3000], pct: [8, 15], bad: 'high',
      what: 'Mediana do tempo de resposta em um teste psicomotor curto.',
      why: 'É um marcador objetivo de fadiga e de queda de atenção, menos sujeito a viés que o autorrelato.',
      act: { high: 'Evite tarefas críticas até descansar. Repita o teste após uma pausa e priorize o sono nesta noite.' } },

    { key: 'wbc', cat: 'lab', code: 'WBC', label: 'Leucócitos (WBC)', short: 'WBC', unit: '×10³/µL', dec: 2, step: 0.01, plaus: [0.5, 60], ok: [4, 11], warn: [3, 13], bad: 'both',
      what: 'Contagem de glóbulos brancos no sangue.',
      why: 'O voo espacial altera a função imune. Aumento sugere infecção ou inflamação; queda sugere supressão imune.',
      act: { high: 'Associe com temperatura e sintomas. Valor elevado persistente pede avaliação do médico de voo.', low: 'Reduza exposição a infecções e informe o médico de voo.' } },
    { key: 'crp', cat: 'lab', code: 'HS_CRP', label: 'Proteína C reativa (hs-CRP)', short: 'hs-CRP', unit: 'mg/L', dec: 2, step: 0.01, plaus: [0, 500], ok: [0, 3], warn: [0, 10], bad: 'high',
      what: 'Marcador sanguíneo de inflamação.',
      why: 'Sobe com infecção, lesão e estresse; também está ligada ao risco cardiovascular.',
      act: { high: 'Informe o médico de voo. Acima de 10 mg/L, considere infecção ou lesão ativa.' } },
    { key: 'cort', cat: 'lab', code: 'CORTISOL_AM', label: 'Cortisol matinal', short: 'Cortisol', unit: 'µg/dL', dec: 2, step: 0.01, plaus: [0, 60], bad: 'both',
      what: 'Hormônio do estresse, coletado pela manhã.',
      why: 'Reflete a resposta ao estresse crônico e ao isolamento. Interpretamos pela mudança em relação ao seu padrão.',
      act: { high: 'Revise carga de trabalho e sono. Mudança sustentada pede avaliação do médico de voo.', low: 'Queda marcada em relação ao seu padrão deve ser discutida com o médico de voo.' } },
    { key: 'vitd', cat: 'lab', code: 'VITAMIN_D_25OH', label: 'Vitamina D (25-OH)', short: 'Vit. D', unit: 'ng/mL', dec: 1, step: 0.1, plaus: [1, 200], ok: [30, 100], warn: [20, 150], bad: 'low',
      what: 'Reserva de vitamina D no sangue.',
      why: 'Sem luz solar, a vitamina D cai. Ela é essencial para a saúde óssea durante a perda de densidade do voo.',
      act: { low: 'Revise a suplementação com o médico de voo.' } },
    { key: 'ctx', cat: 'lab', code: 'CTX', label: 'CTX sérico (reabsorção óssea)', short: 'CTX', unit: 'ng/mL', dec: 3, step: 0.001, plaus: [0, 5], bad: 'high',
      what: 'Marcador de degradação do colágeno ósseo.',
      why: 'Sobe quando o osso é reabsorvido mais rápido que formado, o que acontece em microgravidade.',
      act: { high: 'Reforce o treino de resistência e a ingestão de cálcio e vitamina D, e informe o médico de voo.' } },
    { key: 'ebv', cat: 'lab', code: 'EBV_DNA_SALIVA', label: 'DNA do EBV na saliva', short: 'EBV', unit: 'cópias/mL', dec: 0, step: 1, plaus: [0, 1e8], bad: 'high',
      what: 'Carga do vírus Epstein-Barr na saliva.',
      why: 'O vírus latente reativa quando a imunidade cai sob estresse, um achado conhecido em astronautas.',
      act: { high: 'Reativação indica estresse imune. Descanse, revise o sono e informe o médico de voo.' } },
    { key: 'shannon', cat: 'lab', code: 'MICROBIOME_SHANNON', label: 'Diversidade do microbioma', short: 'Microbioma', unit: 'índice', dec: 2, step: 0.01, plaus: [0, 10], bad: 'low',
      what: 'Índice de Shannon da diversidade de bactérias intestinais.',
      why: 'Queda de diversidade acompanha mudanças de dieta e estresse e se relaciona com a imunidade.',
      act: { low: 'Revise fibras e alimentos fermentados da dieta e informe o médico de voo se persistir.' } },
    { key: 'imt', cat: 'lab', code: 'CAROTID_IMT', label: 'Espessura íntima-média da carótida', short: 'IMT', unit: 'mm', dec: 3, step: 0.001, plaus: [0.1, 3], ok: [0, 0.9], warn: [0, 1.0], bad: 'high',
      what: 'Espessura da parede da carótida medida por ultrassom.',
      why: 'É um marcador de saúde vascular; o voo pode acelerar sinais de envelhecimento arterial.',
      act: { high: 'Informe o médico de voo para revisar o exame de ultrassom.' } },

    { key: 'rad_rate', cat: 'rad', col: 'rate', label: 'Taxa de dose equivalente', short: 'Taxa de dose', unit: 'µSv/h', dec: 3, step: 0.001, plaus: [0, 10000], bad: 'high',
      what: 'Radiação medida pelo dosímetro pessoal, em microsieverts por hora.',
      why: 'Fora da magnetosfera a radiação cósmica e solar é o principal risco de longo prazo. Picos podem indicar evento solar.',
      act: { high: 'Confira o alerta de clima espacial e, se necessário, abrigue-se na área mais blindada da nave.' } },
    { key: 'rad_cum', cat: 'rad', col: 'cum', label: 'Dose cumulativa efetiva', short: 'Dose acumulada', unit: 'mSv', dec: 3, step: 0.001, plaus: [0, 100000], ok: [0, 300], warn: [0, 480], bad: 'high', noZ: true,
      what: 'Soma da dose recebida durante a missão. As faixas usam 50% e 80% do limite de carreira de 600 mSv (NASA-STD-3001 Vol. 1 Rev B).',
      why: 'O limite de carreira controla o risco de câncer e de efeitos no sistema nervoso e cardiovascular.',
      act: { high: 'Informe o médico de voo e a equipe de planejamento: atividades externas podem precisar de ajuste.' } },

    { key: 'co2', cat: 'env', col: 'co2', label: 'CO₂ da cabine', short: 'CO₂', unit: 'ppm', dec: 0, step: 1, plaus: [0, 10000], ok: [0, 1500], warn: [0, 3000], bad: 'high', cohort: true,
      what: 'Concentração de dióxido de carbono no ar da cabine.',
      why: 'Em ambiente fechado o CO₂ acumula perto do corpo e causa dor de cabeça, sono ruim e queda de desempenho.',
      act: { high: 'Melhore a ventilação local, mude de posição no módulo e reporte ao controle da missão. Acima de 3000 ppm, trate como falha de suporte de vida.' } },
    { key: 'rh', cat: 'env', col: 'rh', label: 'Umidade relativa', short: 'Umidade', unit: '%', dec: 0, step: 1, plaus: [0, 100], ok: [30, 60], warn: [20, 70], bad: 'both', cohort: true,
      what: 'Umidade do ar na cabine.',
      why: 'Muito seca irrita vias aéreas; muito úmida favorece fungos e condensação em equipamentos.',
      act: { high: 'Reporte ao controle ambiental, a condensação e os fungos são riscos reais.', low: 'Use o umidificador de bordo e hidrate vias aéreas e olhos.' } },
  ];
  const MBY = Object.fromEntries(MET.map(m => [m.key, m]));
  const LABCODE = Object.fromEntries(MET.filter(m => m.code).map(m => [m.code, m.key]));

  /* ---------- Banco de dados em memória ---------- */
  const DB = { crew: [], missions: [], phases: [], vitals: [], mental: [], labs: [], rad: [], env: [], events: [], version: 0 };
  const LS_KEY = 'athenance.mvp.v1';
  const PHASES = ['Launch & Adaptation', 'Cruise', 'Return Preparation'];
  const PHASE_PT = { 'Launch & Adaptation': 'Lançamento e adaptação', Cruise: 'Cruzeiro', 'Return Preparation': 'Preparação do retorno' };

  function rowsToObj(t) { return t.rows.map(r => Object.fromEntries(t.cols.map((c, i) => [c, r[i]]))); }
  function loadSeed() {
    const S = G.SEED;
    DB.crew = S.crew.map(c => ({ id: c.crew_member_id, name: c.name, role: c.role, age: c.age_years, sex: c.sex, mission: c.mission_id, status: c.status, seed: true }));
    DB.missions = S.missions.map(m => ({ id: m.mission_id, name: m.mission_name, dest: m.destination, start: m.start_date, end: m.end_date }));
    DB.phases = S.phases;
    DB.vitals = rowsToObj(S.vitals); DB.mental = rowsToObj(S.mental);
    DB.labs = rowsToObj(S.labs); DB.rad = rowsToObj(S.rad); DB.env = rowsToObj(S.env);
    DB.sleep = S.sleep ? rowsToObj(S.sleep) : [];  // fases do sono (sintéticas, data/sleep_stages.csv); só exibição, fora do diagnóstico
    DB.events = S.events.map(e => ({ id: e.event_id, crew: e.crew_member_id, start: e.start_date, end: e.end_date, type: e.event_type, desc: e.description }));
    DB.userRecords = [];
  }
  function loadUser() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch (e) { raw = null; }
    if (!raw) return;
    (raw.crew || []).forEach(c => DB.crew.push(c));
    (raw.records || []).forEach(r => applyRecord(r, false));
    DB.userRecords = raw.records || [];
    DB.version++;
  }
  let memoryFallback = null;
  function persist() {
    const payload = { crew: DB.crew.filter(c => !c.seed), records: DB.userRecords };
    try { localStorage.setItem(LS_KEY, JSON.stringify(payload)); return true; } catch (e) { memoryFallback = payload; return false; }
  }
  function applyRecord(r) {
    const t = r.type;
    if (t === 'labs') DB.labs.push(r.row); else if (DB[t]) DB[t].push(r.row);
  }
  function addRecords(recs) {
    recs.forEach(r => { r.id = r.id || 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); r.row.user = true; r.row.rid = r.id; applyRecord(r); DB.userRecords.push(r); });
    DB.version++; return persist();
  }
  function removeRecordGroup(group) {
    const ids = new Set(DB.userRecords.filter(r => r.group === group).map(r => r.id));
    DB.userRecords = DB.userRecords.filter(r => !ids.has(r.id));
    ['vitals', 'mental', 'labs', 'rad', 'env'].forEach(k => { DB[k] = DB[k].filter(x => !(x.rid && ids.has(x.rid))); });
    DB.version++; return persist();
  }
  function addCrew(c) {
    const id = Math.max(0, ...DB.crew.map(x => x.id)) + 1;
    const rec = { id, name: c.name, role: c.role, age: c.age, sex: c.sex, mission: DB.missions[0].id, status: 'Active', seed: false };
    DB.crew.push(rec); DB.version++; persist(); return rec;
  }
  function resetUser() { try { localStorage.removeItem(LS_KEY); } catch (e) {} loadSeed(); DB.version++; }

  /* ---------- Utilidades ---------- */
  const DAY = 864e5;
  const ts = s => Date.parse(s.length === 10 ? s + 'T00:00:00Z' : s.slice(0, 16) + ':00Z');
  const dayKey = s => s.slice(0, 10);
  const median = a => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
  const sd = a => { if (a.length < 2) return NaN; const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };
  const mad = (a, med) => median(a.map(x => Math.abs(x - med)));

  /* ---------- Séries ---------- */
  const cache = new Map();
  function rawRows(m, crew) {
    if (m.cat === 'lab') return DB.labs.filter(r => r.code === m.code && r.crew === crew).map(r => ({ date: r.date, v: r.value, user: !!r.user }));
    if (m.cat === 'env') return DB.env.map(r => ({ date: r.date, v: r[m.col], user: !!r.user }));
    const tbl = m.cat === 'vitals' ? DB.vitals : m.cat === 'mental' ? DB.mental : DB.rad;
    const f = m.col || m.field;
    return tbl.filter(r => r.crew === crew && r[f] != null && r[f] !== '').map(r => ({ date: r.date, v: +r[f], user: !!r.user, phase: r.phase }));
  }
  function series(m, crew) {
    const k = m.key + '|' + (m.cat === 'env' ? 0 : crew) + '|' + DB.version;
    if (cache.has(k)) return cache.get(k);
    const pts = rawRows(m, crew).map(r => ({ ...r, t: ts(r.date), d: dayKey(r.date) })).filter(p => !isNaN(p.v)).sort((a, b) => a.t - b.t);
    cache.set(k, pts); return pts;
  }
  function daily(m, crew) {
    const by = new Map();
    series(m, crew).forEach(p => { (by.get(p.d) || by.set(p.d, []).get(p.d)).push(p.v); });
    return [...by.entries()].map(([d, v]) => ({ d, t: ts(d), v: mean(v) })).sort((a, b) => a.t - b.t);
  }

  /* ---------- Baseline ---------- */
  const BASE_DAYS = 10, MIN_N = 5;
  function windowVals(m, crew) {
    const pts = series(m, crew); if (!pts.length) return [];
    const first = pts[0].t;
    return pts.filter(p => (p.t - first) / DAY < BASE_DAYS).map(p => p.v);
  }
  function stats(vals, m, source) {
    const med = median(vals), s = sd(vals), md = mad(vals, med) * 1.4826;
    const floor = Math.abs(med) * 0.005 || 1e-6;
    const sigma = Math.max(md, 0.75 * (isNaN(s) ? 0 : s), floor);
    return { med, mean: mean(vals), sd: s, sigma, min: Math.min(...vals), max: Math.max(...vals), n: vals.length, source, lo: med - 2 * sigma, hi: med + 2 * sigma };
  }
  function baseline(m, crew) {
    const k = 'b|' + m.key + '|' + crew + '|' + DB.version;
    if (cache.has(k)) return cache.get(k);
    let res = null;
    const own = m.cohort ? windowVals(m, 0) : windowVals(m, crew);
    if (own.length >= MIN_N) res = stats(own, m, m.cohort ? 'cabine' : 'individual');
    else {
      const pooled = DB.crew.flatMap(c => windowVals(m, c.id));
      if (pooled.length >= 3) res = stats(pooled, m, 'coorte');
    }
    cache.set(k, res); return res;
  }

  /* ---------- Avaliação ---------- */
  const LEVELS = ['Normal', 'Atenção', 'Crítico'];
  function adverseZ(m, z) { if (z == null || isNaN(z)) return null; return m.bad === 'high' ? z : m.bad === 'low' ? -z : Math.abs(z); }
  function assess(m, crew, v) {
    const b = baseline(m, crew);
    const out = { m, v, base: b, z: null, sz: null, pct: null, refLevel: null, zLevel: 0, pctLevel: 0, level: 0, reasons: [], dir: 0 };
    if (b && !m.noZ) {
      out.z = (v - b.med) / b.sigma; out.sz = adverseZ(m, out.z);
      out.pct = b.med ? (v - b.med) / Math.abs(b.med) * 100 : null;
      out.dir = out.z > 0 ? 1 : out.z < 0 ? -1 : 0;
      out.zLevel = out.sz >= 3 ? 2 : out.sz >= 2 ? 1 : 0;
    }
    if (m.ok) {
      out.refLevel = (v >= m.ok[0] && v <= m.ok[1]) ? 0 : (v >= m.warn[0] && v <= m.warn[1]) ? 1 : 2;
      out.refSide = v < m.ok[0] ? -1 : v > m.ok[1] ? 1 : 0;
    }
    if (m.pct && out.pct != null) {
      const p = m.bad === 'high' ? out.pct : m.bad === 'low' ? -out.pct : Math.abs(out.pct);
      out.pctLevel = p >= m.pct[1] ? 2 : p >= m.pct[0] ? 1 : 0;
    }
    let zl = out.zLevel; if (m.ok || m.pct || (b && b.source !== 'individual' && !m.cohort)) zl = Math.min(zl, 1);
    out.level = Math.max(out.refLevel || 0, zl, out.pctLevel);
    if (out.refLevel > 0) out.reasons.push('fora da faixa de referência');
    if (out.zLevel > 0) out.reasons.push('desvio do seu padrão');
    if (out.pctLevel > 0) out.reasons.push(`variação de ${out.pct > 0 ? '+' : ''}${out.pct.toFixed(1).replace('.', ',')}% sobre o seu padrão`);
    out.side = out.refSide || (out.sz != null && out.sz >= 2 ? out.dir : 0) || out.dir;
    return out;
  }

  function latest(m, crew) { const s = series(m, crew); return s.length ? s[s.length - 1] : null; }
  function assessLatest(m, crew) { const p = latest(m, crew); if (!p) return null; const a = assess(m, crew, p.v); a.p = p; return a; }

  function crewStatus(crew) {
    const items = MET.map(m => assessLatest(m, crew)).filter(Boolean);
    const cat = {}; Object.keys(CATS).forEach(c => { const xs = items.filter(i => i.m.cat === c); cat[c] = { level: xs.length ? Math.max(...xs.map(i => i.level)) : null, items: xs }; });
    const level = Math.max(0, ...items.map(i => i.level));
    return { level, cat, items, flagged: items.filter(i => i.level > 0).sort((a, b) => b.level - a.level || (b.sz || 0) - (a.sz || 0)) };
  }

  /* ---------- Persistência (eventos) ---------- */
  function persistent(crew, zThr = 2, minDays = 3, metricKeys) {
    const evs = [];
    MET.filter(m => m.cat !== 'lab' && !m.noZ && (!metricKeys || metricKeys.includes(m.key))).forEach(m => {
      const b = baseline(m, crew); if (!b) return;
      const d = daily(m, crew).map(p => ({ ...p, sz: adverseZ(m, (p.v - b.med) / b.sigma) }));
      let run = [];
      const flush = () => { if (run.length >= minDays) evs.push({ crew, m, start: run[0].d, end: run[run.length - 1].d, days: run.length, maxz: Math.max(...run.map(r => r.sz)), meanz: mean(run.map(r => r.sz)) }); run = []; };
      d.forEach(p => { const last = run[run.length - 1]; if (p.sz >= zThr) { if (last && (p.t - last.t) / DAY !== 1) flush(); run.push(p); } else flush(); });
      flush();
    });
    return evs;
  }

  function labFlags(crew, start, end, zThr = 2) {
    const out = [];
    MET.filter(m => m.cat === 'lab').forEach(m => {
      const b = baseline(m, crew); if (!b) return;
      series(m, crew).filter(p => p.d >= start && p.d <= end).forEach(p => { const sz = adverseZ(m, (p.v - b.med) / b.sigma); if (sz >= zThr) out.push({ crew, m, d: p.d, sz, v: p.v }); });
    });
    return out;
  }

  /* ---------- Padrões combinados ---------- */
  function patterns(szMap) {
    const g = k => szMap[k] != null ? szMap[k] : null, hi = (k, t = 1.5) => g(k) != null && g(k) >= t;
    const out = [];
    if (hi('sleep') && (hi('stress') || hi('rt') || hi('mood'))) out.push({ id: 'fatigue', title: 'Fadiga e estresse combinados', risk: 'Isolamento e confinamento',
      text: 'Sono pior que o seu padrão junto com piora de estresse, humor ou tempo de reação.', act: 'Priorize o sono nas próximas 48 horas, reduza a carga de trabalho se possível e avise o médico de voo se continuar.' });
    if (hi('crp') && hi('wbc')) out.push({ id: 'inflam', title: 'Marcadores inflamatórios elevados', risk: 'Alteração imune',
      text: 'hs-CRP e leucócitos acima do seu padrão ao mesmo tempo.', act: 'Cheque temperatura e sintomas e informe o médico de voo para avaliar infecção ou inflamação.' });
    if ((hi('hr') && hi('temp')) && (hi('wbc') || hi('crp'))) out.push({ id: 'infec', title: 'Possível resposta infecciosa', risk: 'Alteração imune',
      text: 'FC e temperatura acima do padrão com marcador inflamatório elevado.', act: 'Isole-se do convívio próximo e acione o médico de voo.' });
    if (hi('co2') && (hi('sleep', 1) || hi('stress', 1) || hi('rt', 1))) out.push({ id: 'air', title: 'Ar da cabine pode estar afetando você', risk: 'Ambiente fechado hostil',
      text: 'CO₂ acima do normal com piora de sono, estresse ou reação.', act: 'Melhore a ventilação local e reporte o nível de CO₂ ao controle da missão.' });
    if (hi('sbp') && hi('hr')) out.push({ id: 'cardio', title: 'Sobrecarga cardiovascular', risk: 'Eventos cardiovasculares',
      text: 'Pressão sistólica e FC acima do padrão no mesmo registro.', act: 'Repita as medidas em repouso e informe o médico de voo se persistir por 2 dias.' });
    if (hi('mass') && g('glu') != null && g('glu') >= 1) out.push({ id: 'nutri', title: 'Possível déficit nutricional', risk: 'Nutrição inadequada',
      text: 'Massa corporal e glicemia fora do seu padrão.', act: 'Revise a ingestão calórica e converse com o médico de voo sobre nutrição.' });
    if (hi('ctx') && hi('vitd', 1)) out.push({ id: 'bone', title: 'Pressão sobre a saúde óssea', risk: 'Perda óssea',
      text: 'Reabsorção óssea (CTX) alta com vitamina D baixa.', act: 'Reforce treino de resistência e revise a suplementação com o médico de voo.' });
    if (hi('rad_rate', 2)) out.push({ id: 'rad', title: 'Pico de radiação', risk: 'Radiação espacial',
      text: 'Taxa de dose bem acima do seu padrão.', act: 'Confira o clima espacial e as orientações de abrigo.' });
    return out;
  }
  function szMapFromAssess(list) { const o = {}; list.forEach(a => { if (a.sz != null) o[a.m.key] = a.sz; }); return o; }

  /* ---------- Contexto de missão ---------- */
  function phaseForDate(d) {
    const day = dayKey(d); const hit = DB.phases.find(p => p[0] === day);
    if (hit) return hit[1];
    const first = DB.phases[0] && DB.phases[0][0]; if (first && day < first) return PHASES[0];
    return PHASES[2];
  }
  function missionDay(d) { const m = DB.missions[0]; return Math.floor((ts(d) - ts(m.start)) / DAY) + 1; }
  function lastDate() {
    let mx = ''; ['vitals', 'mental', 'rad'].forEach(k => DB[k].forEach(r => { if (r.date > mx) mx = r.date; })); return mx;
  }
  function crewLastDate(crew) {
    let mx = ''; ['vitals', 'mental', 'rad'].forEach(k => DB[k].forEach(r => { if (r.crew === crew && r.date > mx) mx = r.date; })); return mx;
  }
  function nextSuggestedDate(crew) {
    const l = crewLastDate(crew); if (!l) return DB.missions[0].start + 'T08:00';
    const t = new Date(ts(l) + DAY); return t.toISOString().slice(0, 10) + 'T08:00';
  }
  function sleepNights(crew) { return DB.sleep.filter(r => r.crew === crew).sort((a, b) => a.date < b.date ? -1 : 1); }
  function lastCum(crew) { const rows = DB.rad.filter(r => r.crew === crew).sort((a, b) => a.date < b.date ? -1 : 1); return rows.length ? rows[rows.length - 1] : null; }

  /* ---------- Estatística de apoio ---------- */
  function pearson(x, y) {
    const n = x.length; if (n < 4) return null; const mx = mean(x), my = mean(y); let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
    return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
  }
  function linreg(x, y) { const n = x.length, mx = mean(x), my = mean(y); let sxy = 0, sxx = 0; for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; } const b = sxx ? sxy / sxx : 0; return { b, a: my - b * mx }; }

  /* ---------- Validação de entrada ---------- */
  function plausible(m, v) { return v >= m.plaus[0] && v <= m.plaus[1]; }

  G.AT = { CATS, MET, MBY, LABCODE, DB, PHASES, PHASE_PT, LEVELS, loadSeed, loadUser, addRecords, removeRecordGroup, addCrew, resetUser, persist,
    ts, dayKey, DAY, median, mean, sd, series, daily, baseline, assess, assessLatest, latest, crewStatus, persistent, labFlags, patterns, szMapFromAssess, adverseZ,
    phaseForDate, missionDay, lastDate, crewLastDate, nextSuggestedDate, lastCum, sleepNights, pearson, linreg, plausible, BASE_DAYS, MIN_N };
})();
