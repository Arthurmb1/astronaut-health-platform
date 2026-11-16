
from pathlib import Path
import pandas as pd


# ============================================================
# CONFIGURATION
# ============================================================

# Identifies the root directory of the project
PROJECT_DIR = Path(__file__).resolve().parent.parent

# Directory containing the CSV files
DATA_DIR = PROJECT_DIR / "data"


# ============================================================
# DATA LOADING
# ============================================================

def load_data(filename: str) -> pd.DataFrame:
    """
    Loads a CSV file from the project's data directory.

    Parameters
    ----------
    filename : str
        Name of the CSV file.

    Returns
    -------
    pd.DataFrame
        Loaded dataset.
    """

    file_path = DATA_DIR / filename

    if not file_path.exists():
        raise FileNotFoundError(
            f"Dataset not found: {file_path}"
        )

    try:
        df = pd.read_csv(file_path)

        return df

    except pd.errors.EmptyDataError:
        raise ValueError(
            f"Dataset is empty: {filename}"
        )

    except pd.errors.ParserError as error:
        raise ValueError(
            f"Error parsing {filename}: {error}"
        )


# ============================================================
# DATE PROCESSING
# ============================================================

def convert_date_columns(
    df: pd.DataFrame,
    date_columns: list[str]
) -> pd.DataFrame:
    """
    Converts specified columns to datetime format.
    """

    df = df.copy()

    for column in date_columns:

        if column not in df.columns:
            raise KeyError(
                f"Column '{column}' not found in dataset."
            )

        df[column] = pd.to_datetime(
            df[column],
            errors="coerce"
        )

    return df


# ============================================================
# DATASET LOADERS
# ============================================================

def get_crew_members() -> pd.DataFrame:
    return load_data("crew_members.csv")


def get_missions() -> pd.DataFrame:
    return load_data("missions.csv")


def get_mission_phases() -> pd.DataFrame:
    df = load_data("mission_phases.csv")

    return convert_date_columns(
        df,
        ["date"]
    )


def get_vital_signs() -> pd.DataFrame:
    df = load_data("vital_signs.csv")

    return convert_date_columns(
        df,
        ["measurement_date"]
    )


def get_mental_health() -> pd.DataFrame:
    df = load_data("mental_health.csv")

    return convert_date_columns(
        df,
        ["measurement_date"]
    )


def get_lab_results() -> pd.DataFrame:
    df = load_data("lab_results.csv")

    return convert_date_columns(
        df,
        ["sample_date"]
    )


def get_radiation_exposure() -> pd.DataFrame:
    df = load_data("radiation_exposure.csv")

    return convert_date_columns(
        df,
        ["measurement_date"]
    )


def get_environmental_data() -> pd.DataFrame:
    df = load_data("environmental_data.csv")

    return convert_date_columns(
        df,
        ["measurement_date"]
    )


def get_simulated_events() -> pd.DataFrame:
    df = load_data("simulated_events.csv")

    return convert_date_columns(
        df,
        ["start_date", "end_date"]
    )
