# Aurora · by Athenance

Protótipo para o NASA Space Apps Challenge 2026: monitoramento de saúde de astronautas em missões longas.

**In short (EN):** Aurora (by Athenance) is a browser-based health monitoring prototype for long-duration crews. It compares each crew member with their own baseline, explains alerts in plain language, and turns real NASA radiation data (Curiosity RAD, NASA-STD-3001, DONKI) into a go / caution / no-go recommendation for leaving the base on Mars. Interface in Portuguese, English and Spanish.

## O problema

Em uma missão a Marte, a tripulação fica meses sem médico por perto e com atraso de comunicação com a Terra. Ela precisa saber sozinha se um indicador mudou, o que isso significa e o que fazer. A radiação é o risco que mais limita a missão: as estimativas publicadas com dados do instrumento RAD passam do limite de carreira atual da NASA.

## O que o Aurora faz

- **Tripulante:** sinais vitais, sono, saúde mental, exames e ambiente da cabine. Cada valor é comparado com a faixa de referência e com o padrão pessoal do tripulante (mediana dos primeiros 10 dias de missão).
- **Padrões combinados:** oito regras cruzam indicadores, por exemplo sono curto com estresse alto, ou CO₂ alto com piora do tempo de reação.
- **Explicação em linguagem simples:** texto por regras, sem depender de rede. Opcionalmente, uma camada de SI (modelo de linguagem) reescreve a explicação, e uma guarda descarta a resposta se ela citar um número que não está nos dados, nomear doença ou remédio, ou sugerir ação fora da lista do motor.
- **Radiação:** orçamento da dose de carreira, trajetória da dose por dia de missão (quando o limite será cruzado), planejamento de saídas da base com recomendação "Pode seguir / Seguir com cautela / Não seguir agora", atividade solar real e chance mensal de evento de partículas solares.
- **Cenários de demonstração:** dívida de sono, evento de radiação e síndrome gripal, aplicados em memória ao tripulante selecionado.

## Dados da NASA e de outras fontes

| Dado | Fonte | Uso |
|---|---|---|
| Limite de carreira de 600 mSv, evento solar de projeto de 250 mSv, eficácia da blindagem, encerrar a saída em até 2 h | NASA-STD-3001 Vol. 1 Rev B e NASA OCHMO-TB-020 | Limites e regras da recomendação |
| 1,84 mSv/dia em trânsito | Zeitlin et al., Science 2013 (instrumento RAD, Mars Science Laboratory) | Dose do trânsito |
| 0,64 mSv/dia na superfície de Marte; cerca de 1,01 Sv na missão completa | Hassler et al., Science 2014 | Dose na superfície e escala de doses |
| Eventos de partículas solares energéticas desde dez/2019 | NASA DONKI (CCMC/GSFC), via api.nasa.gov | Histórico e modelo de chance mensal |
| Manchas solares observadas e previsão do ciclo 25 | NOAA Space Weather Prediction Center | Atividade solar e previsão de 12 meses |
| Fundo natural na Terra, 2,4 mSv/ano | UNSCEAR 2008 | Comparação de doses |

A caixa "Fontes e suposições" (RAD-09) lista cada número com o link e um rótulo: **Real**, **Suposição** ou **Sintético**.

**Dados sintéticos:** os registros dos seis tripulantes (sinais vitais, sono, exames, dosímetro pessoal, ambiente) e a missão "Ares Pathfinder" são fictícios, criados para a demonstração. Não são dados de astronautas reais.

## Como rodar

Requer apenas Python 3 (testado com 3.12). A interface não tem dependências externas.

```bash
python web/serve.py
```

Abra http://127.0.0.1:8765.

Sem servidor: abra `web/dist/index.html` com duplo clique. Tudo funciona, exceto a camada de SI.

### Opcional

- **Camada de SI:** copie `.env.example` para `.env` e preencha `OPENAI_API_KEY`. Sem chave, a interface usa só o texto por regras.
- **Atualizar o clima espacial:** preencha `NASA_API_KEY` no `.env` (grátis em https://api.nasa.gov) e rode os dois comandos abaixo.

```bash
python scripts/fetch_space_weather.py
```

```bash
python web/prep_data.py
```

- **Regenerar traduções e o arquivo único:** `python web/i18n_build.py` e depois `python web/build.py`.
- **Testes:** `python -m unittest discover -s tests -v`.

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `web/src/` | Interface: motor de regras (`engine.js`), modelo de radiação (`radiation.js`), telas (`view-*.js`, `tri-*.js`) |
| `web/ai.py`, `web/serve.py` | Servidor local e guarda da camada de SI |
| `web/MODULOS.md` | Mapa das caixas da interface, com um ID estável para cada uma |
| `data/` | CSVs sintéticos e `space_weather.json` (dados reais da NOAA e do DONKI) |
| `scripts/` | Download do clima espacial e geração das fases de sono sintéticas |
| `tests/` | Testes da guarda da SI |
| `app.py`, `pages/`, `utils/` | Versão anterior em Streamlit, mantida como referência |

## Limites

- Apoio à decisão, não diagnóstico clínico nem dispositivo médico.
- As faixas de referência dos indicadores de saúde são padrões do protótipo. Em uso real devem vir do médico de voo e do NASA-STD-3001.
- O modelo de chance de evento solar é uma estimativa simples nossa: taxa de eventos proporcional ao número de manchas solares. Os eventos são detectados perto da Terra; a chegada a Marte depende da posição dos planetas.
- A dose de missões anteriores de cada tripulante é uma suposição editável na tela.
