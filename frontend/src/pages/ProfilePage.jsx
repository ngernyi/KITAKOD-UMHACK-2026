import { useEffect, useState } from 'react';
import { api, ApiError, FUEL_TYPES, PLATFORMS, VEHICLE_TYPES, ZONES } from '../api.js';
import PageHeader from '../components/PageHeader.jsx';
import Notice from '../components/Notice.jsx';
import './ProfilePage.css';

const EMPTY_PROFILE = {
  driver_id: 'local',
  display_name: '',
  vehicle_type: 'car',
  fuel_type: 'ron95',
  home_zone: 'petaling_jaya_ss2',
  platforms: ['grab', 'maxim'],
  vehicle_fuel_consumption_l_per_100km: 7.5,
  preferences: '',
};

export default function ProfilePage() {
  const [form, setForm] = useState(EMPTY_PROFILE);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getProfile()
      .then((p) => {
        if (cancelled) return;
        setForm({ ...EMPTY_PROFILE, ...p });
        setInitialLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setInitialLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function update(patch) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function togglePlatform(id) {
    setForm((prev) => {
      const has = prev.platforms.includes(id);
      const next = has ? prev.platforms.filter((p) => p !== id) : [...prev.platforms, id];
      return { ...prev, platforms: next };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.platforms.length === 0) {
      setBanner({ tone: 'danger', title: 'Pick at least one platform.', text: 'We can\'t plan a shift with zero apps.' });
      return;
    }
    setSaving(true);
    setBanner(null);
    try {
      await api.saveProfile(form);
      setBanner({ tone: 'success', title: 'Profile saved.', text: 'Plans will now use your settings.' });
    } catch (err) {
      setBanner({
        tone: 'danger',
        title: 'Could not save.',
        text: err instanceof ApiError ? err.message : 'Unexpected error.',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Profile"
        title="Who are you, and what do you drive?"
        description="One-time setup. Everything here feeds into the plan prompt — from fuel cost calculations to which app suggestions make sense for you."
      />

      {banner ? <Notice tone={banner.tone} title={banner.title}>{banner.text}</Notice> : null}

      {!initialLoaded ? (
        <div className="profile__skeleton">Loading…</div>
      ) : (
        <form className="profile" onSubmit={handleSubmit}>
          <section className="profile__group">
            <h2 className="profile__group-title">Identity</h2>
            <div className="profile__grid">
              <Field label="Display name" hint="Optional. Just so the app can greet you.">
                <input
                  className="profile__input"
                  type="text"
                  value={form.display_name}
                  onChange={(e) => update({ display_name: e.target.value })}
                  placeholder="Ahmad"
                  maxLength={40}
                />
              </Field>
            </div>
          </section>

          <section className="profile__group">
            <h2 className="profile__group-title">Vehicle</h2>
            <div className="profile__grid">
              <Field label="Vehicle type">
                <select
                  className="profile__input"
                  value={form.vehicle_type}
                  onChange={(e) => update({ vehicle_type: e.target.value })}
                >
                  {VEHICLE_TYPES.map((v) => (
                    <option key={v.id} value={v.id}>{v.label}</option>
                  ))}
                </select>
              </Field>

              <Field label="Fuel type">
                <select
                  className="profile__input"
                  value={form.fuel_type}
                  onChange={(e) => update({ fuel_type: e.target.value })}
                >
                  {FUEL_TYPES.map((f) => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </select>
              </Field>

              <Field
                label="Fuel consumption"
                hint="Litres per 100 km. 6–9 for most cars, 3–4 for motorbikes, 0 for EV."
              >
                <div className="profile__input-group">
                  <input
                    className="profile__input"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="30"
                    value={form.vehicle_fuel_consumption_l_per_100km}
                    onChange={(e) =>
                      update({ vehicle_fuel_consumption_l_per_100km: parseFloat(e.target.value) || 0 })
                    }
                  />
                  <span className="profile__input-suffix">L / 100km</span>
                </div>
              </Field>
            </div>
          </section>

          <section className="profile__group">
            <h2 className="profile__group-title">Location</h2>
            <div className="profile__grid">
              <Field label="Home zone" hint="Where most of your trips start — not your literal home address.">
                <select
                  className="profile__input"
                  value={form.home_zone}
                  onChange={(e) => update({ home_zone: e.target.value })}
                >
                  {ZONES.map((z) => (
                    <option key={z.id} value={z.id}>{z.label}</option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          <section className="profile__group">
            <h2 className="profile__group-title">Platforms you use</h2>
            <p className="profile__group-lede">
              Pick every app you drive for. GigShift will only suggest platforms on this list.
            </p>
            <div className="profile__chipfield">
              {PLATFORMS.map((p) => {
                const selected = form.platforms.includes(p.id);
                return (
                  <button
                    type="button"
                    key={p.id}
                    className={`profile__platform ${selected ? 'profile__platform--selected' : ''}`}
                    onClick={() => togglePlatform(p.id)}
                  >
                    <span className="profile__platform-check" aria-hidden="true">
                      {selected ? '✓' : '+'}
                    </span>
                    {p.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="profile__group">
            <h2 className="profile__group-title">Driving preferences</h2>
            <p className="profile__group-lede">
              Free text (up to 500 chars). Things like <em>avoid KLIA after 22:00</em>,
              <em> prefer short trips</em>, or <em>no heavy rain zones</em>. This is passed to the reasoning
              engine as a soft hint — it won't override safety rules.
            </p>
            <textarea
              className="profile__textarea"
              value={form.preferences}
              onChange={(e) => update({ preferences: e.target.value.slice(0, 500) })}
              placeholder="Example: Avoid long airport runs unless surge > 1.5x. Prefer Bangsar and Mid Valley evenings. No Cheras after 23:00."
              rows={4}
              maxLength={500}
            />
            <p className="profile__char-count">
              {form.preferences.length} / 500
            </p>
          </section>

          <div className="profile__actions">
            <button type="submit" className="profile__save" disabled={saving}>
              {saving ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </form>
      )}
    </>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="profile__field">
      <span className="profile__label">{label}</span>
      {children}
      {hint ? <span className="profile__hint">{hint}</span> : null}
    </label>
  );
}
