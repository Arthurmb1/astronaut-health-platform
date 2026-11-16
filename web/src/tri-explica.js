/* =========================================================
   Tripulante: explicação e perguntas (TRI-22)
   1) Texto determinístico na hora (regras), e logo abaixo o botão
      "Explicar com SI" (servidor local -> modelo -> guarda em web/ai.py).
   2) Caixa "Pergunte à SI": perguntas sugeridas têm RESPOSTA PRONTA
      (sem chamar a API). Se o usuário alterar o texto, a pergunta vai
      para /api/perguntar, com a mesma guarda.
   Na interface, a camada de inteligência é sempre chamada de SI.
   ========================================================= */
(function () {
  const A = window.AT, U = window.UI, M = window.MOD, { esc, fmt, icon } = U;
  const T = (s, v) => window.I18N.t(s, v), R = r => window.I18N.reason(r);
  const LV = ['Normal', 'Atenção', 'Crítico'];
  const results = new Map();   // pacote (texto) -> resposta da SI (explicação)
  const QA = new Map();        // tripulante|idioma -> [{q, a, fonte, ...}]
  const E = { status: null, draft: '' };

  /* ---------- Perguntas sugeridas com resposta pronta (sem API) ---------- */
  const SUGGEST = [
    { q: 'O que significam Normal, Atenção e Crítico?',
      a: p => T('Normal: o valor está na faixa de referência e perto do seu padrão pessoal. Atenção: saiu da faixa de referência ou se afastou do seu padrão; vale repetir a medida e observar. Crítico: está fora da faixa ampliada; acione o médico de voo. Hoje sua condição geral é {c}.', { c: p.condicao_geral.toLowerCase() }) },
    { q: 'O que é o meu padrão pessoal?',
      a: () => T('É a sua faixa típica, calculada com a mediana e a dispersão das suas medidas nos primeiros {n} dias da missão. Assim o sistema compara você com você mesmo, e não só com a média da população.', { n: A.BASE_DAYS }) },
    { q: 'Devo me preocupar com estes alertas?',
      a: () => T('Um alerta indica que algo mudou, não é um diagnóstico. Repita a medida nas mesmas condições e siga as ações sugeridas. Se o alerta persistir por 2 dias ou vier com sintomas, fale com o médico de voo.') },
    { q: 'Como o sono afeta os meus indicadores?',
      a: () => T('Dormir pouco aumenta o estresse, piora o tempo de reação e o humor e pode elevar a frequência cardíaca e a pressão. Por isso o sistema cruza o sono com esses indicadores no padrão "Fadiga e estresse combinados".') },
    { q: 'Por que a radiação importa nesta missão?',
      a: () => T('Fora do campo magnético da Terra, raios cósmicos e eventos solares aumentam o risco de câncer e de efeitos no coração e no sistema nervoso a longo prazo. A NASA limita a dose de carreira a 600 mSv; a tela Radiação mostra quanto do limite já foi usado.') },
    { q: 'Estes dados são reais?',
      a: () => T('Não. Os dados dos tripulantes são sintéticos, criados para demonstração. Os limites de radiação e os dados de atividade solar da tela Radiação vêm de fontes reais da NASA e da NOAA.') },
  ];
  const norm = s => (s || '').toLowerCase().replace(/\s+/g, ' ').replace(/[?.!¿¡\s]+$/g, '').replace(/^[¿¡\s]+/, '').trim();
  const canned = (text, p) => { const s = SUGGEST.find(x => norm(T(x.q)) === norm(text)); return s ? s.a(p) : null; };

  /* ---------- Pacote de fatos (a única coisa que a SI recebe) ---------- */
  function packet(crew, st) {
    const flagged = st.flagged.slice(0, 6);
    const S = window.SCN && window.SCN.state;
    const act = a => { const ks = Object.keys(a.m.act); return a.m.act[a.side > 0 ? 'high' : 'low'] || a.m.act[ks[0]]; };
    const pats = A.patterns(A.szMapFromAssess(st.items));
    const cand = [];
    pats.forEach(p => cand.push(p.act));
    flagged.forEach(a => cand.push(act(a)));
    const last = A.crewLastDate(crew.id);
    return {
      idioma: window.I18N.LANGS[window.I18N.lang].name,
      tripulante: crew.name,
      data: last ? U.fmtDT(last) : '',
      condicao_geral: T(LV[st.level]),
      dados: T('sintéticos de demonstração'),
      cenario: S && S.active && S.crew === crew.id ? T(window.SCN.SCENARIOS[S.active].name) + ' (' + T('simulado') + ')' : null,
      sinalizados: flagged.map(a => ({
        indicador: a.m.label,
        valor: `${fmt(a.v, a.m.dec)} ${a.m.unit}`,
        estado: T(LV[a.level]),
        padrao_pessoal: a.base && !a.m.noZ ? `${fmt(a.base.med, a.m.dec)} ${a.m.unit}` : null,
        desvio: a.z != null ? T('{z} desvios do seu padrão', { z: `${a.z > 0 ? '+' : '−'}${fmt(Math.abs(a.z), 1)}` }) : null,
        faixa_referencia: a.m.ok ? T('{a} a {b} {u}', { a: fmt(a.m.ok[0], a.m.dec), b: fmt(a.m.ok[1], a.m.dec), u: a.m.unit }) : null,
        motivos: a.reasons.map(R),
      })),
      padroes: pats.map(p => ({ titulo: p.title, texto: p.text })),
      indicadores_normais: st.items.length - st.flagged.length,
      acoes_candidatas: [...new Set(cand)].slice(0, 6),
    };
  }

  /* ---------- Texto determinístico: sempre disponível, sem rede ---------- */
  function template(p) {
    if (!p.sinalizados.length) return { resumo: T('Todos os {n} indicadores do último registro ({d}) estão dentro do esperado para você, tanto na faixa de referência quanto no seu padrão pessoal.', { n: p.indicadores_normais, d: p.data }), acoes: [] };
    const n = p.sinalizados.length;
    const parts = [T(n === 1 ? 'Condição geral: {c}, com 1 indicador fora do esperado no registro de {d}.' : 'Condição geral: {c}, com {n} indicadores fora do esperado no registro de {d}.', { c: p.condicao_geral.toLowerCase(), n, d: p.data })];
    p.sinalizados.slice(0, 3).forEach(s => parts.push(T('{i} em {v} ({e}): {m}', { i: s.indicador, v: s.valor, e: s.estado.toLowerCase(), m: s.motivos.join(', ') }) + (s.padrao_pessoal ? T('; seu padrão é {p}', { p: s.padrao_pessoal }) : '') + '.'));
    if (n > 3) parts.push(T('Há mais {n} na lista de alertas.', { n: n - 3 }));
    p.padroes.slice(0, 2).forEach(x => parts.push(T('Padrão combinado "{t}": {x}', { t: x.titulo, x: x.texto })));
    return { resumo: parts.join(' '), acoes: p.acoes_candidatas.slice(0, 3) };
  }

  async function loadStatus() {
    try { const r = await fetch('/api/status', { cache: 'no-store' }); E.status = r.ok ? await r.json() : { off: true }; }
    catch (e) { E.status = { off: true }; }
  }
  async function post(url, body) {
    try { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return await r.json(); }
    catch (e) { return { ok: false, fonte: 'off', motivo: T('o servidor local não respondeu') }; }
  }
  const offRes = () => ({ ok: false, fonte: 'off', motivo: T('o servidor local não está rodando (abra pelo endereço http://localhost:8765)') });

  function metaBadge(res) {
    const n = res.numeros_conferidos || 0;
    return `<span class="chip l0">${icon('check')}${T('SI verificada')}</span><span class="ai-meta">${T(n === 1 ? '1 número conferido com os dados' : '{n} números conferidos com os dados', { n })} · ${esc(res.modelo || '')}${res.fonte === 'cache' ? ' · ' + T('do cache, sem custo') : res.usd != null ? ` · US$ ${res.usd.toFixed(5)}` : ''}</span>`;
  }
  function failNote(res) {
    return res.fonte === 'ia'
      ? `${icon('warn')}${T('A resposta da SI foi descartada pela guarda: {m}.', { m: esc(String(res.motivo).replace(/\.+$/, '')) })}`
      : `${icon('info')}${T('SI indisponível: {m}.', { m: esc(String(res.motivo).replace(/\.+$/, '')) })}`;
  }

  M.define({ id: 'TRI-22', key: 'tri.explicacao', title: 'Explicação em linguagem simples', sub: 'A SI pode cometer erros. Avalie com cuidado qualquer alerta de parâmetro fora do normal e, se possível, confirme com um especialista.', size: 'full',
    render(b, c, el) {
      el.classList.add('si-mod');
      const p = packet(c.crew, c.st), pk = JSON.stringify(p), res = results.get(pk);
      const st = E.status, qaKey = c.crew.id + '|' + window.I18N.lang, hist = QA.get(qaKey) || [];
      const tip = st && st.off ? T('Servidor local não está rodando') : st && !st.chave ? T('Sem chave da SI no servidor local') : st && st.aviso_chave ? T('Chave da SI com formato suspeito: confira o .env') : T('Gera a explicação com a SI e confere cada número');
      const tpl = template(p);

      let siBlock = '';
      if (res && res.loading) siBlock = `<div class="ai-si loading"><span class="ai-spin"></span>${T('Gerando...')}</div>`;
      else if (res && res.ok) siBlock = `<div class="ai-si"><div class="ai-badges">${metaBadge(res)}</div><p class="ai-text">${esc(res.resumo)}</p>${res.acoes && res.acoes.length ? `<div class="ai-acts"><b>${T('O que fazer')}</b><ul>${res.acoes.map(a => `<li>${esc(a)}</li>`).join('')}</ul></div>` : ''}</div>`;
      else if (res) siBlock = `<p class="ai-note ${res.fonte === 'ia' ? 'warn' : ''}">${failNote(res)} ${T('O texto por regras acima continua valendo.')}</p>`;

      const qaItem = h => {
        let badge, body;
        if (h.loading) { badge = ''; body = `<p class="qa-a muted"><span class="ai-spin"></span>${T('Gerando...')}</p>`; }
        else if (h.fonte === 'pronta') { badge = `<span class="chip n">${icon('check')}${T('Resposta pronta, sem uso da SI')}</span>`; body = `<p class="qa-a">${esc(h.a)}</p>`; }
        else if (h.ok) { badge = metaBadge(h); body = `<p class="qa-a">${esc(h.a)}</p>`; }
        else { badge = ''; body = `<p class="ai-note ${h.fonte === 'ia' ? 'warn' : ''}">${failNote(h)}</p><p class="qa-a muted">${T('Não consegui responder com segurança. Para essa dúvida, fale com o médico de voo ou um especialista.')}</p>`; }
        return `<li><p class="qa-q">${icon('user')}${esc(h.q)}</p><div class="ai-badges">${badge}</div>${body}</li>`;
      };

      b.innerHTML = `<div class="ai-box">
        <div class="ai-badges"><span class="chip n">${T('Texto automático por regras')}</span></div>
        <p class="ai-text">${esc(tpl.resumo)}</p>
        ${tpl.acoes.length ? `<div class="ai-acts"><b>${T('O que fazer')}</b><ul>${tpl.acoes.map(a => `<li>${esc(a)}</li>`).join('')}</ul></div>` : ''}
        <div class="ai-cta"><button class="btn sm ai-btn${st && (st.off || !st.chave) ? ' muted-btn' : ''}" type="button" data-explain ${res && res.loading ? 'disabled' : ''} title="${esc(tip)}">${icon('spark')}${T('Explicar com SI')}</button><span class="ai-meta">${esc(tip)}</span></div>
        ${siBlock}

        <div class="qa">
          <h3>${icon('spark')}${T('Pergunte à SI')}</h3>
          <form class="qa-form" autocomplete="off"><input class="inp" name="q" maxlength="300" placeholder="${esc(T('Escreva sua dúvida sobre estes resultados'))}" value="${esc(E.draft)}"><button class="btn primary sm" type="submit">${T('Perguntar')}</button></form>
          <div class="qa-sug"><span>${T('Sugestões (resposta pronta, sem custo):')}</span>${SUGGEST.map((s, i) => `<button type="button" class="pill" data-sug="${i}">${esc(T(s.q))}</button>`).join('')}</div>
          <p class="qa-hint">${T('Se você alterar o texto de uma sugestão, a pergunta vai para a SI e passa pela mesma guarda.')}</p>
          ${hist.length ? `<ul class="qa-list">${hist.map(qaItem).join('')}</ul>` : ''}
        </div>

        <details class="ai-pkt"><summary>${T('Ver exatamente o que é enviado à SI')}</summary><pre>${esc(JSON.stringify(p, null, 2))}</pre></details>
        <p class="vnote">${T('Apoio à decisão, não diagnóstico. Dados sintéticos. A guarda descarta qualquer resposta da SI que cite um número que não está nos dados, use nome de doença ou remédio, ou sugira ação fora da lista do motor.')}</p>
      </div>`;

      /* Explicar com SI */
      b.querySelector('[data-explain]').onclick = async () => {
        if (st && st.off) { results.set(pk, offRes()); c.rerender(); return; }
        results.set(pk, { loading: true }); c.rerender();
        results.set(pk, await post('/api/explicar', p));
        if (document.querySelector('[data-mod="TRI-22"]')) c.rerender();
      };

      /* Perguntas */
      const input = b.querySelector('.qa-form input');
      input.oninput = () => { E.draft = input.value; };
      const ask = async text => {
        const q = text.trim(); if (!q) return;
        const list = QA.get(qaKey) || []; QA.set(qaKey, list);
        const ready = canned(q, p);
        if (ready) { list.unshift({ q, a: ready, fonte: 'pronta' }); }
        else if (st && st.off) { list.unshift({ q, ...offRes() }); }
        else {
          const item = { q, loading: true }; list.unshift(item); c.rerender();
          const r = await post('/api/perguntar', { pergunta: q, pacote: p });
          Object.assign(item, { loading: false, ...r, a: r.resposta });
        }
        list.splice(4);
        E.draft = ready ? q : '';  // sugestão continua no campo para o usuário poder editar e reenviar
        if (document.querySelector('[data-mod="TRI-22"]')) { c.rerender(); const f = document.querySelector('[data-mod="TRI-22"] .qa'); if (f) f.scrollIntoView({ block: 'nearest' }); }
      };
      b.querySelector('.qa-form').onsubmit = e => { e.preventDefault(); ask(input.value); };
      b.querySelectorAll('[data-sug]').forEach(btn => btn.onclick = () => { const s = T(SUGGEST[+btn.dataset.sug].q); input.value = s; ask(s); });
    } });

  loadStatus();
  window.EXPLAIN = { packet, template, results, QA, SUGGEST, canned, state: E, loadStatus };
})();
