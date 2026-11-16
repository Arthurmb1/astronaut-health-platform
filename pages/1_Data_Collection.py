
from pathlib import Path
from datetime import datetime, date, time

import pandas as pd
import streamlit as st

from utils.data_loader import (
    get_crew_members,
    get_missions,
    get_mission_phases,
    get_vital_signs,
    get_mental_health,
    get_lab_results,
    get_radiation_exposure,
    get_environmental_data
)


# =====================================================
# CONFIGURATION
# =====================================================

st.set_page_config(
    page_title="Data Collection | Athenance",
    page_icon="📡",
    layout="wide"
)

DATA_DIR = Path(__file__).resolve().parents[1] / "data"


# =====================================================
# VISUAL STYLE
# =====================================================

st.markdown("""
<style>
.block-container {
    padding-top: 2rem;
    padding-bottom: 3rem;
}

.hero {
    padding: 30px;
    border-radius: 16px;
    background: linear-gradient(120deg, #10243A, #174B68);
    color: white;
    margin-bottom: 25px;
}

.hero h1 {
    color: white;
    font-size: 34px;
}

.hero p {
    color: #D7E6EF;
    font-size: 16px;
}

.section-card {
    padding: 18px;
    border: 1px solid rgba(128,128,128,0.25);
    border-radius: 12px;
    background: rgba(128,128,128,0.04);
}

.help-text {
    color: #8A9BAA;
    font-size: 13px;
}
</style>
""", unsafe_allow_html=True)


# =====================================================
# DATA LOADING
# =====================================================

@st.cache_data
def load_reference_data():
    return {
        "crew": get_crew_members(),
        "missions": get_missions(),
        "phases": get_mission_phases()
    }


reference = load_reference_data()

crew_df = reference["crew"]
missions_df = reference["missions"]
phases_df = reference["phases"]


# =====================================================
# HELPER FUNCTIONS
# =====================================================

def append_record(filename, record):
    """
    Adds one record to an existing CSV without
    deleting previous records or changing its columns.
    """

    path = DATA_DIR / filename

    if not path.exists():
        raise FileNotFoundError(f"Dataset not found: {path}")

    existing = pd.read_csv(path)

    unknown_columns = set(record) - set(existing.columns)

    if unknown_columns:
        raise ValueError(
            f"Unknown columns in {filename}: {unknown_columns}"
        )

    new_record = pd.DataFrame(
        [{column: record.get(column, None)
          for column in existing.columns}]
    )

    updated = pd.concat(
        [existing, new_record],
        ignore_index=True
    )

    updated.to_csv(path, index=False)


def get_crew_options():
    return {
        f"{row['name']} — {row['role']}": row
        for _, row in crew_df.iterrows()
    }


def get_phase_options():
    return sorted(
        phases_df["mission_phase"].dropna().unique().tolist()
    )


def get_common_fields(key_prefix):
    st.markdown("#### Mission information")

    crew_options = get_crew_options()

    selected_name = st.selectbox(
        "Crew member",
        list(crew_options.keys()),
        key=f"{key_prefix}_crew"
    )

    astronaut = crew_options[selected_name]

    measurement_date = st.date_input(
        "Measurement date",
        value=date.today(),
        key=f"{key_prefix}_date"
    )

    measurement_time = st.time_input(
        "Measurement time",
        value=time(12, 0),
        key=f"{key_prefix}_time"
    )

    phases = get_phase_options()

    selected_phase = st.selectbox(
        "Mission phase",
        phases,
        key=f"{key_prefix}_phase"
    )

    timestamp = datetime.combine(
        measurement_date,
        measurement_time
    ).isoformat()

    return {
        "crew_member_id": int(astronaut["crew_member_id"]),
        "mission_id": str(astronaut["mission_id"]),
        "measurement_date": timestamp,
        "mission_phase": selected_phase
    }


def save_feedback(filename, record):
    try:
        append_record(filename, record)

        st.cache_data.clear()

        st.success("Record successfully saved!")

        st.info(
            "The new measurement has been added to the dataset."
        )

    except Exception as error:
        st.error(f"Unable to save record: {error}")


