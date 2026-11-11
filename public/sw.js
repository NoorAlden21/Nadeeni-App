self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function statusUrl(payloadUrl) {
  const scope = new URL(self.registration.scope);
  if (!payloadUrl) {
    return new URL("/", scope).href;
  }

  let target;
  try {
    target = new URL(payloadUrl, scope);
  } catch {
    return new URL("/", scope).href;
  }

  const localHost = target.hostname === "localhost" || target.hostname === "127.0.0.1";
  const workerIsLocal = scope.hostname === "localhost" || scope.hostname === "127.0.0.1";
  if (localHost && !workerIsLocal) {
    return new URL(`${target.pathname}${target.search}${target.hash}`, scope.origin).href;
  }

  return target.href;
}

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = payload.restaurant_name || "ناديني";
  const scope = self.registration.scope;
  const baseTag = payload.order_number ? `nadeeni-${payload.order_number}` : "nadeeni-ready";
  const url = statusUrl(payload.url);
  const options = {
    body: payload.message || "",
    lang: "ar",
    dir: "rtl",
    icon: new URL("/push-icon.png", scope).href,
    badge: new URL("/push-badge.png", scope).href,
    tag: `${baseTag}-${Date.now()}`,
    renotify: true,
    silent: false,
    vibrate: [200, 100, 200, 100, 320],
    data: { url },
  };

  event.waitUntil(
    (async () => {
      const existing = await self.registration.getNotifications();
      existing.forEach((notification) => {
        if (notification.tag === baseTag || String(notification.tag).startsWith(`${baseTag}-`)) {
          notification.close();
        }
      });
      await self.registration.showNotification(title, options);
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      let targetPath = "";
      try {
        targetPath = new URL(url).pathname;
      } catch {
        targetPath = "";
      }
      windows.forEach((client) => {
        try {
          if (!targetPath || new URL(client.url).pathname !== targetPath) {
            return;
          }
        } catch {
          return;
        }
        client.postMessage({ type: "nadeeni-ready" });
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = statusUrl(event.notification.data && event.notification.data.url);
  const target = new URL(url);

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      const existing = windowClients.find((client) => {
        try {
          const open = new URL(client.url);
          return open.origin === target.origin && open.pathname === target.pathname;
        } catch {
          return false;
        }
      });
      if (existing && "focus" in existing) {
        return existing.focus();
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
      return undefined;
    }),
  );
});
