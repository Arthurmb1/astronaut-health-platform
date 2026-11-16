# Mapa de módulos da interface Aurora (by Athenance)

Cada caixa da interface tem um ID estável no formato `TELA-NN`. Para pedir uma mudança, cite o ID:
"troque o gráfico do TRI-10 por barras", "mova o TRI-08 para o lado do TRI-05", "remova o TRI-12".

Como ver os IDs: abra o app com `?ref` no endereço (ex.: `http://127.0.0.1:8765/?ref#tripulante`) e use o botão
**Modo referência** no menu lateral (atalho `Alt+R`). Sem `?ref` o botão e o atalho não existem: é ferramenta de
desenvolvimento e não aparece na versão final. Clicar na etiqueta copia a
referência, por exemplo `TRI-05 (Sinais vitais, tela tripulante)`, pronta para colar no chat.

## Regras

- O número de um módulo não muda quando ele troca de lugar ou de tamanho. Módulo removido não tem o número reaproveitado.
- Exceção registrada: TRI-05 era a lista de sinais vitais e virou o título da seção de sinais vitais (mesmo assunto).
- Conteúdo de uma caixa: função `render` do módulo (ex.: `M.define({ id: 'TRI-05', ... })` em `src/view-crew.js`).
- Posição e ordem: lista `LAYOUT` no topo do arquivo da tela.
- Tamanho: campo `size` do módulo, em colunas de uma grade de 12: `s`=3, `m`=4, `l`=6, `xl`=8, `full`=12.
  Em telas menores a grade se ajusta sozinha (tudo vira largura cheia no celular).
- IDs marcados como *provisório* vêm de telas ainda não migradas: são numerados pela ordem dos cartões e
  podem mudar quando a tela for migrada.

## Prefixos

| Prefixo | Tela | Arquivo | Situação |
|---|---|---|---|
| APP | Estrutura geral (menu e cabeçalho) | `src/app.js` | Fixo |
| REG | Registrar medições | `src/view-form.js` | Provisório |
| TRI | Tripulante | `src/view-crew.js` | Migrado |
| RAD | Radiação | `src/view-radiacao.js` (modelo em `src/radiation.js`) | Modular desde o início |
| ANA | Análise exploratória | `src/view-explore.js` | Provisório |
| HIS | Registros e exportação | `src/view-records.js` | Provisório |
| MET | Método e limites | `src/view-records.js` | Provisório |

## Estrutura geral

| ID | Caixa |
|---|---|
| APP-01 | Menu lateral (navegação, aviso de dados sintéticos, modo referência, tema) |
| APP-02 | Cabeçalho da tela (título, missão, fase, último registro) |
| APP-04 | Seletor de idioma PT / EN / ES (canto superior direito) |
| APP-03 | Aviso de cenário ativo (aparece em todas as telas enquanto um cenário está ligado; botão para voltar à base) |

## Tripulante (migrado)

Desktop, de cima para baixo:

