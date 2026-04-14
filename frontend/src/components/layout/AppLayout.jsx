// src/components/layout/AppLayout.jsx — v2: teacher type label + payments/tests nav

import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ADMIN_NAV = [
  { to: '/admin',          end: true, label: 'Dashboard', icon: GridIcon },
  { to: '/admin/students',            label: 'Students',  icon: UsersIcon },
  { to: '/admin/teachers',            label: 'Teachers',  icon: TeacherIcon },
  { to: '/admin/classes',             label: 'Classes',   icon: BookIcon },
  { to: '/admin/calendar',            label: 'Calendar',  icon: CalIcon },
  { to: '/admin/tests',               label: 'Tests',     icon: CheckIcon },
  { to: '/admin/payments',            label: 'Payments',  icon: MoneyIcon },
  { to: '/admin/settings',            label: 'Settings',  icon: SettingsIcon },
];

const TEACHER_NAV = [
  { to: '/teacher',         end: true, label: 'Dashboard', icon: GridIcon },
  { to: '/teacher/classes',            label: 'My Classes', icon: BookIcon },
  { to: '/teacher/calendar',           label: 'Calendar',   icon: CalIcon },
  { to: '/teacher/tests',              label: 'Tests',      icon: CheckIcon },
  { to: '/teacher/payments',           label: 'Payments',   icon: MoneyIcon },
  { to: '/teacher/students',           label: 'Students',   icon: UsersIcon },
];

const TEACHER_TYPE_BADGE = {
  theory:          { label: 'Theory Teacher',      color: 'var(--theory-color)',  bg: 'var(--theory-bg)' },
  driving_parking: { label: 'Driving/Parking',     color: 'var(--driving-color)', bg: 'var(--driving-bg)' },
};

export default function AppLayout() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = isAdmin ? ADMIN_NAV : TEACHER_NAV;
  const typeBadge = !isAdmin && user?.teacher_type ? TEACHER_TYPE_BADGE[user.teacher_type] : null;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h1>🚗 DrivePro</h1>
          <span>Driving School Manager</span>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">{isAdmin ? 'Admin' : 'Teacher'}</div>
          {navItems.map(({ to, end, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={!!end}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">{user?.name}</div>
          {typeBadge && (
            <div style={{ marginTop: 4, marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99, background: typeBadge.bg, color: typeBadge.color }}>
                {typeBadge.label}
              </span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
            <span className="badge badge-gray" style={{ fontSize: 10 }}>{user?.role}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => { logout(); navigate('/login'); }}>
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <div className="main-area">
        <Outlet />
      </div>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function GridIcon()     { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>; }
function UsersIcon()    { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
function TeacherIcon()  { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/><path d="M15 14l2 2 4-4"/></svg>; }
function BookIcon()     { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>; }
function CalIcon()      { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>; }
function CheckIcon()    { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>; }
function MoneyIcon()    { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>; }
function SettingsIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>; }
