import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError, PLATFORMS } from '../api.js';
import PageHeader from '../components/PageHeader.jsx';
import Notice from '../components/Notice.jsx';
import { formatRm } from '../lib/format.js';
import './EarningsPage.css';

/**
 * Earnings upload page.
 *
 * Accepts:
 *   - CSV paste (preferred for quick demo)
 *   - File upload (for users exporting from their actual app)
 *
 * The backend accepts either the canonical column set or any of the
 * per-platform aliases (see app/services/earnings_service.py). The
 * template download gives users a working starting point.
 */
export default function EarningsPage() {
  const [platform, setPlatform] = useState('grab');
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [totals, setTotals] = useState(null);

  useEffect(() => {
    api.getEarningsTotals(14).then(setTotals).catch(() => setTotals(null));
  }, [result?.rows_inserted]);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    setCsvText(text);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!csvText.trim()) {
      setError('Paste or upload at least one row first.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.uploadEarnings({ platform, csvText });
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed unexpectedly.');
    } finally {
      setSubmitting(false);
    }
  }

  function clearAll() {
    setCsvText('');
    setFileName('');
    setResult(null);
    setError(null);
  }

  return (
    <>
      <PageHeader
        eyebrow="Earnings"
        title="Upload your recent trips"
        description="Paste a CSV from any of your platforms, or upload a file. GigShift aggregates these into per-zone, per-hour, and per-platform summaries — which the plan prompt then uses to make personal recommendations."
        actions={
          <a
            className="earnings__template-btn"
            href={api.earningsTemplateUrl(platform)}
            download
          >
            ⇩ Download {PLATFORMS.find((p) => p.id === platform)?.label} template
          </a>
        }
      />

      {totals ? (
        <div className="earnings__totals">
          <Stat label="Trips (14 days)" value={totals.trip_count} />
          <Stat label="Total gross" value={formatRm(totals.total_gross_rm)} />
          <Stat label="Total nett" value={formatRm(totals.total_nett_rm)} accent />
        </div>
      ) : null}

      <form className="earnings" onSubmit={handleSubmit}>
        <div className="earnings__controls">
          <label className="earnings__field">
            <span className="earnings__label">Platform</span>
            <select
              className="earnings__select"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
            >
              {PLATFORMS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </label>

          <label className="earnings__field earnings__field--file">
            <span className="earnings__label">Upload file</span>
            <div className="earnings__filepick">
              <input type="file" accept=".csv,text/csv" onChange={handleFile} />
              <span className="earnings__filename">{fileName || 'No file selected'}</span>
            </div>
          </label>
        </div>

        <label className="earnings__field">
          <span className="earnings__label">
            Or paste CSV (header row + one row per trip)
          </span>
          <textarea
            className="earnings__textarea"
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            rows={10}
            placeholder={`start_ts,end_ts,start_zone,end_zone,distance_km,gross_rm,commission_rm,nett_rm\n2026-04-18T18:15:00+08:00,2026-04-18T18:47:00+08:00,Bangsar,KLCC,9.4,22.50,4.50,18.00`}
            spellCheck={false}
          />
        </label>

        {error ? <Notice tone="danger" title="Upload error:">{error}</Notice> : null}

        {result ? <UploadResult result={result} /> : null}

        <div className="earnings__actions">
          <button type="button" className="earnings__secondary" onClick={clearAll}>
            Clear
          </button>
          <button type="submit" className="earnings__primary" disabled={submitting}>
            {submitting ? 'Uploading…' : 'Upload trips'}
          </button>
        </div>
      </form>

      <InfoStrip />
    </>
  );
}

function UploadResult({ result }) {
  const success = result.rows_inserted > 0;
  return (
    <Notice
      tone={success ? 'success' : 'warn'}
      title={success ? `Ingested ${result.rows_inserted} trips.` : 'No rows ingested.'}
      action={
        success ? (
          <Link to="/dashboard" className="earnings__goto">
            See dashboard →
          </Link>
        ) : null
      }
    >
      {result.date_range?.[0] ? (
        <>Dates: {result.date_range[0]} → {result.date_range[1]}. </>
      ) : null}
      {result.duplicates_skipped ? <>{result.duplicates_skipped} duplicate(s) skipped. </> : null}
      {result.rows_rejected ? (
        <>
          {result.rows_rejected} row(s) rejected —
          {' '}
          {(result.rejection_reasons || []).slice(0, 2).join('; ')}
          {result.rejection_reasons?.length > 2 ? '…' : ''}
        </>
      ) : null}
    </Notice>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className={`earnings__stat ${accent ? 'earnings__stat--accent' : ''}`}>
      <span className="earnings__stat-label">{label}</span>
      <span className="earnings__stat-value">{value}</span>
    </div>
  );
}

function InfoStrip() {
  return (
    <section className="earnings__info">
      <h3 className="earnings__info-title">Accepted columns</h3>
      <p className="earnings__info-text">
        GigShift understands the canonical header, plus common per-platform names.
        You don't have to rename columns — upload the CSV your app gave you.
      </p>
      <ul className="earnings__info-list">
        <li><code>start_ts</code> · pickup_time, booking_time, order_time, ride_start, datetime</li>
        <li><code>start_zone</code> · pickup, pickup_area, origin, from</li>
        <li><code>gross_rm</code> · fare, total_fare, trip_fare, ride_price</li>
        <li><code>commission_rm</code> · service_fee, platform_fee, maxim_fee, grab_service_fee</li>
        <li><code>nett_rm</code> · driver_earning, net_payable, take_home</li>
      </ul>
      <p className="earnings__info-text">
        Zones are fuzzy-matched. "PJ", "Bangsar South", "Pavilion KL", "Airport" all resolve correctly.
      </p>
    </section>
  );
}
