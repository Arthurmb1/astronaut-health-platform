"""Servidor do Aurora (by Athenance): arquivos da interface + rotas da camada de SI.

Local (padrão, só nesta máquina):
    python web/serve.py            -> http://127.0.0.1:8765
    python web/serve.py 9000       -> outra porta
Produção (Render, Railway etc.): o serviço define PORT; defina HOST=0.0.0.0.

Rotas:
    GET  /api/status     -> chave configurada?, modelo, uso do dia e total
    POST /api/explicar   -> recebe o pacote de fatos do motor, devolve explicação verificada (ver web/ai.py)
    POST /api/perguntar  -> {pergunta, pacote}: resposta curta verificada pela mesma guarda

Segurança:
    - A chave da OpenAI fica só aqui (variável de ambiente ou .env); nunca vai para o navegador.
    - Só são servidos index.html, src/ e dist/. Código Python, .cache (cache e gastos) e arquivos ocultos ficam fora.
    - Limite de chamadas à SI por visitante (IP) por hora: LLM_CALLS_PER_IP_HOUR (padrão 30; 0 ou off = sem limite).
"""
import functools
import http.server
import json
import os
import sys
import threading
import time
from collections import defaultdict, deque
from pathlib import Path

WEB = Path(__file__).resolve().parent
sys.path.insert(0, str(WEB))
import ai  # noqa: E402

MAX_BODY = 32_000
PUBLIC = ("/", "/index.html", "/favicon.ico")      # caminhos exatos permitidos
PUBLIC_DIRS = ("/src/", "/dist/")                    # pastas permitidas
_hits = defaultdict(deque)
_hits_lock = threading.Lock()


def ip_limit():
    v = (os.environ.get("LLM_CALLS_PER_IP_HOUR") or "30").strip().lower()
    return None if v in ("0", "off", "nao", "não", "none") else int(v)


def allow_call(ip: str) -> bool:
    """Janela deslizante de 1 hora por IP. Respostas do cache também contam (protege contra repetição em massa)."""
    lim = ip_limit()
    if lim is None:
        return True
    now = time.time()
    with _hits_lock:
        q = _hits[ip]
        while q and now - q[0] > 3600:
            q.popleft()
        if len(q) >= lim:
            return False
        q.append(now)
        return True


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Expires", "0")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

    def _json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _client_ip(self):
        # Atrás do proxy do Render/Railway, o IP real vem no X-Forwarded-For
        fwd = self.headers.get("X-Forwarded-For")
        return fwd.split(",")[0].strip() if fwd else self.client_address[0]

    def do_GET(self):
        path = self.path.split("?")[0].split("#")[0]
        if path == "/api/status":
            return self._json(200, ai.status())
        if path in PUBLIC or (path.startswith(PUBLIC_DIRS) and "/." not in path and ".." not in path):
            return super().do_GET()
        self.send_error(404)

    def do_HEAD(self):
        self.do_GET()

    def do_POST(self):
        route = self.path.split("?")[0]
        if route not in ("/api/explicar", "/api/perguntar"):
            return self._json(404, {"erro": "rota não encontrada"})
        n = int(self.headers.get("Content-Length") or 0)
        if n <= 0 or n > MAX_BODY:
            return self._json(413, {"erro": "pacote vazio ou grande demais"})
        try:
            packet = json.loads(self.rfile.read(n).decode("utf-8"))
            assert isinstance(packet, dict)
        except Exception:
            return self._json(400, {"erro": "JSON inválido"})
        if not allow_call(self._client_ip()):
            return self._json(200, {"ok": False, "fonte": "orcamento", "motivo": f"limite de {ip_limit()} chamadas por hora para este visitante"})
        if route == "/api/perguntar":
            return self._json(200, ai.ask(str(packet.get("pergunta", "")), packet.get("pacote") or {}))
        return self._json(200, ai.explain(packet))

    def log_message(self, fmt, *args):  # menos ruído no terminal
        if not str(args[1]).startswith(("2", "3")):
            super().log_message(fmt, *args)


def main():
    port = int(os.environ.get("PORT") or (sys.argv[1] if len(sys.argv) > 1 else 8765))
    host = os.environ.get("HOST") or "127.0.0.1"
    handler = functools.partial(Handler, directory=str(WEB))
    with http.server.ThreadingHTTPServer((host, port), handler) as srv:
        st = ai.status()
        print(f"Aurora em http://{host}:{port}  |  SI: {'chave configurada, modelo ' + st['modelo'] if st['chave'] else 'sem chave (texto determinístico)'}", flush=True)
        srv.serve_forever()


if __name__ == "__main__":
    main()
