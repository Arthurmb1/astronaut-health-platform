"""Gera web/src/data.js a partir dos CSVs sintéticos em ../data.

Só usa a biblioteca padrão (sem pandas). Rodar a partir de qualquer pasta:
    python web/prep_data.py
"""
import csv
import json
import math
from pathlib import Path

WEB = Path(__file__).resolve().parent
DATA = WEB.parent / "data"
OUT = WEB / "src" / "data.js"


def _conv_column(values):
    """Infere o tipo da coluna como o pandas faria: int, float ou texto. Vazio vira None."""
    filled = [v for v in values if v != ""]
    try:
        [int(v) for v in filled]
        if len(filled) < len(values):  # pandas promove a float quando há vazio
            return [float(v) if v != "" else None for v in values]
        return [int(v) for v in values]
    except ValueError:
        pass
    try:
        [float(v) for v in filled]
        return [float(v) if v != "" else None for v in values]
    except ValueError:
        return [v if v != "" else None for v in values]


def read(name):
    with open(DATA / name, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    if not rows:
        return []
    cols = {c: _conv_column([r[c] for r in rows]) for c in rows[0].keys()}
    return [{c: cols[c][i] for c in cols} for i in range(len(rows))]


def dt(s):
    """'2026-08-01 08:00:00' -> '2026-08-01T08:00'"""
    return s[:10] + "T" + s[11:16]


def pick(rows, keys):
    return [[r[k] for k in keys] for r in rows]


def main():
    crew = read("crew_members.csv")
    mis = read("missions.csv")
    ph = read("mission_phases.csv")
    v = read("vital_signs.csv")
    m = read("mental_health.csv")
    lab = read("lab_results.csv")
    rad = read("radiation_exposure.csv")
    env = read("environmental_data.csv")
    ev = read("simulated_events.csv")
    swf = DATA / "space_weather.json"  # dados reais de clima espacial, scripts/fetch_space_weather.py
    sw = json.loads(swf.read_text(encoding="utf-8")) if swf.exists() else None
    sl = read("sleep_stages.csv") if (DATA / "sleep_stages.csv").exists() else []  # gerado por scripts/gen_sleep_stages.py

    out = {
        "crew": crew,
        "missions": mis,
        "phases": pick(ph, ["date", "mission_phase"]),
        "vitals": {
            "cols": ["crew", "date", "phase", "hr", "sbp", "dbp", "temp", "spo2", "mass", "glu"],
            "rows": [[int(r["crew_member_id"]), dt(r["measurement_date"]), r["mission_phase"], r["heart_rate_bpm"],
                      r["systolic_pressure_mmhg"], r["diastolic_pressure_mmhg"], r["body_temperature_c"],
                      r["blood_oxygen_saturation_pct"], r["body_mass_kg"], r["capillary_glucose_mg_dl"]] for r in v],
        },
        "mental": {
            "cols": ["crew", "date", "phase", "sleep", "eff", "mood", "stress", "rt"],
            "rows": [[int(r["crew_member_id"]), dt(r["measurement_date"]), r["mission_phase"], r["sleep_duration_hours"],
                      r["sleep_efficiency_pct"], r["mood_self_report_1_5"], r["perceived_stress_1_5"],
                      r["psychomotor_reaction_time_median_ms"]] for r in m],
        },
        "labs": {
            "cols": ["crew", "date", "code", "value", "qual"],
            "rows": [[int(r["crew_member_id"]), dt(r["sample_date"]), r["analyte_code"], r["result_value"],
                      r["result_qualifier"]] for r in lab],
        },
        "rad": {
            "cols": ["crew", "date", "rate", "cum", "dos"],
            "rows": [[int(r["crew_member_id"]), dt(r["measurement_date"]), r["dose_equivalent_rate_uSv_h"],
                      r["cumulative_effective_dose_mSv"], r["dosimeter_id"]] for r in rad],
        },
        "env": {
            "cols": ["date", "cabin", "co2", "rh"],
            "rows": [[dt(r["measurement_date"]), r["cabin_id"], r["cabin_co2_ppm"], r["cabin_relative_humidity_pct"]]
                     for r in env],
        },
        "sw": sw,
        "sleep": {
            "cols": ["crew", "date", "tst", "light", "deep", "rem"],
            "rows": [[int(r["crew_member_id"]), dt(r["measurement_date"]), r["total_sleep_min"], r["light_sleep_pct"],
                      r["deep_sleep_pct"], r["rem_sleep_pct"]] for r in sl],
        },
        "events": [{k: r[k] for k in ["event_id", "crew_member_id", "start_date", "end_date", "event_type", "description"]}
                   for r in ev],
    }

    def clean(o):  # NaN não é JSON válido
        if isinstance(o, float) and math.isnan(o):
            return None
        if isinstance(o, list):
            return [clean(x) for x in o]
        if isinstance(o, dict):
            return {k: clean(x) for k, x in o.items()}
        return o

    s = json.dumps(clean(out), separators=(",", ":"), ensure_ascii=False)
    OUT.write_text("window.SEED=" + s + ";", encoding="utf-8")
    print(f"{OUT.relative_to(WEB.parent)}: {len(s) / 1024:.1f} KB")


if __name__ == "__main__":
    main()
