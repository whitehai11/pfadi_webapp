// engineered by Maro Elias Goth
import { get, writable } from "svelte/store";
import type { Action } from "svelte/action";

const overlayState = writable<string | null>(null);

export const activeOverlayId = {
  subscribe: overlayState.subscribe
};

export const openOverlay = (id: string) => {
  overlayState.set(id);
};

export const closeOverlay = (id?: string) => {
  if (!id) {
    overlayState.set(null);
    return;
  }

  if (get(overlayState) === id) {
    overlayState.set(null);
  }
};

export const toggleOverlay = (id: string) => {
  if (get(overlayState) === id) {
    overlayState.set(null);
    return;
  }
  overlayState.set(id);
};

type OutsideParams = {
  id: string;
  enabled?: boolean;
};

export const overlayOutside: Action<HTMLElement, OutsideParams> = (node, initialParams) => {
  let params = initialParams;

  const onPointerDown = (event: PointerEvent) => {
    if (params.enabled === false) return;
    if (get(overlayState) !== params.id) return;

    const target = event.target as Node | null;
    if (!target) return;
    if (node.contains(target)) return;

    closeOverlay(params.id);
  };

  document.addEventListener("pointerdown", onPointerDown, true);

  return {
    update(nextParams) {
      params = nextParams;
    },
    destroy() {
      document.removeEventListener("pointerdown", onPointerDown, true);
    }
  };
};
