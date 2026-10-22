import {
  type BrowserContext,
  type BrowserContextOptions,
  expect,
  type Page,
  test as base,
} from "@playwright/test";

/** PNG transparan 1×1. */
const BLANK_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

/**
 * `openPage(options)`: halaman di konteks browser baru (cookie/login terpisah, cocok
 * untuk memerankan warga, petugas, pimpinan bersamaan). Setiap error JavaScript atau
 * respons 5xx di halaman mana pun membuat tes gagal di akhir.
 */
export const test = base.extend<{ openPage: (options?: BrowserContextOptions) => Promise<Page> }>({
  openPage: async ({ browser, baseURL }, use) => {
    const errors: string[] = [];
    const contexts: BrowserContext[] = [];
    await use(async (options = {}) => {
      const context = await browser.newContext({ baseURL, ...options });
      contexts.push(context);
      // Tes tidak bergantung pada internet: tile peta & sumber luar dijawab gambar kosong.
      await context.route(
        (url) => url.hostname !== "localhost",
        (route) => route.fulfill({ status: 200, contentType: "image/png", body: BLANK_PNG }),
      );
      const page = await context.newPage();
      page.on("pageerror", (error) => errors.push(`[pageerror] ${page.url()} ${error.message}`));
      page.on("response", (res) => {
        if (res.status() >= 500) errors.push(`[${res.status()}] ${res.url()}`);
      });
      return page;
    });
    await Promise.all(contexts.map((context) => context.close()));
    expect(errors, "error browser/server selama tes").toEqual([]);
  },
});

export { expect };
