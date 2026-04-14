// src/pages/admin/Classes.jsx — v2: teacher_type enforcement in UI

import { useState, useEffect, useMemo } from 'react';
import { api } from '../../utils/api';
import { toast, Modal, ConfirmModal, EmptyState, LoadingPage, SearchInput } from '../../components/shared/UI';

const TYPE_COLORS = {
  theory:  { color: 'var(--theory-color)',  bg: 'var(--theory-bg)' },
  driving: { color: 'var(--driving-color)', bg: 'var(--driving-bg)' },
  parking: { color: 'var(--parking-color)', bg: 'var(--parking-bg)' },
};

// ── Teacher type labels ────────────────────────────────────────────────────────
const TEACHER_TYPE_LABEL = {
  theory:          { label: 'Theory Teacher',          color: 'var(--theory-color)',  bg: 'var(--theory-bg)' },
  driving_parking: { label: 'Driving/Parking Teacher', color: 'var(--driving-color)', bg: 'var(--driving-bg)' },
};

function TeacherTypeBadge({ type }) {
  if (!type) return null;
  const t = TEACHER_TYPE_LABEL[type] || {};
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 99, background: t.bg, color: t.color }}>
      {t.label}
    </span>
  );
}

// ── Class Form ────────────────────────────────────────────────────────────────
// For driving_parking teachers: student must be selected at creation
// For theory teachers: optional at creation, can add later
function ClassForm({ session, lessonTypes, teachers, students, currentUser, onSave, onClose }) {
  const isEdit = !!session?.id;

  // Pre-select teacher: if teacher user, always themselves
  const defaultTeacherId = currentUser?.role === 'teacher'
    ? String(currentUser.id)
    : (session?.teacher_id ? String(session.teacher_id) : (teachers[0]?.id ? String(teachers[0].id) : ''));

  const [form, setForm] = useState({
    lesson_type_id: session?.lesson_type_id ? String(session.lesson_type_id) : (lessonTypes[0]?.id ? String(lessonTypes[0].id) : ''),
    teacher_id:     defaultTeacherId,
    date:           session?.date || new Date().toISOString().slice(0, 10),
    start_time:     session?.start_time || '09:00',
    end_time:       session?.end_time   || '10:00',
    notes:          session?.notes || '',
    student_id:     '',   // only used for driving_parking at creation
  });

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  // Derive selected teacher's type
  const selectedTeacher = teachers.find(t => String(t.id) === String(form.teacher_id));
  const isDrivingParking = selectedTeacher?.teacher_type === 'driving_parking';

  // Filter students eligible for the selected lesson type
  const eligibleStudents = useMemo(() => {
    const lt = lessonTypes.find(lt => String(lt.id) === String(form.lesson_type_id));
    if (!lt) return students;
    const stageOrder = ['theory', 'driving', 'parking', 'completed'];
    const ltIdx = stageOrder.indexOf(lt.slug);
    return students.filter(s => stageOrder.indexOf(s.current_stage) >= ltIdx ||
      // allow current stage students
      s.current_stage === lt.slug);
  }, [students, form.lesson_type_id, lessonTypes]);

  async function submit() {
    if (!form.lesson_type_id || !form.teacher_id || !form.date || !form.start_time || !form.end_time) {
      toast.error('All fields required'); return;
    }
    if (!isEdit && isDrivingParking && !form.student_id) {
      toast.error('Driving/Parking teachers must assign a student when creating a class'); return;
    }
    const payload = {
      lesson_type_id: Number(form.lesson_type_id),
      teacher_id:     Number(form.teacher_id),
      date:           form.date,
      start_time:     form.start_time,
      end_time:       form.end_time,
      notes:          form.notes || null,
    };
    if (!isEdit && form.student_id) payload.student_id = Number(form.student_id);
    await onSave(payload);
    onClose();
  }

  return (
    <>
      <div className="modal-body">
        {/* Teacher type info banner */}
        {selectedTeacher && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
            background: isDrivingParking ? 'var(--driving-bg)' : 'var(--theory-bg)',
            borderRadius: 'var(--radius-sm)', marginBottom: 16, fontSize: 13,
            color: isDrivingParking ? 'var(--driving-color)' : 'var(--theory-color)',
          }}>
            <span style={{ fontWeight: 600 }}>{isDrivingParking ? '🚗' : '📖'}</span>
            <span>
              {isDrivingParking
                ? 'Driving/Parking teacher — exactly 1 student required at creation, cannot be changed later'
                : 'Theory teacher — can teach multiple students, students can be added later'}
            </span>
          </div>
        )}

        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Lesson Type *</label>
            <select className="form-select" value={form.lesson_type_id} onChange={set('lesson_type_id')} disabled={isEdit}>
              {lessonTypes.map(lt => <option key={lt.id} value={lt.id}>{lt.name} — {lt.class_cost} TND</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Teacher *</label>
            <select className="form-select" value={form.teacher_id} onChange={set('teacher_id')}
              disabled={isEdit || currentUser?.role === 'teacher'}>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.teacher_type === 'driving_parking' ? 'Driving/Parking' : 'Theory'})
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Date *</label>
            <input className="form-input" type="date" value={form.date} onChange={set('date')} />
          </div>
          <div />
          <div className="form-group">
            <label className="form-label">Start Time *</label>
            <input className="form-input" type="time" value={form.start_time} onChange={set('start_time')} />
          </div>
          <div className="form-group">
            <label className="form-label">End Time *</label>
            <input className="form-input" type="time" value={form.end_time} onChange={set('end_time')} />
          </div>
        </div>

        {/* Student assignment — only shown at creation for driving_parking (required) or theory (optional) */}
        {!isEdit && (
          <div className="form-group">
            <label className="form-label">
              {isDrivingParking ? 'Student * (required)' : 'Student (optional — can add later)'}
            </label>
            <select className="form-select" value={form.student_id} onChange={set('student_id')}>
              {!isDrivingParking && <option value="">— No student yet —</option>}
              {eligibleStudents.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.current_stage})</option>
              ))}
            </select>
            {isDrivingParking && !form.student_id && (
              <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>
                A student must be selected for Driving/Parking sessions
              </div>
            )}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea className="form-textarea" value={form.notes} onChange={set('notes')} style={{ minHeight: 56 }} />
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit}>
          {isEdit ? 'Save Changes' : 'Create Class'}
        </button>
      </div>
    </>
  );
}

