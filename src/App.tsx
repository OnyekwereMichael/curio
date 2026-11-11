import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { SplashScreen } from './pages/splash/Splash';
import { SignupScreen } from './pages/sign-up/signup';
import { LoginScreen } from './pages/login/login';
import { CheckEmailScreen } from './pages/check-email/CheckEmail';
import { InstallNudge } from './pages/install-nudge/InstallNudge';
import { NotificationPermission } from './pages/notification-permission/NotificationPermission';
import { HomeScreen } from './pages/home/Home';
import { WordFocusScreen } from './pages/learn/WordFocus';
import { FactFocusScreen } from './pages/learn/FactFocus';
import { ProgressPage } from './pages/progress/Progress';
import { ProfilePage } from './pages/profile/Profile';
import { LearningPlanSettingsPage } from './pages/settings/plan/LearningPlanSettings';
import { PlanWhenPage } from './pages/settings/plan/PlanWhen';
import { PreviewRoute } from './components/PreviewRoute';
import { NotFoundPage } from './pages/NotFound';
import { WordStylePage } from './pages/onboarding/WordStyle';
import { LevelPage } from './pages/onboarding/Level';
import { WordsPerDayPage } from './pages/onboarding/WordsPerDay';
import { FactTopicsPage } from './pages/onboarding/FactTopics';
import { GoalReminderPage } from './pages/onboarding/GoalReminder';
import { PlanSummaryPage } from './pages/onboarding/PlanSummary';
import { ReviewSessionPage } from './pages/review/ReviewSession';
import { PlayHubPage } from './pages/play/PlayHub';
import { WordDuelPage } from './pages/play/WordDuel';
import { FriendsPage } from './pages/friends/Friends';
import { ToastProvider } from './components/ui/Toast';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { CollectionPage } from './pages/collections/CollectionPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { DictionaryPage } from './pages/dictionary/DictionaryPage';

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/welcome" element={<SplashScreen />} />
              <Route path="/signup" element={<SignupScreen />} />
              <Route path="/login" element={<LoginScreen />} />
              {/* Public route — no session exists yet at this point, so it can't be behind ProtectedRoute */}
              <Route path="/check-email" element={<CheckEmailScreen />} />
              <Route path="/onboarding/word-style" element={<ProtectedRoute><WordStylePage /></ProtectedRoute>} />
              <Route path="/onboarding/level" element={<ProtectedRoute><LevelPage /></ProtectedRoute>} />
              <Route path="/onboarding/words-per-day" element={<ProtectedRoute><WordsPerDayPage /></ProtectedRoute>} />
              <Route path="/onboarding/fact-topics" element={<ProtectedRoute><FactTopicsPage /></ProtectedRoute>} />
              <Route path="/onboarding/goal-reminder" element={<ProtectedRoute><GoalReminderPage /></ProtectedRoute>} />
              <Route path="/onboarding/plan" element={<ProtectedRoute><PlanSummaryPage /></ProtectedRoute>} />
              <Route path="/install-nudge" element={<ProtectedRoute><InstallNudge /></ProtectedRoute>} />
              <Route path="/notification-permission" element={<ProtectedRoute><NotificationPermission /></ProtectedRoute>} />
              <Route path="/home" element={<ProtectedRoute><HomeScreen /></ProtectedRoute>} />
              <Route path="/learn/word" element={<ProtectedRoute><WordFocusScreen /></ProtectedRoute>} />
              <Route path="/learn/fact" element={<ProtectedRoute><FactFocusScreen /></ProtectedRoute>} />
              <Route path="/progress" element={<ProtectedRoute><ProgressPage /></ProtectedRoute>} />
              <Route path="/collection" element={<ProtectedRoute><CollectionPage /></ProtectedRoute>} />
              <Route path="/collection/review" element={<ProtectedRoute><PreviewRoute><ReviewSessionPage /></PreviewRoute></ProtectedRoute>} />
              <Route path="/dictionary" element={<ProtectedRoute><DictionaryPage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="/settings/plan" element={<ProtectedRoute><LearningPlanSettingsPage /></ProtectedRoute>} />
              <Route path="/settings/plan/when" element={<ProtectedRoute><PlanWhenPage /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/play" element={<ProtectedRoute><PreviewRoute><PlayHubPage /></PreviewRoute></ProtectedRoute>} />
              <Route path="/play/:code" element={<ProtectedRoute><PreviewRoute><WordDuelPage /></PreviewRoute></ProtectedRoute>} />
              <Route path="/friends" element={<ProtectedRoute><PreviewRoute><FriendsPage /></PreviewRoute></ProtectedRoute>} />

              <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/activity" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Router>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;