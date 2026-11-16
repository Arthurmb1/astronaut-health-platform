
import pandas as pd


def calculate_baseline(
    df: pd.DataFrame,
    metrics: list[str],
    baseline_days: int = 10
) -> pd.DataFrame:
    """
    Calcula estatísticas individuais de referência para cada astronauta.

    O baseline é calculado utilizando os primeiros N dias de
    medições disponíveis para cada astronauta.

    Args:
        df: DataFrame com as medições.
        metrics: Lista de variáveis que terão o baseline calculado.
        baseline_days: Quantidade de dias utilizados como referência.

    Returns:
        DataFrame com estatísticas individuais por astronauta e variável.
    """

    required_columns = ["crew_member_id", "measurement_date"]

    for column in required_columns:
        if column not in df.columns:
            raise KeyError(f"Column '{column}' not found.")

    if baseline_days <= 0:
        raise ValueError("baseline_days must be greater than zero.")

    for metric in metrics:
        if metric not in df.columns:
            raise KeyError(f"Metric '{metric}' not found.")

    data = df.copy()

    data["measurement_date"] = pd.to_datetime(
        data["measurement_date"],
        errors="coerce"
    )

    data = data.dropna(
        subset=["crew_member_id", "measurement_date"]
    )

    if data.empty:
        raise ValueError("No valid measurements available.")

    # Identifica a primeira data de medição de cada astronauta.
    first_dates = data.groupby("crew_member_id")[
        "measurement_date"
    ].transform("min")

    # Calcula quantos dias se passaram desde a primeira medição.
    elapsed_days = (
        data["measurement_date"].dt.normalize()
        - first_dates.dt.normalize()
    ).dt.days

    # Seleciona somente o período definido para o baseline.
    baseline_data = data[elapsed_days < baseline_days].copy()

    # Converte as métricas para formato longo.
    long_data = baseline_data.melt(
        id_vars=["crew_member_id", "measurement_date"],
        value_vars=metrics,
        var_name="metric",
        value_name="value"
    )

    # Garante que os valores sejam numéricos.
    long_data["value"] = pd.to_numeric(
        long_data["value"],
        errors="coerce"
    )

    # Remove valores ausentes das métricas.
    long_data = long_data.dropna(subset=["value"])

    # Calcula as estatísticas por astronauta e métrica.
    baseline = (
        long_data
        .groupby(["crew_member_id", "metric"])
        .agg(
            baseline_mean=("value", "mean"),
            baseline_median=("value", "median"),
            baseline_std=("value", "std"),
            baseline_min=("value", "min"),
            baseline_max=("value", "max"),
            sample_count=("value", "count")
        )
        .reset_index()
    )

    return baseline


def calculate_deviation(
    df: pd.DataFrame,
    baseline: pd.DataFrame,
    metrics: list[str]
) -> pd.DataFrame:
    """
    Compara as medições com o baseline individual de cada astronauta.

    Calcula:
    - Diferença absoluta;
    - Diferença percentual;
    - Z-score.

    Returns:
        DataFrame com as medições e indicadores de desvio.
    """

    required_columns = [
        "crew_member_id",
        "measurement_date"
    ]

    for column in required_columns:
        if column not in df.columns:
            raise KeyError(f"Column '{column}' not found.")

    baseline_columns = [
        "crew_member_id",
        "metric",
        "baseline_mean",
        "baseline_std"
    ]

    for column in baseline_columns:
        if column not in baseline.columns:
            raise KeyError(f"Column '{column}' not found in baseline.")

    for metric in metrics:
        if metric not in df.columns:
            raise KeyError(f"Metric '{metric}' not found.")

    data = df.copy()

    # Converte as métricas para valores numéricos.
    for metric in metrics:
        data[metric] = pd.to_numeric(
            data[metric],
            errors="coerce"
        )

    # Transforma as métricas para formato longo.
    long_data = data.melt(
        id_vars=["crew_member_id", "measurement_date"],
        value_vars=metrics,
        var_name="metric",
        value_name="measured_value"
    )

    # Converte os valores do baseline para formato numérico.
    baseline_data = baseline.copy()

    for column in ["baseline_mean", "baseline_std"]:
        baseline_data[column] = pd.to_numeric(
            baseline_data[column],
            errors="coerce"
        )

    # Associa cada medição ao baseline do astronauta e da métrica.
    result = long_data.merge(
        baseline_data[
            baseline_columns
        ],
        on=["crew_member_id", "metric"],
        how="left",
        validate="many_to_one"
    )

    # Diferença absoluta.
    result["absolute_deviation"] = (
        result["measured_value"] - result["baseline_mean"]
    )

    # Diferença percentual.
    result["percentage_deviation"] = (
        result["absolute_deviation"]
        / result["baseline_mean"].abs()
    ) * 100

    # Z-score.
    result["z_score"] = (
        result["absolute_deviation"]
        / result["baseline_std"]
    )

    # Evita divisões por zero.
    result.loc[
        result["baseline_std"].eq(0),
        "z_score"
    ] = float("nan")

    result.loc[
        result["baseline_mean"].eq(0),
        "percentage_deviation"
    ] = float("nan")

    return result


