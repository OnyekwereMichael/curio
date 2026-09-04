import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { SignupScreen } from './pages/sign-up/signup';
import { LoginScreen } from './pages/login/login';
import { CheckEmailScreen } from './pages/check-email/CheckEmail';
import { InstallNudge } from './pages/install-nudge/InstallNudge';
import { NotificationPermission } from './pages/notification-permission/NotificationPermission';
import { HomeScreen } from './pages/home/Home';
import { ToastProvider } from './components/ui/Toast';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/signup" element={<SignupScreen />} />
            <Route path="/login" element={<LoginScreen />} />
            {/* Public route — no session exists yet at this point, so it can't be behind ProtectedRoute */}
            <Route path="/check-email" element={<CheckEmailScreen />} />
            <Route path="/install-nudge" element={<ProtectedRoute><InstallNudge /></ProtectedRoute>} />
            <Route path="/notification-permission" element={<ProtectedRoute><NotificationPermission /></ProtectedRoute>} />
            <Route path="/home" element={<ProtectedRoute><HomeScreen /></ProtectedRoute>} />

          </Routes>
        </Router>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;