# Publicar o Aurora (by Athenance) no Render

O app publicado é o mesmo do `python web/serve.py`: interface + rotas da SI. Sem dependências externas.

## 1. Repositório no GitHub (uma vez)

Na pasta `astronaut-health-platform v2`, no PowerShell:

```powershell
git init
git add .
git status            # confira: NÃO pode aparecer .env, venv/, web/.cache/ nem astronaut-health-platform/
git commit -m "Aurora: primeira versão publicável"
```

Crie um repositório **privado** no GitHub e siga as instruções dele para `git remote add origin ...` e `git push -u origin main`.

## 2. Serviço no Render

1. Entre em https://render.com com a conta do GitHub.
2. **New > Blueprint**, escolha o repositório. O Render lê o `render.yaml` e cria o serviço `aurora-athenance`.
3. Quando pedir `OPENAI_API_KEY`, cole a chave secreta (`sk-...`). Ela fica só no Render.
4. Aguarde o deploy. O endereço público fica como `https://aurora-athenance.onrender.com`.

## 3. Conferir

- `https://<seu-endereço>/api/status` deve mostrar `"chave": true` e o modelo.
- `https://<seu-endereço>/ai.py` deve dar erro 404 (código e gastos não ficam expostos).
- Abra o app, aplique um cenário e clique em **Explicar com SI**.

## Limites de gasto (painel do Render > Environment)

| Variável | Valor no render.yaml | Efeito |
|---|---|---|
| `LLM_USD_TOTAL` | 1.00 | Teto de gasto. No plano grátis a contagem recomeça a cada deploy; ajuste ao crédito restante. |
| `LLM_CALLS_PER_IP_HOUR` | 30 | Chamadas à SI por visitante por hora. Perguntas sugeridas e texto por regras não contam. |
| `LLM_USD_PER_DAY`, `LLM_CALLS_PER_DAY` | off | Sem teto diário. |
| `OPENAI_MODEL` | gpt-6-luna | Mais fiel aos dados que o gpt-5-nano nos testes. |

Ao atingir qualquer teto, a caixa volta ao texto por regras; o app não quebra.

## Observações do plano grátis

- O serviço "dorme" após ~15 min sem acesso; a primeira visita depois disso leva ~30 a 60 s. Abra o link alguns minutos antes do pitch.
- Os registros digitados ficam no navegador de cada visitante (localStorage), não no servidor.
- Atualizar o app: `git commit` + `git push`; o Render publica de novo sozinho.
