import { useState } from 'react';

/**
 * Fuerza al service worker a buscar una versión nueva del PWA y recarga con el
 * contenido fresco. Evita tener que desinstalar y reinstalar la app.
 */
export function usePwaUpdate() {
  const [checking, setChecking] = useState(false);

  async function syncNow() {
    setChecking(true);

    // Sin service worker (p. ej. en desarrollo): simple recarga.
    if (!('serviceWorker' in navigator)) {
      window.location.reload();
      return;
    }

    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      window.location.reload();
      return;
    }

    let reloaded = false;
    const reload = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };

    // Cuando el SW nuevo toma el control, recarga con la versión actualizada.
    navigator.serviceWorker.addEventListener('controllerchange', reload, { once: true });

    try {
      await reg.update();
      // Si quedó un SW esperando, pídele que se active de inmediato.
      reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
    } catch {
      // Sin red o fallo al consultar: recargamos igual.
    }

    // Si no había actualización, controllerchange no se dispara: recarga igual
    // para refrescar datos y cerrar el estado de carga.
    setTimeout(reload, 1500);
  }

  return { checking, syncNow };
}
