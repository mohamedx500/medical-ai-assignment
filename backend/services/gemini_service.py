"""
Gemini AI Service — Smart Model Fallback & Exponential Backoff
══════════════════════════════════════════════════════════════
Handles all interactions with the Google Gemini API for:
  • Symptom-based diagnosis
  • Medical image analysis

Resilience features:
  1. Model fallback array  (2.0-flash → 1.5-pro → 1.5-flash → 1.5-flash-8b)
  2. Per-model retry with exponential backoff + jitter
  3. Automatic retryDelay parsing from Google's 429 response
  4. Clean error propagation with typed exceptions
"""

from __future__ import annotations

import os
import re
import json
import asyncio
import logging
import random
from dataclasses import dataclass
from typing import Any, Sequence, Union

from google import genai
from google.genai import types
from google.genai.errors import ClientError, ServerError
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ─── Gemini Client ──────────────────────────────────────────────
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# ─── Model Fallback Chain (ordered by preference) ──────────────
MODELS: list[str] = [
    "gemini-2.5-flash",           # Primary — fast, generous quota, reliable
    "gemini-2.0-flash",           # Stable fallback
    "gemini-2.5-pro",             # Highly capable, for complex medical reasoning
    "gemini-2.0-flash-lite",      # Lightest, ultimate fallback
]

# ─── Retry Config ───────────────────────────────────────────────
MAX_RETRIES_PER_MODEL = 2     # Max retries on a single model before fallback
BASE_BACKOFF_SECONDS = 2.0    # Starting backoff duration
MAX_BACKOFF_SECONDS = 30.0    # Cap for exponential backoff
JITTER_RANGE = 0.5            # ± random jitter added to backoff


