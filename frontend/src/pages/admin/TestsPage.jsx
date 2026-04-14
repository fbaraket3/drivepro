// src/pages/admin/TestsPage.jsx — v2: teachers can record+edit, audit trail

import { useState, useEffect, useMemo } from 'react';
import { api } from '../../utils/api';
import { toast, Modal, ConfirmModal, EmptyState, LoadingPage } from '../../components/shared/UI';
import { useAuth } from '../../context/AuthContext';

// ── Test Form ─────────────────────────────────────────────────────────────────
function TestForm({ test, students, lessonTypes, onSave, onClose }) {
  const [form, setForm] = useState(test || {
    student_id:     students[0]?.id || '',
    lesson_type_id: lessonTypes[0]?.id || '',
    date:           new Date().toISOString().slice(0, 10),
    result:         'pass',
    cost:           '',
    notes:          '',
  });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const selectedType = lessonTypes.find(lt => lt.id === parseInt(form.lesson_type_id));

  async function submit() {
    if (!form.student_id || !form.lesson_type_id || !form.date) {
      toast.error('Fill all required fields'); return;
    }
    await onSave({
      ...form,
      student_id:     Number(form.student_id),
      lesson_type_id: Number(form.lesson_type_id),
      cost:           Number(form.cost || selectedType?.test_cost || 0),
    });
    onClose();
  }

  return (
    <>
      <div className="modal-body">
        {!test?.id && (
          <div className="form-group">
            <label className="form-label">Student *</label>
            <select className="form-select" value={form.student_id} onChange={set('student_id')}>
              {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.current_stage})</option>)}
            </select>
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Lesson Type *</label>
          <select className="form-select" value={form.lesson_type_id} onChange={set('lesson_type_id')} disabled={!!test?.id}>
            {lessonTypes.map(lt => <option key={lt.id} value={lt.id}>{lt.name}</option>)}
          </select>
        </div>
        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Date *</label>
            <input className="form-input" type="date" value={form.date} onChange={set('date')} />
          </div>
          <div className="form-group">
            <label className="form-label">Result *</label>
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
          <div style={{ padding: '8px 12px', background: 'var(--green-bg)', color: 'var(--green-text)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
            ✓ Recording a pass will automatically advance the student to the next stage.
          </div>
        )}
      </div>
      <div className="modal-footer">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className={`btn ${form.result === 'pass' ? 'btn-success' : 'btn-primary'}`} onClick={submit}>
          {test?.id ? 'Save Changes' : 'Record Test'}
        </button>
      </div>
    </>
  );
}