// ── Enroll Students Modal (theory-only) ───────────────────────────────────────
function EnrollModal({ session, students, onClose, onRefresh }) {
  const [enrolled, setEnrolled] = useState(session.students?.map(s => s.id) || []);
  const [search, setSearch] = useState('');

  const ltSlug = session.lesson_type_slug;
  const stageOrder = ['theory', 'driving', 'parking', 'completed'];
  const ltIdx = stageOrder.indexOf(ltSlug);

  const eligible = students.filter(s =>
    stageOrder.indexOf(s.current_stage) >= ltIdx ||
    s.current_stage === ltSlug
  );
  const filtered = eligible.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) || s.phone.includes(search)
  );

  async function toggle(student) {
    const isIn = enrolled.includes(student.id);
    try {
      if (isIn) {
        await api.unenrollStudent(session.id, student.id);
        setEnrolled(e => e.filter(x => x !== student.id));
        toast.info(`${student.name} removed`);
      } else {
        await api.enrollStudent(session.id, student.id);
        setEnrolled(e => [...e, student.id]);
        toast.success(`${student.name} enrolled`);
      }
      onRefresh();
    } catch (e) { toast.error(e.message); }
  }

  return (
    <>
      <div className="modal-body">
        <div style={{ padding: '8px 12px', background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', fontSize: 13, marginBottom: 12 }}>
          <strong>{session.lesson_type_name}</strong> · {session.date} · {session.start_time}–{session.end_time}
          <span className="text-muted"> · {session.teacher_name}</span>
        </div>
        <div style={{ padding: '6px 10px', background: 'var(--theory-bg)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--theory-color)', marginBottom: 12 }}>
          Theory classes can have unlimited students
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search students..." />
        <div style={{ marginTop: 10, maxHeight: 280, overflowY: 'auto' }}>
          {filtered.map(s => {
            const isIn = enrolled.includes(s.id);
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', borderBottom: '1px solid var(--border)' }}>
                <input type="checkbox" checked={isIn} onChange={() => toggle(s)}
                  style={{ width: 16, height: 16, cursor: 'pointer' }} />
                <div style={{ flex: 1 }}>
                  <div className="fw-500 text-sm">{s.name}</div>
                  <div className="text-xs text-faint">{s.phone}</div>
                </div>
                <span className={`badge badge-${s.current_stage}`}>{s.current_stage}</span>
              </div>
            );
          })}
          {filtered.length === 0 && <div className="empty-state">No eligible students found.</div>}
        </div>
      </div>
      <div className="modal-footer"><button className="btn" onClick={onClose}>Done</button></div>
    </>
  );
}

