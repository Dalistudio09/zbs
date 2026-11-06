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
import { getAdmin, loginAdminByPassword, loginAdminByTelegram, logoutAdmin, requireAdmin } from "@/lib/shop/session.server";
import { notifyPayment, notifyStatus } from "@/lib/shop/notify.server";
import { handleLocalBotMessage } from "@/lib/shop/telegram.server";
import type { OrderStatus } from "@/lib/shop/types";

export const adminLogin = createServerFn({ method: "POST" })
  .validator((d: { password?: string; telegramId?: string }) => d)
  .handler(async ({ data }) => {
    if (data.telegramId?.trim()) {
      const user = await loginAdminByTelegram(data.telegramId);
      if (user) return { ok: true as const, login: user.login };
    }
    if (data.password) {
      const user = await loginAdminByPassword(data.password);
      if (user) return { ok: true as const, login: user.login };
    }
    return { ok: false as const, error: "Неверный пароль или Telegram ID" };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  await logoutAdmin();
  return { ok: true as const };
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
