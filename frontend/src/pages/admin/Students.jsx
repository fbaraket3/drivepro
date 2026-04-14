// src/pages/admin/Students.jsx

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../utils/api';
import { toast, Modal, ConfirmModal, StageBadge, LoadingPage, EmptyState, SearchInput, ProgressTimeline } from '../../components/shared/UI';

// ─── Student Form ─────────────────────────────────────────────────────────────
function StudentForm({ student, onSave, onClose }) {
  const [form, setForm] = useState(student || { name: '', phone: '', email: '', cin: '', registration_date: new Date().toISOString().slice(0,10), notes: '' });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  async function submit() {
    if (!form.name || !form.phone) { toast.error('Name and phone required'); return; }
    await onSave(form);
    onClose();
  }
  return (
    <>
      <div className="modal-body">
        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input className="form-input" value={form.name} onChange={set('name')} placeholder="e.g. Amir Cherif" />
          </div>
          <div className="form-group">
            <label className="form-label">Phone *</label>
            <input className="form-input" value={form.phone} onChange={set('phone')} placeholder="22 345 678" />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={form.email} onChange={set('email')} />
          </div>
          <div className="form-group">
            <label className="form-label">CIN</label>
            <input className="form-input" value={form.cin} onChange={set('cin')} placeholder="National ID" />
          </div>
          <div className="form-group">
            <label className="form-label">Registration Date</label>
            <input className="form-input" type="date" value={form.registration_date} onChange={set('registration_date')} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea className="form-textarea" value={form.notes} onChange={set('notes')} placeholder="Optional notes..." />
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit}>Save Student</button>
      </div>
    </>
  );
}

// ─── Students List ────────────────────────────────────────────────────────────
export default function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const navigate = useNavigate();

  const load = () => api.getStudents().then(setStudents).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return students
      .filter(s => stageFilter === 'all' || s.current_stage === stageFilter)
      .filter(s => !q || s.name.toLowerCase().includes(q) || s.phone.includes(q) || (s.email || '').toLowerCase().includes(q));
  }, [students, search, stageFilter]);

  async function handleSave(form) {
    try {
      if (modal?.id) { await api.updateStudent(modal.id, form); toast.success('Student updated'); }
      else           { await api.createStudent(form);           toast.success('Student created'); }
      load();
    } catch (e) { toast.error(e.message); throw e; }
  }

  async function handleDelete(id) {
    try { await api.deleteStudent(id); toast.success('Student deleted'); load(); }
    catch (e) { toast.error(e.message); }
  }

  if (loading) return <LoadingPage />;

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Students</h1>
        <button className="btn btn-primary" onClick={() => setModal({})}>+ Add Student</button>
      </div>

      {/* Filters */}
      <div className="flex-row gap-12" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search students..." />
        {['all','theory','driving','parking','completed'].map(s => (
          <button key={s} onClick={() => setStageFilter(s)} style={{
            padding: '5px 12px', borderRadius: 99, fontSize: 12, cursor: 'pointer', fontWeight: 500, fontFamily: 'var(--font)',
            background: stageFilter === s ? 'var(--blue)' : 'transparent',
            color: stageFilter === s ? '#fff' : 'var(--text2)',
            border: `1px solid ${stageFilter === s ? 'var(--blue)' : 'var(--border2)'}`,
          }}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>
        ))}
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Phone</th><th>CIN</th><th>Stage</th><th>Classes</th><th>Registered</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id}>
                  <td><span className="fw-500" style={{ cursor: 'pointer', color: 'var(--blue)' }} onClick={() => navigate(`/admin/students/${s.id}`)}>{s.name}</span></td>
                  <td className="text-muted">{s.phone}</td>
                  <td className="text-muted font-mono">{s.cin || '—'}</td>
                  <td><StageBadge stage={s.current_stage} /></td>
                  <td>{s.total_classes}</td>
                  <td className="text-muted text-sm">{s.registration_date}</td>
                  <td>
                    <div className="flex-row">
                      <button className="btn btn-sm" onClick={() => navigate(`/admin/students/${s.id}`)}>Profile</button>
                      <button className="btn btn-sm" onClick={() => setModal(s)}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => setConfirm(s.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7}><EmptyState message="No students found." /></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!modal} title={modal?.id ? 'Edit Student' : 'Add Student'} onClose={() => setModal(null)}>
        <StudentForm student={modal?.id ? modal : null} onSave={handleSave} onClose={() => setModal(null)} />
      </Modal>

      <ConfirmModal open={!!confirm} title="Delete Student" danger
        message="This will permanently delete the student and all their data."
        onConfirm={() => handleDelete(confirm)}
        onClose={() => setConfirm(null)} />
    </div>
  );
}

