import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { SignupScreen } from './pages/sign-up/signup';
import { LoginScreen } from './pages/login/login';
import { InstallNudge } from './pages/install-nudge/InstallNudge';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signup" element={<SignupScreen />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/install-nudge" element={<InstallNudge />} />
        <Route path="/notification-permission" element={<div className="p-8">Notification Permission (Stage 6) Stub</div>} />
        <Route path="/home" element={<div className="p-8">Home Screen (Stage 7) Stub</div>} />
      </Routes>
    </Router>
  );
}

export default App;
