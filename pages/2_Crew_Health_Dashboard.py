
import streamlit as st
import pandas as pd

from utils.data_loader import (
    get_crew_members,
    get_vital_signs,
    get_mental_health,
    get_lab_results,
    get_radiation_exposure,
    get_environmental_data
)

from utils.baseline import (
    calculate_baseline,
    calculate_deviation
)

from utils.health_assessment import classify_deviation


# =====================================================
# CONFIGURATION
# =====================================================

st.set_page_config(
    page_title="Astronaut Health Monitoring | Athenance",
    page_icon="🚀",
    layout="wide"
)

st.markdown("""
<style>
.stApp {
    background-color: #0B1120;
}

.block-container {
    padding-top: 1.5rem;
    padding-bottom: 2rem;
    max-width: 1600px;
}

[data-testid="stMetric"] {
    background: #151F33;
    border: 1px solid #293650;
    padding: 15px;
    border-radius: 12px;
}

[data-testid="stMetricLabel"] {
    color: #AAB8CC;
}

[data-testid="stMetricValue"] {
    color: #F1F5F9;
}

div[data-testid="stVerticalBlockBorderWrapper"] {
    border-color: #293650;
    border-radius: 12px;
}

h1, h2, h3 {
    color: #F1F5F9;
}

p, label, span {
    color: #D5DEEA;
}

div.stButton > button {
    border-radius: 10px;
    border: 1px solid #394766;
}

.status {
    display: inline-block;
    padding: 5px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 700;
}

.normal {
    background: #123D32;
    color: #4ADE80;
    border: 1px solid #247A58;
}

.attention {
    background: #453512;
    color: #FACC15;
    border: 1px solid #96751B;
}

.elevated {
    background: #481E2A;
    color: #FB7185;
    border: 1px solid #A83D55;
}

.pending {
    background: #293650;
    color: #B8C5D8;
    border: 1px solid #465675;
}

.profile-card {
    background: linear-gradient(110deg, #18243B, #111A2D);
    border: 1px solid #394766;
    border-radius: 14px;
    padding: 20px;
    margin-bottom: 15px;
}

.category-card {
    background: #151F33;
    border: 1px solid #293650;
    border-radius: 12px;
    padding: 16px;
    min-height: 190px;
}

.category-card h4 {
    margin-top: 0;
    margin-bottom: 8px;
    color: #F1F5F9;
}

.category-card p {
    font-size: 14px;
    margin: 5px 0;
}

.small-muted {
    color: #94A3B8;
    font-size: 12px;
}
</style>
""", unsafe_allow_html=True)


# =====================================================
# METRIC DEFINITIONS
# =====================================================

VITAL_METRICS = [
    "heart_rate_bpm",
    "systolic_pressure_mmhg",
    "diastolic_pressure_mmhg",
    "body_temperature_c",
    "blood_oxygen_saturation_pct",
    "body_mass_kg"
]

# Body mass is temporarily excluded from the overall
# status until its synthetic trend is reviewed.
VITAL_STATUS_METRICS = [
    "heart_rate_bpm",
    "systolic_pressure_mmhg",
    "diastolic_pressure_mmhg",
    "body_temperature_c",
    "blood_oxygen_saturation_pct"
]

MENTAL_METRICS = [
    "sleep_duration_hours",
    "sleep_efficiency_pct",
    "mood_self_report_1_5",
    "perceived_stress_1_5",
    "psychomotor_reaction_time_median_ms"
]

METRIC_LABELS = {
    "heart_rate_bpm": "Frequência cardíaca",
    "systolic_pressure_mmhg": "Pressão sistólica",
    "diastolic_pressure_mmhg": "Pressão diastólica",
    "body_temperature_c": "Temperatura corporal",
    "blood_oxygen_saturation_pct": "Saturação de oxigênio",
    "body_mass_kg": "Massa corporal",
    "sleep_duration_hours": "Duração do sono",
    "sleep_efficiency_pct": "Eficiência do sono",
    "mood_self_report_1_5": "Humor",
    "perceived_stress_1_5": "Estresse percebido",
    "psychomotor_reaction_time_median_ms": "Tempo de reação"
}

