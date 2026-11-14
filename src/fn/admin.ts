import { createServerFn } from "@tanstack/react-start";
import {
  changeAdminPassword,
  dashboardStats,
  deleteProduct,
  getAdminProduct,
  getAdminStore,
  getOrder,
  listAdminProducts,
  listNotifications,
  listOrders,
  markOrderPaidByAdmin,
  saveProduct,
  setOrderStatus,
  setProductVisible,
  updateStoreSettings,
  type SaveProductInput,
} from "@/lib/shop/repo.server";
import { getAdmin, loginAdminByTelegram, logoutAdmin, requireAdmin } from "@/lib/shop/session.server";
import { getStoreRow } from "@/lib/shop/bootstrap.server";
import { broadcastManual, notifyPayment, notifyStatus } from "@/lib/shop/notify.server";
import { handleLocalBotMessage, resolveBotToken, telegramUserFromInitData, isShopAdmin } from "@/lib/shop/telegram.server";
import type { OrderStatus } from "@/lib/shop/types";

export const adminLogin = createServerFn({ method: "POST" })
  .validator((d: { initData?: string }) => d)
  .handler(async ({ data }) => {
    const initData = data.initData?.trim();
    if (!initData) return { ok: false as const, error: "Нет доступа" };
    const store = await getStoreRow();
    const user = telegramUserFromInitData(initData, resolveBotToken(store.telegram_bot_token));
    if (!user || !isShopAdmin(user.id)) return { ok: false as const, error: "Нет доступа" };
    const session = await loginAdminByTelegram(String(user.id));
    if (!session) return { ok: false as const, error: "Нет доступа" };
    return { ok: true as const, login: session.login };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  await logoutAdmin();
  return { ok: true as const };
});

export const adminBroadcast = createServerFn({ method: "POST" })
  .validator((d: { text?: string }) => d)
  .handler(async ({ data }) => {
    await requireAdmin();
    return broadcastManual(data.text ?? "");
  });

export const adminMe = createServerFn({ method: "GET" }).handler(async () => {
  const admin = await getAdmin();
  return admin ? { login: admin.login } : null;
});

export const adminDashboard = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const [stats, notes] = await Promise.all([dashboardStats(), listNotifications(12)]);
  return { stats, notes };
});

export const adminProducts = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  return listAdminProducts();
});

export const adminProduct = createServerFn({ method: "GET" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    await requireAdmin();
    return getAdminProduct(data.id);
  });

export const adminSaveProduct = createServerFn({ method: "POST" })
  .validator((d: SaveProductInput) => d)
  .handler(async ({ data }) => {
    await requireAdmin();
    return saveProduct(data);
  });

export const adminDeleteProduct = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    await requireAdmin();
    await deleteProduct(data.id);
    return { ok: true as const };
  });

export const adminToggleVisible = createServerFn({ method: "POST" })
  .validator((d: { id: string; visible: boolean }) => d)
  .handler(async ({ data }) => {
    await requireAdmin();
    await setProductVisible(data.id, data.visible);
    return { ok: true as const };
  });

export const adminOrders = createServerFn({ method: "GET" })
  .validator((d?: { page?: number }) => d ?? {})
  .handler(async ({ data }) => {
    await requireAdmin();
    return listOrders(data.page ?? 0, 30);
  });

export const adminOrder = createServerFn({ method: "GET" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    await requireAdmin();
    return getOrder(data.id);
  });

export const adminSetStatus = createServerFn({ method: "POST" })
  .validator((d: { id: string; status: OrderStatus }) => d)
  .handler(async ({ data }) => {
    await requireAdmin();
    const result = await setOrderStatus(data.id, data.status);
    if (result.ok) {
      try {
        await notifyStatus(result.data, data.status);
      } catch (err) {
        console.error("[notify] status", err);
      }
    }
    return result;
  });

export const adminMarkPaid = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    await requireAdmin();
    const result = await markOrderPaidByAdmin(data.id);
    if (result.ok) {
      try {
        await notifyPayment(result.data);
      } catch (err) {
        console.error("[notify] mark paid", err);
      }
    }
    return result;
  });

export const adminSettings = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  return getAdminStore();
});

export const adminSaveSettings = createServerFn({ method: "POST" })
  .validator((d: Parameters<typeof updateStoreSettings>[0]) => d)
  .handler(async ({ data }) => {
    await requireAdmin();
    return updateStoreSettings(data);
  });

export const adminChangePassword = createServerFn({ method: "POST" })
  .validator((d: { password: string }) => d)
  .handler(async ({ data }) => {
    const admin = await requireAdmin();
    return changeAdminPassword(admin.id, data.password);
  });

export const adminBotChat = createServerFn({ method: "POST" })
  .validator((d: { text?: string; photoDataUrl?: string }) => d)
  .handler(async ({ data }) => {
    await requireAdmin();
    return handleLocalBotMessage(data);
  });