```
| TRI-01 seleção de tripulante (largura cheia)                          |
| TRI-21 cenários de demonstração (largura cheia)                       |
| TRI-02 perfil        | TRI-03 condição geral   | TRI-04 contexto       |
| TRI-05 seção "Sinais vitais" (título, explicação, status do grupo)     |
| TRI-13 frequência    | TRI-19 mapa do corpo    | TRI-14 pressão        |
| TRI-15 saturação O₂  |   (ocupa 2 linhas)      | TRI-16 temperatura    |
| TRI-17 massa corporal              | TRI-18 glicemia                  |
| TRI-22 explicação em linguagem simples (largura cheia)                |
| TRI-20 sono (fases, eficiência, 14 noites)       | TRI-06 mental e sono |
| TRI-07 laboratorial  | TRI-08 radiação         | TRI-09 ambiente       |
| TRI-10 histórico do indicador (largura cheia)                          |
| TRI-11 alertas recentes            | TRI-12 padrões combinados        |
```
| ID | Caixa | Tamanho | Arquivo | O que mostra |
|---|---|---|---|---|
| TRI-01 | Seleção de tripulante | full, sem moldura | view-crew.js | Botões por tripulante com ponto de status |
| TRI-02 | Tripulante | m | view-crew.js | Nome, função, idade, sexo |
| TRI-03 | Condição geral | m | view-crew.js | Estável / Atenção / Crítico e nº de indicadores sinalizados |
| TRI-04 | Contexto da missão | m | view-crew.js | Último registro, dia da missão, fase |
| TRI-05 | Sinais vitais (seção) | full, sem moldura | tri-vitais.js | Título do grupo, como ler as cores, status do grupo |
| TRI-06 | Saúde mental e sono | m | view-crew.js | Sono, eficiência, humor, estresse |
| TRI-07 | Laboratorial | m | view-crew.js | WBC, hs-CRP, cortisol, vitamina D |
| TRI-08 | Radiação | m | view-crew.js | Taxa de dose, dose acumulada, dosímetro |
| TRI-09 | Ambiente da cabine | m | view-crew.js | CO₂, umidade |
| TRI-10 | Histórico do indicador | full | view-crew.js | Lista de métricas, gráfico da missão com padrão pessoal, estatísticas, explicação |
| TRI-11 | Alertas recentes | l | view-crew.js | Indicadores sinalizados no último registro |
| TRI-12 | Padrões combinados | l | view-crew.js | Combinações de indicadores que sugerem risco |
| TRI-13 | Frequência cardíaca | m | tri-vitais.js | Velocímetro 20 a 120 bpm, faixa de exercício tracejada, marca de 60 bpm (AHA) |
| TRI-14 | Pressão arterial | m | tri-vitais.js | Dois velocímetros (sistólica, diastólica) com cortes da AHA 2017 |
| TRI-15 | Saturação de O₂ | m | tri-vitais.js | Barra 85 a 100% com zonas Baixa / Atenção / Ideal e minigráfico de 14 dias |
| TRI-16 | Temperatura corporal | m | tri-vitais.js | Barra 35 a 39 °C e minigráfico |
| TRI-17 | Massa corporal | l | tri-vitais.js | Variação % sobre o padrão pessoal e minigráfico |
| TRI-18 | Glicemia capilar | l | tri-vitais.js | Barra 50 a 140 mg/dL e minigráfico |
| TRI-19 | Mapa do corpo | m, 2 linhas | tri-corpo.js | Figura em contorno com 6 sistemas (neurocognitivo, respiratório, metabólico, cardiovascular, imunológico, ósseo-muscular) coloridos pelo pior status; clique abre a métrica no TRI-10 e destaca a caixa |
| TRI-20 | Sono | xl | tri-sono.js | Rosca das fases da última noite (leve, profundo, REM), velocímetro de eficiência, barras das últimas 14 noites. Fases **sintéticas** de `data/sleep_stages.csv` |
| TRI-21 | Cenários de demonstração | full | tri-cenarios.js | 4 botões (Nominal, Dívida de sono, Evento de radiação, Síndrome gripal) e a lista "o que observar". Lógica em `src/scenarios.js` |
| TRI-22 | Explicação em linguagem simples | full | tri-explica.js | Texto por regras na hora; botão "Explicar com SI" chama o servidor local, que passa a resposta pela guarda (`web/ai.py`). Mostra o pacote enviado |

Elementos comuns às caixas de sinais vitais: ícone de gráfico no canto (abre a métrica no TRI-10),
triângulo ciano = seu padrão pessoal, cores das zonas = faixas do motor (`engine.js`, campos `ok` e `warn`).
Os widgets ficam em `src/widgets.js` (`UI.gauge`, `UI.hbar`, `UI.spark`).

Outros arquivos visuais: logo em `src/brand.js` (SVG, também vira o favicon).

