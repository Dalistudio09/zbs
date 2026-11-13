import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { compressImageFile } from "@/lib/shop/compress";
import { adminChangePassword, adminLogout, adminSaveSettings, adminSettings } from "@/fn/admin";

export const Route = createFileRoute("/admin/settings")({
  loader: () => adminSettings(),
  component: SettingsPage,
});

function SettingsPage() {
  const store = Route.useLoaderData();
  const navigate = useNavigate();
  const router = useRouter();
  const [brandName, setBrandName] = useState(store.brandName);
  const [logoUrl, setLogoUrl] = useState(store.logoUrl ?? "");
  const [primaryColor, setPrimaryColor] = useState(store.primaryColor);
  const [background, setBackground] = useState(store.background);
  const [botUsername, setBotUsername] = useState(store.botUsername);
  const [pickupCity, setPickupCity] = useState(store.pickupCity);
  const [pickupAddress, setPickupAddress] = useState(store.pickupAddress);
  const [deliveryText, setDeliveryText] = useState(store.deliveryText);
  const [sellerPhone, setSellerPhone] = useState(store.sellerPhone);
  const [sellerTelegram, setSellerTelegram] = useState(store.sellerTelegram);
  const [accepting, setAccepting] = useState(store.acceptingOrders);
  const [provider, setProvider] = useState(store.paymentProvider);
  const [kaspiKey, setKaspiKey] = useState("");
  const [kaspiSecret, setKaspiSecret] = useState("");
  const [kaspiPhone, setKaspiPhone] = useState(store.kaspiCashierPhone ?? "");
  const [kaspiBase, setKaspiBase] = useState(store.kaspiBaseUrl ?? "");
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState(store.sellerTelegramChatId ?? "");
  const [adminIds, setAdminIds] = useState(store.adminTelegramIds ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onLogo(file: File | undefined) {
    if (!file) return;
    const data = await compressImageFile(file, 400, 0.8);
    setLogoUrl(data);
  }

  async function save() {
    setBusy(true);
    try {
      await adminSaveSettings({
        data: {
          brandName,
          logoUrl: logoUrl || null,
          primaryColor,
          background,
          botUsername,
          pickupCity,
          pickupAddress,
          deliveryText,
          sellerPhone,
          sellerTelegram,
          acceptingOrders: accepting,
          paymentProvider: provider,
          kaspiApiKey: kaspiKey || undefined,
          kaspiWebhookSecret: kaspiSecret || undefined,
          kaspiCashierPhone: kaspiPhone,
          kaspiBaseUrl: kaspiBase,
          telegramBotToken: botToken || undefined,
          sellerTelegramChatId: chatId,
          adminTelegramIds: adminIds,
        },
      });
      if (password.trim()) {
        const pw = await adminChangePassword({ data: { password } });
        if (!pw.ok) {
          toast.error(pw.error);
          return;
        }
      }
      toast.success("Настройки сохранены");
      await router.invalidate();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-4xl">Настройки</h1>
      <Field label="Название бара">
        <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="ZBS parfbar" />
      </Field>
      <Field label="Логотип">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => void onLogo(e.target.files?.[0])}
          className="text-sm text-muted"
        />
        {logoUrl ? <img src={logoUrl} alt="" className="mt-2 h-10 w-auto" /> : null}
      </Field>
      <Field label="Цвет акцента">
        <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
      </Field>
      <Field label="Фон">
        <Input value={background} onChange={(e) => setBackground(e.target.value)} />
      </Field>
      <Field label="Город самовывоза">
        <Input value={pickupCity} onChange={(e) => setPickupCity(e.target.value)} />
      </Field>
      <Field label="Адрес самовывоза">
        <Input value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} />
      </Field>
      <Field label="Текст доставки">
        <Textarea value={deliveryText} onChange={(e) => setDeliveryText(e.target.value)} />
      </Field>
      <Field label="WhatsApp" hint="Сюда уходит заявка из корзины">
        <Input value={sellerPhone} onChange={(e) => setSellerPhone(e.target.value)} placeholder="+7 7XX XXX XX XX" />
      </Field>
      <Field label="Telegram продавца">
        <Input value={sellerTelegram} onChange={(e) => setSellerTelegram(e.target.value)} />
      </Field>
      <Field label="Username бота">
        <Input value={botUsername} onChange={(e) => setBotUsername(e.target.value)} />
      </Field>
      <label className="flex min-h-12 items-center justify-between rounded-md bg-elevated px-4">
        <span>Принимаем заказы</span>
        <input
          type="checkbox"
          checked={accepting}
          onChange={(e) => setAccepting(e.target.checked)}
          className="size-5 accent-accent"
        />
      </label>

      <h2 className="mt-4 font-display text-2xl">Kaspi</h2>
      <Field label="Провайдер">
        <Select value={provider} onChange={(e) => setProvider(e.target.value as typeof provider)}>
          <option value="mock">Демо (без ключей)</option>
          <option value="rest">Платёжный мост REST</option>
          <option value="off">Выключен</option>
        </Select>
      </Field>
      <Field label="API key" hint={store.kaspiApiKeySet ? "Ключ сохранён. Пустое поле не сотрёт его." : "Только на сервере"}>
        <Input
          type="password"
          value={kaspiKey}
          onChange={(e) => setKaspiKey(e.target.value)}
          placeholder="••••"
        />
      </Field>
      <Field label="Webhook secret">
        <Input
          type="password"
          value={kaspiSecret}
          onChange={(e) => setKaspiSecret(e.target.value)}
          placeholder="••••"
        />
      </Field>
      <Field label="Телефон кассира Kaspi">
        <Input value={kaspiPhone} onChange={(e) => setKaspiPhone(e.target.value)} placeholder="8777..." />
      </Field>
      <Field label="URL моста" hint="POST /invoices, GET /invoices/{id}">
        <Input
          value={kaspiBase}
          onChange={(e) => setKaspiBase(e.target.value)}
          placeholder="https://api.example.kz"
        />
      </Field>

      <h2 className="mt-4 font-display text-2xl">Telegram-бот</h2>
      <Field
        label="Токен бота"
        hint={store.telegramBotTokenSet ? "Токен сохранён." : "Для уведомлений и добавления товаров"}
      >
        <Input
          type="password"
          value={botToken}
          onChange={(e) => setBotToken(e.target.value)}
          placeholder="123456:ABC..."
        />
      </Field>
      <Field label="Chat ID продавца">
        <Input value={chatId} onChange={(e) => setChatId(e.target.value)} placeholder="123456789" />
      </Field>
      <Field label="Telegram ID админов" hint="Белый список. Через запятую. По этим ID можно войти в /admin.">
        <Input value={adminIds} onChange={(e) => setAdminIds(e.target.value)} />
      </Field>

      <h2 className="mt-4 font-display text-2xl">Пароль входа</h2>
      <Field label="Новый пароль" hint="Оставьте пустым, если не меняете">
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>

      <Button block disabled={busy} onClick={() => void save()}>
        Сохранить
      </Button>
      <Link to="/admin/bot" className="block text-center text-sm text-muted no-underline">
        Добавить через бота
      </Link>
      <Button
        variant="ghost"
        block
        onClick={async () => {
          await adminLogout();
          navigate({ to: "/admin/login" });
        }}
      >
        Выйти
      </Button>
    </div>
  );
}