METRIC_UNITS = {
    "heart_rate_bpm": "bpm",
    "systolic_pressure_mmhg": "mmHg",
    "diastolic_pressure_mmhg": "mmHg",
    "body_temperature_c": "°C",
    "blood_oxygen_saturation_pct": "%",
    "body_mass_kg": "kg",
    "sleep_duration_hours": "h",
    "sleep_efficiency_pct": "%",
    "mood_self_report_1_5": "/5",
    "perceived_stress_1_5": "/5",
    "psychomotor_reaction_time_median_ms": "ms"
}


# =====================================================
# DATA LOADING
# =====================================================

@st.cache_data
def load_data():

    crew = get_crew_members()
    vital = get_vital_signs()
    mental = get_mental_health()
    laboratory = get_lab_results()
    radiation = get_radiation_exposure()
    environment = get_environmental_data()

    for df in [vital, mental, radiation, environment]:
        if "measurement_date" in df.columns:
            df["measurement_date"] = pd.to_datetime(
                df["measurement_date"],
                errors="coerce"
            )

    if "sample_date" in laboratory.columns:
        laboratory["sample_date"] = pd.to_datetime(
            laboratory["sample_date"],
            errors="coerce"
        )

    return crew, vital, mental, laboratory, radiation, environment


try:
    (
        crew_df,
        vital_df,
        mental_df,
        lab_df,
        radiation_df,
        environment_df
    ) = load_data()

except Exception as error:
    st.error(f"Erro ao carregar os dados: {error}")
    st.stop()


# =====================================================
# ASSESSMENT ENGINE
# =====================================================

@st.cache_data
def calculate_assessments(vital, mental):

    vital_baseline = calculate_baseline(
        vital,
        VITAL_METRICS,
        baseline_days=10
    )

    vital_deviations = calculate_deviation(
        vital,
        vital_baseline,
        VITAL_METRICS
    )

    vital_assessment = classify_deviation(
        vital_deviations
    )

    mental_baseline = calculate_baseline(
        mental,
        MENTAL_METRICS,
        baseline_days=10
    )

    mental_deviations = calculate_deviation(
        mental,
        mental_baseline,
        MENTAL_METRICS
    )

    mental_assessment = classify_deviation(
        mental_deviations
    )

    return (
        vital_baseline,
        vital_assessment,
        mental_baseline,
        mental_assessment
    )


try:
    (
        vital_baseline,
        vital_assessment,
        mental_baseline,
        mental_assessment
    ) = calculate_assessments(vital_df, mental_df)

except Exception as error:
    st.error(f"Erro na avaliação dos indicadores: {error}")
    st.stop()


# =====================================================
# HELPER FUNCTIONS
# =====================================================

STATUS_TRANSLATION = {
    "Normal": "Normal",
    "Atenção": "Atenção",
    "Desvio elevado": "Desvio elevado",
    "Dados insuficientes": "Dados insuficientes"
}

STATUS_CLASS = {
    "Normal": "normal",
    "Atenção": "attention",
    "Desvio elevado": "elevated",
    "Dados insuficientes": "pending",
    "Sem avaliação": "pending"
}


def status_badge(status):

    css_class = STATUS_CLASS.get(status, "pending")

    return (
        f'<span class="status {css_class}">'
        f'{STATUS_TRANSLATION.get(status, status).upper()}'
        f'</span>'
    )


def latest_record(df, crew_id=None):

    data = df.copy()

    if crew_id is not None and "crew_member_id" in data.columns:
        data = data[data["crew_member_id"] == crew_id]

    if data.empty:
        return None

    date_column = (
        "measurement_date"
        if "measurement_date" in data.columns
        else "sample_date"
    )

    if date_column not in data.columns:
        return data.iloc[-1]

    data = data.dropna(subset=[date_column])

    if data.empty:
        return None

    return data.sort_values(date_column).iloc[-1]


def format_value(value, unit, decimals=1):

    if pd.isna(value):
        return "Sem registro"

    return f"{value:.{decimals}f} {unit}"