def show_history(title, dataframe):
    st.markdown(f"### {title}")

    st.write(
        f"Currently stored records: **{len(dataframe):,}**"
    )

    if dataframe.empty:
        st.info("No records available.")
        return

    st.dataframe(
        dataframe.tail(100).iloc[::-1],
        use_container_width=True,
        hide_index=True
    )

    st.download_button(
        "Download CSV",
        dataframe.to_csv(index=False).encode("utf-8"),
        file_name=f"{title.lower().replace(' ', '_')}.csv",
        mime="text/csv",
        key=f"download_{title}"
    )


# =====================================================
# HEADER
# =====================================================

st.markdown("""
<div class="hero">
    <h1>📡 Data Collection</h1>
    <p>
        Register and manage astronaut health and
        environmental measurements throughout the mission.
    </p>
</div>
""", unsafe_allow_html=True)

st.write(
    "Choose a category below to register a new measurement. "
    "Each record will be stored in its corresponding dataset."
)


# =====================================================
# TABS
# =====================================================

tabs = st.tabs([
    "❤️ Vital Signs",
    "🧠 Mental Health",
    "🧪 Laboratory",
    "☢️ Radiation",
    "🌎 Environment",
    "📋 Data History"
])


# =====================================================
# TAB 1 — VITAL SIGNS
# =====================================================

with tabs[0]:

    st.subheader("Vital Signs Registration")

    st.caption(
        "Record the astronaut's physical health measurements."
    )

    with st.form("vital_signs_form"):

        common = get_common_fields("vital")

        st.divider()

        st.markdown("#### Physical measurements")

        col1, col2 = st.columns(2)

        with col1:
            heart_rate = st.number_input(
                "Heart rate (bpm)",
                min_value=25.0,
                max_value=220.0,
                value=72.0
            )

            systolic = st.number_input(
                "Systolic pressure (mmHg)",
                min_value=50.0,
                max_value=260.0,
                value=120.0
            )

            temperature = st.number_input(
                "Body temperature (°C)",
                min_value=30.0,
                max_value=43.0,
                value=36.5
            )

            oxygen = st.number_input(
                "Blood oxygen saturation (%)",
                min_value=50.0,
                max_value=100.0,
                value=98.0
            )

        with col2:
            diastolic = st.number_input(
                "Diastolic pressure (mmHg)",
                min_value=30.0,
                max_value=160.0,
                value=80.0
            )

            body_mass = st.number_input(
                "Body mass (kg)",
                min_value=25.0,
                max_value=250.0,
                value=70.0
            )

            glucose = st.number_input(
                "Capillary glucose (mg/dL)",
                min_value=20.0,
                max_value=600.0,
                value=90.0
            )

        context = st.text_input(
            "Measurement context",
            placeholder="Example: Resting, after exercise..."
        )

        source = st.text_input(
            "Measurement source",
            value="Manual entry"
        )

        submitted = st.form_submit_button(
            "Save Vital Signs",
            use_container_width=True
        )

        if submitted:

            if systolic <= diastolic:
                st.error(
                    "Systolic pressure must be greater than "
                    "diastolic pressure."
                )

            else:
                record = {
                    **common,
                    "heart_rate_bpm": heart_rate,
                    "systolic_pressure_mmhg": systolic,
                    "diastolic_pressure_mmhg": diastolic,
                    "body_temperature_c": temperature,
                    "blood_oxygen_saturation_pct": oxygen,
                    "body_mass_kg": body_mass,
                    "capillary_glucose_mg_dl": glucose,
                    "measurement_context": context,
                    "measurement_source": source
                }

                save_feedback("vital_signs.csv", record)


# =====================================================
# TAB 2 — MENTAL HEALTH
# =====================================================

