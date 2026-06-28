import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AdminLayout from './components/AdminLayout'
import TerminalPin from './pages/TerminalPin'
import TerminalCamera from './pages/TerminalCamera'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import AdminEmployees from './pages/AdminEmployees'
import AdminRecords from './pages/AdminRecords'
import AdminAudit from './pages/AdminAudit'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<TerminalPin />} />
          <Route path="/camera" element={<TerminalCamera />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <AdminDashboard />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/empleados"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <AdminEmployees />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/fichajes"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <AdminRecords />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/auditoria"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <AdminAudit />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
