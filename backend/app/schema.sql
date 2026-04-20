-- GigShift SQLite schema. Idempotent (CREATE ... IF NOT EXISTS).
-- Initialised on app startup by app.db.init_db().

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS drivers (
    driver_id     TEXT PRIMARY KEY,
    profile_json  TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS trips (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    driver_id         TEXT NOT NULL,
    platform          TEXT NOT NULL,
    start_ts          TEXT NOT NULL,
    end_ts            TEXT NOT NULL,
    start_zone        TEXT NOT NULL,
    end_zone          TEXT,
    distance_km       REAL NOT NULL,
    gross_rm          REAL NOT NULL,
    commission_rm     REAL NOT NULL,
    nett_rm           REAL NOT NULL,
    tip_rm            REAL NOT NULL DEFAULT 0.0,
    surge_multiplier  REAL NOT NULL DEFAULT 1.0,
    source_upload_id  INTEGER,
    created_at        TEXT NOT NULL,
    UNIQUE(driver_id, platform, start_ts, start_zone)
);

CREATE INDEX IF NOT EXISTS idx_trips_driver_start ON trips(driver_id, start_ts);
CREATE INDEX IF NOT EXISTS idx_trips_platform    ON trips(platform);

CREATE TABLE IF NOT EXISTS daily_signals (
    date         TEXT PRIMARY KEY,
    signals_json TEXT NOT NULL,
    generated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plans (
    plan_id        TEXT PRIMARY KEY,
    driver_id      TEXT NOT NULL,
    window_start   TEXT NOT NULL,
    window_end     TEXT NOT NULL,
    plan_json      TEXT NOT NULL,
    prompt_hash    TEXT NOT NULL,
    fallback_used  INTEGER NOT NULL,
    generated_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_plans_driver ON plans(driver_id, generated_at);

CREATE TABLE IF NOT EXISTS followups (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id   TEXT NOT NULL,
    question  TEXT NOT NULL,
    answer    TEXT NOT NULL,
    asked_at  TEXT NOT NULL,
    FOREIGN KEY (plan_id) REFERENCES plans(plan_id)
);