with tabs[1]:

    st.subheader("Mental Health & Sleep Registration")

    st.caption(
        "Record sleep, psychological well-being and "
        "cognitive performance indicators."
    )

    with st.form("mental_health_form"):

        common = get_common_fields("mental")

        st.divider()

        col1, col2 = st.columns(2)

        with col1:
            sleep_duration = st.number_input(
                "Sleep duration (hours)",
                min_value=0.0,
                max_value=24.0,
                value=8.0
            )

            sleep_efficiency = st.number_input(
                "Sleep efficiency (%)",
                min_value=0.0,
                max_value=100.0,
                value=90.0
            )

            mood = st.select_slider(
                "Self-reported mood",
                options=[1, 2, 3, 4, 5],
                value=3,
                help="Illustrative scale: 1 = lowest, 5 = highest."
            )

        with col2:
            stress = st.select_slider(
                "Perceived stress",
                options=[1, 2, 3, 4, 5],
                value=3,
                help="Illustrative scale: 1 = lowest, 5 = highest."
            )

            reaction_time = st.number_input(
                "Median reaction time (ms)",
                min_value=50.0,
                max_value=3000.0,
                value=300.0
            )

        source = st.text_input(
            "Measurement source",
            value="Manual entry"
        )

        scale = st.text_input(
            "Self-report scale",
            value="Illustrative 1-5 scale"
        )

        submitted = st.form_submit_button(
            "Save Mental Health Data",
            use_container_width=True
        )

        if submitted:

            record = {
                **common,
                "sleep_duration_hours": sleep_duration,
                "sleep_efficiency_pct": sleep_efficiency,
                "mood_self_report_1_5": mood,
                "perceived_stress_1_5": stress,
                "psychomotor_reaction_time_median_ms": reaction_time,
                "self_report_scale": scale,
                "measurement_source": source
            }

            save_feedback("mental_health.csv", record)


# =====================================================
# TAB 3 — LABORATORY
# =====================================================

with tabs[2]:

    st.subheader("Laboratory Results Registration")

    st.caption(
        "Register biological measurements and laboratory results."
    )

    with st.form("laboratory_form"):

        crew_options = get_crew_options()

        selected_name = st.selectbox(
            "Crew member",
            list(crew_options.keys()),
            key="lab_crew"
        )

        astronaut = crew_options[selected_name]

        sample_date = st.date_input(
            "Sample date",
            value=date.today(),
            key="lab_date"
        )

        st.divider()

        col1, col2 = st.columns(2)

        with col1:
            analyte_code = st.text_input(
                "Analyte code",
                placeholder="Example: WBC"
            )

            analyte_name = st.text_input(
                "Analyte name",
                placeholder="Example: White blood cells"
            )

            result_value = st.number_input(
                "Result value",
                value=0.0,
                format="%.4f"
            )

            unit = st.text_input(
                "Unit",
                placeholder="Example: cells/uL"
            )

        with col2:
            qualifier = st.selectbox(
                "Result qualifier",
                ["=", "<", ">", "Not detected", "Not quantified"]
            )

            detection_limit = st.number_input(
                "Detection limit (optional; 0 = not provided)",
                min_value=0.0,
                value=0.0
            )

            reference_min = st.number_input(
                "Reference minimum (optional; 0 = not provided)",
                value=0.0
            )

            reference_max = st.number_input(
                "Reference maximum (optional; 0 = not provided)",
                value=0.0
            )

        method = st.text_input(
            "Laboratory method",
            placeholder="Example: Blood assay"
        )

        reference_note = st.text_input(
            "Reference notes",
            placeholder="Laboratory-specific reference information"
        )

        submitted = st.form_submit_button(
            "Save Laboratory Result",
            use_container_width=True
        )

        if submitted:

            if not analyte_name.strip() or not unit.strip():
                st.error("Analyte name and unit are required.")

            elif (
                reference_min != 0
                and reference_max != 0
                and reference_min > reference_max
            ):
                st.error(
                    "Reference minimum cannot exceed reference maximum."
                )

            else:
                existing = get_lab_results()

                next_id = (
                    int(existing["lab_result_id"].max()) + 1
                    if not existing.empty else 1
                )

                record = {
                    "lab_result_id": next_id,
                    "crew_member_id": int(astronaut["crew_member_id"]),
                    "mission_id": str(astronaut["mission_id"]),
                    "sample_date": sample_date.isoformat(),
                    "analyte_code": analyte_code,
                    "analyte_name": analyte_name,
                    "result_value": result_value,
                    "unit": unit,
                    "result_qualifier": qualifier,
                    "detection_limit": (
                        detection_limit if detection_limit != 0 else None
                    ),
                    "method": method,
                    "reference_min": (
                        reference_min if reference_min != 0 else None
                    ),
                    "reference_max": (
                        reference_max if reference_max != 0 else None
                    ),
                    "reference_note": reference_note
                }

                save_feedback("lab_results.csv", record)


# =====================================================
# TAB 4 — RADIATION
# =====================================================

