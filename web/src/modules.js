/* =========================================================
   Athenance: sistema de módulos referenciáveis
   ---------------------------------------------------------
   Cada caixa da interface é um módulo com ID estável, ex.: TRI-05.
     Prefixo = tela  (APP shell, REG registrar, TRI tripulante,
                      ANA análise, HIS registros, MET método)
     Número  = fixo, definido aqui; não muda se a caixa mudar de lugar.

   Para trocar o conteúdo de uma caixa: edite só o render do módulo.
   Para mudar a posição ou o tamanho: edite só o LAYOUT da tela.
   O mapa completo fica em web/MODULOS.md e no "modo referência".
   ========================================================= */
(function () {
  const U = window.UI, { esc } = U;
  const T = (s, v) => (window.I18N ? window.I18N.t(s, v) : s);
  const REG = {};
  const PAGE_PREFIX = { registrar: 'REG', tripulante: 'TRI', radiacao: 'RAD', analise: 'ANA', registros: 'HIS', metodo: 'MET' };

  /* def: { id, key, title, sub?, size: 's'|'m'|'l'|'xl'|'full', bare?, flush?, render(body, ctx, el) }
     bare = sem moldura; flush = corpo sem espaçamento interno; rows = linhas ocupadas
     size em colunas de 12: s=3, m=4, l=6, xl=8, full=12                     */
  function define(def) {
    if (REG[def.id]) console.warn('Módulo redefinido:', def.id);
    REG[def.id] = def;
  }

  const num = id => id.split('-')[1];

  function frame(def) {
    const el = document.createElement('section');
    el.className = 'mod' + (def.bare ? ' bare' : '') + (def.flush ? ' flush' : '');
    el.dataset.mod = def.id;
    el.dataset.size = def.size || 'full';
    if (def.rows) el.dataset.rows = def.rows;  // ocupa N linhas da grade (ex.: figura do corpo)
    el.setAttribute('aria-label', T(def.title));
    el.innerHTML = def.bare ? `<div class="mod-b"></div>` :
      `<header class="mod-h"><span class="mod-n" aria-hidden="true">${num(def.id)}</span><div class="mod-t"><h2>${esc(T(def.title))}</h2>${def.sub ? `<p>${esc(T(def.sub))}</p>` : ''}</div><div class="mod-x"></div></header><div class="mod-b"></div>`;
    return el;
  }

  /* layout: lista de IDs na ordem de leitura. A grade de 12 colunas quebra sozinha. */
  function mount(root, layout, ctx) {
    const grid = document.createElement('div');
    grid.className = 'mods view-in';
    layout.forEach(id => {
      const def = REG[id];
      if (!def) { console.error('Módulo não encontrado:', id); return; }
      const el = frame(def);
      grid.appendChild(el);
      try { def.render(el.querySelector('.mod-b'), ctx, el); }
      catch (e) { console.error(id, e); el.querySelector('.mod-b').innerHTML = `<div class="empty"><b>${T('Erro no módulo {id}', { id: esc(id) })}</b>${esc(e.message)}</div>`; }
    });
    root.innerHTML = '';
    root.appendChild(grid);
    tagAll();
    return grid;
  }

  /* Telas ainda não migradas: recebem IDs provisórios pela ordem dos cartões. */
  function tagLegacy(root, page) {
    const pre = PAGE_PREFIX[page];
    if (!pre || root.querySelector('.mods')) return;
    let n = 0;
    root.querySelectorAll('.card').forEach(c => {
      if (c.parentElement.closest('.card')) return;
      n++;
      c.dataset.mod = `${pre}-${String(n).padStart(2, '0')}`;
      c.dataset.legacy = '1';
    });
    tagAll();
  }

  /* Etiqueta visível no modo referência (clique copia a referência). */
  /* Nomes de caixas provisórias sem título próprio */
  const LEGACY_NAMES = { 'REG-01': 'Formulário de registro', 'REG-02': 'Diagnóstico ao vivo', 'ANA-01': 'Filtros', 'HIS-01': 'Tabela de registros' };
  function title(el) {
    const id = el.dataset.mod, def = REG[id];
    if (def) return T(def.title);
    if (el.dataset.legacy && LEGACY_NAMES[id]) return T(LEGACY_NAMES[id]);
    if (el.dataset.title) return el.dataset.title;
    const h = [...el.querySelectorAll('h1,h2,h3,h4,label,b,strong,small')].find(x => !x.closest('.ref-tag'));
    return h ? h.textContent.trim().replace(/\s+/g, ' ').slice(0, 40) : '';
  }
  function tagAll() {
    document.querySelectorAll('[data-mod]').forEach(el => {
      let t = el.querySelector(':scope > .ref-tag');
      if (!t) { t = document.createElement('button'); t.type = 'button'; t.className = 'ref-tag'; el.prepend(t); t.onclick = e => { e.stopPropagation(); copyRef(el); }; }
      const id = el.dataset.mod, tl = title(el);
      t.innerHTML = `<b>${esc(id)}</b>${tl ? `<span>${esc(tl)}</span>` : ''}${el.dataset.legacy ? `<em>${T('provisório')}</em>` : ''}`;
      t.title = T('Copiar referência');
    });
  }
  function copyRef(el) {
    const page = (location.hash || '#tripulante').slice(1);
    const txt = `${el.dataset.mod} (${title(el)}, ${T('tela')} ${page})`;
    const done = () => window.APP && window.APP.toast(T('Copiado: ') + txt);
    try { navigator.clipboard.writeText(txt).then(done, done); } catch (e) { done(); }
  }

  /* Modo referência: ferramenta de desenvolvimento. Só existe quando o endereço tem ?ref
     (ex.: http://127.0.0.1:8765/?ref#tripulante). Sem isso, não há botão nem atalho. */
  const DEV = /[?&]ref(?:[=&]|$)/.test(location.search);
  const LS = 'athenance.refmode';
  const isRef = () => document.documentElement.classList.contains('ref-mode');
  function setRef(on) {
    document.documentElement.classList.toggle('ref-mode', on);
    try { localStorage.setItem(LS, on ? '1' : '0'); } catch (e) {}
    document.querySelectorAll('[data-refbtn]').forEach(b => b.setAttribute('aria-pressed', on));
  }
  function initRef() {
    if (!DEV) return;
    let on = false; try { on = localStorage.getItem(LS) === '1'; } catch (e) {}
    setRef(on);
    document.addEventListener('keydown', e => {
      if (e.altKey && (e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey) { e.preventDefault(); setRef(!isRef()); }
    });
  }

  const list = () => Object.values(REG).map(d => ({ id: d.id, key: d.key, title: d.title, size: d.size }));

  window.MOD = { define, mount, tagLegacy, tagAll, setRef, isRef, initRef, DEV, list, REG, PAGE_PREFIX };
})();
