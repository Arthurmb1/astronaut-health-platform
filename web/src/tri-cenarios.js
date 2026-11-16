/* =========================================================
   Tripulante: barra de cenários de um clique (TRI-21)
   Lógica dos cenários em scenarios.js; aqui só a interface.
   ========================================================= */
(function () {
  const U = window.UI, M = window.MOD, { esc, icon } = U;
  const T = (s, v) => window.I18N.t(s, v);

  M.define({ id: 'TRI-21', key: 'tri.cenarios', title: 'Cenários de demonstração', sub: 'Um clique simula uma situação no tripulante selecionado. Tudo em memória: a base não muda.', size: 'full',
    render(b, c, el) {
      const SC = window.SCN, st = SC.state, ids = Object.keys(SC.SCENARIOS);
      const on = st.active && st.crew === c.crew.id ? st.active : null;
      const other = st.active && st.crew !== c.crew.id;
      el.querySelector('.mod-x').innerHTML = `<span class="chip n">${T('Simulado')}</span>`;
      const cur = on && SC.SCENARIOS[on];
      b.innerHTML = `<div class="scn-grid" role="group" aria-label="${T('Cenários')}">${ids.map(id => { const s = SC.SCENARIOS[id]; return `<button class="scn-btn scn-${id}" data-scn="${id}" aria-pressed="${on === id}"><span class="scn-ic">${icon(s.icon)}</span><span><b>${esc(T(s.name))}</b><small>${esc(T(s.desc))}</small></span></button>`; }).join('')}</div>
        ${cur ? `<div class="scn-exp"><b>${T('O que observar agora')}</b><ul>${cur.expect.map(e => `<li>${esc(T(e))}</li>`).join('')}</ul><button class="btn sm" type="button" data-scn-off>${icon('undo')}${T('Voltar aos dados da base')}</button></div>` : ''}
        ${other ? `<p class="scn-note">${T('Há um cenário ativo em {n}. Escolher outro aqui substitui aquele.', { n: esc(SC.crewName(st.crew)) })}</p>` : ''}`;
      b.querySelectorAll('[data-scn]').forEach(btn => btn.onclick = () => {
        const id = btn.dataset.scn;
        if (on === id) { SC.reset(); window.APP.toast(T('Dados da base restaurados')); }
        else { SC.apply(id, c.crew.id); window.APP.toast(T('Cenário "{s}" aplicado a {n}', { s: T(SC.SCENARIOS[id].name), n: c.crew.name })); }
        window.APP.refreshHeader(); c.rerender(); window.SCN.renderBanner();
      });
      const off = b.querySelector('[data-scn-off]');
      if (off) off.onclick = () => { SC.reset(); window.APP.refreshHeader(); c.rerender(); window.SCN.renderBanner(); window.APP.toast(T('Dados da base restaurados')); };
    } });
})();