// ── Main Classes Page ─────────────────────────────────────────────────────────
export default function Classes({ teacherMode, currentUser }) {
  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [lessonTypes, setLessonTypes] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);         // null | {} | session
  const [enrollModal, setEnrollModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');

  const load = async () => {
    const params = teacherMode && currentUser ? { teacherId: currentUser.id } : {};
    const [cls, sts, lts, tcs] = await Promise.all([
      api.getClasses(params),
      api.getStudents(),
      api.getLessonTypes(),
      api.getTeachers(),
    ]);
    setSessions(cls); setStudents(sts); setLessonTypes(lts); setTeachers(tcs);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return sessions
      .filter(s => typeFilter === 'all' || s.lesson_type_slug === typeFilter)
      .filter(s => !q || s.teacher_name.toLowerCase().includes(q) || s.lesson_type_name.toLowerCase().includes(q));
  }, [sessions, typeFilter, search]);

  // Teachers only see/use their own teacher entry
  const availableTeachers = teacherMode && currentUser
    ? teachers.filter(t => t.id === currentUser.id)
    : teachers;

  async function handleSave(form) {
    try {
      if (modal?.id) { await api.updateClass(modal.id, form); toast.success('Class updated'); }
      else           { await api.createClass(form);           toast.success('Class created'); }
      load();
    } catch (e) { toast.error(e.message); throw e; }
  }

  async function handleDelete(id) {
    try { await api.deleteClass(id); toast.success('Class deleted'); load(); }
    catch (e) { toast.error(e.message); }
  }

  async function openEnroll(session) {
    if (session.teacher_type === 'driving_parking') {
      toast.error('Cannot add students to Driving/Parking sessions after creation');
      return;
    }
    const full = await api.getClass(session.id);
    setEnrollModal(full);
  }

  if (loading) return <LoadingPage />;

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">{teacherMode ? 'My Classes' : 'Classes'}</h1>
        <button className="btn btn-primary" onClick={() => setModal({})}>+ Add Class</button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search..." />
        {['all', ...lessonTypes.map(lt => lt.slug)].map(s => (
          <button key={s} onClick={() => setTypeFilter(s)} style={{
            padding: '5px 12px', borderRadius: 99, fontSize: 12, cursor: 'pointer', fontWeight: 500, fontFamily: 'var(--font)',
            background: typeFilter === s ? 'var(--blue)' : 'transparent',
            color: typeFilter === s ? '#fff' : 'var(--text2)',
            border: `1px solid ${typeFilter === s ? 'var(--blue)' : 'var(--border2)'}`,
          }}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>
        ))}
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Type</th><th>Teacher</th><th>Date</th><th>Time</th>
                <th>Capacity</th><th>Students</th><th>Cost/Student</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const tc = TYPE_COLORS[s.lesson_type_slug] || {};
                const isSingle = s.max_students === 1;
                return (
                  <tr key={s.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 3, height: 28, borderRadius: 2, background: tc.color, flexShrink: 0 }} />
                        <span className={`badge badge-${s.lesson_type_slug}`}>{s.lesson_type_name}</span>
                      </div>
                    </td>
                    <td>
                      <div className="fw-500 text-sm">{s.teacher_name}</div>
                      <TeacherTypeBadge type={s.teacher_type} />
                    </td>
                    <td>{s.date}</td>
                    <td className="font-mono text-sm">{s.start_time}–{s.end_time}</td>
                    <td>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 99,
                        background: isSingle ? 'var(--amber-bg)' : 'var(--green-bg)',
                        color: isSingle ? 'var(--amber-text)' : 'var(--green-text)',
                      }}>
                        {isSingle ? '1:1' : '1:N'}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-blue">{s.enrolled_count} enrolled</span>
                    </td>
                    <td className="text-green fw-500">{s.cost_override || s.class_cost} TND</td>
                    <td>
                      <div className="flex-row">
                        {/* Only show "Students" button for theory (multi-student) sessions */}
                        {!isSingle && (
                          <button className="btn btn-sm" onClick={() => openEnroll(s)}>Students</button>
                        )}
                        <button className="btn btn-sm" onClick={() => setModal(s)}>Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={() => setConfirm(s.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8}><EmptyState message="No classes found." /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!modal} title={modal?.id ? 'Edit Class' : 'New Class'} onClose={() => setModal(null)}>
        <ClassForm
          session={modal?.id ? modal : null}
          lessonTypes={lessonTypes}
          teachers={availableTeachers}
          students={students}
          currentUser={currentUser}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      </Modal>

      <Modal open={!!enrollModal} title="Manage Students" onClose={() => setEnrollModal(null)}>
        {enrollModal && (
          <EnrollModal
            session={enrollModal}
            students={students}
            onClose={() => setEnrollModal(null)}
            onRefresh={load}
          />
        )}
      </Modal>

      <ConfirmModal open={!!confirm} title="Delete Class" danger
        message="Delete this class session? All enrollments will be removed."
        onConfirm={() => handleDelete(confirm)}
        onClose={() => setConfirm(null)} />
    </div>
  );
}
