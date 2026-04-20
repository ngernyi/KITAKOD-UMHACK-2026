"""Shared enumerations."""

from __future__ import annotations

from enum import Enum


class Platform(str, Enum):
    GRAB = "grab"
    MAXIM = "maxim"
    AIRASIA = "airasia_ride"
    INDRIVE = "indrive"


class VehicleType(str, Enum):
    CAR = "car"
    MOTORBIKE = "motorbike"


class FuelType(str, Enum):
    RON95 = "ron95"
    RON97 = "ron97"
    DIESEL = "diesel"
    EV = "ev"


class CrowdSize(str, Enum):
    SMALL = "small"
    MEDIUM = "medium"
    LARGE = "large"