with tabs[3]:

    st.subheader("Radiation Exposure Registration")

    st.caption(
        "Record radiation dose rate and cumulative exposure."
    )

    with st.form("radiation_form"):

        common = get_common_fields("radiation")

        st.divider()

        col1, col2 = st.columns(2)

        with col1:
            dose_rate = st.number_input(
                "Dose equivalent rate (µSv/h)",
                min_value=0.0,
                max_value=10000.0,
                value=10.0
            )

            cumulative_dose = st.number_input(
                "Cumulative effective dose (mSv)",
                min_value=0.0,
                max_value=100000.0,
                value=0.0
            )

        with col2:
            dosimeter = st.text_input(
                "Dosimeter ID",
                placeholder="Example: DOS-001"
            )

            interval = st.number_input(
                "Integration interval (hours)",
                min_value=0.0,
                value=1.0
            )

        source = st.text_input(
            "Measurement source",
            value="Manual entry"
        )

        submitted = st.form_submit_button(
            "Save Radiation Data",
            use_container_width=True
        )

        if submitted:

            record = {
                "crew_member_id": common["crew_member_id"],
                "mission_id": common["mission_id"],
                "measurement_date": common["measurement_date"],
                "dose_equivalent_rate_uSv_h": dose_rate,
                "cumulative_effective_dose_mSv": cumulative_dose,
                "dosimeter_id": dosimeter,
                "integration_interval_hours": interval,
                "measurement_source": source
            }

            save_feedback("radiation_exposure.csv", record)


# =====================================================
# TAB 5 — ENVIRONMENT
# =====================================================

with tabs[4]:

    st.subheader("Environmental Data Registration")

    st.caption(
        "Record environmental conditions inside the spacecraft cabin."
    )

    with st.form("environment_form"):

        mission_options = {
            row["mission_name"]: row
            for _, row in missions_df.iterrows()
        }

        selected_mission = st.selectbox(
            "Mission",
            list(mission_options.keys())
        )

        mission = mission_options[selected_mission]

        measurement_date = st.date_input(
            "Measurement date",
            value=date.today(),
            key="environment_date"
        )

        measurement_time = st.time_input(
            "Measurement time",
            value=time(12, 0),
            key="environment_time"
        )

        st.divider()

        col1, col2 = st.columns(2)

        with col1:
            co2 = st.number_input(
                "Cabin CO₂ concentration (ppm)",
                min_value=0.0,
                max_value=10000.0,
                value=400.0
            )

        with col2:
            humidity = st.number_input(
                "Relative humidity (%)",
                min_value=0.0,
                max_value=100.0,
                value=45.0
            )

        cabin = st.text_input(
            "Cabin ID",
            value="CABIN-01"
        )

        sensor = st.text_input(
            "Sensor ID",
            value="SENSOR-01"
        )

        source = st.text_input(
            "Measurement source",
            value="Manual entry"
        )

        submitted = st.form_submit_button(
            "Save Environmental Data",
            use_container_width=True
        )

        if submitted:

            timestamp = datetime.combine(
                measurement_date,
                measurement_time
            ).isoformat()

            record = {
                "mission_id": str(mission["mission_id"]),
                "measurement_date": timestamp,
                "cabin_id": cabin,
                "sensor_id": sensor,
                "cabin_co2_ppm": co2,
                "cabin_relative_humidity_pct": humidity,
                "measurement_source": source
            }

            save_feedback("environmental_data.csv", record)


# =====================================================
# TAB 6 — DATA HISTORY
# =====================================================

with tabs[5]:

    st.subheader("Data History")

    st.caption(
        "Explore previously registered measurements."
    )

    history_options = {
        "Vital Signs": get_vital_signs,
        "Mental Health": get_mental_health,
        "Laboratory Results": get_lab_results,
        "Radiation Exposure": get_radiation_exposure,
        "Environmental Data": get_environmental_data
    }

    selected_history = st.selectbox(
        "Select a data category",
        list(history_options.keys())
    )

    history_df = history_options[selected_history]()

    show_history(
        selected_history,
        history_df
    )


# =====================================================
# FOOTER
# =====================================================

st.divider()

st.caption(
    "ATHENANCE | NASA SPACE APPS CHALLENGE 2026 | "
    "Synthetic data demonstration"
)
