// src/pages/admin/PaymentsPage.jsx — v2: teachers can record, recorded_by tracking

import { useState, useEffect, useMemo } from 'react';
import { api } from '../../utils/api';
import { toast, Modal, ConfirmModal, EmptyState, LoadingPage, SearchInput } from '../../components/shared/UI';

// ── Payment Form ──────────────────────────────────────────────────────────────
function PaymentForm({ payment, students, onSave, onClose }) {
  const [form, setForm] = useState(payment || {
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
        <button className="btn btn-success" onClick={submit}>Save Payment</button>
      </div>
    </>
  );
}

// ── Payments Page ─────────────────────────────────────────────────────────────
export function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [search, setSearch] = useState('');
  const [studentFilter, setStudentFilter] = useState('all');

  const load = async () => {
    const [p, s, sum] = await Promise.all([
      api.getPayments(),
      api.getStudents(),
      api.getPaymentSummary(),
    ]);
    setPayments(p); setStudents(s); setSummary(sum);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return payments
      .filter(p => studentFilter === 'all' || String(p.student_id) === String(studentFilter))
      .filter(p => !q || p.student_name.toLowerCase().includes(q) || (p.recorded_by_name || '').toLowerCase().includes(q));
  }, [payments, studentFilter, search]);

  async function handleSave(form) {
    try {
      if (modal?.id) { await api.updatePayment(modal.id, form); toast.success('Payment updated'); }
      else           { await api.createPayment(form);           toast.success('Payment recorded'); }
      load();
    } catch (e) { toast.error(e.message); throw e; }
  }

  async function handleDelete(id) {
    try { await api.deletePayment(id); toast.success('Payment deleted'); load(); }
    catch (e) { toast.error(e.message); }
  }

  if (loading) return <LoadingPage />;

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Payments</h1>
        <button className="btn btn-primary" onClick={() => setModal({})}>+ Add Payment</button>
      </div>

      {summary && (
        <div className="stat-grid" style={{ marginBottom: 20 }}>
          <div className="stat-card">
            <div className="stat-label">Total Collected</div>
            <div className="stat-value" style={{ color: 'var(--green)' }}>{summary.total.toLocaleString()}</div>
            <div className="stat-sub">TND</div>
          </div>
          {summary.byMethod.map(m => (
            <div key={m.method} className="stat-card">
              <div className="stat-label">{m.method.charAt(0).toUpperCase() + m.method.slice(1)}</div>
              <div className="stat-value" style={{ fontSize: 18 }}>{m.total.toLocaleString()}</div>
              <div className="stat-sub">{m.count} payment{m.count !== 1 ? 's' : ''}</div>
            </div>
          ))}
        </div>
      )}

      {/* Recorded-by breakdown */}
      {summary?.byRecorder?.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><div className="card-title">Recorded By</div></div>
          <div className="card-pad" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {summary.byRecorder.map(r => (
              <div key={r.recorder} style={{ flex: '1 1 140px', background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                <div className="fw-500 text-sm">{r.recorder}</div>
                <div className="text-xs text-faint mb-4">{r.role}</div>
                <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--green)' }}>{r.total.toLocaleString()} TND</div>
                <div className="text-xs text-faint">{r.count} transaction{r.count !== 1 ? 's' : ''}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-row gap-12" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search payments..." />
        <select className="form-select" style={{ maxWidth: 200 }} value={studentFilter} onChange={e => setStudentFilter(e.target.value)}>
          <option value="all">All Students</option>
          {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Student</th><th>Date</th><th>Amount</th><th>Method</th>
                <th>Recorded By</th><th>Notes</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td className="fw-500">{p.student_name}</td>
                  <td className="text-muted">{p.payment_date}</td>
                  <td className="text-green fw-500">{p.amount.toLocaleString()} TND</td>
                  <td><span className="badge badge-gray">{p.method}</span></td>
                  <td>
                    <span style={{ fontSize: 12, color: 'var(--text2)' }}>
                      {p.recorded_by_name || '—'}
                    </span>
                  </td>
                  <td className="text-muted text-sm">{p.notes || '—'}</td>
                  <td>
                    <div className="flex-row">
                      <button className="btn btn-sm" onClick={() => setModal(p)}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => setConfirm(p.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7}><EmptyState message="No payments found." /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!modal} title={modal?.id ? 'Edit Payment' : 'Add Payment'} onClose={() => setModal(null)}>
        <PaymentForm payment={modal?.id ? modal : null} students={students}
          onSave={handleSave} onClose={() => setModal(null)} />
      </Modal>
      <ConfirmModal open={!!confirm} title="Delete Payment" danger message="Delete this payment record?"
        onConfirm={() => handleDelete(confirm)} onClose={() => setConfirm(null)} />
    </div>
  );
}

// ── Teachers Admin Page ───────────────────────────────────────────────────────
const TEACHER_TYPE_OPTIONS = [
  { value: 'theory',          label: 'Theory Teacher',          desc: 'Teaches multiple students per session' },
  { value: 'driving_parking', label: 'Driving / Parking Teacher', desc: 'One student per session, assigned at creation' },
];

function TeacherForm({ teacher, isNew, onSave, onClose }) {
  const [form, setForm] = useState(teacher || { name: '', email: '', phone: '', password: '', teacher_type: 'theory' });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function submit() {
    if (!form.name) { toast.error('Name required'); return; }
    if (isNew && (!form.email || !form.password)) { toast.error('Email and password required for new teachers'); return; }
    if (!form.teacher_type) { toast.error('Teacher type required'); return; }
    await onSave(form);
    onClose();
  }

  return (
    <>
      <div className="modal-body">
        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input className="form-input" value={form.name} onChange={set('name')} />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="form-input" value={form.phone || ''} onChange={set('phone')} />
          </div>
          {isNew && (
            <>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input className="form-input" type="email" value={form.email || ''} onChange={set('email')} />
              </div>
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input className="form-input" type="password" value={form.password || ''} onChange={set('password')} />
              </div>
            </>
          )}
        </div>

        {/* Teacher type — card selection */}
        <div className="form-group">
          <label className="form-label">Teacher Type *</label>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            {TEACHER_TYPE_OPTIONS.map(opt => (
              <div key={opt.value} onClick={() => setForm(f => ({ ...f, teacher_type: opt.value }))} style={{
                flex: 1, padding: '12px 14px', borderRadius: 'var(--radius)', cursor: 'pointer',
                border: `2px solid ${form.teacher_type === opt.value ? 'var(--blue)' : 'var(--border)'}`,
                background: form.teacher_type === opt.value ? 'var(--blue-bg)' : 'var(--surface)',
              }}>
                <div style={{ fontWeight: 500, fontSize: 13, color: form.teacher_type === opt.value ? 'var(--blue-text)' : 'var(--text)' }}>
                  {opt.label}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>{opt.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit}>Save Teacher</button>
      </div>
    </>
  );
}

export function TeachersPage() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const load = () => api.getTeachers().then(setTeachers).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  async function handleSave(form) {
    try {
      if (modal?.id) { await api.updateTeacher(modal.id, form); toast.success('Teacher updated'); }
      else           { await api.createTeacher(form);           toast.success('Teacher created'); }
      load();
    } catch (e) { toast.error(e.message); throw e; }
  }

  async function handleDelete(id) {
    try { await api.deleteTeacher(id); toast.success('Teacher deleted'); load(); }
    catch (e) { toast.error(e.message); }
  }

  if (loading) return <LoadingPage />;

  const theory = teachers.filter(t => t.teacher_type === 'theory');
  const driving = teachers.filter(t => t.teacher_type === 'driving_parking');

  function TeacherCard({ t }) {
    const isTheory = t.teacher_type === 'theory';
    return (
      <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
          background: isTheory ? 'var(--theory-bg)' : 'var(--driving-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, fontWeight: 600,
          color: isTheory ? 'var(--theory-color)' : 'var(--driving-color)',
        }}>
          {t.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
        </div>
        <div style={{ flex: 1, minWidth: 120 }}>
          <div className="fw-500">{t.name}</div>
          <div className="text-sm text-muted">{t.email} · {t.phone || 'No phone'}</div>
          <div style={{ marginTop: 4 }}>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 99,
              background: isTheory ? 'var(--theory-bg)' : 'var(--driving-bg)',
              color: isTheory ? 'var(--theory-color)' : 'var(--driving-color)',
            }}>
              {isTheory ? '📖 Theory' : '🚗 Driving/Parking'}
            </span>
          </div>
        </div>
        <div className="text-sm text-muted">{t.total_sessions} sessions · {t.upcoming_sessions} upcoming</div>
        <div className="flex-row">
          <button className="btn btn-sm" onClick={() => setModal(t)}>Edit</button>
          <button className="btn btn-sm btn-danger" onClick={() => setConfirm(t.id)}>Delete</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Teachers</h1>
        <button className="btn btn-primary" onClick={() => setModal({})}>+ Add Teacher</button>
      </div>

      {theory.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            📖 Theory Teachers — multiple students per session
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {theory.map(t => <TeacherCard key={t.id} t={t} />)}
          </div>
        </div>
      )}

      {driving.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            🚗 Driving / Parking Teachers — 1 student per session
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {driving.map(t => <TeacherCard key={t.id} t={t} />)}
          </div>
        </div>
      )}

      {teachers.length === 0 && <EmptyState message="No teachers yet." />}

      <Modal open={!!modal} title={modal?.id ? 'Edit Teacher' : 'Add Teacher'} onClose={() => setModal(null)}>
        <TeacherForm teacher={modal?.id ? modal : null} isNew={!modal?.id}
          onSave={handleSave} onClose={() => setModal(null)} />
      </Modal>
      <ConfirmModal open={!!confirm} title="Delete Teacher" danger
        message="Delete this teacher? Sessions assigned to them will remain."
        onConfirm={() => handleDelete(confirm)} onClose={() => setConfirm(null)} />
    </div>
  );
}

// ── Settings Page ─────────────────────────────────────────────────────────────
export function SettingsPage() {
  const [lessonTypes, setLessonTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    api.getLessonTypes().then(lts => {
      setLessonTypes(lts);
      const init = {};
      lts.forEach(lt => { init[lt.id] = { class_cost: lt.class_cost, test_cost: lt.test_cost }; });
      setForm(init);
    }).finally(() => setLoading(false));
  }, []);

  async function save(id) {
    setSaving(true);
    try { await api.updateLessonType(id, form[id]); toast.success('Costs updated'); }
    catch (e) { toast.error(e.message); }
    setSaving(false);
  }

  if (loading) return <LoadingPage />;

  return (
    <div className="page-content">
      <h1 className="page-title" style={{ marginBottom: 20 }}>Settings</h1>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><div className="card-title">Lesson & Test Costs</div></div>
        <div className="card-pad">
          <p className="text-sm text-muted" style={{ marginBottom: 20 }}>
            Default costs for new sessions. Individual sessions can override the class cost.
          </p>
          {lessonTypes.map(lt => (
            <div key={lt.id} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr auto', gap: 12, alignItems: 'end', marginBottom: 16 }}>
              <div><span className={`badge badge-${lt.slug}`}>{lt.name}</span></div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Cost per class (TND)</label>
                <input className="form-input" type="number" step="0.5"
                  value={form[lt.id]?.class_cost || ''}
                  onChange={e => setForm(f => ({ ...f, [lt.id]: { ...f[lt.id], class_cost: Number(e.target.value) } }))} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Test cost (TND)</label>
                <input className="form-input" type="number" step="0.5"
                  value={form[lt.id]?.test_cost || ''}
                  onChange={e => setForm(f => ({ ...f, [lt.id]: { ...f[lt.id], test_cost: Number(e.target.value) } }))} />
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => save(lt.id)} disabled={saving}>Save</button>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><div className="card-title">Teacher Type Rules</div></div>
        <div className="card-pad">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { icon: '📖', title: 'Theory Teacher', rules: ['Can teach multiple students per session', 'Students can be added to existing sessions', 'No student limit'] },
              { icon: '🚗', title: 'Driving / Parking Teacher', rules: ['Exactly 1 student per session', 'Student must be assigned at class creation', 'Cannot add/change student after creation'] },
            ].map(card => (
              <div key={card.title} style={{ flex: '1 1 220px', background: 'var(--surface2)', borderRadius: 'var(--radius)', padding: '14px 16px' }}>
                <div style={{ fontWeight: 600, marginBottom: 10 }}>{card.icon} {card.title}</div>
                {card.rules.map(r => (
                  <div key={r} style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 6, display: 'flex', gap: 6 }}>
                    <span style={{ color: 'var(--green)' }}>✓</span> {r}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">Progression Rules</div></div>
        <div className="card-pad">
          {[
            ['Theory → Driving', 'Student must pass the Theory test before accessing Driving classes'],
            ['Driving → Parking', 'Student must pass the Driving test before accessing Parking classes'],
            ['Parking → Completed', 'Student is marked as Completed after passing the Parking test'],
          ].map(([rule, desc]) => (
            <div key={rule} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', marginBottom: 8 }}>
              <div style={{ color: 'var(--green)', fontWeight: 600, minWidth: 160, fontSize: 13 }}>✓ {rule}</div>
              <div className="text-sm text-muted">{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