Dados de sono: `data/sleep_stages.csv` é gerado por `scripts/gen_sleep_stages.py` (sintético, semente fixa) e entra
no front por `web/prep_data.py`. As fases são só exibição: não entram no diagnóstico nem no status.

## Radiação

```
| RAD-01 seleção de tripulante (com dose projetada de cada um)           |
| RAD-02 orçamento de dose da carreira          | RAD-03 dose projetada  |
| RAD-10 trajetória da dose: recebida até hoje e projeção vs. limite     |
| RAD-04 planejar saída da base (controles | recomendação e números)     |
| RAD-05 atividade solar e eventos SEP (dados reais) + próximos 12 meses |
| RAD-06 efeitos no corpo             | RAD-07 como a radiação é medida  |
| RAD-08 escala de doses (logarítmica)                                   |
| RAD-09 fontes e suposições                                             |
```

| ID | Caixa | Tamanho | O que mostra |
|---|---|---|---|
| RAD-01 | Seleção de tripulante | full, sem moldura | Botões com a dose de carreira projetada de cada tripulante |
| RAD-02 | Orçamento de dose da carreira | xl | Barra empilhada até o limite de 600 mSv (anteriores, missão até hoje, superfície, retorno, saídas) e campos editáveis |
| RAD-03 | Dose de carreira projetada | m | Velocímetro 0 a 800 mSv, verde até 480 (80%), vermelho acima de 600 |
| RAD-04 | Planejar saída da base | full | Duração, nº de saídas, proteção, atividade solar (sugerida pelos dados), retorno ao abrigo; recomendação Pode seguir / Cautela / Não seguir com motivos |
| RAD-05 | Atividade solar e eventos de partículas | full | Manchas solares NOAA (observado, suavizado, previsão), eventos SEP NASA DONKI, período da missão, chance mensal de evento nos próximos 12 meses |
| RAD-06 | Efeitos da radiação no corpo | l | Figura com 6 órgãos sensíveis numerados, curto e longo prazo |
| RAD-07 | Como a radiação é medida | l | Gy, Sv, dose efetiva; raios cósmicos galácticos e eventos solares |
| RAD-08 | Escala de doses | full | Comparação logarítmica com a saída planejada e a carreira projetada do tripulante |
| RAD-09 | Fontes e suposições | full | Cada número com a fonte e o rótulo Real / Suposição / Sintético |
| RAD-10 | Trajetória da dose de carreira | full | Fica acima do RAD-04. Aviso em uma frase (dentro / perto / vai exceder / já excedido), 3 números (recebida até hoje, ainda a receber, ao fim da missão) e gráfico por dia de missão: linha cheia = dose efetiva já recebida, tracejada = projeção do plano, vermelho = trecho acima de 600 mSv, com o dia em que o limite é cruzado |

Dados reais de clima espacial: `data/space_weather.json`, gerado por `scripts/fetch_space_weather.py`
(NOAA SWPC + NASA DONKI via api.nasa.gov). O download do DONKI é incremental; com a chave de demonstração
ele baixa ~8 janelas de 60 dias por hora. Para completar desde dez/2019, use uma chave grátis em
`NASA_API_KEY` ou rode o script de novo mais tarde, e depois `python web/prep_data.py`.

## Telas provisórias (IDs pela ordem dos cartões)

| ID | Caixa |
|---|---|
| REG-01 | Formulário de registro (5 abas) |
| REG-02 | Diagnóstico ao vivo |
| ANA-01 a ANA-12 | Cartões da análise exploratória, na ordem em que aparecem |
| HIS-01 a HIS-03 | Cartões de registros e exportação |
| MET-01 a MET-03 | Seções de método e limites |

## Cenários de demonstração (TRI-21 e APP-03)

- Aplicam-se ao tripulante selecionado e reescrevem só em memória os últimos dias dele. Não vão para o
  localStorage nem para os CSVs; recarregar a página ou "Voltar aos dados da base" restaura tudo.
