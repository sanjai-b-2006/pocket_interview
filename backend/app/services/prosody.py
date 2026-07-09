import re
from typing import Dict, List

import librosa
import numpy as np

from app.services.asr import TranscriptResult

FILLER_WORDS = {"um", "umm", "uh", "uhh", "like", "actually", "basically", "literally"}

_PAUSE_THRESHOLD_SEC = 0.4


def _words_per_minute(word_count: int, duration_sec: float) -> float:
    if duration_sec <= 0:
        return 0.0
    return word_count / (duration_sec / 60.0)


def _filler_word_count(transcript_text: str) -> int:
    tokens = re.findall(r"[a-zA-Z']+", transcript_text.lower())
    return sum(1 for t in tokens if t in FILLER_WORDS)


def _pause_ratio(words: List, duration_sec: float) -> float:
    if duration_sec <= 0 or len(words) < 2:
        return 0.0
    gap_total = 0.0
    for prev, curr in zip(words, words[1:]):
        gap = curr.start - prev.end
        if gap > _PAUSE_THRESHOLD_SEC:
            gap_total += gap
    return float(min(gap_total / duration_sec, 1.0))


def _pitch_variation(y: np.ndarray, sr: int) -> float:
    try:
        f0, voiced_flag, _ = librosa.pyin(
            y, fmin=librosa.note_to_hz("C2"), fmax=librosa.note_to_hz("C7"), sr=sr
        )
    except Exception:
        return 0.0
    voiced = f0[voiced_flag] if voiced_flag is not None else f0[~np.isnan(f0)]
    voiced = voiced[~np.isnan(voiced)]
    if voiced.size < 2 or voiced.mean() == 0:
        return 0.0
    coeff_of_variation = float(np.std(voiced) / np.mean(voiced))
    # Typical conversational speech CoV ~0.05-0.25; normalize and clip to 0-1.
    return float(np.clip(coeff_of_variation / 0.25, 0.0, 1.0))


def _volume_consistency(y: np.ndarray) -> float:
    rms = librosa.feature.rms(y=y)[0]
    if rms.size == 0 or rms.mean() == 0:
        return 0.0
    coeff_of_variation = float(np.std(rms) / np.mean(rms))
    # Lower variation = steadier volume; invert so 1.0 means very steady.
    return float(np.clip(1.0 - coeff_of_variation, 0.0, 1.0))


def compute_prosody(audio_path: str, transcript: TranscriptResult) -> Dict[str, float]:
    y, sr = librosa.load(audio_path, sr=16000, mono=True)
    word_count = len(transcript.words) if transcript.words else len(transcript.text.split())

    return {
        "words_per_minute": _words_per_minute(word_count, transcript.duration_sec),
        "pitch_variation": _pitch_variation(y, sr),
        "filler_word_count": _filler_word_count(transcript.text),
        "pause_ratio": _pause_ratio(transcript.words, transcript.duration_sec),
        "volume_consistency": _volume_consistency(y),
    }
