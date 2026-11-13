import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { adminLogin } from "@/fn/admin";
import { BRAND_NAME } from "@/lib/shop/brand";
import { buyerTelegramInitData } from "@/lib/shop/telegram-web";

export const Route = createFileRoute("/admin/login")({
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const initData = buyerTelegramInitData();
    if (!initData) {
      setChecking(false);
      return;
    }
    void (async () => {
      const result = await adminLogin({ data: { initData } });
      if (result.ok) {
        navigate({ to: "/admin/products" });
        return;
      }
      setError(result.error);
      setChecking(false);
    })();
  }, [navigate]);

  return (
    <div className="flex min-h-dvh flex-col justify-center bg-bg px-6 text-fg">
      <div className="mx-auto w-full max-w-sm">
        <p className="text-center font-display text-3xl tracking-[0.08em] text-fg">{BRAND_NAME}</p>
        <h1 className="mt-8 font-display text-3xl">Вход продавца</h1>
        <p className="mt-2 text-sm text-muted">
          {checking ? "Проверяем Telegram…" : "Админка открывается из бота @zbsperfumebot."}
        </p>
        {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
        <p className="mt-8 text-center">
          <Link to="/" className="text-sm text-muted">
            На витрину
          </Link>
        </p>
      </div>
    </div>
  );
}