def get_category_status(assessment, crew_id, metrics):

    data = assessment[
        (assessment["crew_member_id"] == crew_id)
        & (assessment["metric"].isin(metrics))
    ].copy()

    if data.empty:
        return "Dados insuficientes"

    data["measurement_date"] = pd.to_datetime(
        data["measurement_date"],
        errors="coerce"
    )

    data = data.dropna(subset=["measurement_date"])

    if data.empty:
        return "Dados insuficientes"

    latest_date = data["measurement_date"].max()

    latest = data[data["measurement_date"] == latest_date]

    categories = latest["assessment_category"].tolist()

    if "Desvio elevado" in categories:
        return "Desvio elevado"

    if "Atenção" in categories:
        return "Atenção"

    if categories and all(x == "Normal" for x in categories):
        return "Normal"

    return "Dados insuficientes"


def render_category_card(title, icon, status, lines, accent):

    content = "".join(
        f"<p>{line}</p>" for line in lines
    )

    st.markdown(
        f"""
        <div class="category-card"
             style="border-top: 3px solid {accent};">
            <h4>{icon} {title}</h4>
            {status_badge(status)}
            <div style="margin-top:12px;">
                {content}
            </div>
        </div>
        """,
        unsafe_allow_html=True
    )


def assessment_text(status):

    descriptions = {
        "Normal": "Indicadores dentro do padrão individual observado.",
        "Atenção": "Alguns indicadores merecem acompanhamento.",
        "Desvio elevado": "Foi identificado um desvio importante do padrão individual.",
        "Dados insuficientes": "Não há dados suficientes para avaliar."
    }

    return descriptions.get(status, "Avaliação indisponível.")


# =====================================================
# HEADER
# =====================================================

header_left, header_right = st.columns([2.3, 1.7])

with header_left:
    st.markdown(
        """
        # Astronaut Health Monitoring
        Acompanhamento integrado de saúde dos tripulantes ao longo da missão.
        """
    )

with header_right:
    st.markdown(
        """
        <div style="
            background:#151F33;
            border:1px solid #293650;
            border-radius:12px;
            padding:15px;
            text-align:right;
            ">
            <span class="small-muted">ATHENANCE | SPACE HEALTH MONITOR</span>
            <br>
            <b>Mission Health Center</b>
        </div>
        """,
        unsafe_allow_html=True
    )


st.divider()


# =====================================================
# CREW SELECTION
# =====================================================

st.markdown("### Tripulante")

crew_options = {
    f"{row['name']} — {row['role']}": int(row["crew_member_id"])
    for _, row in crew_df.iterrows()
}

selected_name = st.selectbox(
    "Selecione o tripulante",
    list(crew_options.keys()),
    label_visibility="collapsed"
)

crew_id = crew_options[selected_name]

selected_crew = crew_df[
    crew_df["crew_member_id"] == crew_id
].iloc[0]


# =====================================================
# FILTER DATA
# =====================================================

crew_vital = vital_df[
    vital_df["crew_member_id"] == crew_id
].copy()

crew_mental = mental_df[
    mental_df["crew_member_id"] == crew_id
].copy()

crew_lab = lab_df[
    lab_df["crew_member_id"] == crew_id
].copy()

crew_radiation = radiation_df[
    radiation_df["crew_member_id"] == crew_id
].copy()


latest_vital = latest_record(crew_vital)
latest_mental = latest_record(crew_mental)
latest_lab = latest_record(crew_lab)
latest_radiation = latest_record(crew_radiation)

latest_environment = latest_record(environment_df)


# =====================================================
# CATEGORY STATUSES
# =====================================================

vital_status = get_category_status(
    vital_assessment,
    crew_id,
    VITAL_STATUS_METRICS
)

mental_status = get_category_status(
    mental_assessment,
    crew_id,
    MENTAL_METRICS
)

# No validated assessment rules exist yet for these categories.
lab_status = "Sem avaliação"
radiation_status = "Sem avaliação"
environment_status = "Sem avaliação"


evaluated_statuses = [
    status for status in [vital_status, mental_status]
    if status != "Dados insuficientes"
]

if "Desvio elevado" in evaluated_statuses:
    overall_status = "Desvio elevado"
