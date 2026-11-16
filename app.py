
import streamlit as st

from utils.data_loader import (
    get_crew_members,
    get_missions,
    get_vital_signs,
    get_mental_health
)


# ==========================================
# CONFIGURAÇÃO DA PÁGINA
# ==========================================

st.set_page_config(
    page_title="Athenance | Health Monitoring",
    page_icon="🚀",
    layout="wide",
    initial_sidebar_state="expanded"
)


# ==========================================
# CARREGAMENTO DOS DADOS
# ==========================================

@st.cache_data
def load_platform_data():

    crew = get_crew_members()
    missions = get_missions()
    vital_signs = get_vital_signs()
    mental_health = get_mental_health()

    return crew, missions, vital_signs, mental_health


crew, missions, vital_signs, mental_health = load_platform_data()


# ==========================================
# MENU LATERAL
# ==========================================

st.sidebar.title("🚀 ATHENANCE")

st.sidebar.caption("SPACE HEALTH INTELLIGENCE")

st.sidebar.divider()

st.sidebar.markdown("### Navigation")

page = st.sidebar.radio(
    "Select a module",
    [
        "Mission Overview",
        "Crew Health Monitoring",
        "Data Collection"
    ]
)

st.sidebar.divider()

st.sidebar.caption(
    "NASA Space Apps Challenge 2026"
)


# ==========================================
# CABEÇALHO
# ==========================================

st.title("🚀 Athenance Health Monitoring")

st.markdown(
    """
    ### Astronaut Health Intelligence Platform

    An integrated platform for monitoring astronaut health,
    identifying deviations from individual baselines and
    exploring health trends throughout space missions.
    """
)

st.divider()


# ==========================================
# INDICADORES GERAIS
# ==========================================

st.subheader("Mission Snapshot")

col1, col2, col3, col4 = st.columns(4)

with col1:
    st.metric(
        label="Crew Members",
        value=len(crew)
    )

with col2:
    st.metric(
        label="Missions",
        value=len(missions)
    )

with col3:
    st.metric(
        label="Vital Signs Records",
        value=f"{len(vital_signs):,}"
    )

with col4:
    st.metric(
        label="Mental Health Records",
        value=f"{len(mental_health):,}"
    )


st.divider()


# ==========================================
# CONTEÚDO PRINCIPAL
# ==========================================

st.subheader("Platform Modules")

col1, col2, col3 = st.columns(3)

with col1:
    st.markdown("### 🛰️ Mission Overview")
    st.write(
        "Explore mission-wide health indicators, "
        "environmental conditions and longitudinal trends."
    )

with col2:
    st.markdown("### 👩‍🚀 Crew Health Monitoring")
    st.write(
        "Monitor individual astronaut health, "
        "compare measurements against personal baselines "
        "and identify relevant deviations."
    )

with col3:
    st.markdown("### 📡 Data Collection")
    st.write(
        "Explore health measurements and manage "
        "the data collected throughout the mission."
    )


st.divider()

st.caption(
    "Athenance | NASA Space Apps Challenge 2026 | "
    "Synthetic data demonstration"
)
