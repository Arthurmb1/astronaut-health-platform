
import pandas as pd


def classify_deviation(
    deviations: pd.DataFrame
) -> pd.DataFrame:
    """
    Classifica os desvios estatísticos utilizando o valor absoluto
    do Z-score.

    Categorias:
    - Normal: |Z| < 2
    - Atenção: 2 <= |Z| < 3
    - Desvio elevado: |Z| >= 3
    - Dados insuficientes: Z-score ausente

    Essa classificação é estatística, não clínica.
    """

    if "z_score" not in deviations.columns:
        raise KeyError("Column 'z_score' not found.")

    result = deviations.copy()

    result["absolute_z_score"] = result["z_score"].abs()

    result["assessment_category"] = "Dados insuficientes"

    valid = result["absolute_z_score"].notna()

    result.loc[
        valid & (result["absolute_z_score"] < 2),
        "assessment_category"
    ] = "Normal"

    result.loc[
        valid
        & (result["absolute_z_score"] >= 2)
        & (result["absolute_z_score"] < 3),
        "assessment_category"
    ] = "Atenção"

    result.loc[
        valid & (result["absolute_z_score"] >= 3),
        "assessment_category"
    ] = "Desvio elevado"

    return result


def detect_persistent_deviations(
    assessment: pd.DataFrame,
    min_consecutive_days: int = 3
) -> pd.DataFrame:
    """
    Identifica sequências de desvios elevados em dias consecutivos.

    Um evento é identificado quando o mesmo astronauta apresenta
    desvio elevado na mesma métrica durante N dias consecutivos.

    Retorna um registro por evento identificado.
    """

    required_columns = [
        "crew_member_id",
        "measurement_date",
        "metric",
        "assessment_category",
        "z_score",
        "absolute_z_score"
    ]

    for column in required_columns:
        if column not in assessment.columns:
            raise KeyError(f"Column '{column}' not found.")

    if min_consecutive_days <= 0:
        raise ValueError("min_consecutive_days must be greater than zero.")

    data = assessment.copy()

    data["measurement_date"] = pd.to_datetime(
        data["measurement_date"],
        errors="coerce"
    )

    data = data.dropna(
        subset=["crew_member_id", "measurement_date"]
    )

    # Considera somente desvios elevados.
    data = data[
        data["assessment_category"] == "Desvio elevado"
    ].copy()

    if data.empty:
        return pd.DataFrame(
            columns=[
                "crew_member_id",
                "metric",
                "start_date",
                "end_date",
                "duration_days",
                "max_absolute_z_score",
                "mean_absolute_z_score"
            ]
        )

    # Normaliza a data para trabalhar com dias do calendário.
    data["day"] = data["measurement_date"].dt.normalize()

    # Se houver várias medições da mesma variável no mesmo dia,
    # utiliza o maior desvio absoluto daquele dia.
    daily = (
        data.groupby(
            ["crew_member_id", "metric", "day"],
            as_index=False
        )
        .agg(
            absolute_z_score=("absolute_z_score", "max")
        )
        .sort_values(
            ["crew_member_id", "metric", "day"]
        )
    )

    events = []

    # Analisa cada astronauta e cada variável separadamente.
    for (crew_id, metric), group in daily.groupby(
        ["crew_member_id", "metric"]
    ):

        group = group.sort_values("day").copy()

        # Identifica intervalos entre medições.
        group["date_gap"] = group["day"].diff().dt.days

        # Uma nova sequência começa quando o intervalo não é de 1 dia.
        group["sequence"] = (
            group["date_gap"].ne(1)
        ).cumsum()

        # Avalia cada sequência.
        for _, sequence in group.groupby("sequence"):

            duration = len(sequence)

            if duration >= min_consecutive_days:

                events.append({
                    "crew_member_id": crew_id,
                    "metric": metric,
                    "start_date": sequence["day"].min(),
                    "end_date": sequence["day"].max(),
                    "duration_days": duration,
                    "max_absolute_z_score": (
                        sequence["absolute_z_score"].max()
                    ),
                    "mean_absolute_z_score": (
                        sequence["absolute_z_score"].mean()
                    )
                })

    return pd.DataFrame(events)
