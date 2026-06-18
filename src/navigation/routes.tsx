import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { AppShell } from '@/ui/layouts/AppShell';
import { SkeletonLines } from '@/ui/components/Skeleton';

const LoginScreen = lazy(() => import('@/ui/screens/auth/LoginScreen'));
const OnboardingScreen = lazy(() => import('@/ui/screens/auth/OnboardingScreen'));
const HomeScreen = lazy(() => import('@/ui/screens/home/HomeScreen'));
const MovementsScreen = lazy(() => import('@/ui/screens/movements/MovementsScreen'));
const MoreScreen = lazy(() => import('@/ui/screens/more/MoreScreen'));

function PageFallback() {
  return (
    <div style={{ padding: '24px' }}>
      <SkeletonLines count={5} />
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const idToken = useAuthStore((s) => s.idToken);
  if (!idToken) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireNoAuth({ children }: { children: React.ReactNode }) {
  const idToken = useAuthStore((s) => s.idToken);
  if (idToken) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function AppRoutes() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* Rutas públicas */}
        <Route
          path="/login"
          element={
            <RequireNoAuth>
              <LoginScreen />
            </RequireNoAuth>
          }
        />
        <Route
          path="/onboarding"
          element={
            <RequireAuth>
              <OnboardingScreen />
            </RequireAuth>
          }
        />

        {/* Rutas protegidas dentro del AppShell */}
        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<HomeScreen />} />
          <Route path="movimientos" element={<MovementsScreen />} />
          <Route path="mas" element={<MoreScreen />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
