import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { useUiStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { Toaster } from '@/ui/components/Toaster';
import { AppRoutes } from '@/navigation/routes';
import { RegisterScreen } from '@/ui/screens/register/RegisterScreen';

export function App() {
  const theme = useUiStore((s) => s.theme);
  const idToken = useAuthStore((s) => s.idToken);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <BrowserRouter>
      <AppRoutes />
      {/* RegisterScreen vive fuera del router para estar disponible en cualquier ruta */}
      {idToken && <RegisterScreen />}
      <Toaster />
    </BrowserRouter>
  );
}
