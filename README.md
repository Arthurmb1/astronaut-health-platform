# AURORA · by Athenance

**Astronaut Unified Remote Observation & Risk Assessment**

**Monitoramento inteligente da saúde de astronautas e suporte à tomada de decisão em missões espaciais de longa duração.**

Protótipo desenvolvido para o **NASA Space Apps Challenge 2026**, com foco nos desafios de monitoramento da saúde humana e gerenciamento de riscos em missões tripuladas a Marte.

---

## Visão geral

O **Aurora** é uma plataforma web que integra monitoramento de saúde, análise de indicadores fisiológicos e ambientais, inteligência artificial generativa e avaliação de riscos de radiação em um único ambiente.

Projetado para apoiar astronautas e equipes de suporte em missões de longa duração, o sistema busca transformar dados complexos em informações compreensíveis e úteis para a tomada de decisão, especialmente em cenários de comunicação limitada com a Terra e acesso restrito a profissionais de saúde.

A plataforma combina regras determinísticas, padrões individuais de referência, dados científicos e recursos de IA para identificar alterações, contextualizar alertas e apoiar o planejamento de operações na superfície de Marte.

**Principais capacidades:**
- Monitoramento integrado da saúde física, mental e comportamental da tripulação.
- Identificação de desvios em relação aos padrões individuais de cada astronauta.
- Detecção de padrões combinados entre indicadores fisiológicos e ambientais.
- Explicações de alertas em linguagem natural, com auxílio opcional de IA generativa.
- Monitoramento da exposição à radiação e projeção de doses ao longo da missão.
- Planejamento de saídas da base marciana com recomendações de risco.
- Interface multilíngue: português, inglês e espanhol.

---

## 1. O problema

Em uma missão tripulada a Marte, os astronautas podem passar meses distantes da Terra, enfrentando atrasos significativos na comunicação e acesso limitado a assistência médica especializada.

Nesse contexto, monitorar indicadores isolados não é suficiente. É necessário compreender como diferentes fatores fisiológicos, comportamentais e ambientais se relacionam e como suas alterações podem afetar a saúde da tripulação e a segurança da missão.

A exposição à radiação representa um dos principais desafios para a exploração humana do espaço profundo. Medições realizadas pelo instrumento Radiation Assessment Detector (RAD), a bordo da missão Mars Science Laboratory, demonstraram níveis significativos de exposição durante o trânsito interplanetário e na superfície marciana.

Diante desse cenário, o Aurora busca responder a três questões fundamentais:

1. **O que mudou?** Identificar alterações nos indicadores de saúde de cada astronauta.
2. **Por que isso importa?** Contextualizar alertas e possíveis relações entre diferentes indicadores.
3. **Como isso afeta a missão?** Apoiar decisões relacionadas à saúde da tripulação e à exposição à radiação.

---

## 2. Funcionalidades

### 2.1. Monitoramento integrado da saúde da tripulação

Um painel centralizado apresenta informações individuais de cada tripulante, incluindo:

- Sinais vitais e indicadores fisiológicos.
- Padrões de sono e recuperação.
- Saúde mental e bem-estar psicológico.
- Exames clínicos e laboratoriais.
- Condições ambientais do habitat.

Os indicadores são avaliados considerando tanto faixas de referência quanto padrões fisiológicos individuais, calculados a partir da mediana dos primeiros 10 dias de missão.

Essa abordagem permite identificar alterações que poderiam passar despercebidas em uma análise baseada exclusivamente em valores de referência populacionais.

### 2.2. Detecção de anomalias e padrões combinados

O motor analítico do Aurora utiliza regras determinísticas para identificar desvios e avaliar relações entre diferentes indicadores de saúde e condições ambientais.

O sistema implementa oito regras de análise combinada, incluindo exemplos como:

- Sono insuficiente associado a níveis elevados de estresse.
- Aumento da concentração de CO₂ associado à piora do tempo de reação.
- Alterações simultâneas em diferentes indicadores fisiológicos.

As regras permitem identificar situações que merecem atenção considerando o contexto geral do tripulante, em vez de avaliar cada variável isoladamente.

### 2.3. Inteligência artificial e explicações em linguagem natural

O Aurora utiliza Inteligência Artificial Generativa como uma camada complementar de comunicação e interpretação dos resultados produzidos pelo motor analítico.

Um Large Language Model (LLM) pode ser acionado opcionalmente para transformar explicações técnicas e alertas baseados em regras em mensagens mais naturais, acessíveis e contextualizadas.

A IA auxilia o usuário a compreender:

- O que provocou determinado alerta.
- Quais indicadores contribuíram para a identificação do padrão.
- Por que a situação pode exigir atenção.
- Qual recomendação foi gerada pelo motor determinístico.

#### Validação e confiabilidade das respostas

Para reduzir o risco de informações incorretas, as respostas geradas pela IA passam por uma camada de validação que verifica:

- Valores numéricos não sustentados pelos dados de origem.
- Menções a doenças ou medicamentos fora do escopo permitido.
- Recomendações de ações que não estejam previstas na lista aprovada pelo motor de regras.

Caso uma resposta não passe pela validação, o sistema descarta o conteúdo gerado e utiliza a explicação original produzida pelas regras determinísticas.

**A IA comunica os resultados. As regras determinísticas produzem as análises e recomendações.**

### 2.4. Monitoramento e gerenciamento de riscos de radiação

O módulo de radiação integra dados científicos e observações de atividade solar para apoiar o gerenciamento da exposição durante a missão.

Entre suas funcionalidades estão:

