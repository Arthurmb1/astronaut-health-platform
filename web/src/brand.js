/* =========================================================
   Athenance: marca (logo em SVG vetorial, versão ciano)
   "A" sem travessão com sombra interna, arco interno, órbita que
   passa por trás no alto e corta o "A" pela frente embaixo, e
   estrela de quatro pontas no canto superior direito.
   ========================================================= */
(function () {
  const C = '#2cc9dc', D = '#0e8ea0';  // ciano da marca e sombra

  /* sfx: sufixo para IDs únicos quando o logo aparece mais de uma vez */
  function logo(sfx = 'x') {
    const id = n => `ath-${n}-${sfx}`;
    const orbit = (sweep, w, stroke) => `<g transform="rotate(-20 52 56)"><path d="M8 56A44 11 0 0 ${sweep} 96 56" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round"/></g>`;
    return `<svg class="ath-logo" viewBox="0 0 100 84" aria-hidden="true">
<defs>
  <mask id="${id('m')}" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="84">
    <rect width="100" height="84" fill="#fff"/>${orbit(0, 7, '#000')}
  </mask>
  <linearGradient id="${id('s')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${D}"/><stop offset="1" stop-color="${D}" stop-opacity=".25"/></linearGradient>
</defs>
${orbit(1, 2.4, C)}
<g mask="url(#${id('m')})">
  <path d="M50 6 L89 76 L78 76 L50 27 L22 76 L11 76 Z" fill="${C}"/>
  <path d="M50 27 L52.8 32 L26 74 L22 76 Z" fill="url(#${id('s')})"/>
  <path d="M27 68 Q45 51 66 57.5" fill="none" stroke="${C}" stroke-width="2.6" stroke-linecap="round"/>
</g>
${orbit(0, 3.4, C)}
<path d="M84 6 Q85.1 18.9 97 20 Q85.1 21.1 84 34 Q82.9 21.1 71 20 Q82.9 18.9 84 6 Z" fill="${C}"/>
</svg>`;
  }

  /* Favicon com o mesmo desenho */
  function favicon() {
    try {
      const svg = logo('fav').replace('<svg class="ath-logo"', '<svg xmlns="http://www.w3.org/2000/svg"');
      let l = document.querySelector('link[rel=icon]');
      if (!l) { l = document.createElement('link'); l.rel = 'icon'; document.head.appendChild(l); }
      l.type = 'image/svg+xml'; l.href = 'data:image/svg+xml,' + encodeURIComponent(svg);
    } catch (e) { /* sem favicon, sem problema */ }
  }

  window.BRAND = { logo, favicon };
})();
