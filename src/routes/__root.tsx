import { useEffect } from "react";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import appCss from "../styles.css?url";

const APP_NAME = "カーブ帳";
const base = import.meta.env.BASE_URL;
const publicHref = (path: string) => `${base}${path.replace(/^\//, "")}`;

function InstallApp() {
  useEffect(() => {
    if (import.meta.env.VITE_GITHUB_PAGES !== "1") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch(() => {});
  }, []);
  return null;
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      { name: "theme-color", content: "#f3eee6" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: APP_NAME },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: publicHref("favicon.svg") },
      { rel: "icon", type: "image/png", sizes: "192x192", href: publicHref("icon-192.png") },
      { rel: "apple-touch-icon", sizes: "180x180", href: publicHref("apple-touch-icon.png") },
      { rel: "manifest", href: publicHref("manifest.webmanifest") },
      { rel: "stylesheet", href: appCss },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;600;700&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap",
      },
    ],
  }),
  component: () => (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen overflow-x-hidden bg-paper text-ink antialiased">
        <InstallApp />
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
