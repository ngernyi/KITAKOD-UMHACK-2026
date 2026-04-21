import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../api.js';
import PageHeader from '../components/PageHeader.jsx';
import Notice from '../components/Notice.jsx';
import { formatRm, platformColor, platformLabel, zoneLabel } from '../lib/format.js';
import './DashboardPage.css';

const ZONE_COLORS = [
  '#10b981', '#0ea5e9', '#f59e0b', '#6366f1', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6',
];

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getAnalytics(14)
      .then((data) => !cancelled && setAnalytics(data))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <PageHeader title="Dashboard" description="Loading your 14-day analytics…" />;
  }

  if (error) {
    return (
      <>
        <PageHeader eyebrow="Dashboard" title="Couldn't load analytics" />
        <Notice tone="danger">{error}</Notice>
      </>
    );
  }

  if (!analytics || analytics.trip_count === 0) {
    return (
      <>
        <PageHeader
          eyebrow="Dashboard"
          title="No trips yet"
          description="Once you upload earnings, this page shows where and when you actually make money — and the plan prompt uses the same summary."
        />
        <div className="dash__empty">
          <p>Your dashboard is waiting for data.</p>
          <Link className="dash__cta" to="/earnings">Upload earnings →</Link>
        </div>
      </>
    );
  }

  const byHour = Array.from({ length: 24 }, (_, hour) => {
    const match = analytics.by_hour.find((h) => h.hour === hour);
    return {
      hour,
      label: `${String(hour).padStart(2, '0')}:00`,
      nett: match ? match.total_nett_rm : 0,
      trips: match ? match.trips : 0,
    };
  });

  const byZone = analytics.by_zone.slice(0, 8).map((z) => ({
    zone: zoneLabel(z.zone),
    zone_id: z.zone,
    nett: z.total_nett_rm,
    trips: z.trips,
  }));

  const byPlatform = analytics.by_platform.map((p) => ({
    platform: platformLabel(p.platform),
    platform_id: p.platform,
    nett: p.total_nett_rm,
    trips: p.trips,
    rm_per_hour: p.avg_rm_per_hour,
  }));

  return (
    <>
      <PageHeader
        eyebrow="Dashboard · last 14 days"
        title="Where your money actually comes from"
        description="Every chart here is pre-aggregated and fed to the plan prompt. Strong zones become recommended zones."
      />

      <section className="dash__kpis">
        <KpiTile label="Trips" value={analytics.trip_count} />
        <KpiTile label="Gross earnings" value={formatRm(analytics.total_gross_rm)} />
        <KpiTile label="Nett earnings" value={formatRm(analytics.total_nett_rm)} accent />
        <KpiTile
          label="Avg nett / trip"
          value={formatRm(analytics.trip_count > 0 ? analytics.total_nett_rm / analytics.trip_count : 0)}
        />
      </section>

      <div className="dash__grid">
        <ChartCard title="Nett earnings by hour" subtitle="Your peak windows">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byHour} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="hour"
                tick={{ fill: '#64748b', fontSize: 11 }}
                interval={2}
                tickFormatter={(h) => `${String(h).padStart(2, '0')}h`}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickFormatter={(v) => `RM${v}`}
                width={52}
              />
              <Tooltip content={<HourTooltip />} cursor={{ fill: 'rgba(16, 185, 129, 0.08)' }} />
              <Bar dataKey="nett" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top zones" subtitle="By nett earnings">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={byZone}
              layout="vertical"
              margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickFormatter={(v) => `RM${v}`}
              />
              <YAxis
                type="category"
                dataKey="zone"
                tick={{ fill: '#334155', fontSize: 12 }}
                width={130}
              />
              <Tooltip content={<ZoneTooltip />} cursor={{ fill: 'rgba(16, 185, 129, 0.08)' }} />
              <Bar dataKey="nett" radius={[0, 4, 4, 0]}>
                {byZone.map((_, i) => (
                  <Cell key={i} fill={ZONE_COLORS[i % ZONE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Platform mix" subtitle="Which app pays you most">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={byPlatform}
                dataKey="nett"
                nameKey="platform"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
              >
                {byPlatform.map((p) => (
                  <Cell key={p.platform_id} fill={platformColor(p.platform_id)} />
                ))}
              </Pie>
              <Tooltip content={<PlatformTooltip />} />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Platform RM / hour" subtitle="Adjusted for time online">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byPlatform} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="platform" tick={{ fill: '#334155', fontSize: 12 }} />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickFormatter={(v) => `RM${v}`}
                width={48}
              />
              <Tooltip content={<RatePlatformTooltip />} cursor={{ fill: 'rgba(16, 185, 129, 0.08)' }} />
              <Bar dataKey="rm_per_hour" radius={[4, 4, 0, 0]}>
                {byPlatform.map((p) => (
                  <Cell key={p.platform_id} fill={platformColor(p.platform_id)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <section className="dash__best">
        <h3 className="dash__best-title">Best platform per hour</h3>
        <p className="dash__best-lede">
          At each hour of day, this is the app with your highest historical nett. The GLM sees this table
          and will often echo its recommendations.
        </p>
        <div className="dash__best-grid">
          {Object.entries(analytics.best_platform_per_hour).length === 0 ? (
            <span className="dash__best-empty">Not enough data yet.</span>
          ) : (
            Object.entries(analytics.best_platform_per_hour)
              .sort((a, b) => Number(a[0]) - Number(b[0]))
              .map(([hour, platform]) => (
                <div
                  key={hour}
                  className="dash__best-cell"
                  style={{ borderLeftColor: platformColor(platform) }}
                >
                  <span className="dash__best-hour">{String(hour).padStart(2, '0')}:00</span>
                  <span className="dash__best-platform">{platformLabel(platform)}</span>
                </div>
              ))
          )}
        </div>
      </section>
    </>
  );
}

function KpiTile({ label, value, accent }) {
  return (
    <div className={`dash__kpi ${accent ? 'dash__kpi--accent' : ''}`}>
      <span className="dash__kpi-label">{label}</span>
      <span className="dash__kpi-value">{value}</span>
    </div>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <section className="dash__card">
      <header className="dash__card-header">
        <h3 className="dash__card-title">{title}</h3>
        {subtitle ? <p className="dash__card-subtitle">{subtitle}</p> : null}
      </header>
      <div className="dash__card-body">{children}</div>
    </section>
  );
}

function HourTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { hour, nett, trips } = payload[0].payload;
  return (
    <div className="tip">
      <strong>{String(hour).padStart(2, '0')}:00</strong>
      <div>{formatRm(nett)} nett · {trips} trips</div>
    </div>
  );
}

function ZoneTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { zone, nett, trips } = payload[0].payload;
  return (
    <div className="tip">
      <strong>{zone}</strong>
      <div>{formatRm(nett)} nett · {trips} trips</div>
    </div>
  );
}

function PlatformTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { platform, nett, trips } = payload[0].payload;
  return (
    <div className="tip">
      <strong>{platform}</strong>
      <div>{formatRm(nett)} nett · {trips} trips</div>
    </div>
  );
}

function RatePlatformTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { platform, rm_per_hour, nett } = payload[0].payload;
  return (
    <div className="tip">
      <strong>{platform}</strong>
      <div>{formatRm(rm_per_hour)}/hr · {formatRm(nett)} total nett</div>
    </div>
  );
}
