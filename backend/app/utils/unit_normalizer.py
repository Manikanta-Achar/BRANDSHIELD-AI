UNITS = {
    "hour": ("time", 3600),
    "hours": ("time", 3600),
    "hr": ("time", 3600),
    "hrs": ("time", 3600),
    "minute": ("time", 60),
    "minutes": ("time", 60),
    "min": ("time", 60),
    "mins": ("time", 60),
    "second": ("time", 1),
    "seconds": ("time", 1),
    "s": ("time", 1),
    "kg": ("mass", 1000),
    "g": ("mass", 1),
    "km": ("length", 1000),
    "m": ("length", 1),
    "gb": ("storage", 1000),
    "mb": ("storage", 1),
    "%": ("percentage", 1),
}


def normalize(value, unit):
    dimension, multiplier = UNITS.get(unit.lower(), (unit.lower(), 1))
    return dimension, float(value) * multiplier
