import { apiFetch } from "./api";

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
};

export const registerPush = async () => {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Push nicht unterstützt");
  }

  const registration = await navigator.serviceWorker.ready;
  const { publicKey } = await apiFetch("/api/push/vapid-public-key");
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey)
  });

  await apiFetch("/api/push/subscribe", {
    method: "POST",
    body: JSON.stringify(subscription)
  });

  return subscription;
};

export const unregisterPush = async () => {
  if (!("serviceWorker" in navigator)) return false;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return false;
  await apiFetch("/api/push/unsubscribe", {
    method: "POST",
    body: JSON.stringify(subscription)
  });
  return subscription.unsubscribe();
};
