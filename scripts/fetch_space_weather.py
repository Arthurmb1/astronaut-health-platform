"""Baixa dados REAIS de clima espacial e grava data/space_weather.json para a página de radiação.

Fontes (públicas):
  - NOAA SWPC: número de manchas solares observado (mensal e suavizado) e previsão do ciclo solar.
      https://services.swpc.noaa.gov/json/solar-cycle/observed-solar-cycle-indices.json
      https://services.swpc.noaa.gov/json/solar-cycle/predicted-solar-cycle.json
  - NASA DONKI via api.nasa.gov: eventos de partículas solares energéticas (SEP).
      https://api.nasa.gov/DONKI/SEP?startDate=...&endDate=...&api_key=...   (janelas de até 60 dias)

Chave da API: variável de ambiente NASA_API_KEY (grátis em https://api.nasa.gov, 1000 consultas/hora).
Sem ela usa DEMO_KEY, que libera só ~10 consultas por hora. O download é incremental: as janelas já
baixadas ficam em data/raw/donki_sep_windows.json e cada execução continua de onde parou,
das mais recentes para as mais antigas. A cobertura (meses completos) vai junto no JSON final.

Uso (na pasta do projeto):
    python scripts/fetch_space_weather.py
    $env:NASA_API_KEY="sua_chave"; python scripts/fetch_space_weather.py      (PowerShell)
"""
import datetime as dt
import json
import os
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "space_weather.json"
CACHE = ROOT / "data" / "raw" / "donki_sep_windows.json"
NOAA_OBS = "https://services.swpc.noaa.gov/json/solar-cycle/observed-solar-cycle-indices.json"
NOAA_PRED = "https://services.swpc.noaa.gov/json/solar-cycle/predicted-solar-cycle.json"
DONKI = "https://api.nasa.gov/DONKI/SEP?startDate={}&endDate={}&api_key={}"
START = dt.date(2019, 12, 1)  # início do ciclo solar 25 (mínimo de dez/2019)


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "athenance-space-apps-demo"})
    with urllib.request.urlopen(req, timeout=60) as r:
        txt = r.read().decode()
    return json.loads(txt) if txt.strip() else []


def windows(start, end):
    out, d = [], start
    while d <= end:
        e = min(d + dt.timedelta(days=59), end)
        out.append((d, e))
        d = e + dt.timedelta(days=1)
    return out


def main():
    today = dt.date.today()
    envf = ROOT / ".env"  # lê NASA_API_KEY do .env, se existir
    if envf.exists():
        for line in envf.read_text(encoding="utf-8").splitlines():
            if line.strip().startswith("NASA_API_KEY=") and line.split("=", 1)[1].strip():
                os.environ.setdefault("NASA_API_KEY", line.split("=", 1)[1].strip().strip('"'))
    key = os.environ.get("NASA_API_KEY", "DEMO_KEY")
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    cache = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}

    obs, pred = get(NOAA_OBS), get(NOAA_PRED)

    pending = [w for w in reversed(windows(START, today)) if f"{w[0]}_{w[1]}" not in cache or w[1] >= today - dt.timedelta(days=1)]
    stopped = None
    for d, e in pending:
        try:
            cache[f"{d}_{e}"] = get(DONKI.format(d, e, key))
        except urllib.error.HTTPError as ex:
            stopped = f"parou em {d}..{e}: HTTP {ex.code}" + (" (limite de consultas da chave; rode de novo mais tarde ou use NASA_API_KEY)" if ex.code == 429 else "")
            break
        CACHE.write_text(json.dumps(cache), encoding="utf-8")

    # Cobertura: janelas baixadas -> meses totalmente cobertos
    days = set()
    for k in cache:
        a, b = (dt.date.fromisoformat(x) for x in k.split("_"))
        days.update(a + dt.timedelta(n) for n in range((b - a).days + 1))
    months = sorted({f"{d:%Y-%m}" for d in days})
    covered = []
    for m in months:
        y, mo = map(int, m.split("-"))
        first = dt.date(y, mo, 1)
        last = (dt.date(y + mo // 12, mo % 12 + 1, 1) - dt.timedelta(1))
        if all(first + dt.timedelta(n) in days for n in range((last - first).days + 1)) and last < today:
            covered.append(m)

    # O DONKI registra uma entrada por instrumento (e por modelo). Para contar EVENTOS:
    #  1) descarta entradas só de modelo ("MODEL: ...");  2) junta detecções a menos de 48 h umas das outras.
    seen, det = set(), []
    for evs in cache.values():
        for ev in evs:
            if ev["sepID"] in seen:
                continue
            seen.add(ev["sepID"])
            names = [i.get("displayName", "") for i in ev.get("instruments", [])]
            meas = [n for n in names if not n.startswith("MODEL")]
            if meas:
                det.append((dt.datetime.fromisoformat(ev["eventTime"].replace("Z", "")), meas))
    det.sort()
    events = []  # [início, fim, nº de detecções, tem GOES >10 MeV, tem >100 MeV, instrumentos]
    for t, meas in det:
        if events and (t - events[-1][1]).total_seconds() <= 48 * 3600:
            e = events[-1]; e[1] = t; e[2] += 1; e[5].update(meas)
        else:
            events.append([t, t, 1, False, False, set(meas)])
    events = [[a.strftime("%Y-%m-%dT%H:%M"), b.strftime("%Y-%m-%dT%H:%M"), n,
               any("GOES" in m and ">10 MeV" in m for m in ins), any(">100 MeV" in m for m in ins),
               ", ".join(sorted(ins))[:120]] for a, b, n, _, _, ins in events]

    first = START.strftime("%Y-%m")
    data = {
        "fetched": today.isoformat(),
        "note": "Dados reais. NOAA SWPC (manchas solares observadas e previstas) e NASA DONKI (eventos SEP).",
        "sources": {"noaa_observed": NOAA_OBS, "noaa_predicted": NOAA_PRED, "nasa_donki_sep": "https://api.nasa.gov/DONKI/SEP (CCMC/GSFC)"},
        "ssn": [[x["time-tag"], x["ssn"], x["smoothed_ssn"] if x["smoothed_ssn"] >= 0 else None] for x in obs if x["time-tag"] >= first],
        "pred": [[x["time-tag"], x["predicted_ssn"], x["low_ssn"], x["high_ssn"]] for x in pred],
        "sep": events,
        "sep_months_covered": covered,
    }
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    total = len(windows(START, today))
    print(f"{OUT.relative_to(ROOT)}: {len(data['ssn'])} meses de manchas, {len(data['pred'])} previstos")
    print(f"DONKI: {len(cache)}/{total} janelas baixadas, {len(covered)} meses completos, {len(events)} eventos SEP")
    if stopped:
        print("Atenção:", stopped)


if __name__ == "__main__":
    main()
