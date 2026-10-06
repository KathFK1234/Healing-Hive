import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spinner } from '@/components/ui';
import { Protected, Open, GuestOnly } from '@/components/layout/RouteGuards';

// Each page is loaded when first visited, so the first screen stays small as
// the app grows.
const LandingPage = lazy(() => import('./pages/LandingPage.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const Signup = lazy(() => import('./pages/Signup.jsx'));
const ProfessionalSignup = lazy(() => import('./pages/ProfessionalSignup.jsx'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('./pages/ResetPassword.jsx'));
const Help = lazy(() => import('./pages/Help.jsx'));
const Therapists = lazy(() => import('./pages/Therapists.jsx'));
const TherapistProfile = lazy(() => import('./pages/TherapistProfile.jsx'));
const Nuggets = lazy(() => import('./pages/Nuggets.jsx'));
const Events = lazy(() => import('./pages/Events.jsx'));
const ForProfessionals = lazy(() => import('./pages/ForProfessionals.jsx'));
const Home = lazy(() => import('./pages/Home.jsx'));
const Sessions = lazy(() => import('./pages/Sessions.jsx'));
const Companion = lazy(() => import('./pages/Companion.jsx'));
const Journal = lazy(() => import('./pages/Journal.jsx'));
const Mood = lazy(() => import('./pages/Mood.jsx'));
const Reminders = lazy(() => import('./pages/Reminders.jsx'));
const SettingsPage = lazy(() => import('./pages/Settings.jsx'));
const Apply = lazy(() => import('./pages/Apply.jsx'));
const Practice = lazy(() => import('./pages/Practice.jsx'));
const Institution = lazy(() => import('./pages/Institution.jsx'));
const Admin = lazy(() => import('./pages/Admin.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

// Addresses from the earlier prototype, kept working so old links land somewhere.
const moved = {
  '/auth': '/login',
  '/client-signup': '/signup',
  '/professional-signup': '/professionals/signup',
  '/institution-dashboard': '/institution',
  '/professional-onboarding': '/apply',
  '/ai-support': '/companion',
  '/user-dashboard': '/home',
  '/dashboard': '/home',
  '/therapist': '/practice',
};

const App = () => (
  <Suspense fallback={<Spinner className="min-h-screen" />}>
    <Routes>
      <Route element={<GuestOnly />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/professionals/signup" element={<ProfessionalSignup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Route>

      <Route element={<Open />}>
        <Route path="/help" element={<Help />} />
        <Route path="/therapists" element={<Therapists />} />
        <Route path="/therapists/:id" element={<TherapistProfile />} />
        <Route path="/nuggets" element={<Nuggets />} />
        <Route path="/events" element={<Events />} />
        <Route path="/professionals" element={<ForProfessionals />} />
      </Route>

      <Route element={<Protected />}>
        <Route path="/home" element={<Home />} />
        <Route path="/sessions" element={<Sessions />} />
        <Route path="/companion" element={<Companion />} />
        <Route path="/journal" element={<Journal />} />
        <Route path="/mood" element={<Mood />} />
        <Route path="/reminders" element={<Reminders />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/apply" element={<Apply />} />
      </Route>

      <Route element={<Protected roles={['therapist', 'peer']} />}>
        <Route path="/practice" element={<Practice />} />
      </Route>

      <Route element={<Protected roles={['institution']} />}>
        <Route path="/institution" element={<Institution />} />
      </Route>

      <Route element={<Protected roles={['admin']} />}>
        <Route path="/admin" element={<Admin />} />
      </Route>

      {Object.entries(moved).map(([from, to]) => (
        <Route key={from} path={from} element={<Navigate to={to} replace />} />
      ))}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>
);

export default App;
