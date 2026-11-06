import { getSql } from "@/lib/db";
import { BRAND_NAME } from "./brand";
import { DEFAULT_ADMIN_LOGIN, DEFAULT_ADMIN_PASSWORD } from "./demo-credentials";
import { hashPassword } from "./passwords";
import { DEMO_PRODUCTS } from "./seed";
import type { StoreRow } from "./rows";

const STORE_ID = "default";
export { DEFAULT_ADMIN_LOGIN, DEFAULT_ADMIN_PASSWORD };

const globalRef = globalThis as typeof globalThis & {
  __zbsBoot__?: Promise<void>;
};

export async function ensureShop(): Promise<void> {
  globalRef.__zbsBoot__ ??= (async () => {
    const sql = await getSql();
    const stores = await sql<{ id: string }>`select id from stores limit 1`;
    if (stores.length === 0) {
      await sql`
        insert into stores (id, brand_name, payment_provider, bot_username, seller_telegram)
        values (${STORE_ID}, ${BRAND_NAME}, ${"mock"}, ${"exist_bar"}, ${"exist_bar"})
      `;

      await sql`
        insert into admin_users (id, store_id, login, password_hash)
        values (${"admin_default"}, ${STORE_ID}, ${DEFAULT_ADMIN_LOGIN}, ${hashPassword(DEFAULT_ADMIN_PASSWORD)})
      `;

      for (const p of DEMO_PRODUCTS) {
        const attrs = JSON.stringify({
          gender: p.gender,
          volume: p.volume,
          notes: p.notes,
        });
        await sql`
          insert into products (
            id, store_id, name, sku, brand, price_kzt, old_price_kzt,
            description, availability, visible, sort_order, attributes
          ) values (
            ${p.id}, ${STORE_ID}, ${p.name}, ${p.sku}, ${p.brand}, ${p.price},
            ${p.oldPrice}, ${p.description}, ${p.availability}, ${true},
            ${p.sort}, ${attrs}::jsonb
          )
        `;
        await sql`
          insert into product_images (id, product_id, sort_order, mime, url)
          values (${`${p.id}_img`}, ${p.id}, ${0}, ${"image/jpeg"}, ${p.image})
        `;
      }
      return;
    }

    await sql`
      update stores
      set brand_name = ${BRAND_NAME},
          bot_username = case
            when bot_username in ('aroma_kz', 'AROMA', 'aroma') then ${"exist_bar"}
            else bot_username
          end,
          seller_telegram = case
            when seller_telegram in ('aroma_kz', 'AROMA', 'aroma') then ${"exist_bar"}
            else seller_telegram
          end,
          updated_at = now()
      where brand_name in ('EXIST', 'AROMA', 'Aroma', 'TÜN', 'TUN', 'Tün')
    `;

    const oldAdmins = await sql<{ id: string }>`
      select id from admin_users where login in ('aroma', 'AROMA') limit 1
    `;
    if (oldAdmins[0]) {
      await sql`
        update admin_users
        set login = ${DEFAULT_ADMIN_LOGIN},
            password_hash = ${hashPassword(DEFAULT_ADMIN_PASSWORD)}
        where id = ${oldAdmins[0].id}
      `;
    }
  })().catch((err) => {
    globalRef.__zbsBoot__ = undefined;
    throw err;
  });
  return globalRef.__zbsBoot__;
}

export async function getStoreRow(): Promise<StoreRow> {
  await ensureShop();
  const sql = await getSql();
  const rows = await sql<StoreRow>`select * from stores order by created_at limit 1`;
  const row = rows[0];
  if (!row) throw new Error("Магазин не создан");
  return row;
}
