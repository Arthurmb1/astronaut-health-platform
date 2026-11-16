
import pandas as pd


# ============================================================
# DATASET CONFIGURATION
# ============================================================

# Defines the datasets that must contain a valid crew member ID.

CREW_DATASETS = {
    "vital_signs": "crew_member_id",
    "mental_health": "crew_member_id",
    "lab_results": "crew_member_id",
    "radiation_exposure": "crew_member_id",
}

# Defines expected mission references.

MISSION_DATASETS = {
    "vital_signs": "mission_id",
    "mental_health": "mission_id",
    "lab_results": "mission_id",
    "radiation_exposure": "mission_id",
    "environmental_data": "mission_id",
}


# ============================================================
# MISSING VALUES
# ============================================================

def check_missing_values(df: pd.DataFrame) -> pd.DataFrame:
    """
    Identifies missing values in each column.
    """

    result = pd.DataFrame({
        "column": df.columns,
        "missing_count": df.isna().sum().values,
        "missing_percentage": (
            df.isna().mean().values * 100
        ).round(2)
    })

    return result.sort_values(
        "missing_count",
        ascending=False
    )


# ============================================================
# DUPLICATE RECORDS
# ============================================================

def check_duplicates(
    df: pd.DataFrame,
    subset: list[str] | None = None
) -> int:
    """
    Counts duplicate records.

    If subset is provided, checks duplicates
    based only on the selected columns.
    """

    return int(df.duplicated(subset=subset).sum())


# ============================================================
# REFERENTIAL INTEGRITY
# ============================================================

def check_crew_references(
    datasets: dict,
    crew_df: pd.DataFrame
) -> dict:
    """
    Checks whether every crew_member_id in the
    measurement datasets exists in crew_members.
    """

    valid_ids = set(
        crew_df["crew_member_id"].dropna()
    )

    results = {}

    for dataset_name, id_column in CREW_DATASETS.items():

        df = datasets[dataset_name]

        invalid_ids = set(
            df.loc[
                ~df[id_column].isin(valid_ids),
                id_column
            ].dropna()
        )

        results[dataset_name] = {
            "invalid_count": int(
                df[id_column].isin(invalid_ids).sum()
            ),
            "invalid_ids": list(invalid_ids)
        }

    return results


def check_mission_references(
    datasets: dict,
    missions_df: pd.DataFrame
) -> dict:
    """
    Checks whether every mission_id in the
    measurement datasets exists in missions.
    """

    valid_ids = set(
        missions_df["mission_id"].dropna()
    )

    results = {}

    for dataset_name, id_column in MISSION_DATASETS.items():

        df = datasets[dataset_name]

        invalid_ids = set(
            df.loc[
                ~df[id_column].isin(valid_ids),
                id_column
            ].dropna()
        )

        results[dataset_name] = {
            "invalid_count": int(
                df[id_column].isin(invalid_ids).sum()
            ),
            "invalid_ids": list(invalid_ids)
        }

    return results


# ============================================================
# PLAUSIBILITY CHECKS
# ============================================================

# These are broad software data-quality guardrails,
# NOT clinical reference ranges or diagnostic thresholds.

PLAUSIBILITY_RANGES = {
    "heart_rate_bpm": (25, 220),
    "systolic_pressure_mmhg": (50, 260),
    "diastolic_pressure_mmhg": (30, 160),
    "body_temperature_c": (30, 43),
    "blood_oxygen_saturation_pct": (50, 100),
    "body_mass_kg": (25, 250),
    "capillary_glucose_mg_dl": (20, 600),
    "sleep_duration_hours": (0, 24),
    "sleep_efficiency_pct": (0, 100),
    "mood_self_report_1_5": (1, 5),
    "perceived_stress_1_5": (1, 5),
    "psychomotor_reaction_time_median_ms": (50, 3000),
    "cabin_co2_ppm": (0, 10000),
    "cabin_relative_humidity_pct": (0, 100),
    "dose_equivalent_rate_uSv_h": (0, 10000),
    "cumulative_effective_dose_mSv": (0, 100000),
}


def check_plausibility(
    df: pd.DataFrame
) -> pd.DataFrame:
    """
    Identifies values outside broad technical
    plausibility guardrails.

    These limits do not represent clinical
    reference ranges.
    """

    issues = []

    for column, (minimum, maximum) in PLAUSIBILITY_RANGES.items():

        if column not in df.columns:
            continue

        values = pd.to_numeric(
            df[column],
            errors="coerce"
        )

        invalid_mask = (
            values.notna()
            & (
                (values < minimum)
                | (values > maximum)
            )
        )

        for index, value in df.loc[
            invalid_mask, column
        ].items():

            issues.append({
                "row_index": index,
                "column": column,
                "value": value,
                "minimum": minimum,
                "maximum": maximum
            })

    return pd.DataFrame(
        issues,
        columns=[
            "row_index",
            "column",
            "value",
            "minimum",
            "maximum"
        ]
    )


# ============================================================
# DATE VALIDATION
# ============================================================

def check_invalid_dates(
    df: pd.DataFrame,
    date_columns: list[str]
) -> dict:
    """
    Counts missing or invalid date values.
    """

    results = {}

    for column in date_columns:

        if column not in df.columns:
            results[column] = "Column not found"
            continue

        converted = pd.to_datetime(
            df[column],
            errors="coerce"
        )

        results[column] = int(
            converted.isna().sum()
        )

    return results
