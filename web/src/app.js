/* =========================================================
   Aurora (by Athenance): shell, rotas e utilitários globais
   ========================================================= */
(function () {
  const A = window.AT, U = window.UI, { esc, icon } = U;
  const state = { crewId: null, metric: 'hr' };
  const PAGES = {
    tripulante: { nav: 'Tripulante', ic: 'user', title: 'Saúde do tripulante', sub: 'Acompanhamento integrado de cada tripulante ao longo da missão.' },
    registrar: { nav: 'Registrar medições', ic: 'form', title: 'Registrar medições', sub: 'Informe seus indicadores de saúde. Você recebe na hora um diagnóstico comparado ao seu padrão pessoal.' },
    radiacao: { nav: 'Radiação', ic: 'rad', title: 'Radiação', sub: 'Dose de carreira, planejamento de saídas em Marte e atividade solar com dados reais.' },
    analise: { nav: 'Análise exploratória', ic: 'chart', title: 'Análise exploratória', sub: 'Padrões e relações nos dados da tripulação, durante e depois da missão.' },
    registros: { nav: 'Registros', ic: 'table', title: 'Registros e exportação', sub: 'Histórico por categoria, origem dos dados e exportação para o seu pipeline.' },
    metodo: { nav: 'Método e limites', ic: 'book', title: 'Método e limites', sub: 'Como cada resultado é calculado e o que a base de demonstração representa.' },
  };
  const LS_THEME = 'athenance.theme';
  const route = () => { const h = (location.hash || '').slice(1); return PAGES[h] ? h : 'tripulante'; };  // tela inicial = primeira do menu

  function logo() { return window.BRAND.logo('side'); }

  const T = (s, v) => window.I18N.t(s, v);

  function langSwitch() {
    const L = window.I18N.LANGS, cur = window.I18N.lang;
    return `<div class="lang" role="group" aria-label="${T('Idioma')}">${icon('globe')}${Object.entries(L).map(([k, x]) => `<button type="button" data-lang="${k}" aria-pressed="${k === cur}" title="${x.name}">${x.short}</button>`).join('')}</div>`;
  }

  function shell() {
    document.getElementById('root').innerHTML = `<div class="app"><aside class="side" data-mod="APP-01" data-title="${T('Menu lateral')}">
      <div class="brand">${logo()}<div><b>Aurora</b><span>by Athenance</span></div></div>
      <div><div class="nav-group">${T('Plataforma')}</div><nav class="nav" aria-label="${T('Principal')}">${Object.entries(PAGES).map(([k, p]) => `<a href="#${k}" data-r="${k}">${icon(p.ic)}<span>${T(p.nav)}</span></a>`).join('')}</nav></div>
      <div class="side-foot"><div class="demo-tag"><i></i><span>${T('Dados de demonstração sintéticos. Não são de astronautas reais.')}</span></div>
        ${window.MOD.DEV ? `<button class="btn ghost sm ref-btn" data-refbtn aria-pressed="false" title="${T('Mostra o ID de cada caixa (atalho Alt+R)')}">${icon('grid')}<span>${T('Modo referência')}</span></button>` : ''}
        <div class="row"><span>NASA Space Apps 2026</span><button class="btn ghost sm" id="theme" aria-label="${T('Alternar tema')}"></button></div></div></aside>
      <main class="main" id="main"><header class="top" data-mod="APP-02" data-title="${T('Cabeçalho da tela')}"><div><h1 id="h1"></h1><p id="sub"></p></div><div class="top-r"><div id="langsw" data-mod="APP-04" data-title="${T('Idioma')}">${langSwitch()}</div><div class="ctx" id="ctx"></div></div></header><div class="scn-banner" id="scnb" data-mod="APP-03" data-title="${T('Aviso de cenário ativo')}" role="status" hidden></div><div class="i18n-note" id="i18nnote" hidden></div><div id="view"></div></main></div>`;
    document.getElementById('theme').onclick = toggleTheme; paintTheme();
    if (window.MOD.DEV) { document.querySelector('[data-refbtn]').onclick = () => window.MOD.setRef(!window.MOD.isRef()); window.MOD.setRef(window.MOD.isRef()); }
    document.querySelectorAll('[data-lang]').forEach(b => b.onclick = () => setLang(b.dataset.lang));
  }
  function setLang(l) { window.I18N.set(l); shell(); refreshHeader(); render(); }
  function paintTheme() { const t = document.documentElement.dataset.theme || 'dark'; const b = document.getElementById('theme'); if (b) b.innerHTML = icon(t === 'dark' ? 'sun' : 'moon') + T(t === 'dark' ? 'Claro' : 'Escuro'); }
  function toggleTheme() { const t = (document.documentElement.dataset.theme || 'dark') === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = t; try { localStorage.setItem(LS_THEME, t); } catch (e) {} paintTheme(); render(); }

  function refreshHeader() {
    const last = A.lastDate(), m = A.DB.missions[0];
    document.getElementById('ctx').innerHTML = `<div><span>${T('Missão')}</span><strong>${esc(m.name)}</strong></div><div><span>${T('Fase')}</span><strong>${A.PHASE_PT[A.phaseForDate(last)]}</strong></div><div><span>${T('Último registro')}</span><strong class="num">${U.fmtDT(last)}</strong></div>`;
  }

  function render() {
    const r = route(), p = PAGES[r], V = window.VIEWS[r];
    document.querySelectorAll('.nav a').forEach(a => { if (a.dataset.r === r) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    const res = r === 'registrar' && window.VIEWS.registrar.form.result;
    document.getElementById('h1').textContent = res ? T('Diagnóstico do registro') : T(p.title);
    document.getElementById('sub').textContent = res ? T('Resultado imediato, comparado com a faixa de referência e com o seu padrão pessoal.') : T(p.sub);
    document.title = (res ? T('Diagnóstico') : T(p.title)) + ' · Aurora';
    const note = document.getElementById('i18nnote'), I = window.I18N;
    note.hidden = true; note.innerHTML = '';
    tipHideAll(); const vw = document.getElementById('view'); V.render(vw); window.MOD.tagLegacy(vw, r); window.SCN.renderBanner(); window.MOD.tagAll();
    if (!I.TRANSLATED.has(r)) I.watch(vw); else I.watch(null);  // telas sem T() no código: tradução no nível da página
  }
  const tipHideAll = () => U.tipHide();

  /* ---------- Toast e modais ---------- */
  let tt;
  function toast(msg) { let el = document.querySelector('.toast'); if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); } el.innerHTML = icon('check') + `<span>${esc(msg)}</span>`; el.querySelector('svg').setAttribute('style', 'width:16px;height:16px;stroke:var(--good-ink);fill:none;stroke-width:2.2'); requestAnimationFrame(() => el.classList.add('on')); clearTimeout(tt); tt = setTimeout(() => el.classList.remove('on'), 2600); }
  function modal(html, onMount) {
    const bg = document.createElement('div'); bg.className = 'modal-bg'; bg.innerHTML = `<div class="card modal" role="dialog" aria-modal="true">${html}</div>`; document.body.appendChild(bg);
    const close = () => bg.remove(); bg.addEventListener('mousedown', e => { if (e.target === bg) close(); }); bg.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    onMount(bg, close); const f = bg.querySelector('input,button'); if (f) f.focus();
  }
  function confirmBox(title, text, okLabel, onOk) {
    modal(`<h3>${esc(title)}</h3><p class="muted" style="margin:6px 0 0">${esc(text)}</p><div class="btns"><button class="btn" data-x>Cancelar</button><button class="btn primary" data-ok>${esc(okLabel)}</button></div>`, (bg, close) => { bg.querySelector('[data-x]').onclick = close; bg.querySelector('[data-ok]').onclick = () => { close(); onOk(); }; });
  }
  function crewModal(done) {
    modal(`<h3>Novo tripulante</h3><p class="muted small" style="margin:4px 0 0">O padrão pessoal aparece depois de ${A.MIN_N} medições. Até lá, usamos a coorte como referência.</p><div class="fields" style="grid-template-columns:1fr 1fr"><div class="field span2"><label for="n-name">Nome</label><input class="inp" id="n-name" autocomplete="off"></div><div class="field"><label for="n-role">Função</label><input class="inp" id="n-role" value="Mission Specialist"></div><div class="field"><label for="n-age">Idade</label><input class="inp" id="n-age" inputmode="numeric" value="35"></div><div class="field span2"><label for="n-sex">Sexo</label><select class="sel" id="n-sex" style="width:100%"><option value="F">Feminino</option><option value="M">Masculino</option></select></div></div><div class="err" id="n-err" style="color:var(--crit-ink);font-size:12px;margin-top:8px"></div><div class="btns"><button class="btn" data-x>Cancelar</button><button class="btn primary" data-ok>Adicionar</button></div>`, (bg, close) => {
      bg.querySelector('[data-x]').onclick = close;
      bg.querySelector('[data-ok]').onclick = () => { const name = bg.querySelector('#n-name').value.trim(), age = parseInt(bg.querySelector('#n-age').value, 10); if (name.length < 2) { bg.querySelector('#n-err').textContent = 'Informe o nome do tripulante.'; return; } if (!(age >= 18 && age <= 80)) { bg.querySelector('#n-err').textContent = 'Idade entre 18 e 80 anos.'; return; } const c = A.addCrew({ name, role: bg.querySelector('#n-role').value.trim() || 'Crew', age, sex: bg.querySelector('#n-sex').value }); close(); toast(name + ' adicionado'); done(c); };
    });
  }

  window.APP = { state, render, refreshHeader, toast, confirm: confirmBox, crewModal };

  function init() {
    A.loadSeed(); A.loadUser();
    let th = 'dark'; try { th = localStorage.getItem(LS_THEME) || 'dark'; } catch (e) {}
    document.documentElement.dataset.theme = th;
    window.VIEWS.registrar.reset(); state.crewId = A.DB.crew[0].id;
    window.MOD.initRef(); window.BRAND.favicon(); window.I18N.applyEngine();
    shell(); refreshHeader(); render();
    window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
  }
  init();
})();
