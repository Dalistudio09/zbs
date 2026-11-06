type WebApp = {
  ready: () => void;
  expand: () => void;
  initDataUnsafe?: { user?: { id: number } };
};

function getWebApp(): WebApp | null {
  if (typeof window === "undefined") return null;
  const tg = (window as unknown as { Telegram?: { WebApp?: WebApp } }).Telegram?.WebApp;
  return tg ?? null;
}

export function bootTelegram(): void {
  const wa = getWebApp();
  if (!wa) return;
  try {
    wa.ready();
    wa.expand();
  } catch {
    /* not in Telegram */
  }
}

export function buyerTelegramId(): string | undefined {
  const id = getWebApp()?.initDataUnsafe?.user?.id;
  return id ? String(id) : undefined;
}