- Acompanhamento do orçamento individual de dose de carreira.
- Histórico e projeção diária da exposição à radiação.
- Estimativa de quando os limites configurados poderão ser atingidos.
- Planejamento de atividades extraveiculares (EVAs).
- Monitoramento da atividade solar e de eventos de partículas energéticas.
- Estimativa da probabilidade mensal de ocorrência de eventos de partículas solares.

Para apoiar o planejamento de saídas da base marciana, o sistema apresenta três níveis de recomendação:

| Classificação | Recomendação |
|---|---|
| **GO** | Pode seguir |
| **CAUTION** | Seguir com cautela |
| **NO-GO** | Não seguir agora |

As recomendações consideram as estimativas de exposição, os limites configurados, as premissas de blindagem e as informações disponíveis sobre atividade solar.

### 2.5. Simulação de cenários

Para demonstrar o funcionamento do sistema, o Aurora disponibiliza cenários simulados que podem ser aplicados ao tripulante selecionado:

- Dívida de sono.
- Evento de radiação solar.
- Síndrome gripal.

As simulações modificam os indicadores em memória, permitindo observar como o sistema responde a diferentes condições e como os alertas são apresentados.

---

## 3. Dados científicos e fontes externas

O Aurora utiliza referências científicas, padrões técnicos e dados externos para fundamentar suas análises de exposição à radiação.

| Dado ou parâmetro | Fonte | Aplicação |
|---|---|---|
| Limite de carreira de 600 mSv, evento solar de projeto de 250 mSv, eficácia da blindagem e critérios de encerramento de EVA em até 2 horas | NASA-STD-3001 Vol. 1 Rev B e NASA OCHMO-TB-020 | Limites e regras das recomendações |
| 1,84 mSv/dia durante o trânsito interplanetário | Zeitlin et al., *Science*, 2013 (instrumento RAD) | Estimativa de dose durante o trânsito |
| 0,64 mSv/dia na superfície de Marte e aproximadamente 1,01 Sv na missão completa | Hassler et al., *Science*, 2014 | Exposição na superfície e contexto das doses |
| Eventos de partículas solares energéticas desde dezembro de 2019 | NASA DONKI (CCMC/GSFC), via api.nasa.gov | Histórico de eventos e modelo de probabilidade mensal |
| Manchas solares observadas e previsão do ciclo solar 25 | NOAA Space Weather Prediction Center | Monitoramento da atividade solar e projeções de 12 meses |
| Radiação natural de fundo na Terra: aproximadamente 2,4 mSv/ano | UNSCEAR 2008 | Comparação de exposição |

### Transparência dos dados

A seção **Fontes e suposições (RAD-09)** apresenta os parâmetros utilizados no sistema, acompanhados de seus respectivos links e classificação:

- **REAL:** dados provenientes de fontes científicas ou observações externas.
- **SUPOSIÇÃO:** parâmetros e estimativas adotados para os modelos do protótipo.
- **SINTÉTICO:** dados artificiais utilizados exclusivamente para demonstração.

---

## 4. Dados sintéticos e ambiente de demonstração

Os registros dos seis tripulantes, incluindo sinais vitais, sono, exames, dosímetros pessoais e condições ambientais, são fictícios e foram criados exclusivamente para demonstrar as funcionalidades da plataforma.

A missão **Ares Pathfinder** também é fictícia.

Esses registros não representam astronautas reais, prontuários médicos ou dados operacionais de missões da NASA.

As observações externas provenientes da NASA e da NOAA são diferenciadas dos dados sintéticos e das premissas utilizadas nos modelos.

---

## 5. Limitações e considerações de segurança

O Aurora é um protótipo experimental de apoio à tomada de decisão. Não constitui um sistema de diagnóstico clínico nem um dispositivo médico certificado.

As seguintes limitações devem ser consideradas:

- As faixas de referência dos indicadores de saúde são configurações do protótipo. Em uma aplicação operacional, precisariam ser definidas e validadas por profissionais especializados em medicina aeroespacial.
- As explicações geradas por IA estão sujeitas a validações, mas não possuem garantia de correção clínica.
- O modelo de probabilidade de eventos solares é uma estimativa simplificada, baseada na relação entre a taxa de eventos e o número de manchas solares.
- Os eventos solares identificados próximos à Terra não representam necessariamente as condições de exposição em Marte. A propagação dos eventos depende, entre outros fatores, da posição dos planetas e da trajetória das partículas.
- Os valores de exposição em missões anteriores de cada tripulante são premissas editáveis na plataforma.
- As recomendações de radiação são baseadas em parâmetros e limites configurados no protótipo, não substituindo procedimentos operacionais certificados de controle de missão.

---

## 6. Tecnologias e arquitetura

O Aurora integra uma interface web, processamento analítico, fontes externas de dados científicos e recursos de Inteligência Artificial Generativa.

Sua arquitetura separa o processamento determinístico da camada de IA, permitindo que as análises, classificações de risco e recomendações sejam produzidas pelo motor de regras, enquanto a IA atua na comunicação dos resultados.

Essa separação permite manter explicações básicas disponíveis mesmo quando o serviço de IA não está acessível.

---

## 7. Equipe

**Athenance** é uma equipe multidisciplinar que reúne conhecimentos de engenharia, ciência de dados e tecnologia para explorar soluções inovadoras para os desafios da exploração espacial humana.

Nosso objetivo é transformar dados complexos em informações compreensíveis e úteis, contribuindo para missões espaciais mais seguras e sustentáveis.

---

**AURORA — Transformando dados de saúde em inteligência para missões espaciais.**

*Desenvolvido para o NASA Space Apps Challenge 2026.*