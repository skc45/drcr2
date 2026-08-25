import { Capacitor } from '@capacitor/core';

export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

export function useLocalApi() {
  if (import.meta.env.VITE_API_URL) return false;
  if (import.meta.env.VITE_LOCAL_API === 'true') return true;
  return isNativeApp();
}

export async function initNativeShell() {
  if (!isNativeApp()) return;
  document.documentElement.classList.add('native-app');
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: '#0d0f12' });
  } catch {
    // Status bar plugin is a no-op in the browser.
  }
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch {
    // Splash screen plugin is a no-op in the browser.
  }
}