// ── Audit Log Modal ───────────────────────────────────────────────────────────
function AuditModal({ testId, onClose }) {
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getTestAudit(testId).then(setAudit).finally(() => setLoading(false));
  }, [testId]);

  return (
    <>
      <div className="modal-body">
        {loading ? (
          <div className="text-muted text-sm">Loading audit history...</div>
        ) : audit.length === 0 ? (
          <EmptyState message="No changes recorded yet." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {audit.map(a => (
              <div key={a.id} style={{
                padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                background: 'var(--surface2)', border: '1px solid var(--border)',
              }}>
                <div className="flex-row justify-between" style={{ marginBottom: 4 }}>
                  <span className="fw-500 text-sm">{a.changed_by_name}</span>
                  <span className="text-xs text-faint">{a.changed_at.replace('T', ' ').slice(0, 16)}</span>
                </div>
                <div className="text-sm">
                  Changed <strong>{a.field}</strong>:&nbsp;
                  <span style={{ background: 'var(--red-bg)', color: 'var(--red-text)', padding: '1px 5px', borderRadius: 3, fontSize: 12 }}>
                    {a.old_value || '—'}
                  </span>
                  &nbsp;→&nbsp;
                  <span style={{ background: 'var(--green-bg)', color: 'var(--green-text)', padding: '1px 5px', borderRadius: 3, fontSize: 12 }}>
                    {a.new_value || '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="modal-footer">
        <button className="btn" onClick={onClose}>Close</button>
      </div>
    </>
  );
}

// ── Tests Page ────────────────────────────────────────────────────────────────
export default function TestsPage() {
  const { isAdmin } = useAuth();
  const [tests, setTests] = useState([]);
  const [students, setStudents] = useState([]);
  const [lessonTypes, setLessonTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [auditModal, setAuditModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [resultFilter, setResultFilter] = useState('all');

  const load = async () => {
    const [t, s, lt] = await Promise.all([api.getTests(), api.getStudents(), api.getLessonTypes()]);
    setTests(t); setStudents(s); setLessonTypes(lt);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() =>
    tests.filter(t => resultFilter === 'all' || t.result === resultFilter),
    [tests, resultFilter]
  );

  async function handleSave(form) {
    try {
      if (modal?.id) {
        await api.updateTest(modal.id, form);
        toast.success('Test result updated — audit log saved');
      } else {
        const res = await api.createTest(form);
        toast.success(res.result === 'pass'
          ? `Test recorded — student advanced to ${res.newStage} stage!`
          : 'Test recorded.');
      }
      load();
    } catch (e) { toast.error(e.message); throw e; }
  }

  async function handleDelete(id) {
    try { await api.deleteTest(id); toast.success('Test deleted'); load(); }
    catch (e) { toast.error(e.message); }
  }

  if (loading) return <LoadingPage />;

  const stats = {
    total: tests.length,
    pass:  tests.filter(t => t.result === 'pass').length,
    fail:  tests.filter(t => t.result === 'fail').length,
    rate:  tests.length ? Math.round(tests.filter(t => t.result === 'pass').length / tests.length * 100) : 0,
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Tests</h1>
        <button className="btn btn-primary" onClick={() => setModal({})}>+ Record Test</button>
      </div>

      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card"><div className="stat-label">Total Tests</div><div className="stat-value">{stats.total}</div></div>
        <div className="stat-card"><div className="stat-label">Passed</div><div className="stat-value" style={{ color: 'var(--green)' }}>{stats.pass}</div></div>
        <div className="stat-card"><div className="stat-label">Failed</div><div className="stat-value" style={{ color: 'var(--red)' }}>{stats.fail}</div></div>
        <div className="stat-card"><div className="stat-label">Pass Rate</div><div className="stat-value">{stats.rate}%</div></div>
      </div>

      <div className="flex-row gap-12" style={{ marginBottom: 16 }}>
        {['all', 'pass', 'fail', 'pending'].map(r => (
          <button key={r} onClick={() => setResultFilter(r)} style={{
            padding: '5px 12px', borderRadius: 99, fontSize: 12, cursor: 'pointer', fontWeight: 500, fontFamily: 'var(--font)',
            background: resultFilter === r ? 'var(--blue)' : 'transparent',
            color: resultFilter === r ? '#fff' : 'var(--text2)',
            border: `1px solid ${resultFilter === r ? 'var(--blue)' : 'var(--border2)'}`,
          }}>{r.charAt(0).toUpperCase() + r.slice(1)}</button>
        ))}
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Student</th><th>Type</th><th>Attempt</th><th>Date</th>
                <th>Result</th><th>Cost</th><th>Recorded By</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id}>
                  <td className="fw-500">{t.student_name}</td>
                  <td><span className={`badge badge-${t.slug}`}>{t.lesson_type_name}</span></td>
                  <td><span className="badge badge-gray">#{t.attempt_number}</span></td>
                  <td className="text-muted">{t.date}</td>
                  <td>
                    <span className={`badge badge-${t.result}`}>
                      {t.result === 'pass' ? '✓ Pass' : t.result === 'fail' ? '✗ Fail' : 'Pending'}
                    </span>
                  </td>
                  <td className="fw-500">{t.cost} TND</td>
                  <td className="text-sm text-muted">{t.created_by_name || '—'}</td>
                  <td>
                    <div className="flex-row">
                      <button className="btn btn-sm" onClick={() => setModal(t)}>Edit</button>
                      <button className="btn btn-sm" onClick={() => setAuditModal(t.id)}
                        style={{ fontSize: 11 }}>History</button>
                      {isAdmin && (
                        <button className="btn btn-sm btn-danger" onClick={() => setConfirm(t.id)}>Delete</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8}><EmptyState message="No tests found." /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!modal} title={modal?.id ? 'Edit Test Result' : 'Record Test'} onClose={() => setModal(null)}>
        <TestForm test={modal?.id ? modal : null} students={students} lessonTypes={lessonTypes}
          onSave={handleSave} onClose={() => setModal(null)} />
      </Modal>

      <Modal open={!!auditModal} title="Change History" onClose={() => setAuditModal(null)} maxWidth={500}>
        {auditModal && <AuditModal testId={auditModal} onClose={() => setAuditModal(null)} />}
      </Modal>

      <ConfirmModal open={!!confirm} title="Delete Test" danger
        message="Delete this test record? This will not automatically revert the student's stage."
        onConfirm={() => handleDelete(confirm)} onClose={() => setConfirm(null)} />
    </div>
  );
}
