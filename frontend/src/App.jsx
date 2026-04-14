// src/App.jsx — v2: teacher payments + tests routes

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/shared/UI';

import Login from './pages/Login';
import AppLayout from './components/layout/AppLayout';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import Students, { StudentProfile } from './pages/admin/Students';
import Classes from './pages/admin/Classes';
import CalendarPage from './pages/admin/CalendarPage';
import TestsPage from './pages/admin/TestsPage';
import { PaymentsPage, TeachersPage, SettingsPage } from './pages/admin/PaymentsPage';

// Teacher pages
import {
  TeacherDashboard,
  TeacherClasses,
  TeacherStudents,
  TeacherCalendar,
  TeacherPayments,
  TeacherTests,
} from './pages/teacher/TeacherPortal';

// ── Route Guard ───────────────────────────────────────────────────────────────
function RequireAuth({ children, role }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role)
    return <Navigate to={user.role === 'admin' ? '/admin' : '/teacher'} replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider />
        <Routes>
          <Route path="/login" element={<LoginRedirect />} />

          {/* ── Admin ── */}
          <Route path="/admin" element={<RequireAuth role="admin"><AppLayout /></RequireAuth>}>
            <Route index      element={<AdminDashboard />} />
            <Route path="students"       element={<Students />} />
            <Route path="students/:id"   element={<StudentProfile />} />
            <Route path="teachers"       element={<TeachersPage />} />
            <Route path="classes"        element={<Classes />} />
            <Route path="calendar"       element={<CalendarPage />} />
            <Route path="tests"          element={<TestsPage />} />
            <Route path="payments"       element={<PaymentsPage />} />
            <Route path="settings"       element={<SettingsPage />} />
          </Route>

          {/* ── Teacher ── */}
          <Route path="/teacher" element={<RequireAuth role="teacher"><AppLayout /></RequireAuth>}>
            <Route index      element={<TeacherDashboard />} />
            <Route path="classes"  element={<TeacherClasses />} />
            <Route path="students" element={<TeacherStudents />} />
            <Route path="calendar" element={<TeacherCalendar />} />
            <Route path="payments" element={<TeacherPayments />} />
            <Route path="tests"    element={<TeacherTests />} />
          </Route>

          <Route path="/"  element={<DefaultRedirect />} />
          <Route path="*"  element={<DefaultRedirect />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

function LoginRedirect() {
  const { user } = useAuth();
  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/teacher'} replace />;
  return <Login />;
}

function DefaultRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'admin' ? '/admin' : '/teacher'} replace />;
}
