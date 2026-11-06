# ZBS parfbar

Корень архива — корень проекта. Точка входа роутера: `src/router.tsx`.

```bash
npm install
npm run build
```

На Vercel задайте переменные окружения (в архиве их нет):

- `DATABASE_URL` — строка Neon
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Товары и заказы пишутся только в Neon. Фото уходят в Cloudinary, папка `zbs`; в базе хранится ссылка.