elif "Atenção" in evaluated_statuses:
    overall_status = "Atenção"
elif evaluated_statuses and all(
    status == "Normal" for status in evaluated_statuses
):
    overall_status = "Normal"
else:
    overall_status = "Dados insuficientes"


# =====================================================
# CREW PROFILE
# =====================================================

st.markdown('<div class="profile-card">', unsafe_allow_html=True)

profile_col1, profile_col2, profile_col3 = st.columns([1.1, 1.1, 2])

with profile_col1:
    st.markdown(f"### 👩‍🚀 {selected_crew['name']}")

with profile_col2:
    st.markdown("**Status geral**")
    st.markdown(status_badge(overall_status), unsafe_allow_html=True)

with profile_col3:
    if latest_vital is not None:
        last_date = latest_vital["measurement_date"]
        st.markdown(
            f"**Último registro:** {last_date.strftime('%d/%m/%Y %H:%M')}"
        )

        if "mission_phase" in latest_vital.index:
            st.caption(f"Fase: {latest_vital['mission_phase']}")

st.markdown("</div>", unsafe_allow_html=True)

st.info(assessment_text(overall_status))


# =====================================================
# CATEGORY CARDS
# =====================================================

st.markdown("### Indicadores por categoria")

c1, c2, c3, c4, c5 = st.columns(5)

with c1:
    if latest_vital is not None:
        vital_lines = [
            f"FC: {format_value(latest_vital.get('heart_rate_bpm'), 'bpm')}",
            f"PA: {format_value(latest_vital.get('systolic_pressure_mmhg'), 'mmHg')} / "
            f"{format_value(latest_vital.get('diastolic_pressure_mmhg'), 'mmHg')}",
            f"Temp.: {format_value(latest_vital.get('body_temperature_c'), '°C')}",
            f"SpO₂: {format_value(latest_vital.get('blood_oxygen_saturation_pct'), '%')}"
        ]
    else:
        vital_lines = ["Nenhum registro disponível"]

    with st.container():
        render_category_card(
            "Sinais Vitais", "❤️", vital_status,
            vital_lines, "#E46B75"
        )

with c2:
    if latest_mental is not None:
        mental_lines = [
            f"Sono: {format_value(latest_mental.get('sleep_duration_hours'), 'h')}",
            f"Eficiência: {format_value(latest_mental.get('sleep_efficiency_pct'), '%')}",
            f"Estresse: {format_value(latest_mental.get('perceived_stress_1_5'), '/5')}",
            f"Humor: {format_value(latest_mental.get('mood_self_report_1_5'), '/5')}"
        ]
    else:
        mental_lines = ["Nenhum registro disponível"]

    render_category_card(
        "Saúde Mental", "🧠", mental_status,
        mental_lines, "#A78BFA"
    )

with c3:
    if latest_lab is not None:
        lab_lines = [
            f"Exame: {latest_lab.get('analyte_name', 'N/D')}",
            f"Resultado: {latest_lab.get('result_value', 'N/D')}",
            f"Unidade: {latest_lab.get('unit', 'N/D')}"
        ]
    else:
        lab_lines = ["Nenhum resultado registrado"]

    render_category_card(
        "Laboratorial", "🧪", lab_status,
        lab_lines, "#38BDF8"
    )

with c4:
    if latest_radiation is not None:
        radiation_lines = [
            f"Taxa de dose: {format_value(latest_radiation.get('dose_equivalent_rate_uSv_h'), 'µSv/h')}",
            f"Dose cumulativa: {format_value(latest_radiation.get('cumulative_effective_dose_mSv'), 'mSv')}",
            f"Dosímetro: {latest_radiation.get('dosimeter_id', 'N/D')}"
        ]
    else:
        radiation_lines = ["Nenhuma medição registrada"]

    render_category_card(
        "Radiação", "☢️", radiation_status,
        radiation_lines, "#EAB308"
    )

