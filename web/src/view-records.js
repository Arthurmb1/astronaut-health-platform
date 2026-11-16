/* =========================================================
   Registros (histórico por categoria + exportação) e Método
   ========================================================= */
(function () {
  const A = window.AT, U = window.UI, { esc, fmt, icon, chip } = U;
  const V = (window.VIEWS = window.VIEWS || {});
  const R = { cat: 'vitals', crew: 'all', scope: 'all', page: 0 };
  const PAGE = 18;

  const COLS = {
    vitals: [['hr', 'FC'], ['sbp', 'PAS'], ['dbp', 'PAD'], ['temp', 'Temp'], ['spo2', 'SpO₂'], ['mass', 'Massa'], ['glu', 'Glicose']],
    mental: [['sleep', 'Sono'], ['eff', 'Efic.'], ['mood', 'Humor'], ['stress', 'Estresse'], ['rt', 'Reação']],
    lab: [['analyte', 'Exame'], ['value', 'Resultado']],
    rad: [['rad_rate', 'Taxa µSv/h'], ['rad_cum', 'Dose mSv'], ['dos', 'Dosímetro']],
    env: [['co2', 'CO₂'], ['rh', 'Umidade'], ['cabin', 'Cabine']],
  };
  const TBL = { vitals: 'vitals', mental: 'mental', lab: 'labs', rad: 'rad', env: 'env' };
  const FIELD = { hr: 'hr', sbp: 'sbp', dbp: 'dbp', temp: 'temp', spo2: 'spo2', mass: 'mass', glu: 'glu', sleep: 'sleep', eff: 'eff', mood: 'mood', stress: 'stress', rt: 'rt', rad_rate: 'rate', rad_cum: 'cum', co2: 'co2', rh: 'rh' };

  function rows() {
    let r = A.DB[TBL[R.cat]].slice();
    if (R.crew !== 'all' && R.cat !== 'env') r = r.filter(x => x.crew === +R.crew);
    if (R.scope === 'mine') r = r.filter(x => x.user);
    return r.sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : (b.crew || 0) - (a.crew || 0));
  }
  function levelOf(row) {
    const ms = R.cat === 'lab' ? [A.MBY[A.LABCODE[row.code]]] : A.MET.filter(m => m.cat === R.cat && row[FIELD[m.key]] != null);
    let lv = 0, any = false;
    ms.forEach(m => { if (!m) return; const v = R.cat === 'lab' ? row.value : row[FIELD[m.key]]; if (v == null) return; any = true; lv = Math.max(lv, A.assess(m, row.crew || 0, +v).level); });
    return any ? lv : null;
  }

  /* ---------- CSV ---------- */
  const HEAD = {
    vitals: ['crew_member_id', 'mission_id', 'measurement_date', 'mission_phase', 'heart_rate_bpm', 'systolic_pressure_mmhg', 'diastolic_pressure_mmhg', 'body_temperature_c', 'blood_oxygen_saturation_pct', 'body_mass_kg', 'capillary_glucose_mg_dl', 'measurement_context', 'measurement_source'],
    mental: ['crew_member_id', 'mission_id', 'measurement_date', 'mission_phase', 'sleep_duration_hours', 'sleep_efficiency_pct', 'mood_self_report_1_5', 'perceived_stress_1_5', 'psychomotor_reaction_time_median_ms', 'self_report_scale', 'measurement_source'],
    lab: ['lab_result_id', 'crew_member_id', 'mission_id', 'sample_date', 'analyte_code', 'analyte_name', 'result_value', 'unit', 'result_qualifier', 'detection_limit', 'method', 'reference_min', 'reference_max', 'reference_note'],
    rad: ['crew_member_id', 'mission_id', 'measurement_date', 'dose_equivalent_rate_uSv_h', 'cumulative_effective_dose_mSv', 'dosimeter_id', 'integration_interval_hours', 'measurement_source'],
    env: ['mission_id', 'measurement_date', 'cabin_id', 'sensor_id', 'cabin_co2_ppm', 'cabin_relative_humidity_pct', 'measurement_source'],
  };
  const dtc = d => d.slice(0, 10) + ' ' + (d.length > 10 ? d.slice(11, 16) : '00:00') + ':00';
  const SRC = r => r.user ? 'Platform web entry' : 'Synthetic demonstration dataset';
  function csvRows(cat, scopeMine) {
    const mid = A.DB.missions[0].id; let src = A.DB[TBL[cat]].slice(); if (scopeMine) src = src.filter(r => r.user);
    src.sort((a, b) => a.date < b.date ? -1 : 1);
    const lab = A.MET.filter(m => m.cat === 'lab');
    return src.map((r, i) => {
      if (cat === 'vitals') return [r.crew, mid, dtc(r.date), r.phase, r.hr, r.sbp, r.dbp, r.temp, r.spo2, r.mass, r.glu, 'Resting, morning protocol', SRC(r)];
      if (cat === 'mental') return [r.crew, mid, dtc(r.date), r.phase, r.sleep, r.eff, r.mood, r.stress, r.rt, 'Illustrative 1-5 scale; 1=low, 5=high', SRC(r)];
      if (cat === 'lab') { const m = A.MBY[A.LABCODE[r.code]]; return [`LAB-${String(r.crew).padStart(2, '0')}-${r.code}-${i}`, r.crew, mid, dtc(r.date), r.code, m ? m.label : r.code, r.value, m ? m.unit : '', r.qual, r.qual && r.qual.startsWith('Below') ? 100 : '', r.user ? 'Platform web entry' : 'Synthetic illustrative assay', '', '', 'Reference bands are prototype screening defaults, not clinical ranges.']; }
      if (cat === 'rad') return [r.crew, mid, dtc(r.date), r.rate, r.cum, r.dos, 24, SRC(r)];
      return [mid, dtc(r.date), r.cabin, 'ENV-CO2-RH-01', r.co2, r.rh, SRC(r)];
    });
  }
  const q = v => { if (v == null) return ''; const s = String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  function toCSV(cat, mine) { return [HEAD[cat].join(','), ...csvRows(cat, mine).map(r => r.map(q).join(','))].join('\n'); }
  const FILE = { vitals: 'vital_signs', mental: 'mental_health', lab: 'lab_results', rad: 'radiation_exposure', env: 'environmental_data' };

  async function copyText(txt) { try { await navigator.clipboard.writeText(txt); return true; } catch (e) { const t = document.createElement('textarea'); t.value = txt; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (er) {} t.remove(); return ok; } }
  function download(name, txt, mime) {
    try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: mime })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); return true; } catch (e) { return false; }
  }
  async function exportCSV(copy) {
    /* Trava: dados de cenário simulado nunca vão para o pipeline */
    if (window.SCN && window.SCN.state.active) { window.APP.toast(window.I18N.t('Desative o cenário simulado antes de exportar (botão "Voltar aos dados da base")')); return; }
    const txt = toCSV(R.cat, R.scope === 'mine'); const n = txt.split('\n').length - 1;
    if (copy) { window.APP.toast((await copyText(txt)) ? `CSV copiado (${n} linhas)` : 'Não foi possível copiar.'); return; }
    download(FILE[R.cat] + '.csv', txt, 'text/csv'); window.APP.toast(`${FILE[R.cat]}.csv: ${n} linhas`);
  }

  /* ---------- Tela ---------- */
  function render(root) {
    const all = rows(), pages = Math.max(1, Math.ceil(all.length / PAGE)); R.page = Math.min(R.page, pages - 1);
    const slice = all.slice(R.page * PAGE, (R.page + 1) * PAGE), cols = COLS[R.cat], mine = A.DB.userRecords.length;
    const cell = (r, k) => {
      if (k === 'analyte') { const m = A.MBY[A.LABCODE[r.code]]; return esc(m ? m.label : r.code); }
      if (k === 'value') { const m = A.MBY[A.LABCODE[r.code]]; return `${fmt(r.value, m ? m.dec : 2)} <span class="muted">${esc(m ? m.unit : '')}</span>${r.qual && r.qual.startsWith('Below') ? ' <span class="muted">(abaixo do limite)</span>' : ''}`; }
      if (k === 'dos' || k === 'cabin') return esc(r[k === 'dos' ? 'dos' : 'cabin']);
      const m = A.MBY[k], v = r[FIELD[k]]; return v == null ? '<span class="muted">—</span>' : fmt(v, m.dec);
    };
    root.innerHTML = `<div class="stack view-in">
      <div class="card"><div class="card-h" style="flex-wrap:wrap"><div class="seg" id="cats">${Object.keys(A.CATS).map(c => `<button data-c="${c}" aria-pressed="${R.cat === c}">${A.CATS[c].short}</button>`).join('')}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">${R.cat !== 'env' ? `<select class="sel" id="rc" aria-label="Tripulante"><option value="all">Todos os tripulantes</option>${A.DB.crew.map(c => `<option value="${c.id}" ${String(R.crew) === String(c.id) ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>` : ''}
        <div class="seg" id="sc">${[['all', 'Todos'], ['mine', 'Inseridos aqui']].map(([v, l]) => `<button data-v="${v}" aria-pressed="${R.scope === v}">${l}</button>`).join('')}</div></div></div>
        <div class="card-b" style="padding:12px 0 0"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Data</th>${R.cat !== 'env' ? '<th>Tripulante</th>' : ''}${cols.map(c => `<th class="${['dos', 'cabin', 'analyte'].includes(c[0]) ? '' : 'r'}">${c[1]}</th>`).join('')}<th>Estado</th><th>Origem</th><th></th></tr></thead><tbody>
        ${slice.length ? slice.map(r => { const c = A.DB.crew.find(x => x.id === r.crew), lv = levelOf(r); return `<tr><td>${U.fmtDT(r.date)}</td>${R.cat !== 'env' ? `<td><i class="dot" style="background:${U.crewColor(r.crew)};margin-right:8px"></i>${esc(c ? c.name : r.crew)}</td>` : ''}${cols.map(k => `<td class="${['dos', 'cabin', 'analyte'].includes(k[0]) ? '' : 'r'}">${cell(r, k[0])}</td>`).join('')}<td>${lv == null ? '' : chip(lv)}</td><td>${r.user ? '<span class="chip n" style="color:var(--accent);background:var(--accent-soft)">Inserido</span>' : '<span class="muted">Demonstração</span>'}</td><td>${r.user ? `<button class="btn ghost sm danger" data-del="${r.rid}" title="Excluir registro" aria-label="Excluir registro">${icon('trash')}</button>` : ''}</td></tr>`; }).join('') : `<tr><td colspan="${cols.length + 5}"><div class="empty"><b>Nenhum registro</b>${R.scope === 'mine' ? 'Você ainda não inseriu medições nesta categoria.' : 'Ajuste os filtros.'}</div></td></tr>`}</tbody></table></div>
        <div class="pager"><span>${all.length.toLocaleString('pt-BR')} registros · página ${R.page + 1} de ${pages}</span><span style="display:flex;gap:6px"><button class="btn sm" id="pp" ${R.page === 0 ? 'disabled' : ''}>Anterior</button><button class="btn sm" id="pn" ${R.page >= pages - 1 ? 'disabled' : ''}>Próxima</button></span></div></div></div>
      <div class="grid g2"><div class="card"><div class="card-h"><div><h3>Exportar para o pipeline</h3><p>O CSV segue exatamente as colunas dos arquivos do seu projeto (${FILE[R.cat]}.csv).</p></div></div><div class="card-b" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" id="dl">${icon('download')}Baixar CSV</button><button class="btn" id="cp">${icon('copy')}Copiar CSV</button><button class="btn ghost" id="cpj">Copiar tudo em JSON</button></div></div>
      <div class="card"><div class="card-h"><div><h3>Armazenamento</h3><p>Os registros ficam no navegador deste dispositivo (${mine} inseridos). Para uso real, troque pelo seu banco de dados.</p></div></div><div class="card-b"><button class="btn danger" id="rs" ${mine || A.DB.crew.some(c => !c.seed) ? '' : 'disabled'}>${icon('undo')}Restaurar base de demonstração</button></div></div></div></div>`;
    root.querySelectorAll('#cats button').forEach(b => b.onclick = () => { R.cat = b.dataset.c; R.page = 0; render(root); });
    root.querySelectorAll('#sc button').forEach(b => b.onclick = () => { R.scope = b.dataset.v; R.page = 0; render(root); });
    const rc = root.querySelector('#rc'); if (rc) rc.onchange = () => { R.crew = rc.value; R.page = 0; render(root); };
    root.querySelector('#pp').onclick = () => { R.page--; render(root); }; root.querySelector('#pn').onclick = () => { R.page++; render(root); };
    root.querySelector('#dl').onclick = () => exportCSV(false); root.querySelector('#cp').onclick = () => exportCSV(true);
    root.querySelector('#cpj').onclick = async () => { const ok = await copyText(JSON.stringify({ crew: A.DB.crew, records: A.DB.userRecords }, null, 1)); window.APP.toast(ok ? 'JSON copiado' : 'Não foi possível copiar.'); };
    root.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { const rid = b.dataset.del, rec = A.DB.userRecords.find(x => x.id === rid); window.APP.confirm('Excluir este registro?', 'Todas as medições salvas no mesmo envio serão removidas.', 'Excluir', () => { A.removeRecordGroup(rec.group); window.APP.refreshHeader(); render(root); window.APP.toast('Registro excluído'); }); });
    root.querySelector('#rs').onclick = () => window.APP.confirm('Restaurar a base de demonstração?', 'Seus registros e tripulantes adicionados neste navegador serão apagados.', 'Restaurar', () => { A.resetUser(); window.VIEWS.registrar.reset(); window.APP.refreshHeader(); render(root); window.APP.toast('Base restaurada'); });
  }
  V.registros = { render };

  /* ---------- Método ---------- */
  function band(m) { return m.ok ? `${fmt(m.ok[0], m.dec)}–${fmt(m.ok[1], m.dec)}` : '—'; }
  V.metodo = { render(root) {
    root.innerHTML = `<div class="stack view-in"><div class="grid g2">
      <div class="card"><div class="card-b prose"><h3 style="margin-top:0">Como o diagnóstico é calculado</h3>
        <p>Cada medida passa por duas comparações e fica com o pior resultado das duas.</p>
        <p><b>1. Faixa de referência.</b> Um intervalo de triagem para adultos. Dentro: normal. Na faixa ampliada: atenção. Fora: crítico.</p>
        <p><b>2. Seu padrão.</b> A mediana e o desvio robusto (MAD × 1,4826) dos primeiros ${A.BASE_DAYS} dias de missão do próprio tripulante. Desvio de 2σ ou mais na direção adversa gera atenção. Para métricas sem faixa de referência, 3σ ou mais gera nível crítico.</p>
        <p>Quando o tripulante tem menos de ${A.MIN_N} medições no período de referência (como nos exames quinzenais), o padrão vem da coorte, e o nível máximo é atenção.</p>
        <h3>Eventos persistentes</h3><p>Dias seguidos em que a média diária de uma métrica fica no mínimo X desvios do padrão, na direção adversa. É a mesma regra do módulo Python de detecção.</p>
        <h3>Padrões combinados</h3><p>Regras que ligam indicadores a riscos de missão da NASA (radiação, isolamento, ambiente fechado, perda óssea e cardiovascular).</p></div></div>
      <div class="stack"><div class="card"><div class="card-b prose"><h3 style="margin-top:0">Origem dos dados</h3>
        <div class="callout">${icon('warn')}<div>A base carregada é <b>sintética</b> (90 dias da missão fictícia Ares Pathfinder, 6 tripulantes). Serve para demonstrar a plataforma, não para afirmar nada sobre astronautas reais.</div></div>
        <p>Medições registradas no formulário ficam rotuladas como <i>Inserido</i> e não se misturam com a base de demonstração na exportação.</p>
        <h3>Limitações</h3><ul><li>As faixas de referência são padrões do protótipo. Em uso real devem vir do médico de voo e do NASA-STD-3001.</li><li>Não é dispositivo médico nem diagnóstico clínico.</li><li>O armazenamento é local ao navegador, sem sincronização entre dispositivos.</li><li>O limite de carreira de radiação (600 mSv) vem do NASA-STD-3001 Vol. 1 Rev B; antes de uso real, confira a revisão vigente.</li></ul></div></div></div></div>
      <div class="card"><div class="card-h"><div><h3>Faixas de referência por indicador</h3><p>Valores usados para o estado normal, atenção e crítico.</p></div></div><div class="card-b" style="padding:12px 0 0"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Indicador</th><th>Categoria</th><th>Unidade</th><th class="r">Normal</th><th class="r">Atenção até</th><th>Direção adversa</th></tr></thead><tbody>${A.MET.map(m => `<tr><td>${esc(m.label)}</td><td>${A.CATS[m.cat].short}</td><td>${esc(m.unit)}</td><td class="r">${band(m)}</td><td class="r">${m.warn ? fmt(m.warn[0], m.dec) + '–' + fmt(m.warn[1], m.dec) : m.pct ? `variação ≥ ${m.pct[0]}% (crítico ≥ ${m.pct[1]}%)` : 'só desvio do padrão'}</td><td>${m.bad === 'both' ? 'Ambas' : m.bad === 'high' ? 'Acima' : 'Abaixo'}</td></tr>`).join('')}</tbody></table></div></div></div></div>`;
  } };
})();
