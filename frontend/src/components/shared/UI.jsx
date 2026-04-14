// src/components/shared/UI.jsx — Reusable UI primitives

import { useState, useEffect, useCallback } from 'react';

// ─── Toast system ─────────────────────────────────────────────────────────────
let _addToast = () => {};
export const toast = {
  success: (msg) => _addToast({ msg, type: 'success' }),
  error:   (msg) => _addToast({ msg, type: 'error' }),
  info:    (msg) => _addToast({ msg, type: 'info' }),
};

export function ToastProvider() {
  const [toasts, setToasts] = useState([]);
  _addToast = useCallback((t) => {
    const id = Date.now();
    setToasts(p => [...p, { ...t, id }]);
    setTimeout(() => setToasts(p => p.filter(x => x.id !== id)), 3500);
  }, []);
  return (
    <div className="toast-wrap">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>
      ))}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export function Modal({ open, title, onClose, children, maxWidth = 560 }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth }}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Confirm dialog ───────────────────────────────────────────────────────────
export function ConfirmModal({ open, title, message, onConfirm, onClose, danger }) {
  return (
    <Modal open={open} title={title || 'Confirm'} onClose={onClose} maxWidth={400}>
      <div className="modal-body">
        <p className="text-sm text-muted">{message}</p>
      </div>
      <div className="modal-footer">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => { onConfirm(); onClose(); }}>
          Confirm
        </button>
      </div>
    </Modal>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
export function StageBadge({ stage }) {
  const map = { theory: 'Theory', driving: 'Driving', parking: 'Parking', completed: 'Completed' };
  return <span className={`badge badge-${stage}`}>{map[stage] || stage}</span>;
}

export function TestBadge({ result }) {
  return <span className={`badge badge-${result}`}>{result}</span>;
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      style={{ animation: 'spin 0.8s linear infinite', display: 'block' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
    </svg>
  );
}

export function LoadingPage() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, color: 'var(--text3)' }}>
      <Spinner /> Loading...
    </div>
  );
}

// ─── Progress Timeline ────────────────────────────────────────────────────────
const STAGE_ICONS = { theory: '📖', driving: '🚗', parking: '🅿️' };

export function ProgressTimeline({ currentStage, stages }) {
  return (
    <div className="timeline">
      {stages.map((s, i) => {
        const status = s.status;
        return (
          <div key={s.lessonType.slug} className={`timeline-step ${status}`}>
            <div className={`timeline-dot ${status}`}>
              {status === 'completed' ? '✓' : status === 'active' ? STAGE_ICONS[s.lessonType.slug] : i + 1}
            </div>
            <div className={`timeline-label ${status}`}>{s.lessonType.name}</div>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
              {s.classes.length} class{s.classes.length !== 1 ? 'es' : ''}
            </div>
            {s.tests.length > 0 && (
              <div style={{ fontSize: 10, marginTop: 2 }}>
                {s.tests.map(t => (
                  <span key={t.id} className={`badge badge-${t.result}`} style={{ marginRight: 2 }}>
                    {t.result === 'pass' ? '✓' : '✗'}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
export function EmptyState({ message, action }) {
  return (
    <div className="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
      </svg>
      <div>{message || 'No data found.'}</div>
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  );
}

// ─── Search input ─────────────────────────────────────────────────────────────
export function SearchInput({ value, onChange, placeholder }) {
  return (
    <div style={{ position: 'relative' }}>
      <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--text3)', pointerEvents: 'none' }}
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      <input
        className="form-input"
        style={{ paddingLeft: 32, maxWidth: 240 }}
        placeholder={placeholder || 'Search...'}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

// ─── Filter pills ─────────────────────────────────────────────────────────────
export function FilterPills({ options, value, onChange }) {
  return (
    <div className="chip-group">
      {options.map(opt => (
        <button key={opt.value} onClick={() => onChange(opt.value)} style={{
          padding: '5px 12px', borderRadius: 99, fontSize: 12, cursor: 'pointer', fontWeight: 500, fontFamily: 'var(--font)',
          background: value === opt.value ? 'var(--blue)' : 'transparent',
          color: value === opt.value ? '#fff' : 'var(--text2)',
          border: `1px solid ${value === opt.value ? 'var(--blue)' : 'var(--border2)'}`,
        }}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}
