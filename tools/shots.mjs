import { chromium } from "playwright-core";
const base = process.env.BASE || "http://localhost:4173";
const out = process.env.OUT;
const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const errors = [];
async function run(name, ctxOpts, steps) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  page.on("console", (m) => m.type() === "error" && errors.push(`${name}: ${m.text()}`));
  page.on("pageerror", (e) => errors.push(`${name}: PAGEERROR ${e.message}`));
  page.on("requestfailed", (r) => errors.push(`${name}: REQFAIL ${r.url()}`));
  page.on("response", (r) => r.status() >= 400 && errors.push(`${name}: ${r.status()} ${r.url()}`));
  await page.goto(base, { waitUntil: "networkidle" });
  await steps(page);
  await ctx.close();
}
await run("desktop", { viewport: { width: 1440, height: 810 } }, async (page) => {
  await page.waitForTimeout(3000);
  const H = await page.evaluate(() => document.getElementById("journey").offsetHeight - innerHeight);
  for (const p of [0, 0.2, 0.45, 0.7, 0.95]) {
    await page.evaluate((y) => scrollTo(0, y), H * p);
    await page.waitForTimeout(1800);
    await page.screenshot({ path: `${out}/d-${p}.png` });
  }
  await page.evaluate((y) => scrollTo(0, y), H + 900);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/d-content.png` });
  console.log("overflowX", await page.evaluate(() => document.documentElement.scrollWidth > innerWidth));
});
await run("mobile", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, async (page) => {
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/m-hero.png` });
  await page.click(".burger");
  await page.screenshot({ path: `${out}/m-menu.png` });
  console.log("m overflowX", await page.evaluate(() => document.documentElement.scrollWidth > innerWidth));
});
for (const r of ["/events", "/events/technical-placeholder-1", "/workshops", "/schedule", "/about", "/register", "/legal/privacy", "/nope"]) {
  await run("route" + r, { viewport: { width: 1280, height: 800 } }, async (page) => {
    await page.goto(base + r, { waitUntil: "networkidle" });
    console.log(r, await page.title(), (await page.locator("h1,h2").first().textContent())?.slice(0, 40));
  });
}
console.log("ERRORS", JSON.stringify(errors, null, 1));
await browser.close();
