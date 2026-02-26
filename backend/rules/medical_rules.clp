;;; Medical Expert System Rules
;;; These rules evaluate patient symptoms and provide preliminary diagnoses.

;;; Template for patient symptoms
(deftemplate patient
   (slot name (type STRING))
   (slot age (type INTEGER))
   (slot gender (type STRING))
   (multislot symptoms)
   (slot severity (type STRING) (default "moderate")))

;;; Template for diagnosis output
(deftemplate diagnosis
   (slot condition (type STRING))
   (slot confidence (type STRING))
   (slot recommendation (type STRING))
   (slot urgency (type STRING)))

;;; Rule: High Fever + Cough + Fatigue => Possible Influenza
(defrule influenza-check
   (patient (symptoms $? fever $?) (symptoms $? cough $?) (symptoms $? fatigue $?))
   =>
   (assert (diagnosis
      (condition "Influenza (Flu)")
      (confidence "High")
      (recommendation "Rest, hydration, antiviral medication (e.g., Oseltamivir). Monitor temperature. Seek emergency care if breathing difficulty develops.")
      (urgency "Moderate"))))

;;; Rule: Chest Pain + Shortness of Breath => Possible Cardiac Event
(defrule cardiac-check
   (patient (symptoms $? chest-pain $?) (symptoms $? shortness-of-breath $?))
   =>
   (assert (diagnosis
      (condition "Possible Cardiac Event")
      (confidence "High")
      (recommendation "Immediate medical attention required. Call emergency services. Do not exert yourself. Take aspirin if not allergic.")
      (urgency "Critical"))))

;;; Rule: Headache + Nausea + Sensitivity to Light => Possible Migraine
(defrule migraine-check
   (patient (symptoms $? headache $?) (symptoms $? nausea $?) (symptoms $? light-sensitivity $?))
   =>
   (assert (diagnosis
      (condition "Migraine")
      (confidence "Moderate")
      (recommendation "Rest in a dark, quiet room. Over-the-counter pain relievers (ibuprofen, acetaminophen). Consider prescription triptans if recurrent.")
      (urgency "Low"))))

;;; Rule: Joint Pain + Swelling + Morning Stiffness => Possible Arthritis
(defrule arthritis-check
   (patient (symptoms $? joint-pain $?) (symptoms $? swelling $?) (symptoms $? morning-stiffness $?))
   =>
   (assert (diagnosis
      (condition "Rheumatoid Arthritis")
      (confidence "Moderate")
      (recommendation "Anti-inflammatory medication (NSAIDs). Physical therapy. Consult a rheumatologist for disease-modifying therapy.")
      (urgency "Moderate"))))

;;; Rule: Frequent Urination + Excessive Thirst + Fatigue => Possible Diabetes
(defrule diabetes-check
   (patient (symptoms $? frequent-urination $?) (symptoms $? excessive-thirst $?) (symptoms $? fatigue $?))
   =>
   (assert (diagnosis
      (condition "Type 2 Diabetes Mellitus")
      (confidence "Moderate")
      (recommendation "Blood glucose testing recommended. Dietary modifications, regular exercise. Consult endocrinologist for HbA1c testing.")
      (urgency "Moderate"))))

;;; Rule: Persistent Cough + Weight Loss + Night Sweats => Possible Tuberculosis
(defrule tuberculosis-check
   (patient (symptoms $? persistent-cough $?) (symptoms $? weight-loss $?) (symptoms $? night-sweats $?))
   =>
   (assert (diagnosis
      (condition "Tuberculosis (TB)")
      (confidence "Moderate")
      (recommendation "Chest X-ray and sputum test required. Isolation precautions. Start anti-TB therapy (RIPE regimen) upon confirmation.")
      (urgency "High"))))

;;; Rule: Skin Rash + Fever + Joint Pain => Possible Autoimmune Condition
(defrule autoimmune-check
   (patient (symptoms $? skin-rash $?) (symptoms $? fever $?) (symptoms $? joint-pain $?))
   =>
   (assert (diagnosis
      (condition "Systemic Lupus Erythematosus (SLE)")
      (confidence "Low")
      (recommendation "ANA blood test recommended. Dermatological evaluation. Avoid sun exposure. Consult rheumatologist.")
      (urgency "Moderate"))))

;;; Fallback Rule: No specific match
(defrule general-assessment
   (patient (name ?n))
   (not (diagnosis))
   =>
   (assert (diagnosis
      (condition "General Assessment Required")
      (confidence "Low")
      (recommendation "Symptoms do not match a specific pattern. Comprehensive physical examination and laboratory workup recommended.")
      (urgency "Low"))))
