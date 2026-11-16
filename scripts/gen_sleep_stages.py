"""Gera data/sleep_stages.csv: fases do sono SINTÉTICAS (leve, profundo, REM) por noite e tripulante.

Não altera nenhum CSV existente. Lê mental_health.csv e crew_members.csv e grava um arquivo novo,
ligado às medições de sono pela chave (crew_member_id, measurement_date).

Modelo (suposição de demonstração, não é dado real nem modelo validado):
  - Proporções de referência para adultos saudáveis: sono leve (N1+N2) ~50-60%, profundo (N3) ~13-23%,
    REM ~20-25% do tempo total de sono. Faixas da literatura de sono em adultos; A CONFERIR na fonte.
  - Sono profundo cai com a idade, com noite curta, com estresse alto e com eficiência baixa.
  - REM cai com noite curta (o REM se concentra no fim da noite) e com estresse alto.
  - Ruído gaussiano com semente fixa: rodar de novo gera exatamente o mesmo arquivo.

Uso (na pasta do projeto):
    python scripts/gen_sleep_stages.py
"""
import csv
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
OUT = DATA / "sleep_stages.csv"
SEED = 2026

COLS = ["crew_member_id", "mission_id", "measurement_date", "mission_phase", "total_sleep_min",
        "light_sleep_pct", "deep_sleep_pct", "rem_sleep_pct",
        "light_sleep_min", "deep_sleep_min", "rem_sleep_min",
        "measurement_source", "generation_note"]

SOURCE = "Synthetic sleep staging (simulated wearable EEG headband)"
NOTE = ("Synthetic. Derived from sleep_duration_hours, sleep_efficiency_pct and perceived_stress_1_5 in "
        "mental_health.csv plus crew age; reference adult stage proportions to be verified.")


def clamp(x, lo, hi):
    return max(lo, min(hi, x))


def stages(hours, eff, stress, age, rng):
    deep = (20.0 - 0.15 * (age - 30) + 1.8 * (hours - 7) - 2.2 * (stress - 1.5) + 0.06 * (eff - 85)
            + rng.gauss(0, 1.6))
    rem = 22.0 + 2.2 * (hours - 7) - 1.2 * (stress - 1.5) + rng.gauss(0, 1.8)
    deep = round(clamp(deep, 6.0, 30.0), 1)
    rem = round(clamp(rem, 10.0, 32.0), 1)
    light = round(100.0 - deep - rem, 1)  # o restante, para somar exatamente 100
    return light, deep, rem


def main():
    with open(DATA / "crew_members.csv", newline="", encoding="utf-8") as f:
        ages = {r["crew_member_id"]: float(r["age_years"]) for r in csv.DictReader(f)}
    with open(DATA / "mental_health.csv", newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    rng = random.Random(SEED)
    out = []
    for r in rows:
        h = float(r["sleep_duration_hours"])
        eff = float(r["sleep_efficiency_pct"])
        stress = float(r["perceived_stress_1_5"])
        light, deep, rem = stages(h, eff, stress, ages[r["crew_member_id"]], rng)
        tst = h * 60
        out.append({
            "crew_member_id": r["crew_member_id"], "mission_id": r["mission_id"],
            "measurement_date": r["measurement_date"], "mission_phase": r["mission_phase"],
            "total_sleep_min": round(tst),
            "light_sleep_pct": light, "deep_sleep_pct": deep, "rem_sleep_pct": rem,
            "light_sleep_min": round(tst * light / 100), "deep_sleep_min": round(tst * deep / 100),
            "rem_sleep_min": round(tst * rem / 100),
            "measurement_source": SOURCE, "generation_note": NOTE,
        })

    with open(OUT, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLS)
        w.writeheader()
        w.writerows(out)

    n = len(out)
    avg = lambda k: sum(x[k] for x in out) / n
    print(f"{OUT.relative_to(ROOT)}: {n} noites")
    print(f"médias: leve {avg('light_sleep_pct'):.1f}%  profundo {avg('deep_sleep_pct'):.1f}%  REM {avg('rem_sleep_pct'):.1f}%")
    print(f"faixas: profundo {min(x['deep_sleep_pct'] for x in out)}-{max(x['deep_sleep_pct'] for x in out)}%  "
          f"REM {min(x['rem_sleep_pct'] for x in out)}-{max(x['rem_sleep_pct'] for x in out)}%  "
          f"leve {min(x['light_sleep_pct'] for x in out)}-{max(x['light_sleep_pct'] for x in out)}%")


if __name__ == "__main__":
    main()
