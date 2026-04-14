// src/pages/teacher/TeacherPortal.jsx — v2: payments, test editing, scoped calendar

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';
import { toast, Modal, EmptyState, LoadingPage } from '../../components/shared/UI';
import Classes from '../admin/Classes';
import CalendarPage from '../admin/CalendarPage';
import TestsPage from '../admin/TestsPage';

const TYPE_COLORS = {
  theory:  { color: 'var(--theory-color)',  bg: 'var(--theory-bg)' },
  driving: { color: 'var(--driving-color)', bg: 'var(--driving-bg)' },
  parking: { color: 'var(--parking-color)', bg: 'var(--parking-bg)' },
};

// ── Teacher Dashboard ─────────────────────────────────────────────────────────
export function TeacherDashboard() {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getTeacherSchedule(user.id, {
      from: new Date().toISOString().slice(0, 10),
    }).then(setSchedule).finally(() => setLoading(false));
  }, [user.id]);

  if (loading) return <LoadingPage />;

  const today = new Date().toISOString().slice(0, 10);
  const todaySessions = schedule.filter(s => s.date === today);
  const upcoming      = schedule.filter(s => s.date > today);

  const typeLabel = user.teacher_type === 'driving_parking'
    ? '🚗 Driving / Parking Teacher'
    : '📖 Theory Teacher';

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome, {user.name}</h1>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>{typeLabel}</div>
        </div>
        <span className="text-muted text-sm">
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
      </div>

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Today's Classes</div>
          <div className="stat-value" style={{ color: 'var(--blue)' }}>{todaySessions.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Upcoming (30 days)</div>
          <div className="stat-value">{upcoming.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Students Today</div>
          <div className="stat-value">{todaySessions.reduce((s, c) => s + (c.enrolled_count || 0), 0)}</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><div className="card-title">Today's Classes</div></div>
        {todaySessions.length === 0
          ? <div className="empty-state">No classes today.</div>
          : todaySessions.map(s => {
            const tc = TYPE_COLORS[s.lesson_type_slug] || {};
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 4, height: 44, borderRadius: 2, background: tc.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="fw-500">{s.lesson_type_name}</div>
                  <div className="text-sm text-muted">
                    {s.enrolled_count} student{s.enrolled_count !== 1 ? 's' : ''}
                    {s.student_names ? ` — ${s.student_names}` : ''}
                  </div>
                </div>
                <div className="text-sm font-mono text-muted">{s.start_time}–{s.end_time}</div>
              </div>
            );
          })}
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">Upcoming Schedule</div></div>
        {upcoming.length === 0
          ? <div className="empty-state">No upcoming classes.</div>
          : upcoming.slice(0, 10).map(s => {
            const tc = TYPE_COLORS[s.lesson_type_slug] || {};
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ minWidth: 90, fontSize: 13, color: 'var(--text3)' }}>{s.date}</div>
                <div style={{ width: 4, height: 30, borderRadius: 2, background: tc.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="fw-500 text-sm">{s.lesson_type_name}</div>
                  <div className="text-xs text-faint">{s.start_time}–{s.end_time} · {s.enrolled_count} student{s.enrolled_count !== 1 ? 's' : ''}</div>
                </div>
                {s.student_names && <div className="text-xs text-faint" style={{ maxWidth: 160, textAlign: 'right' }}>{s.student_names}</div>}
              </div>
            );
          })}
      </div>
    </div>
  );
}

