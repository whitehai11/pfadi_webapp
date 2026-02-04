/// <reference lib="webworker" />

const sw = self as unknown as ServiceWorkerGlobalScope;
const CACHE_NAME = "pfadi-shell-v2";

const ASSET_PATHS = ["/", "/manifest.json", "/icon.svg"]; 

sw.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSET_PATHS);
    })
  );
  sw.skipWaiting();
});

sw.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  sw.clients.claim();
});

sw.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/calendar.ics")) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        return response;
      });
    })
  );
});

const getPushPayload = (event: PushEvent) => {
  if (!event.data) return { title: "Benachrichtigung", body: "Neue Benachrichtigung." };
  try {
    const data = event.data.json() as { title?: string; body?: string; url?: string };
    return {
      title: data.title || "Benachrichtigung",
      body: data.body || "Neue Benachrichtigung.",
      url: data.url
    };
  } catch {
    const text = event.data.text();
    return { title: "Benachrichtigung", body: text || "Neue Benachrichtigung." };
  }
};

sw.addEventListener("push", (event) => {
  const payload = getPushPayload(event);
  event.waitUntil(
    sw.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icon.svg",
      badge: "/icon.svg",
      data: { url: payload.url || "/" }
    })
  );
});

sw.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    sw.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      for (const client of clientsArr) {
        if ("focus" in client && client.url.includes(target)) {
          return client.focus();
        }
      }
      if (sw.clients.openWindow) return sw.clients.openWindow(target);
    })
  );
});
