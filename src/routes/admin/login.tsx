import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { adminLogin } from "@/fn/admin";
import { BRAND_NAME } from "@/lib/shop/brand";
import { DEFAULT_ADMIN_PASSWORD } from "@/lib/shop/demo-credentials";
import { buyerTelegramId } from "@/lib/shop/telegram-web";

export const Route = createFileRoute("/admin/login")({
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function enter(payload: { password?: string; telegramId?: string }) {
    setBusy(true);
    setError("");
    try {
      const result = await adminLogin({ data: payload });
      if (!result.ok) {
        setError(result.error);
        return false;
      }
      navigate({ to: "/admin/products" });
      return true;
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const id = buyerTelegramId();
    if (!id) return;
    void (async () => {
      const result = await adminLogin({ data: { telegramId: id } });
      if (result.ok) navigate({ to: "/admin/products" });
    })();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = secret.trim();
    if (!v) {
      setError("Введите пароль");
      return;
    }
    const payload = /^\d{5,}$/.test(v)
      ? { telegramId: v, password: v }
      : { password: v };
    await enter(payload);
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center bg-bg px-6 text-fg">
      <div className="mx-auto w-full max-w-sm">
        <p className="text-center font-display text-3xl tracking-[0.08em] text-fg">{BRAND_NAME}</p>
        <h1 className="mt-8 font-display text-3xl">Вход продавца</h1>
        <p className="mt-2 text-sm text-muted">Пароль продавца.</p>
        <form className="mt-8 flex flex-col gap-4" onSubmit={(e) => void submit(e)}>
          <Field label="Пароль">
            <Input
              type="text"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              autoComplete="current-password"
            />
          </Field>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" block disabled={busy}>
            {busy ? "Входим…" : "Войти"}
          </Button>
        </form>
        <p className="mt-8 text-center text-xs text-faint">
          Демо-пароль: {DEFAULT_ADMIN_PASSWORD}
        </p>
        <p className="mt-6 text-center">
          <Link to="/" className="text-sm text-muted">
            На витрину
          </Link>
        </p>
      </div>
    </div>
  );
}
