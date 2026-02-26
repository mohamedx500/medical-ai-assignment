import os

# Try to import clips; provide fallback if clipspy is not installed
try:
    import clips

    CLIPS_AVAILABLE = True
except ImportError:
    CLIPS_AVAILABLE = False

RULES_PATH = os.path.join(os.path.dirname(__file__), "..", "rules", "medical_rules.clp")


def run_diagnosis(
    name: str, age: int, gender: str, symptoms: list[str], severity: str
) -> list[dict]:
    """Run CLIPS expert system with patient data and return diagnoses."""

    if not CLIPS_AVAILABLE:
        # Fallback: simulate CLIPS output when clipspy is not installed
        return _simulate_clips(name, age, gender, symptoms, severity)

    env = clips.Environment()
    env.load(RULES_PATH)

    # Build the symptom string for CLIPS multislot
    symptom_str = " ".join(symptoms)

    # Assert patient fact
    fact_str = f'(patient (name "{name}") (age {age}) (gender "{gender}") (symptoms {symptom_str}) (severity "{severity}"))'
    env.assert_string(fact_str)

    # Run the engine
    env.run()

    # Collect diagnosis facts
    diagnoses = []
    for fact in env.facts():
        if fact.template and fact.template.name == "diagnosis":
            diagnoses.append(
                {
                    "condition": str(fact["condition"]),
                    "confidence": str(fact["confidence"]),
                    "recommendation": str(fact["recommendation"]),
                    "urgency": str(fact["urgency"]),
                }
            )

    if not diagnoses:
        diagnoses.append(
            {
                "condition": "No Specific Match",
                "confidence": "Low",
                "recommendation": "Comprehensive physical examination and laboratory workup recommended.",
                "urgency": "Low",
            }
        )

    return diagnoses


def _simulate_clips(
    name: str, age: int, gender: str, symptoms: list[str], severity: str
) -> list[dict]:
    """Simulated CLIPS output for development without clipspy installed."""
    results = []

    symptom_set = set(s.lower().replace(" ", "-") for s in symptoms)

    # Simulated rule matching
    if {"fever", "cough", "fatigue"} & symptom_set == {"fever", "cough", "fatigue"}:
        results.append(
            {
                "condition": "Influenza (Flu)",
                "confidence": "High",
                "recommendation": "Rest, hydration, antiviral medication (e.g., Oseltamivir). Monitor temperature. Seek emergency care if breathing difficulty develops.",
                "urgency": "Moderate",
            }
        )

    if {"chest-pain", "shortness-of-breath"} & symptom_set == {
        "chest-pain",
        "shortness-of-breath",
    }:
        results.append(
            {
                "condition": "Possible Cardiac Event",
                "confidence": "High",
                "recommendation": "Immediate medical attention required. Call emergency services. Do not exert yourself. Take aspirin if not allergic.",
                "urgency": "Critical",
            }
        )

    if {"headache", "nausea", "light-sensitivity"} & symptom_set == {
        "headache",
        "nausea",
        "light-sensitivity",
    }:
        results.append(
            {
                "condition": "Migraine",
                "confidence": "Moderate",
                "recommendation": "Rest in a dark, quiet room. Over-the-counter pain relievers (ibuprofen, acetaminophen). Consider prescription triptans if recurrent.",
                "urgency": "Low",
            }
        )

    if {"joint-pain", "swelling", "morning-stiffness"} & symptom_set == {
        "joint-pain",
        "swelling",
        "morning-stiffness",
    }:
        results.append(
            {
                "condition": "Rheumatoid Arthritis",
                "confidence": "Moderate",
                "recommendation": "Anti-inflammatory medication (NSAIDs). Physical therapy. Consult a rheumatologist for disease-modifying therapy.",
                "urgency": "Moderate",
            }
        )

    if {"frequent-urination", "excessive-thirst", "fatigue"} & symptom_set == {
        "frequent-urination",
        "excessive-thirst",
        "fatigue",
    }:
        results.append(
            {
                "condition": "Type 2 Diabetes Mellitus",
                "confidence": "Moderate",
                "recommendation": "Blood glucose testing recommended. Dietary modifications, regular exercise. Consult endocrinologist for HbA1c testing.",
                "urgency": "Moderate",
            }
        )

    if not results:
        results.append(
            {
                "condition": "General Assessment Required",
                "confidence": "Low",
                "recommendation": "Symptoms do not match a specific pattern. Comprehensive physical examination and laboratory workup recommended.",
                "urgency": "Low",
            }
        )

    return results
