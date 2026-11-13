import { randomBytes } from "node:crypto";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { getSql } from "@/lib/db";
import { getStoreRow } from "./bootstrap.server";
import { verifyPassword } from "./passwords";
import { isShopAdmin } from "./telegram.server";

const COOKIE = "exist_admin";
const WEEK = 7 * 24 * 60 * 60;

export type AdminUser = {
  id: string;
  store_id: string;
  login: string;
};

async function issueSession(row: AdminUser): Promise<AdminUser> {
  const sql = await getSql();
  const token = randomBytes(24).toString("hex");
  const expires = new Date(Date.now() + WEEK * 1000).toISOString();
  await sql`
    insert into admin_sessions (token, admin_id, expires_at)
    values (${token}, ${row.id}, ${expires})
  `;
  setCookie(COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: WEEK,
  });
  return { id: row.id, store_id: row.store_id, login: row.login };
}

export async function loginAdminByPassword(password: string): Promise<AdminUser | null> {
  await getStoreRow();
  const sql = await getSql();
  const rows = await sql<AdminUser & { password_hash: string }>`
    select id, store_id, login, password_hash from admin_users order by created_at
  `;
  for (const row of rows) {
    if (verifyPassword(password, row.password_hash)) {
      return issueSession(row);
    }
  }
  return null;
}

export async function loginAdminByTelegram(telegramId: string): Promise<AdminUser | null> {
  await getStoreRow();
  const id = telegramId.trim();
  if (!isShopAdmin(id)) return null;
  const sql = await getSql();
  const rows = await sql<AdminUser>`
    select id, store_id, login from admin_users order by created_at limit 1
  `;
  const row = rows[0];
  if (!row) return null;
  return issueSession(row);
}

export async function logoutAdmin(): Promise<void> {
  const token = getCookie(COOKIE);
  const sql = await getSql();
  if (token) {
    await sql`delete from admin_sessions where token = ${token}`;
  }
  setCookie(COOKIE, "", { path: "/", httpOnly: true, sameSite: "lax", maxAge: 0 });
}

export async function getAdmin(): Promise<AdminUser | null> {
  const token = getCookie(COOKIE);
  if (!token) return null;
  const sql = await getSql();
  const rows = await sql<AdminUser>`
    select u.id, u.store_id, u.login
    from admin_users u
    join admin_sessions s on s.admin_id = u.id
    where s.token = ${token} and s.expires_at > now()
    limit 1
  `;
  return rows[0] ?? null;
}

export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdmin();
  if (!admin) {
    const err = new Error("Нужен вход");
    err.name = "Unauthorized";
    throw err;
  }
  return admin;
}
