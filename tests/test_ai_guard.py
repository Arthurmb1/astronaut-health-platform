"""Testes da guarda e da integração da camada de IA (web/ai.py). Não chamam a OpenAI real:
um servidor falso local imita a Responses API.

    python -m unittest discover -s tests -v
"""
import http.server
import json
import os
import sys
import tempfile
import threading
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "web"))
import ai  # noqa: E402

PACKET = {
    "tripulante": "Alex Morgan", "data": "29 out 2026, 08:00", "condicao_geral": "Crítico",
    "dados": "sintéticos de demonstração", "cenario": "Síndrome gripal (simulado)",
    "sinalizados": [
        {"indicador": "Temperatura corporal", "valor": "38,47 °C", "estado": "Crítico", "padrao_pessoal": "36,6 °C",
         "desvio": "+9,3 desvios", "faixa_referencia": "36,0 a 37,5 °C", "motivos": ["fora da faixa de referência"]},
        {"indicador": "CO₂ da cabine", "valor": "1.096 ppm", "estado": "Atenção", "padrao_pessoal": "940 ppm",
         "desvio": "+2,4 desvios", "faixa_referencia": "0 a 1.500 ppm", "motivos": ["desvio do seu padrão"]},
    ],
    "padroes": [{"titulo": "Possível resposta infecciosa", "texto": "FC e temperatura acima do padrão com marcador inflamatório elevado."}],
    "acoes_candidatas": ["Isole-se do convívio próximo e acione o médico de voo.", "Hidrate-se e repita a medida em 2 horas."],
}


class Guard(unittest.TestCase):
    def test_aceita_numeros_copiados(self):
        ok, motivo, out = ai.guard({"resumo": "Sua temperatura está em 38,47 °C, acima da faixa de 36,0 a 37,5 °C. O CO₂ da cabine está em 1.096 ppm.", "acoes": []}, PACKET)
        self.assertTrue(ok, motivo)

    def test_rejeita_numero_inventado(self):
        ok, motivo, _ = ai.guard({"resumo": "Sua temperatura chegou a 38,9 °C.", "acoes": []}, PACKET)
        self.assertFalse(ok)
        self.assertIn("38.9", motivo)

    def test_rejeita_milhar_inventado(self):
        ok, _, _ = ai.guard({"resumo": "O CO₂ subiu para 1.200 ppm.", "acoes": []}, PACKET)
        self.assertFalse(ok)

    def test_ignora_digitos_de_codigos(self):
        ok, motivo, _ = ai.guard({"resumo": "A SpO2 e o CO2 não aparecem como problema; a temperatura sim, 38,47 °C.", "acoes": []}, PACKET)
        self.assertTrue(ok, motivo)

    def test_rejeita_nome_de_doenca(self):
        ok, motivo, _ = ai.guard({"resumo": "Você provavelmente está com gripe.", "acoes": []}, PACKET)
        self.assertFalse(ok)
        self.assertIn("gripe", motivo)

    def test_permite_termo_que_ja_esta_no_pacote(self):
        ok, motivo, _ = ai.guard({"resumo": "O motor indica uma possível resposta infecciosa.", "acoes": []}, PACKET)
        self.assertTrue(ok, motivo)

    def test_aceita_recusa_de_diagnostico(self):
        for txt in ("Não posso oferecer diagnóstico ou tratamento; fale com o médico de voo.",
                    "Isso não é um diagnóstico.", "This is not a diagnosis.", "No puedo dar un diagnóstico.",
                    "Sugere resposta inflamatória, sem classificá-la como diagnóstico aqui."):
            ok, motivo, _ = ai.guard({"resumo": txt, "acoes": []}, PACKET)
            self.assertTrue(ok, (txt, motivo))

    def test_recusa_com_doenca_continua_bloqueada(self):
        ok, _, _ = ai.guard({"resumo": "Não é um diagnóstico, mas parece febre.", "acoes": []}, PACKET)
        self.assertFalse(ok)

    def test_rejeita_idioma_errado(self):
        pkt = {**PACKET, "idioma": "English"}
        ok, motivo, _ = ai.guard({"resumo": "Os indicadores sinalizados mostram que a temperatura não está normal e você deve avisar.", "acoes": []}, pkt)
        self.assertFalse(ok)
        self.assertIn("idioma", motivo)
        ok, _, _ = ai.guard({"resumo": "Your temperature is 38,47 °C and it is above the range.", "acoes": []}, pkt)
        self.assertTrue(ok)
        ok, _, _ = ai.guard({"resumo": "Su temperatura está en 38,47 °C, por encima del rango; debe avisar al médico.", "acoes": []}, {**PACKET, "idioma": "Español"})
        self.assertTrue(ok)

    def test_rejeita_diagnostico(self):
        ok, _, _ = ai.guard({"resumo": "O diagnóstico é claro.", "acoes": []}, PACKET)
        self.assertFalse(ok)

    def test_filtra_acoes_fora_da_lista(self):
        ok, _, out = ai.guard({"resumo": "Temperatura em 38,47 °C.", "acoes": ["Tome um antitérmico.", "hidrate-se e repita a medida em 2 horas."]}, PACKET)
        self.assertTrue(ok)
        self.assertEqual(out["acoes"], ["Hidrate-se e repita a medida em 2 horas."])

    def test_remove_travessao(self):
        ok, _, out = ai.guard({"resumo": "Temperatura alta — 38,47 °C.", "acoes": []}, PACKET)
        self.assertTrue(ok)
        self.assertNotIn("—", out["resumo"])

    def test_rejeita_vazio_e_longo(self):
        self.assertFalse(ai.guard({"resumo": " ", "acoes": []}, PACKET)[0])
        self.assertFalse(ai.guard({"resumo": "a" * (ai.MAX_CHARS + 1), "acoes": []}, PACKET)[0])


