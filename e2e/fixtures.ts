import {
  type BrowserContext,
  type BrowserContextOptions,
  expect,
  type Page,
  test as base,
} from "@playwright/test";

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
