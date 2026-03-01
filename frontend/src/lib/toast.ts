// engineered by Maro Elias Goth
import { derived, writable } from "svelte/store";

export type ToastType = "info" | "success" | "error";

export type ToastItem = {
  id: string;
  message: string;
  type: ToastType;
  read: boolean;
  createdAt: number;
};

export const toasts = writable<ToastItem[]>([]);
export const unreadToastCount = derived(toasts, ($toasts) => $toasts.filter((toast) => !toast.read).length);

export const pushToast = (message: string, type: ToastType = "info", timeoutMs = 3500) => {
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const toast: ToastItem = { id, message, type, read: false, createdAt: Date.now() };

  toasts.update((items) => [...items, toast]);

  if (timeoutMs > 0) {
    setTimeout(() => {
      toasts.update((items) => items.filter((item) => item.id !== id));
    }, timeoutMs);
  }
};

export const dismissToast = (id: string) => {
  toasts.update((items) => items.filter((item) => item.id !== id));
};

export const markToastAsRead = (id: string) => {
  toasts.update((items) => items.map((item) => (item.id === id ? { ...item, read: true } : item)));
};

export const markAllToastsAsRead = () => {
  toasts.update((items) => items.map((item) => ({ ...item, read: true })));
};

export const clearToasts = () => {
  toasts.set([]);
};