class FakeOpenAI(http.server.BaseHTTPRequestHandler):
    reply = {}
    calls = 0

    def do_POST(self):
        FakeOpenAI.calls += 1
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        assert body["text"]["format"]["type"] == "json_schema"
        assert self.headers["Authorization"] == "Bearer teste"
        payload = {"status": "completed", "output": [{"type": "message", "content": [{"type": "output_text", "text": json.dumps(FakeOpenAI.reply, ensure_ascii=False)}]}],
                   "usage": {"input_tokens": 900, "output_tokens": 120, "input_tokens_details": {"cached_tokens": 0}}}
        data = json.dumps(payload).encode()
        self.send_response(200); self.send_header("Content-Type", "application/json"); self.send_header("Content-Length", str(len(data))); self.end_headers()
        self.wfile.write(data)

    def log_message(self, *a):
        pass


class Integracao(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), FakeOpenAI)
        threading.Thread(target=cls.srv.serve_forever, daemon=True).start()
        cls.tmp = tempfile.TemporaryDirectory()
        ai.CACHE_DIR = Path(cls.tmp.name)
        cls.root0 = ai.ROOT; ai.ROOT = Path(cls.tmp.name)  # isola do .env real do projeto
        os.environ.update({"OPENAI_API_KEY": "teste", "OPENAI_BASE_URL": f"http://127.0.0.1:{cls.srv.server_port}", "OPENAI_MODEL": "gpt-6-luna"})

    @classmethod
    def tearDownClass(cls):
        cls.srv.shutdown(); ai.ROOT = cls.root0; cls.tmp.cleanup()
        for k in ("OPENAI_API_KEY", "OPENAI_BASE_URL", "OPENAI_MODEL"):
            os.environ.pop(k, None)

    def test_fluxo_completo_cache_e_custo(self):
        FakeOpenAI.reply = {"resumo": "Sua temperatura está em 38,47 °C, acima da faixa de 36,0 a 37,5 °C.", "acoes": ["Isole-se do convívio próximo e acione o médico de voo."]}
        FakeOpenAI.calls = 0
        r1 = ai.explain(PACKET)
        self.assertTrue(r1["ok"], r1)
        self.assertEqual(r1["fonte"], "ia")
        self.assertAlmostEqual(r1["usd"], (900 * 0.10 + 120 * 0.50) / 1e6, places=9)
        r2 = ai.explain(PACKET)
        self.assertEqual(r2["fonte"], "cache")
        self.assertEqual(FakeOpenAI.calls, 1)
        self.assertEqual(ai.usage_today()["calls"], 1)

    def test_resposta_reprovada_nao_vai_para_cache(self):
        pkt = {**PACKET, "tripulante": "Outra pessoa"}
        FakeOpenAI.reply = {"resumo": "Sua temperatura chegou a 39,2 °C.", "acoes": []}
        r = ai.explain(pkt)
        self.assertFalse(r["ok"])
        self.assertIn("39.2", r["motivo"])
        self.assertEqual(ai.explain(pkt)["fonte"], "ia")  # tentou de novo, não usou cache

    def test_sem_chave(self):
        old = os.environ.pop("OPENAI_API_KEY")
        try:
            orig = ai.ROOT; ai.ROOT = Path(self.tmp.name)  # sem .env
            r = ai.explain(PACKET)
            self.assertEqual(r["fonte"], "sem_chave")
        finally:
            ai.ROOT = orig; os.environ["OPENAI_API_KEY"] = old

    def test_pergunta_aprovada_usa_numero_da_pergunta(self):
        FakeOpenAI.reply = {"resposta": "Sim, 38,47 °C está acima de 37,5 °C, o limite da faixa. Você citou 5 dias; o motor olha o último registro."}
        r = ai.ask("Minha temperatura está alta há 5 dias?", PACKET)
        self.assertTrue(r["ok"], r)
        self.assertIn("resposta", r)
        self.assertEqual(ai.ask("Minha temperatura está alta há 5 dias?", PACKET)["fonte"], "cache")

    def test_pergunta_com_doenca_continua_bloqueada(self):
        FakeOpenAI.reply = {"resposta": "Pode ser gripe, mas só um especialista pode dizer."}
        r = ai.ask("Isso é gripe?", PACKET)
        self.assertFalse(r["ok"])
        self.assertIn("gripe", r["motivo"])

    def test_pergunta_com_numero_inventado(self):
        FakeOpenAI.reply = {"resposta": "Sua temperatura chegou a 39,1 °C."}
        self.assertFalse(ai.ask("Qual foi o pico da temperatura?", PACKET)["ok"])

    def test_pergunta_vazia_ou_longa(self):
        self.assertFalse(ai.ask("   ", PACKET)["ok"])
        self.assertFalse(ai.ask("x" * 400, PACKET)["ok"])

    def test_sem_teto_diario_e_teto_total(self):
        os.environ.update({"LLM_CALLS_PER_DAY": "off", "LLM_USD_PER_DAY": "0"})
        try:
            FakeOpenAI.reply = {"resumo": "Temperatura em 38,47 °C.", "acoes": []}
            self.assertEqual(ai.explain({**PACKET, "tripulante": "Sem teto"})["fonte"], "ia")
            os.environ["LLM_USD_TOTAL"] = "0.000001"  # já gastou mais que isso nos testes anteriores
            self.assertEqual(ai.explain({**PACKET, "tripulante": "Teto total"})["fonte"], "orcamento")
        finally:
            for k in ("LLM_CALLS_PER_DAY", "LLM_USD_PER_DAY", "LLM_USD_TOTAL"):
                os.environ.pop(k, None)

    def test_teto_de_orcamento(self):
        os.environ["LLM_CALLS_PER_DAY"] = "1"  # já houve chamadas antes: 1 basta para bloquear
        try:
            r = ai.explain({**PACKET, "tripulante": "Terceira pessoa"})
            self.assertEqual(r["fonte"], "orcamento")
        finally:
            os.environ.pop("LLM_CALLS_PER_DAY")


if __name__ == "__main__":
    unittest.main()
