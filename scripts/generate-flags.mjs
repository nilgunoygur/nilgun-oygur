// `pnpm flags`: copies a flag SVG for every phone country into public/flags/.
import { copyFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { getCountries } from "libphonenumber-js/mobile";

const source = join(dirname(createRequire(import.meta.url).resolve("country-flag-icons/package.json")), "3x2");
const target = new URL("../public/flags/", import.meta.url).pathname;
rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
const available = new Set(readdirSync(source));
const missing = [];
for (const code of getCountries()) {
  if (available.has(`${code}.svg`)) copyFileSync(join(source, `${code}.svg`), join(target, `${code}.svg`));
  else missing.push(code);
}
console.log(`Copied ${getCountries().length - missing.length} flags.${missing.length ? ` Missing: ${missing.join(", ")}` : ""}`);
