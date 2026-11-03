// Service worker Pantas: hanya untuk notifikasi push status permohonan (tanpa cache offline).
// Payload dari lib/push.ts: { title, body, url, tag }. tag = resi, jadi notifikasi baru untuk
// resi yang sama menggantikan yang lama.

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Pantas", {
      body: data.body || "Ada perubahan pada permohonan Anda.",
      tag: data.tag,
      renotify: Boolean(data.tag),
      icon: "/brand/pantas-icon-192.png",
      badge: "/brand/pantas-badge.png",
      data: { url: data.url || "/lacak" },
    }),
  );
});

// Klik notifikasi: fokus ke tab halaman resi itu bila sudah terbuka, selain itu buka tab baru.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/lacak";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => w.url.split("?")[0] === url && "focus" in w);
      return open ? open.focus() : self.clients.openWindow(url);
    }),
  );
});