def calculate_robust_baseline(df, metrics, baseline_days=10):
    """
    Calcula um baseline robusto por astronauta e métrica,
    utilizando mediana e MAD (Median Absolute Deviation).

    O baseline considera os primeiros `baseline_days` dias
    de medições de cada astronauta.
    """

    required_columns = [
        "crew_member_id",
        "measurement_date"
    ] + metrics

    missing_columns = [
        column for column in required_columns
        if column not in df.columns
    ]

    if missing_columns:
        raise ValueError(
            f"Colunas ausentes no DataFrame: {missing_columns}"
        )

    data = df.copy()

    data["measurement_date"] = pd.to_datetime(
        data["measurement_date"],
        errors="coerce"
    )

    data = data.dropna(
        subset=["crew_member_id", "measurement_date"]
    )

    # Ordena as medições por astronauta e data
    data = data.sort_values(
        ["crew_member_id", "measurement_date"]
    )

    # Seleciona os primeiros N dias de cada astronauta
    baseline_data = (
        data.groupby("crew_member_id")
        .head(baseline_days)
        .copy()
    )

    # Transforma as métricas em formato longo
    long_data = baseline_data.melt(
        id_vars=[
            "crew_member_id",
            "measurement_date"
        ],
        value_vars=metrics,
        var_name="metric",
        value_name="value"
    )

    long_data["value"] = pd.to_numeric(
        long_data["value"],
        errors="coerce"
    )

    long_data = long_data.dropna(subset=["value"])

    def calculate_mad(values):
        median = values.median()
        return (values - median).abs().median()

    baseline = (
        long_data.groupby(
            ["crew_member_id", "metric"]
        )
        .agg(
            baseline_median=("value", "median"),
            baseline_mad=("value", calculate_mad),
            baseline_min=("value", "min"),
            baseline_max=("value", "max"),
            sample_count=("value", "count")
        )
        .reset_index()
    )

    # Converte MAD em uma estimativa robusta do desvio-padrão
    baseline["baseline_robust_sigma"] = (
        1.4826 * baseline["baseline_mad"]
    )

    return baseline


def calculate_robust_deviation(df, baseline, metrics):
    """
    Calcula os desvios das medições em relação ao baseline robusto.

    Utiliza:
    - Mediana como referência central.
    - MAD convertido em escala robusta de desvio-padrão.
    - Robust Z-score para medir o afastamento.
    """

    required_columns = [
        "crew_member_id",
        "measurement_date"
    ] + metrics

    missing_columns = [
        column for column in required_columns
        if column not in df.columns
    ]

    if missing_columns:
        raise ValueError(
            f"Colunas ausentes no DataFrame: {missing_columns}"
        )

    baseline_columns = [
        "crew_member_id",
        "metric",
        "baseline_median",
        "baseline_mad",
        "baseline_robust_sigma"
    ]

    missing_baseline_columns = [
        column for column in baseline_columns
        if column not in baseline.columns
    ]

    if missing_baseline_columns:
        raise ValueError(
            f"Colunas ausentes no baseline: {missing_baseline_columns}"
        )

    data = df.copy()

    data["measurement_date"] = pd.to_datetime(
        data["measurement_date"],
        errors="coerce"
    )

    # Transforma as métricas para formato longo
    long_data = data.melt(
        id_vars=[
            "crew_member_id",
            "measurement_date"
        ],
        value_vars=metrics,
        var_name="metric",
        value_name="measured_value"
    )

    long_data["measured_value"] = pd.to_numeric(
        long_data["measured_value"],
        errors="coerce"
    )

    long_data = long_data.dropna(
        subset=["measured_value", "measurement_date"]
    )

    # Adiciona as estatísticas do baseline
    deviations = long_data.merge(
        baseline[baseline_columns],
        on=["crew_member_id", "metric"],
        how="left"
    )

    # Desvio absoluto em relação à mediana
    deviations["absolute_deviation"] = (
        deviations["measured_value"]
        - deviations["baseline_median"]
    )

    # Desvio percentual
    deviations["percentage_deviation"] = (
        deviations["absolute_deviation"]
        / deviations["baseline_median"].abs()
    ) * 100

    # Robust Z-score
    deviations["robust_z_score"] = (
        deviations["absolute_deviation"]
        / deviations["baseline_robust_sigma"]
    )

    # Evita resultados infinitos
    deviations["robust_z_score"] = (
        deviations["robust_z_score"]
        .replace([float("inf"), float("-inf")], float("nan"))
    )

    return deviations
