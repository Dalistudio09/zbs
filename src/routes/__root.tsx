import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { fetchStore } from "@/fn/public";
import { ThemeVars } from "@/components/shop/store-shell";
import { BRAND_NAME } from "@/lib/shop/brand";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  loader: () => fetchStore(),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1" },
      { title: BRAND_NAME },
      { name: "theme-color", content: "#0E0E0E" },
      {
        name: "description",
        content: `${BRAND_NAME}. Селективная парфюмерия. Заявка в WhatsApp.`,
      },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
    ],
    scripts: [{ src: "https://telegram.org/js/telegram-web-app.js" }],
  }),
  component: Root,
});

function Root() {
  const store = Route.useLoaderData();
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="antialiased">
        <PreviewHostBridge />
        <ThemeVars color={store.primaryColor} background={store.background} />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
