/* =========================================================
   Athenance: idiomas (português, inglês, espanhol)
   ---------------------------------------------------------
   A chave de tradução é a própria frase em português:
     t('Sinais vitais')                  -> 'Vital signs' em inglês
     t('Medido em {d}', { d: data })     -> placeholders entre chaves
   Frase sem tradução volta em português e entra em I18N.missing
   (útil para achar o que falta: console -> I18N.missing).
   Dicionários: i18n-en.js e i18n-es.js.
   ========================================================= */
(function () {
  const LS = 'athenance.lang';
  const LANGS = {
    pt: { short: 'PT', name: 'Português', locale: 'pt-BR', html: 'pt-BR', months: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'] },
    en: { short: 'EN', name: 'English', locale: 'en-US', html: 'en', months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] },
    es: { short: 'ES', name: 'Español', locale: 'es-ES', html: 'es', months: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] },
  };
  /* Telas já traduzidas; as demais mostram aviso e ficam em português */
  const TRANSLATED = new Set(['tripulante']);
  const D = { en: {}, es: {} };
  const missing = new Set();
  let lang = 'pt';
  try { const v = localStorage.getItem(LS); if (LANGS[v]) lang = v; } catch (e) {}

  function t(s, vars) {
    if (s == null) return s;
    let r = s;
    if (lang !== 'pt') { const x = D[lang][s]; if (x != null) r = x; else missing.add(s); }
    if (vars) r = r.replace(/\{(\w+)\}/g, (_, k) => vars[k] != null ? vars[k] : '');
    return r;
  }

  /* Motivos gerados pelo motor (texto fixo + porcentagem) */
  function reason(r) {
    const m = /^variação de ([+−-]?[\d.,]+)% sobre o seu padrão$/.exec(r);
    if (m) { const p = lang === 'en' ? m[1].replace(',', '.') : m[1]; return t('variação de {p}% sobre o seu padrão', { p }); }
    return t(r);
  }

  /* Textos que moram no motor (métricas, categorias, fases, padrões combinados) */
  function applyEngine() {
    const A = window.AT; if (!A) return;
    A.MET.forEach(m => {
      if (!m._pt) m._pt = { label: m.label, short: m.short, what: m.what, why: m.why, unit: m.unit, act: { ...m.act } };
      const p = m._pt;
      m.label = t(p.label); m.short = t(p.short); m.what = t(p.what); m.why = t(p.why); m.unit = t(p.unit);
      m.act = Object.fromEntries(Object.entries(p.act).map(([k, v]) => [k, t(v)]));
    });
    Object.values(A.CATS).forEach(c => { if (!c._pt) c._pt = { label: c.label, short: c.short }; c.label = t(c._pt.label); c.short = t(c._pt.short); });
    if (!A._PHASE_PT) A._PHASE_PT = { ...A.PHASE_PT };
    Object.keys(A._PHASE_PT).forEach(k => { A.PHASE_PT[k] = t(A._PHASE_PT[k]); });
    if (!A._patterns) {
      A._patterns = A.patterns;
      A.patterns = (...a) => A._patterns(...a).map(p => ({ ...p, title: t(p.title), text: t(p.text), act: t(p.act), risk: t(p.risk) }));
    }
  }

  /* ---------- Tradução no nível da página (telas sem T() no código) ----------
     Troca textos e atributos (placeholder, title, aria-label) que batem exatamente com uma frase
     do dicionário; RULES cobre frases com números. Um observador traduz o que a tela redesenhar. */
  const RULES = [];   // [regex, (match) => texto]; preenchido pelos dicionários via addRule
  const missingDom = new Set();
  const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'PRE', 'CODE']);
  /* Modelos com números: 'Retorno à Terra ({n} dias)' -> 'Return to Earth ({n} days)' */
  const TPL = { en: [], es: [] };
  function addTemplates(l, rows) {
    rows.forEach(([pt, tr]) => {
      const names = [];
      const src = '^' + pt.split(/(\{\w+\})/).map(part => {
        const m = /^\{(\w+)\}$/.exec(part);
        if (!m) return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        names.push(m[1]); return '([\\s\\S]*?)';
      }).join('') + '$';
      TPL[l].push({ re: new RegExp(src), names, tr });
    });
  }
  const valueSet = {};  // frases já traduzidas: não contam como faltando
  function trCore(core) {
    if (lang === 'pt' || !core || !/[A-Za-zÀ-ú]/.test(core)) return null;
    const d = D[lang];
    if (d[core] != null) return d[core];
    for (const tp of TPL[lang]) {
      const m = tp.re.exec(core);
      if (m) { const v = {}; tp.names.forEach((n, i) => { const g = m[i + 1]; v[n] = d[g] != null ? d[g] : g; }); return tp.tr.replace(/\{(\w+)\}/g, (_, k) => v[k] != null ? v[k] : ''); }
    }
    for (const [re, fn] of RULES) { const m = re.exec(core); if (m) { const r = fn(m, t); if (r != null) return r; } }
    if (!valueSet[lang]) valueSet[lang] = new Set(Object.values(d));
    if (!valueSet[lang].has(core) && !/^[A-Z]{2,4}-\d+$/.test(core)) missingDom.add(core);
    return null;
  }
  function trString(s) {
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s), r = trCore(m[2]);
    return r == null ? s : m[1] + r + m[3];
  }
  function translateDOM(root) {
    if (lang === 'pt' || !root) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => (n.parentElement && (SKIP.has(n.parentElement.tagName) || n.parentElement.closest('[data-i18n-skip]'))) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
    const nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
    nodes.forEach(n => { const v = trString(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; });
    const els = root.nodeType === 1 ? [root, ...root.querySelectorAll('[placeholder],[title],[aria-label]')] : [];
    els.forEach(el => ['placeholder', 'title', 'aria-label'].forEach(a => { if (el.hasAttribute && el.hasAttribute(a)) { const v = trString(el.getAttribute(a)); if (v !== el.getAttribute(a)) el.setAttribute(a, v); } }));
  }
  let observer = null;
  function watch(root) {
    if (observer) { observer.disconnect(); observer = null; }
    if (lang === 'pt' || !root) return;
    translateDOM(root);
    observer = new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) translateDOM(n); else if (n.nodeType === 3 && n.parentElement) translateDOM(n.parentElement); })));
    observer.observe(root, { childList: true, subtree: true });
  }

  function set(l) {
    if (!LANGS[l]) return;
    lang = l;
    try { localStorage.setItem(LS, l); } catch (e) {}
    document.documentElement.lang = LANGS[l].html;
    applyEngine();
  }

  window.I18N = {
    t, set, reason, applyEngine, LANGS, D, missing, TRANSLATED, translateDOM, watch, missingDom, RULES,
    addRule: (re, fn) => RULES.push([re, fn]),
    addTemplates,
    get lang() { return lang; },
    locale: () => LANGS[lang].locale,
    months: () => LANGS[lang].months,
    add: (l, obj) => { Object.assign(D[l], obj); delete valueSet[l]; },
  };
  document.documentElement.lang = LANGS[lang].html;
})();