with c5:
    if latest_environment is not None:
        environment_lines = [
            f"CO₂: {format_value(latest_environment.get('cabin_co2_ppm'), 'ppm')}",
            f"Umidade: {format_value(latest_environment.get('cabin_relative_humidity_pct'), '%')}",
            f"Cabine: {latest_environment.get('cabin_id', 'N/D')}"
        ]
    else:
        environment_lines = ["Nenhuma medição registrada"]

    render_category_card(
        "Ambiente", "🌎", environment_status,
        environment_lines, "#22D3EE"
    )


# =====================================================
# DETAILED METRIC ANALYSIS
# =====================================================

st.divider()

st.markdown("### Análise detalhada")

analysis_left, analysis_right = st.columns([3, 1])

with analysis_left:

    available_metrics = [
        metric for metric in VITAL_METRICS
        if metric in crew_vital.columns
    ]

    selected_metric = st.selectbox(
        "Selecione um indicador",
        available_metrics,
        format_func=lambda x: METRIC_LABELS[x]
    )

    metric_history = crew_vital[
        ["measurement_date", selected_metric]
    ].dropna().copy()

    metric_history = metric_history.sort_values(
        "measurement_date"
    )

    metric_history = metric_history.rename(
        columns={selected_metric: METRIC_LABELS[selected_metric]}
    )

    baseline_row = vital_baseline[
        (vital_baseline["crew_member_id"] == crew_id)
        & (vital_baseline["metric"] == selected_metric)
    ]

    if not metric_history.empty:
        st.markdown(
            f"**{METRIC_LABELS[selected_metric]} — Histórico da missão**"
        )

        st.line_chart(
            metric_history.set_index("measurement_date"),
            height=320
        )

with analysis_right:

    if not metric_history.empty:

        values = metric_history[
            METRIC_LABELS[selected_metric]
        ]

        st.markdown("#### Estatísticas")

        st.metric(
            "Último valor",
            format_value(values.iloc[-1], METRIC_UNITS[selected_metric])
        )

        st.metric(
            "Média da missão",
            format_value(values.mean(), METRIC_UNITS[selected_metric])
        )

        st.metric(
            "Mínimo",
            format_value(values.min(), METRIC_UNITS[selected_metric])
        )

        st.metric(
            "Máximo",
            format_value(values.max(), METRIC_UNITS[selected_metric])
        )

        if not baseline_row.empty:
            baseline_value = baseline_row.iloc[0]["baseline_mean"]

            st.metric(
                "Padrão individual",
                format_value(
                    baseline_value,
                    METRIC_UNITS[selected_metric]
                )
            )


# =====================================================
# RECENT ALERTS
# =====================================================

st.divider()

st.markdown("### Alertas recentes")

vital_alerts = vital_assessment[
    (vital_assessment["crew_member_id"] == crew_id)
    & (vital_assessment["assessment_category"].isin(
        ["Atenção", "Desvio elevado"]
    ))
].copy()

mental_alerts = mental_assessment[
    (mental_assessment["crew_member_id"] == crew_id)
    & (mental_assessment["assessment_category"].isin(
        ["Atenção", "Desvio elevado"]
    ))
].copy()

alerts = pd.concat(
    [vital_alerts, mental_alerts],
    ignore_index=True
)

if alerts.empty:
    st.success("Nenhum desvio estatístico recente identificado.")

else:

    alerts["measurement_date"] = pd.to_datetime(
        alerts["measurement_date"],
        errors="coerce"
    )

    alerts = alerts.sort_values(
        "measurement_date",
        ascending=False
    ).head(8)

    for _, alert in alerts.iterrows():

        metric = alert["metric"]
        status = alert["assessment_category"]

        icon = "⚠️" if status == "Atenção" else "🔴"

        st.markdown(
            f"""
            <div class="category-card" style="margin-bottom:8px;">
                <b>{icon} {METRIC_LABELS.get(metric, metric)}</b>
                {status_badge(status)}
                <p class="small-muted">
                    Registro: {alert['measurement_date'].strftime('%d/%m/%Y')}
                </p>
            </div>
            """,
            unsafe_allow_html=True
        )


# =====================================================
# FOOTER
# =====================================================

st.divider()

st.caption(
    "ATHENANCE | NASA SPACE APPS CHALLENGE 2026 | "
    "Synthetic data demonstration"
)
