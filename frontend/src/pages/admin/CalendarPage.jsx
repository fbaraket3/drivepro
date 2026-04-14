// src/pages/admin/CalendarPage.jsx

import { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { Modal, LoadingPage } from '../../components/shared/UI';

const TYPE_COLORS = {
  theory:  { color: '#5563DE', bg: '#EEEFFE' },
  driving: { color: '#0F6E56', bg: '#E1F5EE' },
  parking: { color: '#993C1D', bg: '#FAECE7' },
};

const TODAY = new Date().toISOString().slice(0, 10);
const fmt = d => d.toISOString().slice(0, 10);

export default function CalendarPage() {
  const [view, setView] = useState('week');
  const [anchor, setAnchor] = useState(new Date());
  const [sessions, setSessions] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [teacherFilter, setTeacherFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getTeachers().then(setTeachers);
  }, []);

  useEffect(() => {
    const { from, to } = getRange();
    const params = { from, to };
    if (teacherFilter !== 'all') params.teacherId = teacherFilter;
    if (typeFilter !== 'all')    params.lessonType = typeFilter;

    setLoading(true);
    api.getCalendar(params).then(setSessions).finally(() => setLoading(false));
  }, [anchor, view, teacherFilter, typeFilter]);

  function getRange() {
    if (view === 'day') return { from: fmt(anchor), to: fmt(anchor) };
    if (view === 'week') {
      const start = new Date(anchor);
      const day = (start.getDay() + 6) % 7;
      start.setDate(start.getDate() - day);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return { from: fmt(start), to: fmt(end) };
    }
    // month
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const end   = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    return { from: fmt(start), to: fmt(end) };
  }

  function move(dir) {
    const d = new Date(anchor);
    if (view === 'day')   d.setDate(d.getDate() + dir);
    if (view === 'week')  d.setDate(d.getDate() + dir * 7);
    if (view === 'month') d.setMonth(d.getMonth() + dir);
    setAnchor(d);
  }

  function headerLabel() {
    const opts = { month: 'long', year: 'numeric' };
    if (view === 'day')   return anchor.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (view === 'month') return anchor.toLocaleDateString('en-GB', opts);
    const { from, to } = getRange();
    const s = new Date(from); const e = new Date(to);
    return `${s.toLocaleDateString('en-GB',{ day:'numeric',month:'short'})} – ${e.toLocaleDateString('en-GB',{ day:'numeric',month:'short',year:'numeric'})}`;
  }

  const sessionsByDate = sessions.reduce((acc, s) => {
    (acc[s.date] = acc[s.date] || []).push(s);
    return acc;
  }, {});

  function SessionChip({ s }) {
    const tc = TYPE_COLORS[s.lesson_type_slug] || {};
    return (
      <div onClick={() => setSelected(s)} className="cal-event" style={{ background: tc.bg, color: tc.color }}>
        {s.start_time} {s.lesson_type_name} ({s.enrolled_count})
      </div>
    );
  }

  function getWeekDays() {
    const start = new Date(anchor);
    const day = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - day);
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d; });
  }

  function getMonthDays() {
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const end   = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    const days = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(new Date(d));
    return days;
  }

  return (
    <div className="page-content">
      {/* ── Toolbar ── */}
      <div className="page-header" style={{ marginBottom: 12 }}>
        <h1 className="page-title">Calendar</h1>
        <div className="flex-row">
          {['day','week','month'].map(v => (
            <button key={v} onClick={() => setView(v)} className={`btn btn-sm ${view === v ? 'btn-primary' : ''}`}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex-row gap-12" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
        <select className="form-select" style={{ maxWidth: 180 }} value={teacherFilter} onChange={e => setTeacherFilter(e.target.value)}>
          <option value="all">All Teachers</option>
          {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select className="form-select" style={{ maxWidth: 160 }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="all">All Types</option>
          <option value="theory">Theory</option>
          <option value="driving">Driving</option>
          <option value="parking">Parking</option>
        </select>
        {/* Type legend */}
        {Object.entries(TYPE_COLORS).map(([slug, c]) => (
          <div key={slug} className="flex-row" style={{ gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: c.color }} />
            <span className="text-xs text-muted">{slug}</span>
          </div>
        ))}
      </div>

      {/* ── Nav bar ── */}
      <div className="flex-row justify-between" style={{ marginBottom: 14 }}>
        <button className="btn btn-sm" onClick={() => move(-1)}>← Prev</button>
        <div style={{ fontWeight: 500, fontSize: 15 }}>{headerLabel()}</div>
        <div className="flex-row">
          <button className="btn btn-sm" onClick={() => setAnchor(new Date())}>Today</button>
          <button className="btn btn-sm" onClick={() => move(1)}>Next →</button>
        </div>
      </div>

      {loading ? <LoadingPage /> : (
        <>
          {/* ── DAY VIEW ── */}
          {view === 'day' && (
            <div className="card card-pad">
              {(sessionsByDate[fmt(anchor)] || []).length === 0 ? (
                <div className="empty-state">No classes this day.</div>
              ) : (sessionsByDate[fmt(anchor)] || []).map(s => {
                const tc = TYPE_COLORS[s.lesson_type_slug] || {};
                return (
                  <div key={s.id} onClick={() => setSelected(s)} style={{
                    display: 'flex', gap: 12, padding: '12px 14px', cursor: 'pointer', marginBottom: 8,
                    background: tc.bg, borderRadius: 'var(--radius)', border: `1px solid ${tc.color}33`,
                  }}>
                    <div style={{ minWidth: 100, fontWeight: 500, color: tc.color }}>{s.start_time}–{s.end_time}</div>
                    <div>
                      <div className="fw-500" style={{ color: tc.color }}>{s.lesson_type_name}</div>
                      <div className="text-sm text-muted">{s.teacher_name} · {s.enrolled_count} students</div>
                      {s.student_names && <div className="text-xs text-faint mt-4">{s.student_names}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── WEEK VIEW ── */}
          {view === 'week' && (
            <div style={{ overflowX: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(110px, 1fr))', gap: 6, minWidth: 700 }}>
                {getWeekDays().map(d => {
                  const dateStr = fmt(d);
                  const isToday = dateStr === TODAY;
                  const daySessions = sessionsByDate[dateStr] || [];
                  return (
                    <div key={dateStr} style={{
                      minHeight: 120, padding: '8px 6px', borderRadius: 'var(--radius-sm)',
                      background: isToday ? 'var(--blue-bg)' : 'var(--surface)',
                      border: `1px solid ${isToday ? 'var(--blue)' : 'var(--border)'}`,
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 6, color: isToday ? 'var(--blue)' : 'var(--text3)' }}>
                        {d.toLocaleDateString('en-GB', { weekday: 'short' })} {d.getDate()}
                      </div>
                      {daySessions.map(s => <SessionChip key={s.id} s={s} />)}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── MONTH VIEW ── */}
          {view === 'month' && (
            <div style={{ overflowX: 'auto' }}>
              <div className="cal-grid-month" style={{ minWidth: 560 }}>
                {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
                  <div key={d} className="cal-day-header">{d}</div>
                ))}
                {(() => {
                  const days = getMonthDays();
                  const firstDow = (days[0].getDay() + 6) % 7;
                  const blanks = Array.from({ length: firstDow }, (_, i) => <div key={`b${i}`} />);
                  return [...blanks, ...days.map(d => {
                    const dateStr = fmt(d);
                    const isToday = dateStr === TODAY;
                    const ds = sessionsByDate[dateStr] || [];
                    return (
                      <div key={dateStr} className={`cal-day ${isToday ? 'today' : ''}`}>
                        <div className="cal-day-num" style={{ color: isToday ? 'var(--blue)' : 'var(--text)' }}>{d.getDate()}</div>
                        {ds.slice(0, 3).map(s => <SessionChip key={s.id} s={s} />)}
                        {ds.length > 3 && <div style={{ fontSize: 10, color: 'var(--text3)' }}>+{ds.length - 3}</div>}
                      </div>
                    );
                  })];
                })()}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Session detail modal ── */}
      <Modal open={!!selected} title="Class Details" onClose={() => setSelected(null)} maxWidth={420}>
        {selected && (() => {
          const tc = TYPE_COLORS[selected.lesson_type_slug] || {};
          return (
            <>
              <div className="modal-body">
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <span className={`badge badge-${selected.lesson_type_slug}`}>{selected.lesson_type_name}</span>
                </div>
                {[
                  ['Teacher', selected.teacher_name],
                  ['Date', selected.date],
                  ['Time', `${selected.start_time} – ${selected.end_time}`],
                  ['Students', selected.enrolled_count],
                  ['Cost/Student', `${selected.cost_override || selected.class_cost} TND`],
                ].map(([k, v]) => (
                  <div key={k} className="flex-row justify-between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                    <span className="text-sm text-muted">{k}</span>
                    <span className="fw-500 text-sm">{v}</span>
                  </div>
                ))}
                {selected.student_names && (
                  <div style={{ marginTop: 12 }}>
                    <div className="text-xs text-faint mb-4">STUDENTS</div>
                    <div className="text-sm">{selected.student_names}</div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn" onClick={() => setSelected(null)}>Close</button>
              </div>
            </>
          );
        })()}
      </Modal>
    </div>
  );
}
