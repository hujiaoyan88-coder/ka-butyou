import { cpSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const source = ".output/public";
const dest = "docs";
const indexPath = join(source, "index.html");

if (!existsSync(indexPath)) {
  console.error("GitHub Pages build did not write .output/public/index.html");
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
cpSync(source, dest, { recursive: true });

const css = readdirSync(join(dest, "assets")).find(
  (name) => name.startsWith("styles-") && name.endsWith(".css"),
);
if (!css) {
  console.error("GitHub Pages build is missing the stylesheet");
  process.exit(1);
}

let html = readFileSync(join(dest, "index.html"), "utf8");
html = html.replaceAll("/./assets/", "./assets/");
html = html.replace(/href="\.\/assets\/styles-[^"]+\.css"/, `href="./assets/${css}"`);
html = html.replace(/<link rel="manifest" href="[^"]*__grok\/manifest\.webmanifest"[^>]*>/g, "");

writeFileSync(join(dest, "index.html"), html);
writeFileSync(join(dest, "404.html"), html);
writeFileSync(join(dest, ".nojekyll"), "");
console.log("GitHub Pages site is in docs/");
