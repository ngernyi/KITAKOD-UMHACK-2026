"""Fuzzy zone resolver.

Incoming CSV rows rarely use our canonical zone ids ('petaling_jaya_ss2').
They write labels like 'PJ', 'Petaling Jaya', 'Bangsar South'. This module
normalises any reasonable spelling to a zone id from the whitelist, or
returns None (caller decides what to do).

No external dependencies - pure string normalisation + a hand-curated
alias table. Good enough for MVP.
"""

from __future__ import annotations

import re
from functools import lru_cache
from typing import Optional

from app.services.external_data_service import zone_whitelist


# Hand-curated aliases. Keys are lower-cased, stripped of punctuation.
# Values are zone ids from zones_kl.json.
_ALIASES: dict[str, str] = {
    # KLCC
    "klcc": "klcc",
    "kl city centre": "klcc",
    "suria klcc": "klcc",
    "petronas twin towers": "klcc",
    # Bukit Bintang
    "bukit bintang": "bukit_bintang",
    "bb": "bukit_bintang",
    "pavilion": "bukit_bintang",
    "jalan alor": "bukit_bintang",
    "changkat": "bukit_bintang",
    # Bangsar
    "bangsar": "bangsar",
    "bangsar south": "bangsar",
    "bangsar village": "bangsar",
    # Mid Valley / KL Sentral
    "midvalley": "mid_valley",
    "mid valley": "mid_valley",
    "kl sentral": "mid_valley",
    "sentral": "mid_valley",
    "the gardens": "mid_valley",
    # Sunway
    "sunway": "sunway",
    "sunway pyramid": "sunway",
    "bandar sunway": "sunway",
    "pjs": "sunway",
    # PJ / Damansara
    "pj": "petaling_jaya_ss2",
    "petaling jaya": "petaling_jaya_ss2",
    "ss2": "petaling_jaya_ss2",
    "pj ss2": "petaling_jaya_ss2",
    "damansara": "petaling_jaya_ss2",
    "damansara utama": "petaling_jaya_ss2",
    "uptown": "petaling_jaya_ss2",
    # Subang
    "subang": "subang_jaya",
    "subang jaya": "subang_jaya",
    "ss15": "subang_jaya",
    "usj": "subang_jaya",
    # Puchong
    "puchong": "puchong",
    "ioi mall": "puchong",
    "bandar puchong": "puchong",
    # Cheras
    "cheras": "cheras",
    "leisure mall": "cheras",
    "taman connaught": "cheras",
    # Setapak / Wangsa Maju
    "setapak": "setapak_wangsa_maju",
    "wangsa maju": "setapak_wangsa_maju",
    "danau kota": "setapak_wangsa_maju",
    # Ampang
    "ampang": "ampang",
    "ampang point": "ampang",
    "ampang park": "ampang",
    # Kepong
    "kepong": "kepong",
    "kepong baru": "kepong",
    # KLIA
    "klia": "klia_klia2",
    "klia2": "klia_klia2",
    "klia1": "klia_klia2",
    "airport": "klia_klia2",
    "kuala lumpur international airport": "klia_klia2",
    # Shah Alam
    "shah alam": "shah_alam",
    # Klang
    "klang": "klang",
    "port klang": "klang",
    # Cyberjaya / Putrajaya
    "cyberjaya": "cyberjaya_putrajaya",
    "putrajaya": "cyberjaya_putrajaya",
    # Mont Kiara / Sri Hartamas
    "mont kiara": "mont_kiara_sri_hartamas",
    "sri hartamas": "mont_kiara_sri_hartamas",
    "hartamas": "mont_kiara_sri_hartamas",
    "publika": "mont_kiara_sri_hartamas",
    # Kota Damansara / TTDI
    "kota damansara": "kota_damansara",
    "ttdi": "kota_damansara",
    "damansara perdana": "kota_damansara",
    "mutiara damansara": "kota_damansara",
    "the curve": "kota_damansara",
    "ikea damansara": "kota_damansara",
}


@lru_cache(maxsize=1)
def _valid_ids() -> set[str]:
    return {z["id"] for z in zone_whitelist()}


@lru_cache(maxsize=1)
def _label_to_id() -> dict[str, str]:
    """Build "petaling jaya / bangsar south": zone_id map from zones_kl.json labels."""

    out: dict[str, str] = {}
    for z in zone_whitelist():
        label = _normalise(z["label"])
        out[label] = z["id"]
        # also split on '/' - many labels are compound
        for piece in z["label"].split("/"):
            out[_normalise(piece)] = z["id"]
    return out


def _normalise(s: str) -> str:
    s = s.lower().strip()
    s = re.sub(r"[^a-z0-9 ]+", " ", s)
    s = re.sub(r"\s+", " ", s)
    return s.strip()


def resolve(raw: str) -> Optional[str]:
    """Resolve a free-form location string to a zone id, or None."""

    if not raw:
        return None
    candidate = _normalise(str(raw))
    if not candidate:
        return None

    # 1. Exact zone id?
    if candidate.replace(" ", "_") in _valid_ids():
        return candidate.replace(" ", "_")
    # 2. Alias table.
    if candidate in _ALIASES:
        return _ALIASES[candidate]
    # 3. Canonical label match.
    label_map = _label_to_id()
    if candidate in label_map:
        return label_map[candidate]
    # 4. Substring hit against labels (longest-wins to avoid 'pj' matching 'putrajaya').
    matches = [(alias, zid) for alias, zid in _ALIASES.items() if alias in candidate]
    matches.sort(key=lambda p: len(p[0]), reverse=True)
    if matches:
        return matches[0][1]
    # 5. Substring hit against canonical labels.
    for label, zid in sorted(label_map.items(), key=lambda p: len(p[0]), reverse=True):
        if label and label in candidate:
            return zid
    return None