// ── Teacher Payments Page ─────────────────────────────────────────────────────
// Teachers can record payments for any student. They see all payments they recorded.
function PaymentForm({ students, onSave, onClose }) {
  const [form, setForm] = useState({
    student_id:   students[0]?.id || '',
    amount:       '',
    payment_date: new Date().toISOString().slice(0, 10),
    method:       'cash',
    notes:        '',
  });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function submit() {
    if (!form.student_id || !form.amount) { toast.error('Student and amount required'); return; }
    await onSave({ ...form, student_id: Number(form.student_id), amount: Number(form.amount) });
    onClose();
  }

  return (
    <>
      <div className="modal-body">
        <div className="form-group">
          <label className="form-label">Student *</label>
          <select className="form-select" value={form.student_id} onChange={set('student_id')}>
            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Amount (TND) *</label>
            <input className="form-input" type="number" value={form.amount} onChange={set('amount')} placeholder="0" />
          </div>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input className="form-input" type="date" value={form.payment_date} onChange={set('payment_date')} />
          </div>
          <div className="form-group">
            <label className="form-label">Method</label>
            <select className="form-select" value={form.method} onChange={set('method')}>
              {['cash', 'card', 'transfer', 'cheque'].map(m => (
                <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <input className="form-input" value={form.notes} onChange={set('notes')} placeholder="optional" />
          </div>
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-success" onClick={submit}>Record Payment</button>
      </div>
    </>
  );
}

export function TeacherPayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);

  const load = async () => {
    const [p, s] = await Promise.all([api.getPayments(), api.getStudents()]);
    // Teachers see only payments they recorded
    setPayments(p.filter(pay => pay.recorded_by === user.id || pay.recorded_by_name === user.name));
    setStudents(s);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  async function handleSave(form) {
    try {
      await api.createPayment(form);
      toast.success('Payment recorded successfully');
      load();
    } catch (e) { toast.error(e.message); }
  }

  const total = payments.reduce((s, p) => s + p.amount, 0);

  if (loading) return <LoadingPage />;

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Payments</h1>
        <button className="btn btn-primary" onClick={() => setModal(true)}>+ Record Payment</button>
      </div>

      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-label">Payments I Recorded</div>
          <div className="stat-value">{payments.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Amount</div>
          <div className="stat-value" style={{ color: 'var(--green)' }}>{total.toLocaleString()}</div>
          <div className="stat-sub">TND</div>
        </div>
      </div>

      <div className="card">
        <div className="card-pad" style={{ paddingBottom: 0 }}>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12, padding: '8px 12px', background: 'var(--blue-bg)', borderRadius: 'var(--radius-sm)', color: 'var(--blue-text)' }}>
            You can record payments received from students. These are visible to the admin.
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Student</th><th>Date</th><th>Amount</th><th>Method</th><th>Notes</th></tr>
            </thead>
            <tbody>
              {payments.length > 0 ? payments.map(p => (
                <tr key={p.id}>
                  <td className="fw-500">{p.student_name}</td>
                  <td>{p.payment_date}</td>
                  <td className="text-green fw-500">{p.amount.toLocaleString()} TND</td>
                  <td><span className="badge badge-gray">{p.method}</span></td>
                  <td className="text-muted text-sm">{p.notes || '—'}</td>
                </tr>
              )) : (
                <tr><td colSpan={5}><EmptyState message="No payments recorded yet." /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} title="Record Payment" onClose={() => setModal(false)}>
        <PaymentForm students={students} onSave={handleSave} onClose={() => setModal(false)} />
      </Modal>
    </div>
  );
}

// ── Teacher Students View ─────────────────────────────────────────────────────
export function TeacherStudents() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getClasses({ teacherId: user.id }).then(setClasses).finally(() => setLoading(false));
  }, [user.id]);

  if (loading) return <LoadingPage />;

  // Collect unique students across this teacher's classes (from student_names in enrolled)
  const sessionList = classes.map(c => ({
    type: c.lesson_type_name,
    slug: c.lesson_type_slug,
    date: c.date,
    time: `${c.start_time}–${c.end_time}`,
    names: c.student_names ? c.student_names.split(', ') : [],
    count: c.enrolled_count,
  }));

  return (
    <div className="page-content">
      <h1 className="page-title" style={{ marginBottom: 20 }}>My Students</h1>
      <div className="card">
        <div className="card-pad" style={{ paddingBottom: 0 }}>
          <p className="text-sm text-muted" style={{ marginBottom: 16 }}>
            Students enrolled in your classes. Contact admin to view full student profiles.
          </p>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Session Type</th><th>Date</th><th>Time</th><th>Students</th></tr>
            </thead>
            <tbody>
              {sessionList.length > 0 ? sessionList.map((s, i) => (
                <tr key={i}>
                  <td><span className={`badge badge-${s.slug}`}>{s.type}</span></td>
                  <td>{s.date}</td>
                  <td className="font-mono text-sm">{s.time}</td>
                  <td>
                    {s.names.length > 0
                      ? s.names.map(n => (
                        <span key={n} style={{ display: 'inline-block', margin: '1px 3px 1px 0', padding: '1px 7px', background: 'var(--surface2)', borderRadius: 99, fontSize: 12 }}>{n}</span>
                      ))
                      : <span className="text-faint text-sm">—</span>
                    }
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={4}><EmptyState message="No classes yet." /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Wrappers that pass teacher context ────────────────────────────────────────
export function TeacherClasses() {
  const { user } = useAuth();
  return <Classes teacherMode currentUser={user} />;
}

export function TeacherCalendar() {
  return <CalendarPage />;
}

export function TeacherTests() {
  return <TestsPage />;
}