# ─── Custom Exceptions ─────────────────────────────────────────
class GeminiServiceError(Exception):
    """Base exception for Gemini service failures."""

    def __init__(self, message: str, status_code: int = 500, details: dict | None = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details or {}


class GeminiRateLimitError(GeminiServiceError):
    """All models exhausted their rate limits."""

    def __init__(self, tried_models: list[str]):
        super().__init__(
            message=(
                "All AI models are currently experiencing high traffic. "
                "Please try again in a few moments."
            ),
            status_code=429,
            details={
                "error": "all_models_rate_limited",
                "tried_models": tried_models,
                "retry_after": 30,
            },
        )


class GeminiAuthError(GeminiServiceError):
    """API key is invalid or missing."""

    def __init__(self, original_error: str = ""):
        super().__init__(
            message="Gemini API key is invalid or missing. Check your .env configuration.",
            status_code=503,
            details={"error": "api_key_invalid", "original_error": original_error[:200]},
        )


# ─── Helpers ────────────────────────────────────────────────────

def _parse_retry_delay(error_msg: str) -> float | None:
    """
    Extract the recommended retry delay from a Google 429 error message.
    Looks for patterns like:
      - "retryDelay": "22s"
      - "Please retry in 3.4s"
      - "Please retry in 22.434002029s"
    """
    # Pattern 1: JSON-style retryDelay
    match = re.search(r'"retryDelay":\s*"(\d+(?:\.\d+)?)s"', error_msg)
    if match:
        return float(match.group(1))

    # Pattern 2: Natural language "Please retry in Xs"
    match = re.search(r"retry in (\d+(?:\.\d+)?)s", error_msg, re.IGNORECASE)
    if match:
        return float(match.group(1))

    return None


def _compute_backoff(attempt: int, parsed_delay: float | None) -> float:
    """
    Compute the wait time before the next retry.
    Uses parsed delay from Google if available, otherwise exponential backoff + jitter.
    """
    if parsed_delay is not None:
        # Use Google's recommended delay + small buffer
        return min(parsed_delay + 1.0, MAX_BACKOFF_SECONDS)

    # Exponential backoff: 2s → 4s → 8s → 16s (capped at MAX)
    backoff = min(BASE_BACKOFF_SECONDS * (2 ** (attempt - 1)), MAX_BACKOFF_SECONDS)
    jitter = random.uniform(-JITTER_RANGE, JITTER_RANGE)
    return max(0.5, backoff + jitter)


def _is_rate_limit_error(error: ClientError) -> bool:
    """Check if a ClientError is a 429 rate-limit / RESOURCE_EXHAUSTED error."""
    error_msg = str(error).upper()
    status = getattr(error, "status", None) or getattr(error, "code", 0)
    return status == 429 or "RESOURCE_EXHAUSTED" in error_msg or "429" in error_msg


def _is_auth_error(error: ClientError) -> bool:
    """Check if a ClientError is an authentication / API key error."""
    error_msg = str(error).upper()
    status = getattr(error, "status", None) or getattr(error, "code", 0)
    return status in (401, 403) or "API_KEY" in error_msg


def _strip_code_fences(text: str) -> str:
    """Remove markdown code fences (```json ... ```) from Gemini output."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [line for line in lines if not line.strip().startswith("```")]
        text = "\n".join(lines).strip()
    return text


# ─── Core: Smart Fallback Engine ────────────────────────────────

@dataclass
class GeminiCallResult:
    """Result of a successful Gemini API call."""
    text: str
    model_used: str
    attempts: int


async def call_gemini_smart(
    contents: Union[str, list[Any]],
    models: Sequence[str] = MODELS,
    max_retries_per_model: int = MAX_RETRIES_PER_MODEL,
) -> GeminiCallResult:
    """
    Call Gemini API with Smart Model Fallback & Exponential Backoff.

    Strategy:
    ─────────
    1. Try each model in the fallback chain
    2. For each model, retry up to `max_retries_per_model` times on 429 errors
    3. Parse Google's recommended retryDelay for precise backoff timing
    4. On non-429 errors (400, 500, auth), fail immediately or skip model
    5. If ALL models are exhausted, raise GeminiRateLimitError

    Args:
        contents:  The prompt string or [prompt, image_part] list
        models:    Ordered list of model IDs to try
        max_retries_per_model:  Max 429 retries per individual model

    Returns:
        GeminiCallResult with the response text, model used, and attempt count

    Raises:
        GeminiRateLimitError:  All models hit rate limits
        GeminiAuthError:       API key is invalid
        GeminiServiceError:    Other unrecoverable error
    """
    tried_models: list[str] = []
    total_attempts = 0

    for model_index, model in enumerate(models):
        tried_models.append(model)

        for attempt in range(1, max_retries_per_model + 1):
            total_attempts += 1

            try:
                logger.info(
                    f"[Gemini] Calling model={model} "
                    f"(fallback {model_index + 1}/{len(models)}, "
                    f"attempt {attempt}/{max_retries_per_model})"
                )

                response = client.models.generate_content(
                    model=model, contents=contents
                )

                raw_text = response.text.strip()
                logger.info(
                    f"[Gemini] ✓ Success with model={model} "
                    f"after {total_attempts} total attempt(s)"
                )
                return GeminiCallResult(
                    text=raw_text,
                    model_used=model,
                    attempts=total_attempts,
                )

            except ClientError as e:
                error_msg = str(e)

                # ── Auth error → fail immediately, no point trying other models
                if _is_auth_error(e):
                    logger.error(f"[Gemini] Auth error: {error_msg[:150]}")
                    raise GeminiAuthError(error_msg)

                # ── Rate limit → retry with backoff, then fall through to next model
                if _is_rate_limit_error(e):
                    parsed_delay = _parse_retry_delay(error_msg)
                    wait_time = _compute_backoff(attempt, parsed_delay)

                    if attempt < max_retries_per_model:
                        logger.warning(
                            f"[Gemini] 429 on model={model} "
                            f"(attempt {attempt}/{max_retries_per_model}). "
                            f"Retrying in {wait_time:.1f}s..."
                        )
                        await asyncio.sleep(wait_time)
                        continue  # retry same model
                    else:
                        # Exhausted retries for this model → try next model
                        if model_index < len(models) - 1:
                            next_model = models[model_index + 1]
                            logger.warning(
                                f"[Gemini] 429 on model={model} "
                                f"— max retries reached. Falling back to {next_model}"
                            )
                            # Small pause before switching models
                            await asyncio.sleep(min(wait_time, 3.0))
                        break  # break inner retry loop → next model

                # ── Other client error (400, etc.) → skip this model
                else:
                    logger.warning(
                        f"[Gemini] Non-retryable error on model={model}: "
                        f"{error_msg[:150]}"
                    )
                    break  # try next model

            except ServerError as e:
                # 500-level from Google → skip this model, try next
                logger.warning(
                    f"[Gemini] Server error on model={model}: {str(e)[:150]}"
                )
                break  # try next model

            except Exception as e:
                # Unexpected error → raise immediately
                logger.error(f"[Gemini] Unexpected error: {e}")
                raise GeminiServiceError(
                    message=f"Unexpected error during AI analysis: {str(e)[:200]}",
                    status_code=500,
                )

    # ── All models exhausted ──
    logger.error(
        f"[Gemini] All {len(tried_models)} models exhausted after "
        f"{total_attempts} total attempts. Models tried: {tried_models}"
    )
    raise GeminiRateLimitError(tried_models)


# ─── Public API ─────────────────────────────────────────────────

LANGUAGE_INSTRUCTIONS = {
    "ar": "IMPORTANT: You MUST respond entirely in Arabic (العربية). All field values in the JSON must be written in Arabic.",
    "en": "",
}


async def diagnose_from_symptoms(
    name: str, age: int, gender: str, symptoms: list[str], severity: str,
    language: str = "en",
) -> dict:
    """
    Send patient symptoms to Gemini for AI-powered diagnosis.
    Uses smart model fallback if the primary model is rate-limited.
    """
    lang_instruction = LANGUAGE_INSTRUCTIONS.get(language, "")

    prompt = f"""You are a medical AI assistant. Analyze the following patient data and provide a structured diagnosis.

Patient Information:
- Name: {name}
- Age: {age}
- Gender: {gender}
- Symptoms: {', '.join(symptoms)}
- Severity: {severity}

{lang_instruction}

Respond ONLY with valid JSON in this exact format (no markdown, no code fences):
{{
  "diagnosis": "Primary suspected condition",
  "confidence": "High/Moderate/Low",
  "explanation": "Brief medical reasoning for the diagnosis",
  "treatment_plan": [
    "Step 1",
    "Step 2",
    "Step 3"
  ],
  "medications": [
    "Medication 1 with dosage",
    "Medication 2 with dosage"
  ],
  "lifestyle_recommendations": [
    "Recommendation 1",
    "Recommendation 2"
  ],
  "follow_up": "Recommended follow-up timeline and actions",
  "urgency": "Critical/High/Moderate/Low"
}}"""

    result = await call_gemini_smart(prompt)
    text = _strip_code_fences(result.text)

    try:
        data = json.loads(text)
        # Attach metadata about which model was used
        data["_meta"] = {
            "model": result.model_used,
            "attempts": result.attempts,
        }
        return data
    except json.JSONDecodeError:
        return {
            "diagnosis": "Analysis Complete",
            "confidence": "Moderate",
            "explanation": text,
            "treatment_plan": ["Consult a healthcare professional for detailed evaluation."],
            "medications": [],
            "lifestyle_recommendations": [],
            "follow_up": "Schedule appointment within 1 week.",
            "urgency": "Moderate",
            "_meta": {"model": result.model_used, "attempts": result.attempts},
        }


async def analyze_medical_image(
    image_bytes: bytes, mime_type: str, language: str = "en",
    user_prompt: str = "",
) -> dict:
    """
    Send a medical image to Gemini Vision for analysis.
    Optionally includes a user prompt for targeted multimodal analysis.
    Uses smart model fallback if the primary model is rate-limited.
    """
    lang_instruction = LANGUAGE_INSTRUCTIONS.get(language, "")
    user_context = ""
    if user_prompt.strip():
        user_context = f"\nThe user asks specifically: \"{user_prompt.strip()}\"\nPlease address their question in your analysis.\n"

    prompt = f"""You are a medical imaging AI specialist. Analyze this medical image carefully.
{user_context}
{lang_instruction}

Respond ONLY with valid JSON in this exact format (no markdown, no code fences):
{{
  "tumor_type": "Identified condition or 'No abnormality detected'",
  "findings": "Detailed findings from the image analysis",
  "location": "Anatomical location of findings",
  "severity": "Critical/High/Moderate/Low/Normal",
  "characteristics": [
    "Characteristic 1",
    "Characteristic 2"
  ],
  "treatment": [
    "Treatment option 1",
    "Treatment option 2"
  ],
  "prevention": [
    "Preventive measure 1",
    "Preventive measure 2"
  ],
  "additional_tests": [
    "Recommended test 1",
    "Recommended test 2"
  ],
  "confidence_score": "0-100%"
}}"""

    image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
    result = await call_gemini_smart([prompt, image_part])
    text = _strip_code_fences(result.text)

    try:
        data = json.loads(text)
        data["_meta"] = {"model": result.model_used, "attempts": result.attempts}
        return data
    except json.JSONDecodeError:
        return {
            "tumor_type": "Analysis Complete",
            "findings": text,
            "location": "See findings",
            "severity": "Requires Review",
            "characteristics": [],
            "treatment": ["Consult specialist for detailed evaluation."],
            "prevention": ["Regular screening recommended."],
            "additional_tests": [],
            "confidence_score": "N/A",
            "_meta": {"model": result.model_used, "attempts": result.attempts},
        }
