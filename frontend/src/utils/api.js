// src/utils/api.js — v2: teacher_type, payments by teacher, test audit

const BASE = import.meta.env.VITE_API_URL + '/api';

function getToken() { return localStorage.getItem('dp_token'); }

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const tok = getToken();
  if (tok) headers['Authorization'] = `Bearer ${tok}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  get:    (path)       => request('GET',    path),
  post:   (path, body) => request('POST',   path, body),
  put:    (path, body) => request('PUT',    path, body),
  patch:  (path, body) => request('PATCH',  path, body),
  delete: (path)       => request('DELETE', path),

  // Auth
  login: (email, password) => request('POST', '/auth/login', { email, password }),

  // Students
  getStudents:          ()       => request('GET',    '/students'),
  getStudent:           (id)     => request('GET',    `/students/${id}`),
  createStudent:        (d)      => request('POST',   '/students', d),
  updateStudent:        (id, d)  => request('PUT',    `/students/${id}`, d),
  deleteStudent:        (id)     => request('DELETE', `/students/${id}`),
  getStudentProgress:   (id)     => request('GET',    `/students/${id}/progress`),
  getStudentFinancials: (id)     => request('GET',    `/students/${id}/financials`),

  // Classes
  getClasses:       (p = {}) => request('GET', '/classes?' + new URLSearchParams(p)),
  getCalendar:      (p = {}) => request('GET', '/classes/calendar?' + new URLSearchParams(p)),
  getClass:         (id)     => request('GET', `/classes/${id}`),
  createClass:      (d)      => request('POST', '/classes', d),
  updateClass:      (id, d)  => request('PUT',  `/classes/${id}`, d),
  deleteClass:      (id)     => request('DELETE', `/classes/${id}`),
  enrollStudent:    (cid, sid) => request('POST',   `/classes/${cid}/enroll`, { student_id: sid }),
  unenrollStudent:  (cid, sid) => request('DELETE', `/classes/${cid}/enroll/${sid}`),
  markAttendance:   (cid, sid, attended) => request('PATCH', `/classes/${cid}/attendance`, { student_id: sid, attended }),

  // Tests
  getTests:     (p = {}) => request('GET',    '/tests?' + new URLSearchParams(p)),
  getTest:      (id)     => request('GET',    `/tests/${id}`),
  getTestAudit: (id)     => request('GET',    `/tests/${id}/audit`),
  createTest:   (d)      => request('POST',   '/tests', d),
  updateTest:   (id, d)  => request('PUT',    `/tests/${id}`, d),
  deleteTest:   (id)     => request('DELETE', `/tests/${id}`),

  // Payments
  getPayments:       (p = {}) => request('GET',    '/payments?' + new URLSearchParams(p)),
  createPayment:     (d)      => request('POST',   '/payments', d),
  updatePayment:     (id, d)  => request('PUT',    `/payments/${id}`, d),
  deletePayment:     (id)     => request('DELETE', `/payments/${id}`),
  getPaymentSummary: ()       => request('GET',    '/payments/summary'),

  // Admin
  getDashboard:      ()       => request('GET', '/admin/dashboard'),
  getLessonTypes:    ()       => request('GET', '/admin/lesson-types'),
  updateLessonType:  (id, d)  => request('PUT', `/admin/lesson-types/${id}`, d),
  getTeachers:       ()       => request('GET', '/admin/teachers'),
  createTeacher:     (d)      => request('POST', '/auth/teachers', d),
  updateTeacher:     (id, d)  => request('PUT',  `/admin/teachers/${id}`, d),
  deleteTeacher:     (id)     => request('DELETE', `/admin/teachers/${id}`),
  getTeacherSchedule:(id, p = {}) => request('GET', `/admin/teacher/${id}/schedule?` + new URLSearchParams(p)),
};