// ─── Student Profile ──────────────────────────────────────────────────────────
export function StudentProfile() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('progress');
  const [testModal, setTestModal] = useState(null);
  const [payModal, setPayModal] = useState(false);
  const [lessonTypes, setLessonTypes] = useState([]);

  const load = () => api.getStudent(id).then(setData).finally(() => setLoading(false));
  useEffect(() => {
    load();
    api.getLessonTypes().then(setLessonTypes);
  }, [id]);

  async function handleTestSave(form) {
    try {
      const res = await api.createTest({ ...form, student_id: parseInt(id) });
      toast.success(res.result === 'pass' ? `Passed! Moved to ${res.newStage} stage.` : 'Test recorded — failed.');
      load();
    } catch (e) { toast.error(e.message); }
  }

  async function handlePaySave(form) {
    try {
      await api.createPayment({ ...form, student_id: parseInt(id) });
      toast.success('Payment recorded');
      load();
    } catch (e) { toast.error(e.message); }
  }

  if (loading || !data) return <LoadingPage />;

  const { financials, progress } = data;
  const tabs = ['progress', 'classes', 'tests', 'payments'];

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--theory-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 600, color: 'var(--theory-color)', flexShrink: 0 }}>
          {data.name.split(' ').map(w => w[0]).join('').slice(0,2)}
        </div>
        <div style={{ flex: 1 }}>
          <div className="flex-row" style={{ marginBottom: 4 }}>
            <h1 className="page-title">{data.name}</h1>
            <StageBadge stage={data.current_stage} />
          </div>
          <div className="text-sm text-muted">{data.phone}{data.email ? ` · ${data.email}` : ''}{data.cin ? ` · CIN: ${data.cin}` : ''}</div>
        </div>
        <div className="flex-row">
          {data.current_stage !== 'completed' && (
            <button className="btn btn-primary btn-sm" onClick={() => setTestModal({})}>+ Record Test</button>
          )}
          <button className="btn btn-success btn-sm" onClick={() => setPayModal(true)}>+ Payment</button>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-label">Total Owed</div>
          <div className="stat-value">{financials.totalOwed.toLocaleString()}</div>
          <div className="stat-sub">TND</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Paid</div>
          <div className="stat-value" style={{ color: 'var(--green)' }}>{financials.totalPaid.toLocaleString()}</div>
          <div className="stat-sub">TND</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Balance</div>
          <div className="stat-value" style={{ color: financials.balance < 0 ? 'var(--red)' : 'var(--green)' }}>
            {Math.abs(financials.balance).toLocaleString()}
          </div>
          <div className="stat-sub">{financials.balance < 0 ? 'TND still owed' : 'TND credit'}</div>
        </div>
        {Object.entries(financials.perType).map(([slug, ft]) => (
          <div key={slug} className="stat-card" style={{ borderLeft: `3px solid var(--${slug}-color)` }}>
            <div className="stat-label">{ft.lessonTypeName}</div>
            <div className="stat-value" style={{ fontSize: 18 }}>{ft.total.toLocaleString()} TND</div>
            <div className="stat-sub">{ft.classCount} classes + {ft.testAttempts} test{ft.testAttempts !== 1 ? 's' : ''}</div>
          </div>
        ))}
      </div>

      {/* Progress Timeline */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><div className="card-title">Learning Progress</div></div>
        <div className="card-pad">
          <ProgressTimeline currentStage={data.current_stage} stages={progress.stages} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-row" style={{ marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{
            padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
            fontSize: 14, fontWeight: activeTab === t ? 500 : 400,
            color: activeTab === t ? 'var(--blue)' : 'var(--text2)',
            borderBottom: `2px solid ${activeTab === t ? 'var(--blue)' : 'transparent'}`,
            marginBottom: -1,
          }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      {activeTab === 'progress' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {progress.stages.map(s => (
            <div key={s.lessonType.slug} className="card">
              <div className="card-header">
                <div className="flex-row">
                  <span className={`badge badge-${s.lessonType.slug}`}>{s.lessonType.name}</span>
                  <span className={`badge badge-${s.status}`}>{s.status}</span>
                </div>
                <div className="text-sm text-muted">{financials.perType[s.lessonType.slug]?.total.toLocaleString()} TND total</div>
              </div>
              <div className="card-pad" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div className="text-xs text-faint mb-8">CLASSES ({s.classes.length})</div>
                  {s.classes.length === 0 ? <div className="text-sm text-faint">No classes yet</div> : s.classes.slice(0,3).map(c => (
                    <div key={c.id} className="text-sm" style={{ marginBottom: 4 }}>
                      {c.date} · {c.start_time}–{c.end_time} · <span className="text-faint">{c.teacher_name}</span>
                    </div>
                  ))}
                  {s.classes.length > 3 && <div className="text-xs text-faint">+{s.classes.length - 3} more</div>}
                </div>
                <div>
                  <div className="text-xs text-faint mb-8">TEST ATTEMPTS ({s.tests.length})</div>
                  {s.tests.length === 0 ? <div className="text-sm text-faint">No tests yet</div> : s.tests.map(t => (
                    <div key={t.id} className="flex-row text-sm" style={{ marginBottom: 4 }}>
                      <span className={`badge badge-${t.result}`}>{t.result}</span>
                      <span className="text-muted">Attempt {t.attempt_number} · {t.date}</span>
                      <span className="text-faint">{t.cost} TND</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'classes' && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Type</th><th>Date</th><th>Time</th><th>Teacher</th><th>Cost</th></tr></thead>
              <tbody>
                {progress.stages.flatMap(s => s.classes.map(c => (
                  <tr key={c.id}>
                    <td><span className={`badge badge-${s.lessonType.slug}`}>{s.lessonType.name}</span></td>
                    <td>{c.date}</td>
                    <td className="text-muted">{c.start_time}–{c.end_time}</td>
                    <td>{c.teacher_name}</td>
                    <td className="text-green fw-500">{s.lessonType.class_cost} TND</td>
                  </tr>
                ))).length > 0
                  ? progress.stages.flatMap(s => s.classes.map(c => (
                    <tr key={c.id}>
                      <td><span className={`badge badge-${s.lessonType.slug}`}>{s.lessonType.name}</span></td>
                      <td>{c.date}</td>
                      <td className="text-muted">{c.start_time}–{c.end_time}</td>
                      <td>{c.teacher_name}</td>
                      <td className="text-green fw-500">{(c.cost_override || s.lessonType.class_cost)} TND</td>
                    </tr>
                  )))
                  : <tr><td colSpan={5}><EmptyState message="No classes yet" /></td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'tests' && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Type</th><th>Attempt</th><th>Date</th><th>Result</th><th>Cost</th></tr></thead>
              <tbody>
                {progress.stages.flatMap(s => s.tests).length > 0
                  ? progress.stages.flatMap(s => s.tests.map(t => (
                    <tr key={t.id}>
                      <td><span className={`badge badge-${s.lessonType.slug}`}>{s.lessonType.name}</span></td>
                      <td>#{t.attempt_number}</td>
                      <td>{t.date}</td>
                      <td><span className={`badge badge-${t.result}`}>{t.result}</span></td>
                      <td className="text-green fw-500">{t.cost} TND</td>
                    </tr>
                  )))
                  : <tr><td colSpan={5}><EmptyState message="No tests recorded yet" /></td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'payments' && <PaymentsTab studentId={id} onRefresh={load} />}

      {/* Test Modal */}
      <Modal open={!!testModal} title="Record Test" onClose={() => setTestModal(null)}>
        <TestForm student={data} lessonTypes={lessonTypes} onSave={handleTestSave} onClose={() => setTestModal(null)} />
      </Modal>

      {/* Payment Modal */}
      <Modal open={payModal} title="Record Payment" onClose={() => setPayModal(false)}>
        <PaymentForm onSave={handlePaySave} onClose={() => setPayModal(false)} />
      </Modal>
    </div>
  );
}

function PaymentsTab({ studentId, onRefresh }) {
  const [payments, setPayments] = useState([]);
  useEffect(() => { api.getPayments({ studentId }).then(setPayments); }, [studentId]);
  return (
    <div className="card">
      <div className="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Notes</th></tr></thead>
          <tbody>
            {payments.length > 0 ? payments.map(p => (
              <tr key={p.id}>
                <td>{p.payment_date}</td>
                <td className="text-green fw-500">{p.amount.toLocaleString()} TND</td>
                <td><span className="badge badge-gray">{p.method}</span></td>
                <td className="text-muted text-sm">{p.notes || '—'}</td>
              </tr>
            )) : <tr><td colSpan={4}><EmptyState message="No payments yet" /></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TestForm({ student, lessonTypes, onSave, onClose }) {
  const [form, setForm] = useState({
    lesson_type_id: lessonTypes.find(lt => lt.slug === student.current_stage)?.id || lessonTypes[0]?.id || '',
    date: new Date().toISOString().slice(0,10),
    result: 'pass',
    cost: '',
    notes: '',
  });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const selectedType = lessonTypes.find(lt => lt.id === parseInt(form.lesson_type_id));

  async function submit() {
    if (!form.lesson_type_id || !form.date) { toast.error('All fields required'); return; }
    const cost = form.cost || selectedType?.test_cost || 0;
    await onSave({ ...form, cost: Number(cost), lesson_type_id: Number(form.lesson_type_id) });
    onClose();
  }

  return (
    <>
      <div className="modal-body">
        <div className="form-group">
          <label className="form-label">Lesson Type</label>
          <select className="form-select" value={form.lesson_type_id} onChange={set('lesson_type_id')}>
            {lessonTypes.map(lt => <option key={lt.id} value={lt.id}>{lt.name}</option>)}
          </select>
        </div>
        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Date</label>
            <input className="form-input" type="date" value={form.date} onChange={set('date')} />
          </div>
          <div className="form-group">
            <label className="form-label">Result</label>
            <select className="form-select" value={form.result} onChange={set('result')}>
              <option value="pass">Pass ✓</option>
              <option value="fail">Fail ✗</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Cost (TND)</label>
            <input className="form-input" type="number" value={form.cost}
              onChange={set('cost')} placeholder={selectedType?.test_cost || '0'} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea className="form-textarea" value={form.notes} onChange={set('notes')} style={{ minHeight: 60 }} />
        </div>
        {form.result === 'pass' && (
          <div style={{ background: 'var(--green-bg)', color: 'var(--green-text)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: 13, marginTop: 8 }}>
            ✓ Recording a pass will automatically advance the student to the next stage.
          </div>
        )}
      </div>
      <div className="modal-footer">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className={`btn ${form.result === 'pass' ? 'btn-success' : 'btn-primary'}`} onClick={submit}>Save Test</button>
      </div>
    </>
  );
}

function PaymentForm({ onSave, onClose }) {
  const [form, setForm] = useState({ amount: '', payment_date: new Date().toISOString().slice(0,10), method: 'cash', notes: '' });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  async function submit() {
    if (!form.amount) { toast.error('Amount required'); return; }
    await onSave({ ...form, amount: Number(form.amount) });
    onClose();
  }
  return (
    <>
      <div className="modal-body">
        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Amount (TND)</label>
            <input className="form-input" type="number" value={form.amount} onChange={set('amount')} placeholder="0" />
          </div>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input className="form-input" type="date" value={form.payment_date} onChange={set('payment_date')} />
          </div>
          <div className="form-group">
            <label className="form-label">Method</label>
            <select className="form-select" value={form.method} onChange={set('method')}>
              {['cash','card','transfer','cheque'].map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Notes</label>
          <input className="form-input" value={form.notes} onChange={set('notes')} placeholder="optional" />
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-success" onClick={submit}>Save Payment</button>
      </div>
    </>
  );
}


