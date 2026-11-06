import { createHashHistory, createRouter } from "@tanstack/react-router";
import { AppErrorComponent } from "@/lib/error-component";
import { previewPathRewrite } from "@/lib/preview-path-prefix";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    routeTree,
    // GitHub Pages has no rewrite for /repo/. Hash URLs stay on index.html.
    history:
      import.meta.env.VITE_GITHUB_PAGES === "1" && typeof window !== "undefined"
        ? createHashHistory()
        : undefined,
    rewrite: previewPathRewrite(),
    defaultErrorComponent: AppErrorComponent,
  });
}