- Os eventos partem de 14 dias de rotina nominal, para o sinal do cenário aparecer sem as tendências da base.
- Exportação CSV fica bloqueada enquanto um cenário estiver ativo.
- Para mudar a intensidade ou duração de um cenário: objeto `SCENARIOS` em `src/scenarios.js`.

## Camada de SI (TRI-22)

- O navegador nunca vê a chave: monta o pacote de fatos e chama `POST /api/explicar` no servidor local
  (`web/serve.py`), que chama a OpenAI (Responses API, saída estruturada) e aplica a guarda de `web/ai.py`.
- Guarda: número citado tem de existir no pacote; sem nome de doença, remédio ou "diagnóstico" que não esteja
  no pacote; ações só da lista do motor; até 900 caracteres (o prompt pede no máximo 600); travessão vira vírgula. Reprovou: texto por regras.
- Cache em `web/.cache/llm_cache.json` (mesmo pacote não paga duas vezes) e registro de gasto em
  `web/.cache/llm_ledger.jsonl`, com teto diário (`LLM_USD_PER_DAY`, `LLM_CALLS_PER_DAY`).
- Configuração em `.env` na pasta do projeto (modelo em `.env.example`). Testes: `python -m unittest discover -s tests -v`.

## Nomenclatura

- Na interface, a camada de inteligência é sempre chamada de **SI**, nunca de IA. O código interno do servidor
  (`web/ai.py`) mantém o nome do arquivo.
- O subtítulo do TRI-22 é o aviso: a SI pode cometer erros; alertas de parâmetro fora do normal devem ser avaliados
  com cuidado e, se possível, por um especialista.

## Idiomas (APP-04)

- Botões PT / EN / ES no canto superior direito. A escolha fica salva no navegador.
- Chave de tradução = a frase em português (`I18N.t('Sinais vitais')`). Dicionários gerados por
  `python web/i18n_build.py` a partir da tabela em `web/i18n_build.py` (confere placeholders e travessão).
- Traduzidas: menu, cabeçalho, avisos e toda a tela Tripulante (incluindo textos das métricas e padrões do motor).
  Ainda em português, com aviso na tela: Registrar, Radiação, Análise, Registros, Método.
- A SI responde no idioma escolhido (campo `idioma` do pacote) e a guarda bloqueia termos proibidos nos três idiomas.
- Para achar frases sem tradução: abrir o app em EN ou ES e rodar no console `[...I18N.missing]`.

## Logo

- `src/brand.js`: "A" ciano com sombra interna, arco interno, órbita que passa pela frente e estrela. Vira o favicon.

## TRI-22: perguntas e testes reais (15/11/2026)

- Botão "Explicar com SI" fica no fim do texto por regras; a resposta da SI aparece abaixo, sem apagar o texto.
- "Pergunte à SI": 6 sugestões com resposta pronta (sem API). Texto alterado vai para `POST /api/perguntar`.
- Guarda (web/ai.py), aplicada a explicação e perguntas:
  números só do pacote ou da pergunta; sem nome de doença, remédio ou diagnóstico (negações como
  "não posso dar diagnóstico" são aceitas); ações só da lista do motor; idioma da resposta igual ao escolhido;
  até 900 caracteres (o prompt pede no máximo 600).
- Teste real com a OpenAI: chamada aprovada pela guarda, ~3 s, US$ 0,0001 a 0,0003 por chamada.
  gpt-6-luna foi mais fiel aos dados que gpt-5-nano no mesmo caso; o nano chegou a responder no idioma errado.
- Testes: `python -m unittest discover -s tests -v` (21 testes, sem chamar a API real).
- Telas Registrar, Radiação, Análise, Registros e Método são traduzidas no nível da página
  (`I18N.watch` + dicionário e modelos com números em `web/i18n_pages.py`).
