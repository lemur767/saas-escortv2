import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { UIProvider } from './context/UIContext'
import { SocketProvider } from './context/SocketContext'

// Pages
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard.tsx'
import ProfileDetail from './pages/ProfileDetail'
import ConversationView from './pages/ConversationView'
import Clients from './pages/Clients'
import Settings from './pages/Settings'
import Billing from './pages/Billing'
import Analytics from './pages/Analytics'
import ForgotPassword from './pages/ForgotPassword'

// Components
//import ProtectedRoute from './components/common/ProtectedRoute'
import MainLayout from './components/common/MainLayout'

const App = () => {
  return (
    <AuthProvider>
      <UIProvider>
        <SocketProvider>
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              
              {/* Protected routes with layout */}
              <Route element={<MainLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/profiles/:profileId" element={<ProfileDetail />} />
                <Route path="/conversations/:profileId/:clientPhone" element={<ConversationView />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/billing" element={<Billing />} />
                <Route path="/analytics" element={<Analytics />} />
              </Route>
              
              {/* Redirect root to dashboard */}
              <Route path="/" element={<Navigate to="/register" replace />} />
              
              {/* Catch-all route */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </BrowserRouter>
        </SocketProvider>
      </UIProvider>
    </AuthProvider>
  )
}

export default App