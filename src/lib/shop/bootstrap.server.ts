import { getSql } from "@/lib/db";
import { BRAND_NAME } from "./brand";
import { CATALOG } from "./catalog";
import { DEFAULT_ADMIN_LOGIN, DEFAULT_ADMIN_PASSWORD } from "./demo-credentials";
import { hashPassword } from "./passwords";
import type { StoreRow } from "./rows";
import { STORIES } from "./stories";

const STORE_ID = "default";
const DEMO_IDS = [
  "p_noir",
  "p_silk",
  "p_vetiver",
  "p_cherry",
  "p_saffron",
  "p_tea",
  "p_leather",
  "p_peony",
];
const GENERIC_BOTTLES = new Set([
  "/bottles/amber.jpg",
  "/bottles/floral.jpg",
  "/bottles/citrus.jpg",
  "/bottles/white.jpg",
  "/bottles/blue.jpg",
  "/bottles/gourmand.jpg",
  "/bottles/green.jpg",
  "/bottles/leather.jpg",
  "/bottles/aquatic.jpg",
  "/bottles/cherry.jpg",
  "/bottles/oud.jpg",
  "/bottles/musk.jpg",
]);
export { DEFAULT_ADMIN_LOGIN, DEFAULT_ADMIN_PASSWORD };

const globalRef = globalThis as typeof globalThis & {
  __zbsBotBoot__?: Promise<void>;
};

function attrsFor(p: (typeof CATALOG)[number]) {
  const story = STORIES[p.id];
  return JSON.stringify({
    gender: p.gender,
    family: p.family,
    stock: p.stock,
    year: p.year,
    perfumer: p.perfumer,
    notes: { top: p.top, heart: p.heart, base: p.base },
    ...(story ? { storyTitle: story.title, story: story.body } : {}),
  });
}

async function seedCatalog(sql: Awaited<ReturnType<typeof getSql>>) {
  for (const id of DEMO_IDS) {
    await sql`delete from products where id = ${id}`;
  }
  const haveRows = await sql<{ id: string }>`select id from products where id like 'cat_%'`;
  const have = new Set(haveRows.map((r) => r.id));
  for (const p of CATALOG) {
    const story = STORIES[p.id];
    if (!have.has(p.id)) {
      await sql`
        insert into products (
          id, store_id, name, sku, brand, price_kzt, old_price_kzt,
          description, availability, visible, sort_order, attributes
        ) values (
          ${p.id}, ${STORE_ID}, ${p.name}, ${null}, ${p.brand}, ${p.price},
          ${null}, ${p.description}, ${p.stock > 0 ? "in_stock" : "hidden"}, ${true},
          ${p.sort}, ${attrsFor(p)}::jsonb
        )
      `;
      await sql`
        insert into product_images (id, product_id, sort_order, mime, url)
        values (${`${p.id}_img`}, ${p.id}, ${0}, ${"image/jpeg"}, ${p.image})
      `;
    } else if (story) {
      const patch = JSON.stringify({ storyTitle: story.title, story: story.body });
      await sql`
        update products
        set attributes = coalesce(attributes, '{}'::jsonb) || ${patch}::jsonb
        where id = ${p.id}
      `;
    }
    if (!GENERIC_BOTTLES.has(p.image)) {
      const imgs = await sql<{ id: string; url: string | null }>`
        select id, url from product_images where product_id = ${p.id}
      `;
      for (const img of imgs) {
        if (img.url && GENERIC_BOTTLES.has(img.url)) {
          await sql`update product_images set url = ${p.image} where id = ${img.id}`;
        }
      }
    }
  }
}

export async function ensureShop(): Promise<void> {
  globalRef.__zbsBotBoot__ ??= (async () => {
    const sql = await getSql();
    const stores = await sql<{ id: string }>`select id from stores limit 1`;
    if (stores.length === 0) {
      await sql`
        insert into stores (
          id, brand_name, payment_provider, bot_username, seller_telegram, admin_telegram_ids
        )
        values (
          ${STORE_ID}, ${BRAND_NAME}, ${"mock"}, ${"zbsperfumebot"}, ${"zbsperfumebot"},
          ${"458817513,743736933"}
        )
      `;
      await sql`
        insert into admin_users (id, store_id, login, password_hash)
        values (${"admin_default"}, ${STORE_ID}, ${DEFAULT_ADMIN_LOGIN}, ${hashPassword(DEFAULT_ADMIN_PASSWORD)})
      `;
    } else {
      await sql`
        update stores
        set brand_name = ${BRAND_NAME},
            bot_username = case
              when bot_username is null or bot_username in ('exist_bar', 'exist', 'aroma') then 'zbsperfumebot'
              else bot_username
            end,
            admin_telegram_ids = ${"458817513,743736933"},
            updated_at = now()
        where id = ${STORE_ID} or brand_name in ('EXIST', 'AROMA', 'Aroma', 'TÜN', 'TUN', 'Tün', ${BRAND_NAME})
      `;
    }
    await seedCatalog(sql);
  })().catch((err) => {
    globalRef.__zbsBotBoot__ = undefined;
    throw err;
  });
  return globalRef.__zbsBotBoot__;
}

export async function getStoreRow(): Promise<StoreRow> {
  await ensureShop();
  const sql = await getSql();
  const rows = await sql<StoreRow>`select * from stores order by created_at limit 1`;
  const row = rows[0];
  if (!row) throw new Error("Магазин не найден");
  return row;
}