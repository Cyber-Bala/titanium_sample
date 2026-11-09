import { chromium } from "playwright-core";
const out = process.env.OUT;
const pts = (process.env.PTS || "0,0.1,0.17,0.205,0.26,0.34,0.42,0.5,0.58,0.66,0.74,0.82,0.9,0.96").split(",").map(Number);
const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 810 } })).newPage();
const errs = [];
page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
page.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
page.on("response", (r) => r.status() >= 400 && errs.push(r.status() + " " + r.url()));
await page.goto("http://localhost:4173", { waitUntil: "networkidle" });
await page.waitForSelector(".loader", { state: "detached", timeout: 30000 }).catch(() => errs.push("loader stuck"));
const H = await page.evaluate(() => document.getElementById("journey").offsetHeight - innerHeight);
for (const p of pts) {
  await page.evaluate((y) => scrollTo(0, y), H * p);
  await page.waitForTimeout(2600);
  await page.screenshot({ path: `${out}/v-${p}.png` });
}
console.log("ERRORS", JSON.stringify(errs.slice(0, 10)));
await browser.close();
