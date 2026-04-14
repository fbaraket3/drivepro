// src/pages/admin/AdminDashboard.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import { LoadingPage, StageBadge } from '../../components/shared/UI';

const TYPE_COLORS = {
  theory:  { color: 'var(--theory-color)',  bg: 'var(--theory-bg)' },
  driving: { color: 'var(--driving-color)', bg: 'var(--driving-bg)' },
  parking: { color: 'var(--parking-color)', bg: 'var(--parking-bg)' },
};

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.getDashboard().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingPage />;
  if (!data) return <div className="page-content">Error loading dashboard.</div>;

  const stageMap = Object.fromEntries(data.byStage.map(s => [s.current_stage, s.count]));

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <div className="flex-row">
          <span style={{ fontSize: 13, color: 'var(--text3)' }}>{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Total Students</div>
          <div className="stat-value">{data.totalStudents}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Upcoming Classes</div>
          <div className="stat-value" style={{ color: 'var(--blue)' }}>{data.upcomingClasses}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Revenue</div>
          <div className="stat-value" style={{ color: 'var(--green)' }}>{data.totalRevenue.toLocaleString()}</div>
          <div className="stat-sub">TND collected</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Outstanding</div>
          <div className="stat-value" style={{ color: data.outstanding > 0 ? 'var(--red)' : 'var(--green)' }}>
            {Math.max(0, data.outstanding).toLocaleString()}
          </div>
          <div className="stat-sub">TND remaining</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* ── Stage breakdown ── */}
        <div className="card">
          <div className="card-header"><div className="card-title">Students by Stage</div></div>
          <div className="card-pad">
            {['theory', 'driving', 'parking', 'completed'].map(stage => {
              const count = stageMap[stage] || 0;
              const pct = data.totalStudents > 0 ? (count / data.totalStudents) * 100 : 0;
              return (
                <div key={stage} style={{ marginBottom: 12 }}>
                  <div className="flex-row justify-between mb-4">
                    <StageBadge stage={stage} />
                    <span className="text-sm fw-500">{count}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${pct}%`, background: `var(--${stage}-color, var(--green))` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Teachers ── */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Teachers</div>
            <button className="btn btn-sm" onClick={() => navigate('/admin/teachers')}>View all</button>
          </div>
          <div>
            {data.teachers.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--theory-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: 'var(--theory-color)' }}>
                  {t.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="fw-500 text-sm">{t.name}</div>
                  <div className="text-xs text-faint">{t.total_sessions} sessions total</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Today's Classes ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div className="card-title">Today's Classes</div>
          <button className="btn btn-sm" onClick={() => navigate('/admin/calendar')}>Calendar</button>
        </div>
        {data.todayClasses.length === 0 ? (
          <div className="empty-state">No classes scheduled for today.</div>
        ) : (
          <div>
            {data.todayClasses.map(c => {
              const tc = TYPE_COLORS[c.slug] || {};
              return (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 4, height: 36, borderRadius: 2, background: tc.color, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div className="fw-500 text-sm">{c.lesson_type_name}</div>
                    <div className="text-xs text-faint">{c.teacher_name} · {c.enrolled_count} students</div>
                  </div>
                  <div className="text-sm text-muted">{c.start_time}–{c.end_time}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Recent Payments ── */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Recent Payments</div>
          <button className="btn btn-sm" onClick={() => navigate('/admin/payments')}>View all</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Student</th><th>Amount</th><th>Date</th><th>Method</th></tr>
            </thead>
            <tbody>
              {data.recentPayments.slice(0, 5).map(p => (
                <tr key={p.id}>
                  <td className="fw-500">{p.student_name}</td>
                  <td className="text-green fw-500">{p.amount.toLocaleString()} TND</td>
                  <td className="text-muted text-sm">{p.payment_date}</td>
                  <td><span className="badge badge-gray">{p.method}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
